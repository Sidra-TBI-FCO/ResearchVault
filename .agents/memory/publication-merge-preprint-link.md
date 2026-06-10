---
name: Merging a preprint into its published version
description: Why the publication merge must preserve preprint linkage server-side
---

When two publication records (a preprint + its published version) are merged,
the published DOI wins as the survivor's `doi`. The preprint's own identity (its
`10.1101/...` DOI and originating server) must be preserved on the survivor via
`prepublicationUrl` / `prepublicationSite`, or it is lost when the merged record
is deleted.

**Why:** the merge dialog only lets the officer pick, per field, which record's
value to keep — it offers no *cross-field* mapping (e.g. "put the preprint's DOI
into the survivor's prepublicationUrl"). So this linkage can only be handled
server-side in `mergePublications`, not via the UI overrides.

**How to apply:** in `mergePublications`, when the survivor is not itself a
preprint, backfill `prepublicationUrl`/`prepublicationSite` from any merged
preprint target. Gate each on *key-presence* in the overrides object (not
truthiness) so a deliberate officer clear (empty/null) is respected. Preprint
detection + link/server-name building live in `shared/publicationDeduplication.ts`.
