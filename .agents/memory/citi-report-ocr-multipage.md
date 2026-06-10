---
name: CITI report OCR multi-page handling
description: Why CITI completion reports need PDF chunking and report-first document-type detection in the certificate OCR flow
---

# CITI completion report OCR

CITI uploads come in two shapes: a 1-page **certificate** and a multi-page
**completion report** (Requirements + Transcript, usually 4+ pages). The OCR
flow lives in the `/api/certificates/process-batch` route.

## OCR.space free tier caps PDFs at 3 pages
**Rule:** Split any PDF into ≤3-page chunks before sending to OCR.space, OCR
each chunk, and concatenate the text in order.
**Why:** The free tier (and the `helloworld` key) returns an E301
"maximum page limit is 3" error for 4+ page PDFs, which previously made every
report fail outright while 1-page certificates worked. Splitting bypasses the
limit. pdf-lib does the splitting.
**How to apply:** Only PDFs need splitting; images and short PDFs pass through
as a single buffer. Also read **all** `ParsedResults` pages from each OCR
response (not just `[0]`) or multi-page chunks lose text.

## Document-type detection must check report markers FIRST
**Rule:** In `detectCITIDocumentType`, test report signatures
(`completion report`, `coursework requirements/transcript`, `part 1/2 of 2`)
before certificate signatures, and use case-insensitive matching.
**Why:** Completion reports also contain the generic line "Collaborative
Institutional Training Initiative" (in their footer, title case), so a
certificate-first check misroutes reports to the certificate parser and breaks
field extraction.
**How to apply:** Reports are parsed by `parseCITIReportFormat`, which keys off
labeled fields: `Name: X (ID: …)`, `Curriculum Group:` (skip the "Same as
Curriculum Group" placeholder), labeled `Completion Date:`/`Expiration Date:`,
and `Record ID:`. Keep labeled patterns primary with the old positional
heuristics as fallback.
