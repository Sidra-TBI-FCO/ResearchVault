---
name: Publication status is mixed-case in the DB
description: "published" vs "Published" both exist; any "counts as published" filter must be case-insensitive
---

The `publications.status` column holds the same logical states in inconsistent
casing — both `published` (lowercase, the majority) and `Published`, plus
`Published *`, `In Press`, and `Accepted/In Press`. Seed/import paths write
lowercase; some UI/manual paths write capitalized.

**Rule:** Any query or filter that means "this publication counts as published /
in press" must compare case-insensitively (`LOWER(status) IN (...)` in SQL, or
`status.toLowerCase()` in JS). Treat both the `*`-suffixed and `accepted/`-prefixed
variants as equivalent to their base forms (`published *` == `published`,
`accepted/in press` == `in press`).

**Why:** A case-sensitive `status = 'Published'` filter silently dropped ~44
records (every lowercase `published`), so a freshly-added publication with a
correct internal-author link showed up as 0 on the scientist detail page and in
Sidra Score rankings. `getAuthorshipStatsByYear` already used `LOWER(...)`, which
masked the bug because the charts looked right while the list/count did not.

**How to apply:** When adding any new aggregation, ranking, or list that selects
"published" publications, mirror the case-insensitive set
`('published','published *','in press','accepted/in press')`. Do not assume a
canonical casing for `status`.
