---
name: Scientist has no `.name` field
description: How to build a scientist/PI display name; why `scientist.name` silently breaks
---

The `scientists` table / Drizzle `Scientist` type has NO `name` column. It has
`honorificTitle`, `firstName`, `lastName` (all the row fields). `storage.getScientist`
returns the raw row unchanged — there is no computed `name`.

So `scientist.name` / `pi.name` is **always `undefined`** everywhere it appears
(many spots in `server/routes.ts` still do this).

**Why it matters:** when that undefined is inserted into a NOT NULL column it
crashes. Concrete case: the IBC PI-comment route (`/api/ibc-applications/:id/pi-comment`)
set `authorName: pi.name` → undefined → Drizzle emits `default` → NULL → violates
`ibc_application_comments.author_name` NOT NULL → route returned 500
"Failed to submit comment". Most other `.name` usages write into JSON/nullable
fields so they fail silently instead of crashing.

**How to apply:** build the display name explicitly with a guaranteed fallback:
`[pi.honorificTitle, pi.firstName, pi.lastName].filter(Boolean).join(' ').trim() || 'Principal Investigator'`.

**Debugging note:** the log-capture tool only shows the express request logger,
not `console.error`/stderr. To see a real route error, temporarily echo
`String(err.stack)` into the JSON response, and remember tsx needs a FULL workflow
restart (not HMR) to pick up `server/routes.ts` changes.
