-- Adds Microsoft Entra ID (SSO) provisioning columns to the users table.
-- Applied automatically when Drizzle migrations run; safe on existing rows.
-- Required before enabling SSO via AZURE_* env vars — see replit.md.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auth_provider" text NOT NULL DEFAULT 'local';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "entra_oid" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_entra_oid_unique"
  ON "users" ("entra_oid");
