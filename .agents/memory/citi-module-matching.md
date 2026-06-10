---
name: CITI OCR module matching
description: Why CITI certificate→module matching is deliberately conservative and how new courses are bootstrapped.
---

CITI certificate OCR maps a parsed course title to an existing certification module, or flags it as a NEW module.

The match is intentionally conservative — prefer flagging NEW over picking a wrong existing module:
exact normalized name → abbreviation match → strong token overlap (Jaccard ≥ 0.6 AND ≥ 2 shared
significant tokens, after dropping generic stopwords like training/series/complete/course).

**Why:** the old loose substring/keyword matcher mis-assigned unrelated courses — e.g.
"Biosafety Complete Training Series" was matched to the existing "Animal Biosafety (ABS)" module.
A wrong auto-match silently corrupts compliance records, which is worse than asking the user to confirm.

**How to apply:** when tuning thresholds, bias toward false-negatives (flag NEW) not false-positives.
New-course bootstrap path: the confirm-save endpoint accepts a per-row new-module request and
creates-or-reuses a module by normalized name (so re-imports don't duplicate). Suggested
abbreviation and expiration (snapped to 12/24/36/48/60 months from the cert's completion→expiry span)
are extrapolated for the user to confirm/edit in the review UI. In production no modules are
preconfigured, so this is the normal first-use population flow.
