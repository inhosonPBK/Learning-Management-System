-- 0001_org.sql — organization: departments, teams, profiles
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Entra cost-center departments (secondary attribute, filters/stats only)
create table if not exists public.departments (
  dept_code   text primary key,
  name_en     text not null,
  entity      text not null check (entity in ('PBK','PK','SHARED')),
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- Owner-defined teams (10). Team = the Level-1 lead's team, derived from the manager chain.
create table if not exists public.teams (
  code        text primary key,
  name_en     text not null,
  name_ko     text,
  lead_id     uuid,                       -- FK added below (profiles created after)
  entity      text check (entity in ('PBK','PK','SHARED')),
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

create table if not exists public.profiles (
  id                    uuid primary key default gen_random_uuid(),
  auth_user_id          uuid unique references auth.users(id) on delete set null,
  entra_id              uuid unique,
  email                 citext unique not null,
  display_name          text not null,
  name_ko               text,
  job_title             text,
  entity                text check (entity in ('PBK','PK','SHARED')),
  team_code             text references public.teams(code) on delete set null,
  dept_code             text references public.departments(dept_code) on delete set null,
  employee_type         text check (employee_type in ('Employee','Intern','Consultant','Agency Project')),
  manager_id            uuid references public.profiles(id) on delete set null,
  is_admin              boolean not null default false,
  is_people_ops         boolean not null default false,
  is_gm                 boolean not null default false,
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  locale                text not null default 'ko' check (locale in ('ko','en')),
  last_login_at         timestamptz,
  deactivated_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists profiles_manager_idx   on public.profiles(manager_id);
create index if not exists profiles_team_idx      on public.profiles(team_code);
create index if not exists profiles_auth_user_idx on public.profiles(auth_user_id);

alter table public.teams
  drop constraint if exists teams_lead_fk,
  add constraint teams_lead_fk foreign key (lead_id) references public.profiles(id) on delete set null;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: enabled with no policies → anon/authenticated keys are denied; service role only.
alter table public.departments enable row level security;
alter table public.teams       enable row level security;
alter table public.profiles    enable row level security;
