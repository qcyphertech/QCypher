-- Catalog item photo uploads (the "Inventory: Images" toggle, Full tier).
-- Unlike job-photos, catalog_items.image_url is stored directly on the row
-- and rendered as a plain <img src>, with no signed-URL regeneration at
-- read time — so this bucket is public (a stored URL must stay valid
-- indefinitely, not expire after an hour like a signed job-photo URL).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  true,
  5242880,   -- 5 MB hard limit per file (compressed client-side before upload)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {tenant_id}/{uuid}.jpg — first folder segment is the
-- tenant_id, same convention as job-photos.

CREATE POLICY "catalog_images_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

CREATE POLICY "catalog_images_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

-- No SELECT policy needed for authenticated reads — the bucket is public,
-- so storage.objects rows are readable via the public URL regardless of
-- RLS (public buckets bypass SELECT RLS for the public endpoint).
