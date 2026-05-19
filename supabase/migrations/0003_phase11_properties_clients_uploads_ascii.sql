-- supabase/migrations/0003_phase11_properties_clients_uploads_ascii.sql
--
-- Extends the printable-ASCII CHECK constraint pattern (originally added to
-- reservations and expenses during the May 5 diamond-character bug fix) to
-- the free-text columns on properties, clients, and uploads.
--
-- Closes a defense-in-depth gap surfaced during pre-launch verification: the
-- application-layer sanitizeString() in lib/csvMapper.ts had no DB-layer
-- mirror on these three tables, which the sanitizer's policy comment
-- incorrectly claimed it did. Multi-property CSV import (next commit) adds
-- a new code path that creates property rows from CSV-derived strings; this
-- migration ensures the DB rejects any non-ASCII row that bypasses the
-- mapper, matching the existing reservations/expenses contract.
--
-- Constrained columns:
--   properties.name, properties.address
--   clients.name
--   uploads.filename
--
-- Other text columns considered and intentionally NOT constrained here:
--   uploads.upload_type -- bounded to 'reservations'|'expenses' by code, not
--     user-writable; CHECK enum would belong with the tier/status enums and
--     is out of scope for this migration.
--   accounts.name, accounts.billing_email -- out of scope for the diamond-
--     character defense; billing_email has its own validation pathway.
--   properties -- other text columns (e.g. notes, geocoding fields) not
--     known to be user-writable free text; if discovered later, extend.
--
-- All constraints are NULL-safe (mirror the reservations/expenses pattern):
-- NULL values pass the CHECK; only non-NULL non-printable-ASCII strings are
-- rejected. Empty string is printable-ASCII (matches []*), so it passes.

-- Applied to production Supabase on May 19, 2026. Pre-check returned zero
-- violating rows; all four ALTERs succeeded.

-- -- Pre-check: ensure no existing rows violate the new constraints --------
-- If any of these SELECTs return rows, the corresponding ALTER below will
-- fail. Investigate and clean before running the ALTERs. Expected to return
-- zero rows on the production database; included for safety.

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.properties
    where name is not null and name !~ '^[\x20-\x7E]*$';
  if v_count > 0 then raise exception 'properties.name has % non-ASCII rows', v_count; end if;

  select count(*) into v_count from public.properties
    where address is not null and address !~ '^[\x20-\x7E]*$';
  if v_count > 0 then raise exception 'properties.address has % non-ASCII rows', v_count; end if;

  select count(*) into v_count from public.clients
    where name is not null and name !~ '^[\x20-\x7E]*$';
  if v_count > 0 then raise exception 'clients.name has % non-ASCII rows', v_count; end if;

  select count(*) into v_count from public.uploads
    where filename is not null and filename !~ '^[\x20-\x7E]*$';
  if v_count > 0 then raise exception 'uploads.filename has % non-ASCII rows', v_count; end if;
end $$;

-- -- Add the CHECK constraints ---------------------------------------------

alter table public.properties
  add constraint properties_name_printable_ascii
  check (name is null or name ~ '^[\x20-\x7E]*$');

alter table public.properties
  add constraint properties_address_printable_ascii
  check (address is null or address ~ '^[\x20-\x7E]*$');

alter table public.clients
  add constraint clients_name_printable_ascii
  check (name is null or name ~ '^[\x20-\x7E]*$');

alter table public.uploads
  add constraint uploads_filename_printable_ascii
  check (filename is null or filename ~ '^[\x20-\x7E]*$');
