create table if not exists public.courses (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_curricula (
  course_id text primary key references public.courses(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.course_schedules (
  course_id text not null references public.courses(id) on delete cascade,
  semester text not null check (semester ~ '^\d{4}\.[12]$'),
  data jsonb not null check (jsonb_typeof(data) = 'array'),
  extraction jsonb,
  updated_at timestamptz not null default now(),
  primary key (course_id, semester)
);

create table if not exists public.course_contents (
  course_id text primary key references public.courses(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'completed_with_errors', 'failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists public.migration_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.migration_runs(id) on delete cascade,
  course_id text not null,
  source_key text not null,
  kind text not null check (kind in ('course', 'curriculum', 'contents', 'schedule')),
  semester text,
  source_file text not null,
  source_checksum text not null,
  source_data jsonb not null,
  destination_snapshot jsonb,
  previous_data jsonb,
  status text not null check (status in ('pending', 'identical', 'imported', 'error')),
  error jsonb,
  processed_at timestamptz,
  unique (run_id, source_key)
);

create index if not exists migration_items_run_status_idx
  on public.migration_items (run_id, status);

alter table public.courses enable row level security;
alter table public.course_curricula enable row level security;
alter table public.course_schedules enable row level security;
alter table public.course_contents enable row level security;
alter table public.migration_runs enable row level security;
alter table public.migration_items enable row level security;

revoke all on table public.courses, public.course_curricula, public.course_schedules,
  public.course_contents, public.migration_runs, public.migration_items
  from public, anon, authenticated;
grant select, insert, update, delete on table public.courses, public.course_curricula,
  public.course_schedules, public.course_contents, public.migration_runs, public.migration_items
  to service_role;

create or replace function public.apply_academic_course_import(
  p_run_id uuid,
  p_course_id text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_stored public.migration_items%rowtype;
  v_current jsonb;
  v_imported integer := 0;
  v_identical integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A unidade de importação não contém itens.' using errcode = '22023';
  end if;

  -- Serialize imports for a course, including first-time inserts where there is no row to lock.
  perform pg_advisory_xact_lock(hashtext(p_course_id));

  if not exists (
    select 1 from public.migration_runs r where r.id = p_run_id
  ) then
    raise exception 'Execução de migração não encontrada.' using errcode = 'P0002';
  end if;

  for v_item in
    select supplied.value
    from jsonb_array_elements(p_items) as supplied(value)
    left join public.migration_items as ordered_item
      on ordered_item.run_id = p_run_id
      and ordered_item.course_id = p_course_id
      and ordered_item.source_key = supplied.value ->> 'source_key'
    order by case ordered_item.kind
      when 'course' then 0
      when 'curriculum' then 1
      when 'contents' then 2
      else 3
    end, ordered_item.semester, supplied.value ->> 'source_key'
  loop
    select * into v_stored
    from public.migration_items i
    where i.run_id = p_run_id
      and i.course_id = p_course_id
      and i.source_key = v_item ->> 'source_key'
    for update;

    if not found then
      raise exception 'Item de migração não encontrado: %', v_item ->> 'source_key' using errcode = 'P0002';
    end if;
    if v_stored.source_checksum <> v_item ->> 'source_checksum'
      or v_stored.source_data is distinct from v_item -> 'source_data' then
      raise exception 'A origem do item mudou após a prévia: %', v_stored.source_file using errcode = '40001';
    end if;
    if v_stored.status = 'imported' then
      continue;
    end if;
    if v_stored.status not in ('pending', 'error', 'identical') then
      raise exception 'Estado inválido no item de migração: %', v_stored.status using errcode = '22023';
    end if;

    v_current := null;
    if v_stored.kind = 'course' then
      select c.data into v_current from public.courses c where c.id = p_course_id for update;
    elsif v_stored.kind = 'curriculum' then
      select c.data into v_current from public.course_curricula c where c.course_id = p_course_id for update;
    elsif v_stored.kind = 'contents' then
      select c.data into v_current from public.course_contents c where c.course_id = p_course_id for update;
    elsif v_stored.kind = 'schedule' then
      select jsonb_build_object('data', s.data, 'extraction', s.extraction)
        into v_current
      from public.course_schedules s
      where s.course_id = p_course_id and s.semester = v_stored.semester
      for update;
    end if;

    if v_current is distinct from v_stored.destination_snapshot then
      raise exception 'O destino mudou após a prévia: %', v_stored.source_file using errcode = '40001';
    end if;

    if v_current is not distinct from v_stored.source_data then
      update public.migration_items
      set status = 'identical', previous_data = v_current, error = null, processed_at = now()
      where id = v_stored.id;
      v_identical := v_identical + 1;
      continue;
    end if;

    if v_stored.kind = 'course' then
      insert into public.courses (id, data, updated_at)
      values (p_course_id, v_stored.source_data, now())
      on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
    elsif v_stored.kind = 'curriculum' then
      insert into public.course_curricula (course_id, data, updated_at)
      values (p_course_id, v_stored.source_data, now())
      on conflict (course_id) do update set data = excluded.data, updated_at = excluded.updated_at;
    elsif v_stored.kind = 'contents' then
      insert into public.course_contents (course_id, data, updated_at)
      values (p_course_id, v_stored.source_data, now())
      on conflict (course_id) do update set data = excluded.data, updated_at = excluded.updated_at;
    elsif v_stored.kind = 'schedule' then
      insert into public.course_schedules (course_id, semester, data, extraction, updated_at)
      values (p_course_id, v_stored.semester, v_stored.source_data -> 'data', v_stored.source_data -> 'extraction', now())
      on conflict (course_id, semester) do update
      set data = excluded.data, extraction = excluded.extraction, updated_at = excluded.updated_at;
    end if;

    update public.migration_items
    set status = 'imported', previous_data = v_current, error = null, processed_at = now()
    where id = v_stored.id;
    v_imported := v_imported + 1;
  end loop;

  update public.migration_runs
  set status = 'running', started_at = coalesce(started_at, now())
  where id = p_run_id;

  return jsonb_build_object('imported', v_imported, 'identical', v_identical);
end;
$$;

revoke all on function public.apply_academic_course_import(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_academic_course_import(uuid, text, jsonb) to service_role;
