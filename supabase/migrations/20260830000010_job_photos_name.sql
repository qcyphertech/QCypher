-- Lets a tenant give each job photo a real name instead of only a
-- Before/After/Other label — see the Job Photos redesign (mockup D).
alter table public.job_photos
  add column name text null;
