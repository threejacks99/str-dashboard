-- Phase 10: enforce uniqueness on (property_id, reservation_ref) at the DB level.
-- Mirrors the client-side dedup in app/upload/page.tsx so a concurrent upload
-- from a second tab can't slip duplicates past the JS-Set check.
-- Partial: rows without a reservation_ref (manual entries, some imports) are
-- exempt, matching current dedup behavior.

CREATE UNIQUE INDEX IF NOT EXISTS reservations_property_ref_unique_idx
  ON reservations (property_id, reservation_ref)
  WHERE reservation_ref IS NOT NULL;
