-- Visual analysis fields on project references
alter table public.project_references
  add column if not exists analysis_status text not null default 'none'
    check (analysis_status in ('none','pending','succeeded','unavailable','failed')),
  add column if not exists analysis_mode text
    check (analysis_mode is null or analysis_mode in ('visual','metadata_only')),
  add column if not exists analysis_json jsonb,
  add column if not exists analysis_confirmed_json jsonb,
  add column if not exists analysis_provider text,
  add column if not exists analysis_model text,
  add column if not exists analysis_error text,
  add column if not exists pdf_pages_processed integer[] not null default '{}',
  add column if not exists analyzed_at timestamptz;

create table if not exists public.plan_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('pro')),
  email text,
  status text not null default 'active'
    check (status in ('active','left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  left_at timestamptz
);

create unique index if not exists plan_waitlist_active_unique
  on public.plan_waitlist (user_id, plan_id)
  where status = 'active';

create index if not exists plan_waitlist_user_idx
  on public.plan_waitlist (user_id, created_at desc);

alter table public.plan_waitlist enable row level security;

drop policy if exists plan_waitlist_owner_all on public.plan_waitlist;
create policy plan_waitlist_owner_all on public.plan_waitlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null
    check (event_type in ('generation','refinement','export')),
  status text not null default 'reserved'
    check (status in ('reserved','committed','released')),
  project_id uuid references public.logo_projects (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists usage_reservations_owner_status_idx
  on public.usage_reservations (owner_id, event_type, status, created_at desc);

alter table public.usage_reservations enable row level security;

drop policy if exists usage_reservations_owner_all on public.usage_reservations;
create policy usage_reservations_owner_all on public.usage_reservations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into public.plan_waitlist (user_id, plan_id, status, email)
select p.user_id, 'pro', 'active', u.email
from public.user_profiles p
join auth.users u on u.id = p.user_id
where p.plan_status = 'waitlist'
on conflict do nothing;
