# Receipt Line-Item Breakdown — Design Doc

**Status:** In Progress
**Jira:** [CFA-4](https://pchung1888.atlassian.net/browse/CFA-4)
**Date:** 2026-02-28

## Overview

Enable the app to scan a receipt photo, parse it into individual line items via Gemini AI, and create one `Expense` record per line item — all sharing a `receiptGroupId` so they can be displayed grouped in the trip detail view.

## Goals

- Replace single-expense receipt scan with multi-line-item breakdown
- Preserve existing single-expense manual entry flow
- Group line items from the same receipt for display and settlement

## Non-Goals

- Per-item category auto-detection beyond what Gemini provides
- Editing a receipt group as a whole after save

## Data Model Changes

Two new optional fields on `Expense`:

| Field | Type | Purpose |
|-------|------|---------|
| `receiptGroupId` | `String?` | UUID grouping all line items from the same receipt |
| `lineItemIndex` | `Int?` | Preserves order of line items within a group |

## API Changes

### `POST /api/uploads/receipt/parse`

**New response shape:**
```json
{
  "merchantName": "Trader Joe's",
  "date": "2026-02-28",
  "items": [
    { "description": "Milk", "amount": 3.99, "category": "food" },
    { "description": "Bread", "amount": 2.49, "category": "food" }
  ]
}
```

### `POST /api/trips/[id]/expenses/from-receipt`

New batch endpoint. Creates N `Expense` rows in a single `$transaction`, all sharing a generated `receiptGroupId`.

**Request body:**
```json
{
  "items": [{ "description": "...", "amount": 0.00, "category": "food" }],
  "receiptPath": "...",
  "date": "YYYY-MM-DD",
  "paidByParticipantId": "...",
  "creditCardId": "...",
  "familyMemberId": "...",
  "splits": [{ "participantId": "...", "amount": 0.00 }]
}
```

## UI Changes

- `ExpenseForm`: after receipt scan, show `LineItemEditor` instead of auto-filling single expense
- `LineItemEditor`: shadcn/ui table — Description | Category | Amount | Delete; "Add row" button
- Trip detail: group expenses by `receiptGroupId`; show collapsed `📋 Merchant (N items, $total)` row with expand toggle

## Implementation Stories

| # | Story | Status |
|---|-------|--------|
| 1 | Update Expense Categories | ✅ Done |
| 2 | Update Expense Schema & Prisma | ✅ Done |
| 3 | Enhance Gemini Receipt Parser | ⏳ Pending |
| 4 | Create Line-Item Editor Component | ⏳ Pending |
| 5 | Integrate Editor into Expense Form | ⏳ Pending |
| 6 | Create Batch Expense Creation API | ⏳ Pending |
| 7 | Implement Grouped Expense Display | ⏳ Pending |
| 8 | Update Balance Calculations | ⏳ Pending |
| 9 | Add Tests | ⏳ Pending |

## Open Questions

1. **Balance grouping**: Each line item has identical splits, or distribute proportionally?
2. **Merchant name source**: Displayed as group label in trip detail header.
3. **Edit grouped expenses**: Individual item edit via existing expense edit flow (no bulk edit).
