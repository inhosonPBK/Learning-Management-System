-- 0003_reports.sql — report types (lookup) and the single reports table
create table if not exists public.report_types (
  code                    text primary key,
  name_ko                 text not null,
  name_en                 text not null,
  author_kind             text not null check (author_kind in ('trainee','supervisor')),
  has_period              boolean not null default false,
  requires_review         boolean not null default false,
  trainee_visible         boolean not null default true,
  current_schema_version  int not null default 1,
  sort_order              int not null default 0
);

insert into public.report_types (code, name_ko, name_en, author_kind, has_period, requires_review, trainee_visible, sort_order) values
  ('weekly',    '주간 교육 보고서', 'Weekly Report',    'trainee',    true,  true,  true,  1),
  ('training',  '교육훈련보고서',   'Training Report',  'trainee',    false, true,  true,  2),
  ('interview', '면담보고서',       'Interview Report', 'supervisor', false, false, false, 3)
on conflict (code) do update set
  name_ko = excluded.name_ko, name_en = excluded.name_en, sort_order = excluded.sort_order;

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  enrollment_id   uuid not null references public.enrollments(id) on delete cascade,
  trainee_id      uuid not null references public.profiles(id) on delete restrict,   -- denormalized from enrollment
  report_type     text not null references public.report_types(code),
  author_id       uuid not null references public.profiles(id) on delete restrict,
  period_index    int,
  report_date     date,
  content         jsonb not null default '{}'::jsonb,
  schema_version  int  not null default 1,
  status          text not null default 'draft' check (status in ('draft','submitted','completed')),
  submitted_at    timestamptz,
  completed_at    timestamptz,
  reviewer_id     uuid references public.profiles(id) on delete set null,
  review          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists reports_period_unique
  on public.reports(enrollment_id, report_type, period_index) where period_index is not null;
create index if not exists reports_trainee_idx    on public.reports(trainee_id);
create index if not exists reports_author_idx     on public.reports(author_id);
create index if not exists reports_enrollment_idx on public.reports(enrollment_id, report_type);
create index if not exists reports_status_idx     on public.reports(status);

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.report_types enable row level security;
alter table public.reports      enable row level security;
