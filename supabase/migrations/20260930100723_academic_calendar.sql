create table if not exists public.academic_calendars (
  id text primary key check (id = 'ufape'),
  draft jsonb check (draft is null or jsonb_typeof(draft) = 'object'),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  published_at timestamptz
);

alter table public.academic_calendars enable row level security;
revoke all on table public.academic_calendars from public, anon, authenticated, service_role;
grant select, update on table public.academic_calendars to service_role;

-- The institution has one shared calendar. Drafts and publications are independent.
insert into public.academic_calendars (id) values ('ufape') on conflict (id) do nothing;
