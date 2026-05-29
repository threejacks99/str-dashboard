-- 0004_drop_clients_email_unique.sql
-- Drops the global UNIQUE(email) on clients. Email is contact data, not an
-- identity (a client is identified by id + account_id), and a system-wide
-- unique blocked legitimate cases (same email across accounts; two owners
-- sharing a contact email) and caused signup 500s on reused emails.
alter table public.clients drop constraint if exists clients_email_key;
