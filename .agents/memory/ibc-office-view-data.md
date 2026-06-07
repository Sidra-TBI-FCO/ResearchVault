---
name: IBC office read-only view — field parity & data shape
description: Durable rules for building/maintaining a read-only office view of IBC application data.
---

**Rule:** A read-only "show 100% of applicant data" office view must be built from a
field-parity pass against the applicant edit form, NOT from the obvious nested toggle
sections alone. The IBC schema carries legacy/compat boolean columns (a "Legacy Biosafety
Checkboxes for compatibility" block in the edit form) that are easy to miss because they sit
outside the main biosafety-scope groups. Missing them fails review.

**Why:** code review rejects office views that omit any applicant-editable field; the legacy
compat checkboxes are persisted and user-editable but visually disconnected from the modern
toggle sections.

**How to apply:** enumerate every editable field in the edit form and confirm each has a
read-only renderer OR a justified omission. Justified omissions: backward-compat JSON blobs
that the modern UI no longer writes per-field, and data surfaced via dedicated endpoints
(team members via the personnel endpoint, rooms/PPE via the facilities component).

**Data shape notes:**
- Office view reads the raw application object from the DB, so use schema/DB column names,
  not edit-form alias names (some differ).
- Stored checkbox/array values are already human-readable label strings — render directly.
- Nested JSON booleans (NIH sections, synthetic-experiment sub-objects) use camelCase keys —
  humanize or map them.
- Section visibility for a boolean trigger must test `=== true` (or non-empty detail), never
  `!= null`; an explicit stored `false` ("No") must NOT reveal the section.
- The applicant *Tab components accept `isReadOnly` and fetch their own data — reuse them.
