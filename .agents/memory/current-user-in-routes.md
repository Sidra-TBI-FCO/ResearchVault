---
name: Current user in API routes
description: Where the authenticated user identity actually lives on the request, and the broken OIDC-style path to avoid.
---

# Resolving the current user in Express routes

The authenticated user lives on `req.session.user` in every auth mode
(demo/local/ldap/oidc). Its shape is `{ id, username, name, email, role,
scientistId, needsRegistration }`. Demo mode injects `id: 0`, `scientistId: null`.

**Do NOT read `req.user?.claims?.sub`.** That OIDC-style path is never populated
in this app, so it silently evaluates to `undefined`.

**Why:** several routes copied the `req.user.claims.sub` pattern. When the value
feeds a `NOT NULL` column (e.g. `certifications.uploaded_by`), the insert throws,
the per-item catch swallows it into a `results[].error`, and the endpoint still
returns HTTP 200 — so the save silently fails and nothing appears in the UI.

**How to apply:** derive the id from the session, matching existing routes:
`req.session?.user?.scientistId ?? req.session?.user?.id ?? 1`. For columns that
mean "which scientist", prefer `scientistId`; fall back to `id` then a sentinel.
There is no FK on `certifications.uploaded_by`, only NOT NULL, so a sentinel
integer is accepted.
