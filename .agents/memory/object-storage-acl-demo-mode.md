---
name: Object-storage ACL gating must match demo mode
description: GCS ACL writers and checkers must agree on whether demo mode skips ACLs, or demo+GCS uploads get denied.
---

Object-storage authorization has two halves that must stay in lockstep:
- The **writer** (`/api/uploads/finalize`) only sets a GCS owner ACL in real-auth
  modes; in demo mode it sets no ACL.
- Every **consumer** that later reads an object (e.g. `/api/certificates/process-batch`,
  the `/objects/*` GET handler) must therefore also skip the ACL ownership check
  in demo mode.

**Why:** If a consumer gates only on `!isLocalStorage` (i.e. "is this GCS?") it will
enforce an ownership check on demo uploads that have no owner ACL → deny-by-default
→ the feature silently fails. This caused OCR to fail on the published app (demo +
GCS): process-batch returned a fast (~245ms) "Access denied" before ever calling
OCR. Local storage masks this because there is no GCS ACL at all.

**How to apply:** Any GCS read-authorization check must be gated on
`!isLocalStorage && getAuthMode() !== "demo"`, mirroring finalize. When adding a new
object consumer, verify the demo+GCS path end-to-end (upload → finalize →
consume), not just local storage.
