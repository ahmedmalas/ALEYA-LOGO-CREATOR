-- User profiles, preferences, plan fields, reference titles, generation↔reference links.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  business_name text,
  phone text,
  country text,
  timezone text default 'UTC',
  preferred_language text default 'en',
  plan_id text not null default 'free'
    check (plan_id in ('free', 'pro')),
  plan_status text not null default 'active'
    check (plan_status in ('active', 'waitlist', 'past_due', 'canceled')),
  billing_provider text,
  billing_customer_id text,
  billing_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_logo_styles text[] not null default '{}',
  preferred_colour_directions text[] not null default '{}',
  default_export_formats text[] not null default array['svg','png'],
  email_product_updates boolean not null default true,
  email_marketing boolean not null default false,
  reduce_motion boolean not null default false,
  high_contrast boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional materialized hourly/daily counters; generation_jobs remains source of truth for enforcement.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null
    check (event_type in ('generation', 'refinement', 'export', 'reference_upload')),
  project_id uuid references public.logo_projects (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_owner_created_idx
  on public.usage_events (owner_id, created_at desc);

alter table public.project_references
  add column if not exists title text;

create table if not exists public.generation_references (
  id uuid primary key default gen_random_uuid(),
  generation_job_id uuid not null references public.generation_jobs (id) on delete cascade,
  concept_id uuid references public.logo_concepts (id) on delete set null,
  reference_id uuid not null references public.project_references (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (generation_job_id, reference_id, concept_id)
);

create index if not exists generation_references_job_idx
  on public.generation_references (generation_job_id);
create index if not exists generation_references_reference_idx
  on public.generation_references (reference_id);

alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.usage_events enable row level security;
alter table public.generation_references enable row level security;

drop policy if exists user_profiles_owner_all on public.user_profiles;
create policy user_profiles_owner_all on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_preferences_owner_all on public.user_preferences;
create policy user_preferences_owner_all on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists usage_events_owner_all on public.usage_events;
create policy usage_events_owner_all on public.usage_events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists generation_references_owner_all on public.generation_references;
create policy generation_references_owner_all on public.generation_references
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Avatar storage (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Auto-create profile + preferences on first auth user insert (for new signups)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name, plan_id, plan_status)
  values (new.id, split_part(new.email, '@', 1), 'free', 'active')
  on conflict (user_id) do nothing;
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill existing users
insert into public.user_profiles (user_id, display_name, plan_id, plan_status)
select id, split_part(email, '@', 1), 'free', 'active'
from auth.users
on conflict (user_id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
