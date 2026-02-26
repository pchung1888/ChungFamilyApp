# Test Architect Memory — ChungFamilyApp

## Key Files
- Reference test: `src/components/family/__tests__/family-form.test.tsx`
- Vitest config: `vitest.config.ts` — uses `resolve.alias` array, no `vite-tsconfig-paths`
- Select mock: `src/__mocks__/ui/select.tsx` (aliased via vitest.config.ts)
- next/navigation mock: `src/__mocks__/next/navigation.ts` (aliased via vitest.config.ts)
- Test setup: `src/test-setup.ts` (imports `@testing-library/jest-dom`)

## Critical Patterns

### API Route Tests
- Import route handlers directly: `import { GET, POST } from "../balance/route"`
- Mock Prisma: `vi.mock("@/lib/prisma", () => ({ prisma: { model: { method: vi.fn() } } }))`
- Import from `@/generated/prisma/client`, NOT `@/generated/prisma`
- Parse response body with: `res.json() as Promise<ResponseType>`
- Route params are Promises: `{ params: Promise.resolve({ id: "trip-1" }) }`
- Date objects in Prisma mock fixtures become ISO strings after JSON serialization — use `expect.objectContaining()` for comparisons involving Date fields, not `toEqual(fixture)` directly

### beforeEach Mock Queue Pitfall
- `mockResolvedValueOnce` calls QUEUE — they do NOT reset between tests
- If `beforeEach` queues `mockResolvedValueOnce(A)` and the test body queues `mockResolvedValueOnce(B)`, the route gets A first (from beforeEach), not B
- Fix: only set `mockResolvedValueOnce` inside the test body when you need specific return values, OR use `mockResolvedValue` (non-Once) in `beforeEach` for defaults
- Pattern: expose a helper function `mockBothParticipantsValid()` that tests call explicitly when they need the happy-path scenario

### Component Tests
- Mock `next/link` in component tests: `vi.mock("next/link", () => ({ default: ({ href, children }) => <a href={href}>{children}</a> }))`
- Use `getAllByText` when multiple elements may share the same text value (e.g., two stat cards both showing "3")
- For unique value assertions in stat cards, use unique numbers that can't appear in multiple card values simultaneously
- Date-relative tests (countdown chips): use `new Date(Date.now() + n * 24 * 60 * 60 * 1000)` helper

### Known happy-dom Quirks
- `step="0.1"` inputs always report `stepMismatch` — add `novalidate` to the form element in edit-mode tests
- Native `<select>` works fine; Radix Select needs the mock from `src/__mocks__/ui/select.tsx`

## Test Locations Created
- `src/app/api/trips/[id]/__tests__/balance.test.ts` — 15 tests, balance algorithm + min-transactions
- `src/app/api/trips/[id]/__tests__/participants.test.ts` — 15 tests, GET/POST/DELETE participants
- `src/app/api/trips/[id]/__tests__/settlements.test.ts` — 15 tests, POST settlements
- `src/components/dashboard/__tests__/stat-cards.test.tsx` — 16 tests
- `src/components/dashboard/__tests__/upcoming-trips.test.tsx` — 19 tests

## Business Rules Encoded in Tests
- Balance algorithm: payer net += amount; each split participant net -= split.amount
- Settlement: fromId net += amount (reduced debt); toId net -= amount (reduced credit)
- All nets must sum to 0 (zero-sum invariant)
- Greedy min-transactions: chain A→B→C collapses to C→A with 1 transaction
- Participant names must be unique per trip (checked via `tripId_name` unique constraint)
- Settlement: fromId !== toId; amount must be positive number; both participants must belong to the same trip

## Links to Detailed Notes
- See `patterns.md` for extended mock patterns
