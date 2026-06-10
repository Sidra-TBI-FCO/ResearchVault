---
name: CITI certificate/report PDF text extraction
description: How the certificate upload flow reads CITI certificates and completion reports — text layer first, OCR only as fallback
---

# CITI certificate / report extraction

CITI uploads come in two shapes: a short **certificate** and a multi-page
**completion report** (Requirements + Transcript). The flow lives in the
`/api/certificates/process-batch` route in `server/routes.ts`.

## Read the embedded PDF text layer FIRST, OCR only as fallback
**Rule:** For PDFs, extract the embedded text layer directly (`extractPdfText`,
backed by `pdf-parse`) before doing any OCR. Use OCR only when the PDF has
little/no embedded text (threshold: <100 non-space chars → treat as scanned
image and fall back to OCR).
**Why:** CITI PDFs are normally generated as text PDFs, so the text layer is
clean and exact — OCR garbles module names, record IDs, and dates. The reported
"report not detected" bug was actually wrong field extraction from OCR noise,
not a hard failure. Text extraction fixes accuracy; OCR stays for scanned/image
PDFs.
**How to apply:** `pdf-parse` is v2 with a new API — use
`new PDFParse({ data: Uint8Array }).getText()` (NOT the old
`require('pdf-parse')(buffer)` default-call, and the `./lib/pdf-parse.js`
subpath is blocked by its exports map). When text extraction succeeds, set
`provider = 'pdf-text'` so the OCR branches are skipped and history is labeled.

## OCR fallback still chunks multi-page PDFs
OCR.space free tier caps PDFs at 3 pages, so `splitPdfIntoChunks` (pdf-lib)
splits into ≤3-page chunks, OCRs each, and concatenates — and reads ALL
`ParsedResults` pages, not just `[0]`. This only matters for scanned/image
reports that fall through to OCR.

## Document-type detection must check report markers FIRST
In `detectCITIDocumentType`, test report signatures (`completion report`,
`coursework requirements/transcript`, `part 1/2 of 2`) before certificate
signatures, case-insensitive. Reports also contain the generic "Collaborative
Institutional Training Initiative" line, so a certificate-first check misroutes
reports to the certificate parser. Reports are parsed by `parseCITIReportFormat`
keyed off labeled fields (`Name: X (ID: …)`, `Curriculum Group:` skipping the
"Same as Curriculum Group" placeholder, labeled `Completion`/`Expiration Date`,
`Record ID:`), with positional heuristics as fallback.
