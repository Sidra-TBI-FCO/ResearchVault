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

# Pre-existing schema/DB drift (as of June 2026)

This repo has real drift between `shared/schema.ts` and the live DB. The
add+drop table (the one that triggers the rename prompt) was
`certification_configurations`. Other tables had one-sided drift (DB columns the
schema no longer declares, e.g. `scientists.role`,
`research_activities.lead_scientist_id`, several `ibc_applications.*`,
`team_members.category`, and `users.scientist_id` schema-only). Pushing these
would DROP columns and lose data, so resolution needs a human decision — do not
let an automated `push --force` silently apply them. Treat as out-of-scope for
unrelated tasks; flag to the user.
