-- 0006_reservation_status_default_confirmed.sql
-- Flip reservations.status default from lowercase 'confirmed' to canonical 'Confirmed'
-- so imports lacking a status column (most STR exports) land on the canonical value.
-- FUTURE inserts only; existing rows untouched (legacy rows canonicalized separately
-- via a reviewed data-only UPDATE, not this migration). No status CHECK exists, and the
-- column already holds a titlecase Cancelled row, so Confirmed is accepted.
alter table public.reservations alter column status set default 'Confirmed';
