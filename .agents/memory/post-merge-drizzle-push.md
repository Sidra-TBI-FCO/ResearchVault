---
name: Post-merge drizzle-kit push quirk + schema drift
description: Why post-merge schema sync can silently no-op, and that this repo has pre-existing code/DB schema drift requiring manual resolution.
---

# Post-merge `drizzle-kit push` TTY/exit-0 quirk

The post-merge setup script (`scripts/post-merge.sh`) runs `drizzle-kit push`.
On a plain `drizzle-kit push` (no flag) it dies non-interactively with
"Interactive prompts require a TTY terminal" → non-zero exit → **merge setup
fails**. Switching to `npx drizzle-kit push --force` makes merges pass.

**Non-obvious trap:** even with `--force`, when a table has BOTH added and
dropped columns, drizzle still fires `promptColumnsConflicts` (rename-vs-
create+drop ambiguity), prints the same TTY error to stderr — **but the process
exits 0 anyway**. So post-merge reports success while the schema push is
effectively a no-op for any conflicting diff. `--force` only auto-accepts
data-loss statements; it does NOT resolve rename ambiguity.

**Why it matters:** as long as a rename-conflict table exists in the diff, every
`push` aborts mid-diff, so NO schema changes get applied (not just the
conflicting table). A merged task that adds a legit column won't see it land.

**How to apply:** to make push actually apply changes, the add+drop drift must be
removed first — either align `shared/schema.ts` to the DB, or apply the intended
change via an explicit SQL migration in `migrations/` (the repo already uses
hand-written SQL migrations for some changes). Re-run the per-table diff
(schema column SQL-names vs `information_schema.columns`) to find the conflicting
table(s).

# Pre-existing schema/DB drift (RESOLVED June 9, 2026 — dummy DB, full align)

This repo had real drift between `shared/schema.ts` and the live DB. With user
sign-off (all data was dummy, freshly deployed) the DB was fully aligned TO the
code schema via `npx drizzle-kit push --force < /dev/null`. After alignment, the
per-table column diff reports **NO COLUMN DRIFT**.

**True root cause of the "TTY prompt" crashes:** it was NOT really rename
ambiguity. The DB was created with Postgres-default unique constraint names
(`<table>_<col>_key`), but drizzle-kit expects its own convention
(`<table>_<col>_unique`). So every `.unique()` column looked "missing" to
drizzle, which tried to ADD a `_unique` constraint for each — and those prompts
are what crashed `push` without a TTY.

**The fix sequence (do this if drift ever recurs on a dummy/expendable DB):**
1. Rename all `*_key` unique constraints to `*_unique`
   (`ALTER TABLE x RENAME CONSTRAINT x_col_key TO x_col_unique`). Promote any
   unique *index* drizzle expects as a *constraint* via
   `ALTER TABLE x ADD CONSTRAINT x_col_unique UNIQUE USING INDEX <idx>`.
2. Manually convert non-auto-castable column type changes BEFORE push (Postgres
   can't auto-cast these): text→json/jsonb and text→`text[]`. Use
   `ALTER COLUMN c TYPE json USING (CASE WHEN c IS NULL OR c='' THEN NULL ELSE c::json END)`
   and for arrays `... TYPE text[] USING (CASE WHEN c IS NULL OR c='' THEN NULL ELSE ARRAY[c] END)`.
   To find them: parse schema for `.array()` / `json()`/`jsonb()` cols and diff
   against `information_schema.columns.data_type`.
3. Then `npx drizzle-kit push --force < /dev/null` runs with ZERO prompts.

**Known harmless non-idempotency — DO NOT chase it.** Even after a clean align,
every subsequent `push` re-emits a few statements and prints `[✓] Changes
applied` (never "No changes"):
- DROP+CREATE of the `ibc_application_research_activities_..._index` unique index
  — its drizzle-generated name exceeds Postgres's 63-char identifier limit, gets
  truncated on disk, so it never matches and is recreated each run.
- `ALTER COLUMN ... SET DEFAULT '{}'`/`'[]'` on array/json columns — drizzle
  can't detect the existing default and re-sets it each run.
These are cosmetic drizzle-kit limitations, not real drift, and don't break the
app or post-merge.

**Unrelated benign log noise:** `relation "session" does not exist` comes from
connect-pg-simple's periodic prune, NOT from push (push does not manage/drop the
`session` table — it's not in the drizzle schema). With `createTableIfMissing:
true` (server/index.ts) the table self-creates on the first session write; in
demo mode sessions are rarely written so the prune query errors harmlessly.
