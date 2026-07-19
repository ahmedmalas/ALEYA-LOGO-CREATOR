-- Project reference materials (logos, sketches, packaging, PDFs, inspiration).

create table if not exists public.project_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.logo_projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  safe_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  note text,
  is_active boolean not null default true,
  kind text not null default 'other'
    check (kind in (
      'logo',
      'sketch',
      'packaging',
      'product',
      'business_card',
      'screenshot',
      'inspiration',
      'receipt',
      'document',
      'other'
    )),
  preview_path text,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, storage_path)
);

create index if not exists project_references_project_idx
  on public.project_references (project_id);

create index if not exists project_references_owner_idx
  on public.project_references (owner_id);

alter table public.project_references enable row level security;

create policy project_references_owner_all on public.project_references
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Private bucket for reference uploads. Paths: {owner_id}/{project_id}/{reference_id}/{safe_filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-references',
  'project-references',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy project_references_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy project_references_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy project_references_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy project_references_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
