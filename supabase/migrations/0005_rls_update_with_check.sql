-- 0005_rls_update_with_check.sql
-- Hardens the five UPDATE RLS policies that had a USING clause but no WITH CHECK.
--
-- Problem: USING gates WHICH rows a caller may update (correctly scoped to their
-- own account), but with no WITH CHECK the NEW values were unvalidated. A user
-- could take a row they own and reassign its foreign key (property_id / client_id
-- / account_id) to point at another account's record — a cross-tenant integrity
-- hole. Reads and INSERTs were already correctly scoped; this closes the UPDATE gap.
--
-- Fix: add a WITH CHECK that mirrors each policy's existing USING expression, so the
-- post-update row must still belong to the caller's account. ALTER POLICY edits in
-- place (USING is preserved; no drop/recreate window).

alter policy accounts_update on public.accounts
  with check (
    id in (
      select account_users.account_id
      from account_users
      where account_users.user_id = auth.uid()
        and account_users.role = 'admin'
    )
  );

alter policy clients_update on public.clients
  with check (
    exists (
      select 1
      from account_users
      where account_users.user_id = auth.uid()
        and account_users.account_id = clients.account_id
    )
  );

alter policy properties_update on public.properties
  with check (
    exists (
      select 1
      from clients c
      join account_users au on au.account_id = c.account_id
      where au.user_id = auth.uid()
        and c.id = properties.client_id
    )
  );

alter policy reservations_update on public.reservations
  with check (
    exists (
      select 1
      from properties p
      join clients c on c.id = p.client_id
      join account_users au on au.account_id = c.account_id
      where au.user_id = auth.uid()
        and p.id = reservations.property_id
    )
  );

alter policy expenses_update on public.expenses
  with check (
    exists (
      select 1
      from properties p
      join clients c on c.id = p.client_id
      join account_users au on au.account_id = c.account_id
      where au.user_id = auth.uid()
        and p.id = expenses.property_id
    )
  );
