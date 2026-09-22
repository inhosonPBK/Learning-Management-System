-- 0002_programs.sql — training programs, enrollments, watchers
create table if not exists public.programs (
  id                    uuid primary key default gen_random_uuid(),
  program_type          text not null check (program_type in ('intern','new_hire','ojt')),
  name_ko               text not null,
  name_en               text not null,
  start_date            date not null,
  end_date              date not null,
  duration_weeks        int  not null check (duration_weeks > 0),
  enabled_report_types  text[] not null default '{weekly,interview}',
  status                text not null default 'planned' check (status in ('planned','active','closed')),
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs(id) on delete cascade,
  trainee_id      uuid not null references public.profiles(id) on delete restrict,
  mentor_id       uuid references public.profiles(id) on delete set null,
  start_date      date,
  end_date        date,
  jd_text         text,
  training_plan   jsonb not null default '[]'::jsonb,
  status          text not null default 'active' check (status in ('active','completed','withdrawn')),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (program_id, trainee_id)
);
create index if not exists enrollments_trainee_idx on public.enrollments(trainee_id);
create index if not exists enrollments_mentor_idx  on public.enrollments(mentor_id);

create table if not exists public.enrollment_watchers (
  enrollment_id  uuid not null references public.enrollments(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  role           text not null check (role in ('co_mentor','observer')),
  created_at     timestamptz not null default now(),
  primary key (enrollment_id, profile_id)
);
create index if not exists enrollment_watchers_profile_idx on public.enrollment_watchers(profile_id);

drop trigger if exists programs_updated_at on public.programs;
create trigger programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();
drop trigger if exists enrollments_updated_at on public.enrollments;
create trigger enrollments_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

alter table public.programs            enable row level security;
alter table public.enrollments         enable row level security;
alter table public.enrollment_watchers enable row level security;
