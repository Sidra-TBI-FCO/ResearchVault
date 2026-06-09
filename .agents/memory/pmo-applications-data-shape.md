---
name: PMO applications data shape & broken :id endpoint
description: How /api/pmo-applications is shaped, why PMO records must be addressed by id+type, and which single-record endpoint is unimplemented.
---

# PMO applications (RA-200 / RA-205A) data shape

`GET /api/pmo-applications` is served by `getAllPmoApplications`, which merges
`ra200_applications` and `ra205a_applications` into one list. Every field is
camelCase (`applicationId`, `leadScientistId`, `projectId`, `durationMonths`)
**except** an added discriminator `form_type` (snake) = `'RA-200' | 'RA-205A'`.

**IDs collide across the two tables** — both ra200 and ra205a have ids 1, 2, …
**Never key a React list or build a route by id alone.** Always combine with
`form_type` (e.g. React key `` `${form_type}-${id}` ``, navigation
`/pmo/applications/:id?type=RA-200`).

PMO records carry no PI name — only `leadScientistId` / `budgetHolderId`.
Resolve names via `/api/scientists`:
`[honorificTitle, firstName, lastName].filter(Boolean).join(' ')`.

**Why:** the list page once rendered hardcoded `TBD` placeholders and used wrong
snake_case field names, so real lead/project/duration never displayed.

## Broken single-record endpoint
`GET/PUT/DELETE /api/pmo-applications/:id` call
`storage.getPmoApplication/updatePmoApplication/deletePmoApplication`, which are
declared in `IStorage` but **not implemented in `DatabaseStorage`** — the GET
returns 500 "Failed to fetch application" at runtime. Read flows must use the
list endpoint + `?type=` filter instead of `:id`. The edit flow
(`pmo/applications/edit.tsx` PUT by id) is still on the broken endpoint — a
pre-existing bug, separate from data display.
