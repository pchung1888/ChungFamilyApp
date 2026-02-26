# Research Session: Friends + Bill Splitting (2026-02)

## Trigger
User wants to expand ChungFamilyApp from family-only to family+friends trips,
with bill/cost splitting functionality.

## Current App Gaps
1. No concept of "trip participants" — trips have no explicit member list
2. Expenses have a single "paid by" (familyMemberId) but no split-among list
3. FamilyMember model is too narrow (role: parent/teen only, tied to family concept)
4. No settlement/reimbursement tracking
5. No guest/non-account participants

## Competitor Analysis Summary

### Splitwise (market leader for expense splitting)
- Persistent groups OR one-off expenses
- Participants: registered users OR name+email invites
- Split types: equal, exact amounts, percentages, shares, itemized
- Debt simplification: Bellman-Ford-style min-cost flow to minimize transaction count
- Settlement: explicit "settle up" records (not deletions)
- Expense comments, receipts
- Multi-currency

### Tricount (best for trip-scoped groups)
- No persistent groups — each trip is self-contained
- Participants: name only (no account required)
- Automatic balance calculation
- "Reimbursement suggestions" — tells you exactly who pays whom
- Very simple UX — closest model to what ChungFamilyApp needs
- Offline-first

### Settle Up
- Persistent groups
- Whiteboard-style balance view
- Multi-currency
- Good for repeated friend groups

### Trail Wallet
- Budget-focused, not splitting
- Simple category tracking
- Good for solo travel budgeting patterns

### Lambus
- Full trip planner + expense tracker
- Itinerary with waypoints, POIs
- Expense splitting per trip
- Document storage
- Voting on plans

## Splitting Algorithms Explained

### 1. Equal Split
Every participant pays amount/n. Simplest. Good for shared meals, hotel.
Implementation: trivial — amount / participant_count

### 2. Custom Amounts (Exact Split)
Each person owes a specific dollar amount. Must sum to total.
Implementation: validation that sum(splits) == total

### 3. Percentage Split
Each person owes X% of total. Must sum to 100%.
Implementation: amount * (pct/100) per person

### 4. Shares Split
Each person assigned N shares; owed proportional amount.
Example: 3 adults get 2 shares, 2 kids get 1 share.
Implementation: amount * (person_shares / total_shares)

### 5. Itemized Split (line-item)
Each line item on a bill assigned to specific people.
Example: restaurant bill where each person pays their own items.
Implementation: complex — need sub-items per expense

### 6. Debt Simplification (Settlement Optimization)
Given N people with balances, minimize number of transactions to settle all debts.
Algorithm:
  - Compute net balance for each person (total paid - total owed)
  - Sort into "creditors" (positive balance) and "debtors" (negative balance)
  - Greedy matching: largest debtor pays largest creditor
  - Repeat until all balances zero
  - Result: at most N-1 transactions (vs. N*(N-1)/2 naive pairwise)

Example:
  A paid $90 (A,B,C each owe $30): A is owed $60
  B paid $0: B owes $30
  C paid $0: C owes $30
  Result: B pays A $30, C pays A $30 (2 transactions)

  Without simplification: B pays A $30, C pays A $30 (same in this case)

  More complex example with 4 people shows bigger savings.

## Proposed Schema for Friends + Splitting

```prisma
model TripParticipant {
  id           String        @id @default(cuid())
  tripId       String
  trip         Trip          @relation(fields: [tripId], references: [id], onDelete: Cascade)
  name         String        // display name
  email        String?       // optional, for future invite
  memberId     String?       // links to FamilyMember if they're a family member
  member       FamilyMember? @relation(fields: [memberId], references: [id], onDelete: SetNull)
  color        String?       // UI avatar color
  createdAt    DateTime      @default(now())
  splits       ExpenseSplit[]
  paidExpenses Expense[]     // expenses this participant paid
  settlementsFrom Settlement[] @relation("SettlementFrom")
  settlementsTo   Settlement[] @relation("SettlementTo")

  @@unique([tripId, name]) // prevent duplicate names per trip
}

model ExpenseSplit {
  id            String          @id @default(cuid())
  expenseId     String
  expense       Expense         @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  participantId String
  participant   TripParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  amount        Float           // dollar amount this person owes
  createdAt     DateTime        @default(now())

  @@unique([expenseId, participantId])
}

model Settlement {
  id             String          @id @default(cuid())
  tripId         String
  trip           Trip            @relation(fields: [tripId], references: [id], onDelete: Cascade)
  fromId         String          // who is paying
  from           TripParticipant @relation("SettlementFrom", fields: [fromId], references: [id])
  toId           String          // who is receiving
  to             TripParticipant @relation("SettlementTo", fields: [toId], references: [id])
  amount         Float
  note           String?
  settledAt      DateTime?       // null = pending, set = confirmed paid
  createdAt      DateTime        @default(now())
}
```

Changes to Expense model:
- Add `paidByParticipantId String?` (links to TripParticipant instead of FamilyMember)
- Keep `familyMemberId` for backward compat OR migrate to TripParticipant

## MVF (Minimum Viable Feature) for Friends + Splitting

1. TripParticipant — add/remove people per trip (family OR friends)
2. Expense payer — select from trip participants (not global family list)
3. Equal split as default — auto-split across all participants
4. Balance view — per-trip "who owes whom" summary
5. Settlement recording — mark debts as paid

That's it for v1. Itemized split and debt simplification can come later.

## UX Patterns for Mixed Groups

### Tricount approach (recommended for ChungFamilyApp):
- Trip creation flow includes "Add participants" step
- Each participant = name (required) + email (optional)
- Family members pre-populate from existing FamilyMember list
- Friends added ad-hoc (name only, no account needed)
- Participant shown as colored avatar/initial chip

### Splitwise approach (more complex):
- Groups are persistent, invite by email
- Overkill for a private family app

### Recommended for ChungFamilyApp:
- Tricount-style per-trip participants
- Pre-populate with family members
- Allow ad-hoc name-only friends
- No email invites needed (private app)

## Implementation Complexity Notes

### Low complexity:
- TripParticipant CRUD (new entity, use /new-entity skill)
- Equal split auto-calculation (pure math, no new UI)
- Balance summary (computed from ExpenseSplit, no new table)

### Medium complexity:
- ExpenseSplit table + split UI on expense form
- Settlement recording UI
- Migrating existing expense "paidBy" to use TripParticipant

### High complexity:
- Itemized/line-item splitting (new UI paradigm)
- Debt simplification algorithm (algorithmic, but pure TS)
- Multi-currency with live rates
- Email invites / notifications

## Free External APIs
- frankfurter.app — currency exchange (no API key, CORS-friendly)
  `https://api.frankfurter.app/latest?from=USD&to=EUR,JPY`
- No auth required, reliable, ECB data
