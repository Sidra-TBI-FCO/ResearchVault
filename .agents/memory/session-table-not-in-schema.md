---
name: session table is not in Drizzle schema
description: connect-pg-simple "session" table can be dropped by drizzle-kit push and break the whole app
---

The express-session store (connect-pg-simple, configured in `server/index.ts`
with `tableName: 'session'`, `createTableIfMissing: true`) relies on a
`session` table that is NOT defined in `shared/schema.ts`.

**Symptom:** every request fails with Postgres `42P01 relation "session" does
not exist`; the app appears to "not run in dev" even though the workflow is up.

**Why:** a `drizzle-kit push` (e.g. post-merge schema sync) treats `session`
as an unknown table and can drop it. `createTableIfMissing` does not reliably
recreate it in demo mode (sessions are rarely written), so pruning keeps
erroring on the missing table.

**How to apply:** if you see `relation "session" does not exist`, recreate it
with the standard connect-pg-simple DDL (sid varchar PK, sess json, expire
timestamp(6), index on expire). After any schema reconciliation that drops it,
recreate it rather than assuming createTableIfMissing will.
