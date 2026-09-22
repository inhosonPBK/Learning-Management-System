-- 0004_materials.sql — training materials board (phase 2 features; tables created now)
create table if not exists public.material_categories (
  code        text primary key,
  name_ko     text not null,
  name_en     text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

insert into public.material_categories (code, name_ko, name_en, sort_order) values
  ('onboarding', '온보딩',        'Onboarding',        1),
  ('policy',     '규정·정책',     'Policies',          2),
  ('product',    '제품 교육',     'Product Training',  3),
  ('quality',    '품질·안전',     'Quality & Safety',  4),
  ('systems',    '시스템·도구',   'Systems & Tools',   5),
  ('general',    '일반',          'General',           9)
on conflict (code) do nothing;

create table if not exists public.training_materials (
  id             uuid primary key default gen_random_uuid(),
  category_code  text not null references public.material_categories(code),
  title          text not null,
  body           text,
  author_id      uuid references public.profiles(id) on delete set null,
  program_types  text[],                      -- null = general (all)
  is_published   boolean not null default false,
  published_at   timestamptz,
  view_count     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists training_materials_category_idx on public.training_materials(category_code, is_published);

create table if not exists public.material_attachments (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid not null references public.training_materials(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists material_attachments_material_idx on public.material_attachments(material_id);

drop trigger if exists training_materials_updated_at on public.training_materials;
create trigger training_materials_updated_at before update on public.training_materials
  for each row execute function public.set_updated_at();

alter table public.material_categories enable row level security;
alter table public.training_materials  enable row level security;
alter table public.material_attachments enable row level security;

-- Private storage bucket; files are served via short-lived signed URLs from server actions.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;
