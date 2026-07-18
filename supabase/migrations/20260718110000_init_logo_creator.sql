-- ALEYA Logo Creator schema
create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.logo_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null,
  tagline text,
  industry text not null,
  personality text not null,
  style text not null,
  preferred_colors text[] not null default '{}',
  avoid_colors text[] not null default '{}',
  icon_ideas text,
  typography_direction text not null,
  layout_direction text not null,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'selected', 'archived')),
  selected_concept_id uuid,
  aleya_business_id text,
  aleya_return_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.logo_projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  kind text not null check (kind in ('generate', 'regenerate', 'refine')),
  provider text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  request_payload jsonb not null default '{}',
  result_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (owner_id, idempotency_key)
);

create table if not exists public.logo_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.logo_projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.generation_jobs (id) on delete set null,
  title text not null,
  prompt text not null,
  icon_concept text,
  layout text not null,
  palette jsonb not null default '{}',
  typography jsonb not null default '{}',
  provider text not null,
  provider_metadata jsonb not null default '{}',
  svg_markup text,
  png_path text,
  transparent_png_path text,
  monochrome_path text,
  icon_path text,
  horizontal_path text,
  stacked_path text,
  light_preview_path text,
  dark_preview_path text,
  parent_concept_id uuid references public.logo_concepts (id) on delete set null,
  refinement_instruction text,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.logo_projects
  drop constraint if exists logo_projects_selected_concept_id_fkey;

alter table public.logo_projects
  add constraint logo_projects_selected_concept_id_fkey
  foreign key (selected_concept_id) references public.logo_concepts (id) on delete set null;

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.logo_projects (id) on delete cascade,
  concept_id uuid not null references public.logo_concepts (id) on delete cascade,
  name text not null,
  business_name text not null,
  tagline text,
  primary_colors text[] not null default '{}',
  secondary_colors text[] not null default '{}',
  typography jsonb not null default '{}',
  logo_prompt text,
  icon_concept text,
  layout text,
  primary_logo_path text,
  secondary_logo_path text,
  icon_path text,
  light_variant_path text,
  dark_variant_path text,
  generation_history jsonb not null default '[]',
  editable_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_kit_id uuid not null references public.brand_kits (id) on delete cascade,
  aleya_business_id text not null,
  state text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  response_body text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists logo_projects_owner_idx on public.logo_projects (owner_id);
create index if not exists logo_concepts_project_idx on public.logo_concepts (project_id);
create index if not exists brand_kits_owner_idx on public.brand_kits (owner_id);
create index if not exists generation_jobs_owner_created_idx on public.generation_jobs (owner_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.logo_projects enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.logo_concepts enable row level security;
alter table public.brand_kits enable row level security;
alter table public.integration_deliveries enable row level security;

create policy workspaces_owner_all on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy logo_projects_owner_all on public.logo_projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy generation_jobs_owner_all on public.generation_jobs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy logo_concepts_owner_all on public.logo_concepts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy brand_kits_owner_all on public.brand_kits
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy integration_deliveries_owner_all on public.integration_deliveries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('logo-assets', 'logo-assets', false)
on conflict (id) do nothing;

create policy logo_assets_select on storage.objects
  for select to authenticated
  using (bucket_id = 'logo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logo_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logo_assets_update on storage.objects
  for update to authenticated
  using (bucket_id = 'logo-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logo-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy logo_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'logo-assets' and (storage.foldername(name))[1] = auth.uid()::text);
