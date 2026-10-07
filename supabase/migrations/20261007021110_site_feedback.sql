create table public.site_feedback (
  id uuid primary key,
  category text not null check (category in ('suggestion', 'problem', 'academic_data', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  name text check (char_length(name) <= 100),
  email text check (char_length(email) <= 254),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 4096),
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'resolved', 'archived')),
  internal_notes text not null default '' check (char_length(internal_notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index site_feedback_created_idx on public.site_feedback (created_at desc, id);
create index site_feedback_status_idx on public.site_feedback (status, created_at desc);
create index site_feedback_course_idx on public.site_feedback ((metadata->>'course'), created_at desc);

-- Short-lived daily HMAC identifiers for anti-spam only; no raw IP is stored.
create table public.site_feedback_rate_limits (
  requester_hash text primary key check (requester_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null default now(),
  submissions integer not null default 0 check (submissions between 0 and 5)
);
create index site_feedback_rate_limits_window_idx on public.site_feedback_rate_limits (window_start);
alter table public.site_feedback enable row level security;
alter table public.site_feedback_rate_limits enable row level security;
revoke all on public.site_feedback, public.site_feedback_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.site_feedback, public.site_feedback_rate_limits to service_role;

create function public.submit_site_feedback(
  p_id uuid, p_category text, p_message text, p_name text, p_email text,
  p_metadata jsonb, p_requester_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
  v_inserted integer;
begin
  if p_requester_hash is null or p_requester_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid requester identifier';
  end if;
  -- Repeating the same submission after a timeout does not create another message.
  if exists (select 1 from public.site_feedback where id = p_id) then
    return jsonb_build_object('id', p_id);
  end if;
  delete from public.site_feedback_rate_limits where window_start < now() - interval '24 hours';
  insert into public.site_feedback_rate_limits (requester_hash) values (p_requester_hash)
    on conflict (requester_hash) do nothing;
  select window_start, submissions into v_window, v_count
    from public.site_feedback_rate_limits where requester_hash = p_requester_hash for update;
  -- Concurrent retries may have completed while this call waited for the lock.
  if exists (select 1 from public.site_feedback where id = p_id) then
    return jsonb_build_object('id', p_id);
  end if;
  if v_window <= now() - interval '15 minutes' then
    v_window := now();
    v_count := 0;
  end if;
  if v_count >= 5 then
    return jsonb_build_object('rate_limited', true,
      'retry_after', greatest(1, ceil(extract(epoch from v_window + interval '15 minutes' - now()))::integer));
  end if;
  insert into public.site_feedback (id, category, message, name, email, metadata)
    values (p_id, p_category, p_message, p_name, p_email, coalesce(p_metadata, '{}'::jsonb))
    on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;
  update public.site_feedback_rate_limits
    set window_start = v_window, submissions = v_count + v_inserted
    where requester_hash = p_requester_hash;
  return jsonb_build_object('id', p_id);
end;
$$;
revoke all on function public.submit_site_feedback(uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_site_feedback(uuid, text, text, text, text, jsonb, text) to service_role;
