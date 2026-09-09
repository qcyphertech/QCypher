-- Normalize existing contact emails to lowercase — the domain part in
-- particular was being displayed as typed (e.g. "Gmail.Com"), which reads
-- as a data-entry error even though email delivery itself is
-- case-insensitive for the domain. New/edited contacts are now lowercased
-- at write time (ContactForm, CSV import, CRM bot); this backfills rows
-- written before that.
update contacts
set email = lower(email)
where email is not null and email <> lower(email);
