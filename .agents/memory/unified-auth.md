---
name: Unified multi-provider auth
description: How the AUTH_MODE auth system is wired and why entra_oid is reused generically
---

# Unified auth (AUTH_MODE)

One auth system selectable via `AUTH_MODE` env: `local` (default) | `demo` | `ldap` | `oidc`.
SSO = ldap/oidc only; off by default so local/role-emulation behaves as before.

**`/api/auth/config` shape is a superset on purpose:** `{ mode, ssoEnabled, provider, providerName }`.
`ssoEnabled` (= mode is ldap||oidc) is kept so existing consumers — `App.tsx`,
`useCurrentUser.tsx`, `Sidebar.tsx`, settings — keep working unchanged; `mode`/`providerName`
are the new fields the login page uses.

**`users.entra_oid` is reused as the generic external subject id** (OIDC `sub`), not just Entra.
**Why:** avoids a schema rename/migration churn; the existing migration
`migrations/20260525_add_entra_auth_columns.sql` already adds it (unique, nullable — Postgres
unique allows multiple NULLs, so LDAP users with no subject id are fine).
**How to apply:** external-user lookup order is subjectId → email → username; new users get
`AUTH_DEFAULT_ROLE` (default `Investigator`).

OIDC provider (`server/authProviders/oidc.ts`) uses openid-client v6 with PKCE **and** state+nonce.
Callback URL is rebuilt from the configured `OIDC_REDIRECT_URI` (not req.protocol/host) to stay
correct behind the reverse proxy. Entra is just a configured issuer:
`https://login.microsoftonline.com/<tenant>/v2.0`.

## Deployment split (Replit open, on-prem LDAP)
This repo is a fork shared/synced with a colleague's on-prem fork (mehshad/ResearchVault).
Replit (dev workspace **and** published deployment) runs `AUTH_MODE=demo` set via **env vars only**
(`AUTH_MODE`, `DEMO_NAME`, `DEMO_ROLE`) → open, no-login "Demo User" (id 0)/Management. On-prem runs
`AUTH_MODE=ldap` via its own env. **No app code decides which environment is open — it's pure env config.**
**Why:** keeps the two forks code-identical so syncs don't conflict, and a colleague merge once
silently **removed the old dev auto-injection** in `server/index.ts`, so `demo` mode is now the *only*
open mechanism (local mode is a real login wall). `demoBannerMiddleware` injects the guest only when
`AUTH_MODE=demo`; `requireAuth` bypasses in demo.

## ESM gotchas (the merge broke these)
- This is an ESM project (`package.json` `"type":"module"`). **Never use `require()`** in server code —
  it throws `require is not defined` at runtime (and in the esbuild prod bundle). Use `await import()`.
- `server/db.ts` uses top-level `await` (neon-vs-pg branching). `tsconfig.json` must set
  `"target":"ES2022"` (with `module:ESNext`) or `npm run check` (tsc) fails. If tsc reports phantom
  errors after a config change, delete the incremental cache `node_modules/typescript/tsbuildinfo`.
