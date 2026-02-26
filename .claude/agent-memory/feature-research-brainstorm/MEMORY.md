# Feature Research Brainstorm - Agent Memory

## Project Context (as of 2026-02)
- App: ChungFamilyApp — family travel & expense tracker
- Stack: Next.js 16, React 19, TypeScript, PostgreSQL/Prisma, Tailwind v4, shadcn/ui
- Current entities: FamilyMember, Trip, Expense, CreditCard, CardBenefit, User/Auth
- Expense has: category, description, amount, date, paidBy (familyMemberId), creditCardId, pointsEarned, receiptPath
- Trip has: name, destination, startDate, endDate, budget, type (road_trip/flight/local), notes
- FamilyMember has: name, role (parent/teen), email, userId (linked to auth User)
- NO participant/split model yet — expenses are not split across people

## Research Session 1 (2026-02) — Friends + Bill Splitting
See: `research-sessions/2026-02-friends-splitting.md`

Key findings:
- Expanding from "family only" to "family + friends" requires a Participant model (not overloading FamilyMember)
- Core splitting algorithms: equal split, custom amounts, percentage split, itemized/line-item split
- Debt simplification (minimize transactions) is the killer feature in Splitwise — reduces n*(n-1)/2 payments to n-1
- Settlement = marking who paid whom, not deleting the expense
- "Guest participants" (no app account) is standard UX — just a name, optional email

## Competitor App Patterns (trained knowledge, verified)

### Splitwise
- Groups with unlimited members; participants can be non-users (email invite or name-only)
- Equal split is default; custom amounts, percentages, shares also available
- "Simplify debts" feature: graph-based algorithm minimizes total number of transactions
- Settlement: mark payment as "settle up" — creates a $0 balance transfer record
- Expense comments and receipts per expense
- IOweYou summary on dashboard

### Tricount
- Trip-scoped (not persistent groups) — perfect model for ChungFamilyApp
- Participants added per trip, not globally
- Balance sheet view: who owes whom, minimized
- No account required for participants — name only
- Offline-first, simple UX

### Settle Up / Spendee
- Multi-currency support with exchange rates
- Recurring expenses
- CSV export

### Lambus
- Combined itinerary + expense tracker
- "Roadbook" — shared itinerary with waypoints
- Participant voting on activities
- Document storage (boarding passes, hotel confirmations)

### TripIt / TripCase
- Email-based itinerary import (flight confirmations, hotel bookings)
- Calendar sync
- Real-time flight alerts

## Common User Pain Points (from knowledge of app store reviews)
- Forgetting who paid what after the trip — need persistent record
- Complex settlement math errors — automation is essential
- Non-app-users being excluded — guest/name-only participants critical
- Currency conversion on international trips
- Splitting only some items on a restaurant bill (itemized split)

## Free APIs / Libraries for Implementation
- frankfurter.app — free currency exchange rates API (no key required)
- open.er-api.com — free tier currency rates
- No good free mapping API for itinerary waypoints (Google Maps has $300/month free credit)
- react-pdf or @react-pdf/renderer — PDF export of trip summaries
- Papa Parse — CSV export (pure client-side)

## Terminology Used in This Space
- "Participant" — person on a trip (may or may not have app account)
- "Payer" — who paid the expense
- "Beneficiary / Split among" — who the expense is split among
- "Settle up" — recording a reimbursement payment
- "Debt simplification" — algorithm to reduce number of payments needed
- "Balance" — net amount owed between two people
- "Settlement" — the act of paying off a balance
- "Guest" — participant without an app account

## Schema Design Patterns for Splitting
See: `research-sessions/2026-02-friends-splitting.md` for full schema proposal

Key tables needed:
- TripParticipant (tripId, name, email?, memberId?) — links people to trips
- ExpenseSplit (expenseId, participantId, amount, isPaid?) — how each expense is divided
- Settlement (tripId, fromParticipantId, toParticipantId, amount, paidAt?) — reimbursements
