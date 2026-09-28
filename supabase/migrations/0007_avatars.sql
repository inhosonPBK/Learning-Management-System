-- 0007_avatars.sql — profile photos
alter table public.profiles add column if not exists avatar_path text;

-- Public-read bucket; object names are random uuids so URLs are not guessable. 2 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
