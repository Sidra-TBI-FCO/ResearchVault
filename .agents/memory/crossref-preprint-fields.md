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

**Why:** A user reported an imported medRxiv preprint as "missing journal/volume/
issue/pages and no PMID." Only the journal name was actually recoverable.

**How to apply:** Lives in `fetchCrossrefPublication` in `server/routes.ts`. When
adding venue/metadata logic, branch on `work.type === "posted-content"`.
