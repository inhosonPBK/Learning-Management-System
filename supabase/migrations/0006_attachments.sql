-- 0006_attachments.sql — generic file attachments (enrollment documents, material files)
create table if not exists public.attachments (
  id            uuid primary key default gen_random_uuid(),
  owner_type    text not null check (owner_type in ('enrollment','material')),
  owner_id      uuid not null,
  kind          text not null default 'other',        -- enrollment: training_plan | jd | other ; material: file
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  status        text not null default 'pending' check (status in ('pending','ready')),
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists attachments_owner_idx on public.attachments(owner_type, owner_id);
alter table public.attachments enable row level security;

-- superseded by the generic table (was empty)
drop table if exists public.material_attachments;

-- Private bucket for all documents; browser uploads go through signed upload URLs (50 MB/file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;
