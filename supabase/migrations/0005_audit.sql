-- 0005_audit.sql — explicit audit log written from server actions
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,          -- e.g. report.submit, user.create, enrollment.assign_mentor
  entity_type  text not null,          -- report | profile | enrollment | program | material
  entity_id    uuid,
  detail       jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_actor_idx  on public.audit_log(actor_id, created_at desc);

alter table public.audit_log enable row level security;
