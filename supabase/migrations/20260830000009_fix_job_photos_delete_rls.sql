-- Fixes a real bug found live 2026-08-19 while QA-verifying the job-photo
-- upload fix: soft-deleting a job photo (UPDATE ... SET deleted_at = now())
-- always failed with "new row violates row-level security policy for
-- table job_photos", even reproduced against `USING (true) WITH CHECK
-- (true)` and inside a plain DO block with no RETURNING clause at all —
-- ruling out every application-layer explanation. Empirically isolated:
-- the failure disappears the instant `job_photos_select`'s `deleted_at IS
-- NULL` clause is removed. Postgres RLS's UPDATE enforcement checks row
-- visibility via the table's SELECT policy in addition to the UPDATE
-- policy itself — baking "not yet deleted" into SELECT's own USING
-- clause means the row updating itself to deleted becomes invisible to
-- that check mid-update, and the write is rejected. This soft-delete
-- flow could never have actually worked since the table was created.
--
-- Fix: SELECT policy no longer encodes "not deleted" as an RLS
-- condition — filtering deleted photos out of what a tenant sees is now
-- the application query's job (lib/actions/photos.ts's getJobPhotos
-- adds `.is('deleted_at', null)` explicitly), same as any other
-- soft-delete pattern in this codebase. RLS only enforces tenant
-- isolation, which is what it's actually for.
DROP POLICY IF EXISTS "job_photos_select" ON job_photos;

CREATE POLICY "job_photos_select" ON job_photos
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
