---
name: CITI certificate date/record-ID parsing pitfalls
description: Why CITI date and record-ID extraction produced garbage like "undefined-undefined-04" and how the parser must guard it
---

# CITI date & record-ID extraction

The CITI certificate/report parsers (`parseCITICertificateFormat`,
`parseCITIReportFormat` in `server/routes.ts`) extract dates and the record ID
with a cascade of regexes.

## A regex with the `g` flag + `.find()` returns a STRING, not a match array
**Rule:** When a fallback uses `text.match(/.../g)?.find(...)`, the result is a
plain string (the whole matched substring), not a `RegExpMatchArray`. Do NOT
index it as `m[1]`/`m[0]` to pull a captured group — string indexing returns
single *characters* (`"04-Dec-2027"[0]` is `"0"`). Branch on the type:
`typeof m === 'string' ? m : (m[1] || m[0])`.
**Why:** This bug silently turned a valid expiration like `"04-Dec-2027"` into
`"4"`, and the old `convertDateFormat` then emitted `"undefined-undefined-04"`,
which crashed the DATE-column insert in `/api/certificates/confirm-batch` with a
raw SQL error ("1 certification could not be saved").
**How to apply:** The same shape appears for completion date, expiration date,
and record ID — fix all three. The non-`g` `.match()` calls (Formats 1–3) DO
return arrays and are fine to index with `[1]`.

## Date conversion must fail closed, and writes must validate ISO dates
**Rule:** `convertDateFormat` returns `string | null` — it returns null for
anything that isn't `DD-Mon-YYYY` or already-ISO `YYYY-MM-DD`, instead of
building a string from `undefined` parts. Before any certification insert,
validate with a strict ISO check (`isValidIsoDate`) and return a clean per-row
error ("Could not read the … date correctly. Please set it manually") rather
than letting Postgres reject a malformed date.
**Why:** A non-empty garbage string passes a `!endDate` truthy check, so only a
real format/validity check stops it before the DB.
