-- Phase 9 — Soft delete on properties. Applied 2026-05-11.

-- Add nullable deleted_at column; existing rows read as NULL (= not deleted), no backfill needed.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial index for the "active properties for a client" lookup pattern used by every soft-delete-aware read in the app.
CREATE INDEX IF NOT EXISTS properties_active_idx
  ON properties (client_id)
  WHERE deleted_at IS NULL;

-- No RLS changes: existing policies on properties scope by account via client_id and keep working unchanged.
-- Soft-delete filtering is an application-level concern.
