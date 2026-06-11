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
preprint, backfill `prepublicationUrl`/`prepublicationSite` whenever the
*effective* survivor value (survivor + overrides) is empty. Do NOT gate on
key-presence in overrides: the merge dialog ALWAYS sends both keys (empty when
neither record had them), so key-presence makes every merge look like a
deliberate clear and the backfill never fires through the real UI. Source order:
the merged record's own explicit `prepublicationUrl`/`prepublicationSite`, else
derive from a recognizable preprint via `preprintLink` / `preprintServerName`.

**Site value must match the form radio:** `prepublicationSite` is a radio group
with the exact options `arXiv` / `bioRxiv` / `medRxiv` / `Research Square` /
`Other` (see `client/src/pages/publications/{edit,detail}.tsx`). Any other string
(e.g. the old `"bioRxiv / medRxiv"`) renders as *blank* even when stored, so it
looks lost. `preprintServerName` must return one of those canonical values.
bioRxiv and medRxiv share the `10.1101` DOI prefix and can't be told apart from
the DOI alone — prefer the record's own site/journal text, fall back to `Other`.

Preprint detection + link/server-name building live in
`shared/publicationDeduplication.ts`.
