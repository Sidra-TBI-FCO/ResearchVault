---
name: CrossRef preprint (posted-content) field quirks
description: Why imported preprints look "missing" journal/volume/issue/pages/PMID, and how journal is recovered.
---
# CrossRef preprint handling

For CrossRef `type: "posted-content"` (preprints, e.g. medRxiv/bioRxiv DOIs like
10.1101/...):

- `container-title` is EMPTY. The venue/server name lives in `institution[0].name`
  (e.g. "medRxiv"); `publisher` is the umbrella org (e.g. "openRxiv"). Recover the
  journal as `container-title[0] || institution[0].name || (posted-content ? publisher : "")`.
- `volume`, `issue`, `page` genuinely DO NOT EXIST for preprints — there is nothing
  to fetch and nothing to fabricate. Don't treat their absence as a bug.
- Most preprints have NO PMID (not indexed in PubMed), so PubMed enrichment returns
  nothing. Again, not a bug.
- The "vN" VERSION SUFFIX (e.g. `...25339324v1`) that bioRxiv/medRxiv put on the
  preprint URL is NOT part of the registered DOI — CrossRef 404s if you query with
  it. Strip a trailing `/v\d+$/` (scoped to the `10.1101/` namespace so you don't
  mangle normal DOIs), and only retry on a genuine 404 (not transient 429/5xx, or a
  temporary error could resolve a different DOI form).

**Why:** A user reported an imported medRxiv preprint as "missing journal/volume/
issue/pages and no PMID", and a separate report where the journal didn't import at
all — that one was the `v1` suffix 404ing the lookup entirely.

**How to apply:** Shared helpers in `server/routes.ts` — `fetchCrossrefWork` (404
retry w/ `stripDoiVersionSuffix`) and `crossrefJournalName` (venue fallback).
`fetchCrossrefPublication` and the `/api/publications/import/doi/:doi` endpoint both
go through them. When adding venue/metadata logic, branch on
`work.type === "posted-content"`.
