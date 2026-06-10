---
name: Drizzle wraps pg errors in error.cause
description: Where to find the Postgres error code/detail when catching DB errors in this codebase
---

When a query throws, Drizzle (the pg/Neon driver setup in `server/db.ts`) wraps the
underlying Postgres driver error. The top-level thrown error has only
`{ query, params, cause }` and its `.code`/`.detail`/`.constraint` are **undefined**.
The real Postgres error code (e.g. `23505` unique violation), `detail`
(`Key (email)=(...) already exists`), and `constraint` (`scientists_email_unique`)
live on `error.cause`.

**Why:** Handlers that checked `error.code === "23505"` on the top-level error
silently fell through to a generic 500 instead of returning a useful 409.

**How to apply:** Unwrap before inspecting, e.g.
`const pgError = error?.code ? error : error?.cause;` then read
`pgError.code` / `pgError.detail` / `pgError.constraint`. Constraint names follow
`<table>_<col>_unique` in this DB.
