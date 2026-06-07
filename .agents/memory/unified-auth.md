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

OIDC provider (`server/authProviders/oidc.ts`) uses openid-client v6 with PKCE **and** state+nonce,
plus `buildEndSessionUrl` for provider logout. Callback URL is rebuilt from the configured
`OIDC_REDIRECT_URI` (not req.protocol/host) to stay correct behind the reverse proxy.
Entra is just a configured issuer: `https://login.microsoftonline.com/<tenant>/v2.0`.
