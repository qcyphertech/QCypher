-- Fixes catalog-images storage RLS: tenant_id lives under app_metadata in
-- the JWT, not at the root - the original 20260831000003 migration copied
-- job-photos' pre-fix policy pattern (auth.jwt() ->> 'tenant_id') instead
-- of the corrected one from 20260720000001_fix_job_photos_rls.sql
-- (auth.jwt() -> 'app_metadata' ->> 'tenant_id'), so every upload failed
-- with "new row violates row-level security policy" - the claim it was
-- checking never existed at that path.
--
-- Also widens accepted formats (adds GIF/AVIF/HEIC/HEIF - client-side
-- compression converts everything to JPEG before upload, but accepting
-- the source format at the bucket level avoids a confusing rejection if
-- that conversion is ever skipped) and drops the per-file limit to 3MB
-- to match the compression pipeline's actual output size.

DROP POLICY IF EXISTS "catalog_images_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "catalog_images_storage_delete" ON storage.objects;

CREATE POLICY "catalog_images_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

CREATE POLICY "catalog_images_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

UPDATE storage.buckets
SET
  file_size_limit = 3145728,  -- 3 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif']
WHERE id = 'catalog-images';
