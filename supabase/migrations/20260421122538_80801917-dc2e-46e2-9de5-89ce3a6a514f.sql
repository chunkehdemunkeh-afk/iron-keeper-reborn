drop policy if exists "Avatar images are publicly accessible" on storage.objects;

-- Allow public read of individual files only when the exact name is known
-- (storage.foldername returns NULL when listing a bucket without a prefix)
create policy "Avatar images are publicly readable by path"
on storage.objects for select
using (
  bucket_id = 'avatars'
  and (storage.foldername(name)) is not null
);