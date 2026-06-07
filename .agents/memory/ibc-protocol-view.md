---
name: IBC protocol read-only view
description: Shared component that renders the full read-only IBC protocol for both office and reviewer pages.
---

`client/src/components/IbcProtocolView.tsx` is the single source of truth for the
comprehensive read-only rendering of an IBC application: all `Section` blocks
(Protocol Information, Description & Summary, Research Activities, Biosafety
Scope, Personnel & Training, Nucleic Acids/NIH, Human/NHP, Methods & Safety,
Hazardous Agents, Facilities, Inactivation, Disposal, Transport, Dual Use,
Documents placeholder) plus the "On this page" jump navigation. It owns the
data-block helpers (`buildDataBlock`, `Field`, `YesNoRow`, `ChipList`), the
`LABELS` map, and fetches its own supporting data (scientist, research
activities, personnel, certification modules + matrix).

**Why:** The reviewer page used to show only a thin summary, so reviewers
couldn't see what the office sees. Both pages now render the identical full
protocol from this one component instead of duplicating ~800 lines.

**How to apply:**
- Both `client/src/pages/ibc-office/protocol-detail.tsx` and
  `client/src/pages/ibc-reviewer/review.tsx` render `<IbcProtocolView
  applicationId={id} sidebar={...} />`.
- The component renders a 3-col grid: left = sections, right = sticky jump nav
  followed by the `sidebar` slot. Each page keeps its OWN page header (title +
  status/biosafety badges) above the component and passes its role-specific
  controls through `sidebar` — office passes Officer Actions + Communication
  History; reviewer passes the Submit Review form + TimelineComments.
- Office-only controls (status transitions, reviewer-assignment dialog) must
  stay in the office page's sidebar, never inside `IbcProtocolView`, so reviewer
  mode never shows them.
- New protocol sections go in `IbcProtocolView` so both audiences get them.
