-- =============================================================================
-- _TEMPLATE.sql — canonical template for new public-schema tables
-- =============================================================================
-- DO NOT APPLY THIS FILE DIRECTLY. Copy it and rename to the next sequential
-- migration number, e.g. `0002_<short_name>.sql`, then edit the placeholders.
--
-- Why every block below is mandatory
--   On 2026-10-30, Supabase is changing the default behavior so that NEW
--   tables created in the `public` schema are no longer automatically
--   exposed to the Data API. Without explicit GRANTs to anon /
--   authenticated / service_role, PostgREST returns permission errors and
--   the client SDK cannot read or write the table.
--
--   Existing tables in this project are grandfathered (their grants
--   persist), so `supabase/audits/check_public_grants.sql` documents the
--   current state. But every NEW table added after 2026-10-30 — including
--   tables added in a migration that gets replayed against a freshly
--   provisioned project (staging, DR rebuild) — requires the GRANT block
--   below. The same default applies to brand-new projects starting
--   2026-05-30, so any new project we provision after that date will hit
--   this restriction immediately.
--
--   Skipping the GRANT block will silently break any client-side query
--   against the new table. The error surfaces only at runtime.
-- =============================================================================

-- 1. Create the table
-- -----------------------------------------------------------------------------
create table public.<table_name> (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  -- Add real columns here. Keep nullable/default decisions explicit;
  -- prefer NOT NULL with a sensible default over nullable-by-omission.
  property_id uuid        not null    references public.properties(id) on delete cascade
);

-- 2. Grant Data API access (REQUIRED — see header)
-- -----------------------------------------------------------------------------
-- These three grants match the Supabase pre-2026-10-30 default and must be
-- present on every new public-schema table. Do not narrow them without a
-- deliberate decision recorded in the handoff doc — narrower grants are
-- fine, but the audit script will flag the table and you'll need to
-- justify it.
grant select                         on public.<table_name> to anon;
grant select, insert, update, delete on public.<table_name> to authenticated;
grant select, insert, update, delete on public.<table_name> to service_role;

-- 3. Enable Row-Level Security
-- -----------------------------------------------------------------------------
-- GRANTs control whether the Data API exposes the table at all.
-- RLS controls which rows each authenticated user can see / mutate.
-- Both are required — GRANTs without RLS = open table; RLS without GRANTs
-- = invisible table.
alter table public.<table_name> enable row level security;

-- 4. Example RLS policies — adapt to the new table's foreign-key path
-- -----------------------------------------------------------------------------
-- Hostics's standard scoping chain is:
--
--     auth.uid()
--        -> account_users (user_id, account_id)
--        -> accounts      (id)
--        -> clients       (id, account_id)
--        -> properties    (id, client_id)
--
-- Walk the chain from the new table back to account_users. Most app tables
-- hang off properties (like reservations/expenses/uploads), so the example
-- below assumes the new table has a `property_id` FK. Adapt as needed:
--   * If the new table has a `client_id` FK, drop the `properties` join.
--   * If the new table has an `account_id` FK, drop both `properties` and
--     `clients` joins.
--   * If the new table is per-user (e.g. user preferences), scope on
--     `user_id = auth.uid()` directly with no joins.

-- SELECT: only rows whose property belongs to one of the caller's accounts.
create policy "<table_name>_select_scoped_by_account"
  on public.<table_name>
  for select
  using (
    property_id in (
      select p.id
      from public.properties    p
      join public.clients       c  on c.id  = p.client_id
      join public.accounts      a  on a.id  = c.account_id
      join public.account_users au on au.account_id = a.id
      where au.user_id = auth.uid()
    )
  );

-- INSERT: only allow inserting a row whose property belongs to the caller.
-- Note `with check` (not `using`) — `using` is for SELECT/UPDATE/DELETE
-- row visibility; `with check` is for what's allowed to be written.
create policy "<table_name>_insert_scoped_by_account"
  on public.<table_name>
  for insert
  with check (
    property_id in (
      select p.id
      from public.properties    p
      join public.clients       c  on c.id  = p.client_id
      join public.accounts      a  on a.id  = c.account_id
      join public.account_users au on au.account_id = a.id
      where au.user_id = auth.uid()
    )
  );

-- Add UPDATE / DELETE policies if the app mutates rows after insert.
-- Mirror the SELECT `using` clause; for UPDATE, add a matching `with check`
-- clause if the policy must also constrain the post-update row (e.g. to
-- prevent rewriting the scoping FK to another account's property).

-- =============================================================================
-- After applying the migration, re-run `supabase/audits/check_public_grants.sql`
-- in the Supabase SQL editor and confirm <table_name> does NOT appear in the
-- `missing_any_expected = TRUE` section at the top of the result set.
-- =============================================================================
