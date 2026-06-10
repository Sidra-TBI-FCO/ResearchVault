---
name: Journal name → impact-factor matching
description: Why IF lookups must normalize journal names, not exact-match them
---

Publication `journal` strings (often PubMed-abbreviated, e.g. "The Lancet. Oncology")
do NOT exact-match the impact-factor dataset's `journals.journal_name`
(e.g. "LANCET ONCOLOGY"). A case-insensitive exact match (`ilike(col, name)` with no
wildcards) silently returns no IF.

**Rule:** match journals tolerantly — normalize both sides (lowercase, strip a leading
"the ", collapse all punctuation/whitespace to single spaces), and also fall back to the
`abbreviated_journal` column. Keep the JS `normalizeJournalName()` and its SQL mirror in
lockstep, and apply the SAME normalization everywhere IF is looked up (storage
`findJournalByName`, sidra-scores `ifByJournalYear`/`lookupIf`) or results diverge between
the publication detail page and the score ranking.

**Why:** sources spell journals differently; exact match is too brittle and fails closed
with no error, so the UI just shows no IF.

**Edge notes:** the IF dataset's latest year lagged the publication year (e.g. 2025 paper,
dataset max 2024) — the client already falls back to a hardcoded 2024 fetch, so a missing
current-year row is expected, not a matching bug. Normalized fallback can collide (two
journals → same key); current code takes the first row, which is acceptable for this use.
