/**
 * Tests for GET /api/trips/[id]/balance
 *
 * Covers the balance computation + greedy min-transactions algorithm
 * embedded in the route handler. Prisma is fully mocked.
 *
 * Balance rule (from the route):
 *   - Payer's net  += expense.amount
 *   - Each split participant's net -= split.amount
 *   - Settlement: fromId net += amount  (debtor paid back)
 *                 toId   net -= amount  (creditor received)
 */

import { NextResponse } from "next/server";
import { GET } from "../balance/route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    tripParticipant: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    settlement: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

// Cast helpers so TypeScript knows these are vi.fn()
const mockTripFindUnique = vi.mocked(prisma.trip.findUnique);
const mockParticipantFindMany = vi.mocked(prisma.tripParticipant.findMany);
const mockExpenseFindMany = vi.mocked(prisma.expense.findMany);
const mockSettlementFindMany = vi.mocked(prisma.settlement.findMany);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/api/trips/trip-1/balance");
}

function makeParams(id = "trip-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Parse the JSON body out of a NextResponse. */
async function json(res: NextResponse): Promise<{
  data: {
    balances: Array<{ participantId: string; name: string; net: number }>;
    transactions: Array<{ from: { id: string; name: string }; to: { id: string; name: string }; amount: number }>;
  } | null;
  error: string | null;
}> {
  return res.json() as Promise<{
    data: {
      balances: Array<{ participantId: string; name: string; net: number }>;
      transactions: Array<{ from: { id: string; name: string }; to: { id: string; name: string }; amount: number }>;
    } | null;
    error: string | null;
  }>;
}

/** Participant factory */
function makeParticipant(id: string, name: string) {
  return { id, name };
}

/** Expense factory: payer paid totalAmount; splits define per-person amounts */
function makeExpense(
  id: string,
  paidByParticipantId: string,
  amount: number,
  splits: Array<{ participantId: string; amount: number }>
) {
  return { id, amount, paidByParticipantId, splits };
}

// ─── Setup: trip always exists; settlements default to [] ────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockTripFindUnique.mockResolvedValue({ id: "trip-1" } as never);
  mockSettlementFindMany.mockResolvedValue([] as never);
  mockExpenseFindMany.mockResolvedValue([] as never);
});

// ─── Error-path tests ────────────────────────────────────────────────────────

describe("GET /api/trips/[id]/balance — error paths", () => {
  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns empty balances and transactions when there are no participants", async () => {
    mockParticipantFindMany.mockResolvedValue([] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ balances: [], transactions: [] });
  });

  it("returns 500 when Prisma throws", async () => {
    mockTripFindUnique.mockRejectedValue(new Error("DB down") as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to compute balance");
  });
});

// ─── Balance computation tests ───────────────────────────────────────────────

describe("GET /api/trips/[id]/balance — balance computation", () => {
  it("returns zero net for all participants when there are no expenses", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");

    mockParticipantFindMany.mockResolvedValue([alice, bob] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(body.data!.balances).toEqual([
      { participantId: "p-alice", name: "Alice", net: 0 },
      { participantId: "p-bob", name: "Bob", net: 0 },
    ]);
    expect(body.data!.transactions).toEqual([]);
  });

  it("computes 2-person equal split: A pays $100, each owes $50", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");

    mockParticipantFindMany.mockResolvedValue([alice, bob] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 100, [
        { participantId: "p-alice", amount: 50 },
        { participantId: "p-bob", amount: 50 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    // Alice paid $100, owes $50 → net = +50
    // Bob owes $50 → net = -50
    expect(body.data!.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: "p-alice", net: 50 }),
        expect.objectContaining({ participantId: "p-bob", net: -50 }),
      ])
    );
  });

  it("computes 3-person equal split: A pays $90, each owes $30", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 90, [
        { participantId: "p-alice", amount: 30 },
        { participantId: "p-bob", amount: 30 },
        { participantId: "p-carol", amount: 30 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(body.data!.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: "p-alice", net: 60 }),   // 90 - 30
        expect.objectContaining({ participantId: "p-bob", net: -30 }),
        expect.objectContaining({ participantId: "p-carol", net: -30 }),
      ])
    );
  });

  it("accumulates multiple expenses across different payers", async () => {
    // A pays $60, B pays $30 for a meal each split equally (3 people)
    // A: +60 -20 -10 = +30  (paid hotel $60 split 3 ways, paid meal $30 split 3 ways)
    // B: -20 +30 -10 = 0
    // C: -20 -10 = -30
    // Simpler: A pays $60 split equally 3 ways ($20 each), B pays $30 split equally 3 ways ($10 each)
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 60, [
        { participantId: "p-alice", amount: 20 },
        { participantId: "p-bob", amount: 20 },
        { participantId: "p-carol", amount: 20 },
      ]),
      makeExpense("e-2", "p-bob", 30, [
        { participantId: "p-alice", amount: 10 },
        { participantId: "p-bob", amount: 10 },
        { participantId: "p-carol", amount: 10 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    // Alice: paid 60, owe split 20 (e1) + 10 (e2) = 30 → net = 60 - 20 - 10 = +30
    // Bob:   paid 30, owe split 20 (e1) + 10 (e2) = 30 → net = 30 - 20 - 10 = 0
    // Carol: owe split 20 (e1) + 10 (e2) = 30 → net = -20 - 10 = -30
    expect(body.data!.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: "p-alice", net: 30 }),
        expect.objectContaining({ participantId: "p-bob", net: 0 }),
        expect.objectContaining({ participantId: "p-carol", net: -30 }),
      ])
    );
  });

  it("all nets sum to zero (zero-sum invariant)", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 120, [
        { participantId: "p-alice", amount: 40 },
        { participantId: "p-bob", amount: 40 },
        { participantId: "p-carol", amount: 40 },
      ]),
      makeExpense("e-2", "p-bob", 75, [
        { participantId: "p-alice", amount: 25 },
        { participantId: "p-bob", amount: 25 },
        { participantId: "p-carol", amount: 25 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    const totalNet = body.data!.balances.reduce((sum, b) => sum + b.net, 0);
    expect(Math.abs(totalNet)).toBeLessThan(0.01); // floating-point tolerance
  });

  it("handles a single participant with a self-split correctly", async () => {
    const alice = makeParticipant("p-alice", "Alice");

    mockParticipantFindMany.mockResolvedValue([alice] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 50, [
        { participantId: "p-alice", amount: 50 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    // Alice paid and owes the full amount to herself → net = 0
    expect(body.data!.balances).toEqual([
      expect.objectContaining({ participantId: "p-alice", net: 0 }),
    ]);
    expect(body.data!.transactions).toEqual([]);
  });

  it("applies settlements: reduces the payer's debt and creditor's credit", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");

    mockParticipantFindMany.mockResolvedValue([alice, bob] as never);
    // Alice paid $100, split equally → Alice net +50, Bob net -50
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 100, [
        { participantId: "p-alice", amount: 50 },
        { participantId: "p-bob", amount: 50 },
      ]),
    ] as never);
    // Bob settles $50 to Alice
    mockSettlementFindMany.mockResolvedValue([
      { fromId: "p-bob", toId: "p-alice", amount: 50 },
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(body.data!.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: "p-alice", net: 0 }),
        expect.objectContaining({ participantId: "p-bob", net: 0 }),
      ])
    );
    expect(body.data!.transactions).toEqual([]);
  });
});

// ─── Min-transactions (greedy) algorithm tests ───────────────────────────────

describe("GET /api/trips/[id]/balance — min-transactions algorithm", () => {
  it("produces one transaction for a 2-person split", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");

    mockParticipantFindMany.mockResolvedValue([alice, bob] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 100, [
        { participantId: "p-alice", amount: 50 },
        { participantId: "p-bob", amount: 50 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(body.data!.transactions).toHaveLength(1);
    expect(body.data!.transactions[0]).toEqual({
      from: { id: "p-bob", name: "Bob" },
      to: { id: "p-alice", name: "Alice" },
      amount: 50,
    });
  });

  it("minimises transactions for 3-person case where one person is owed by two", async () => {
    // Alice pays $90 for everyone: A net +60, B net -30, C net -30
    // Minimal settlement: B → A $30 and C → A $30 (2 transactions, not 3)
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 90, [
        { participantId: "p-alice", amount: 30 },
        { participantId: "p-bob", amount: 30 },
        { participantId: "p-carol", amount: 30 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    // Should be exactly 2 transactions (not more)
    expect(body.data!.transactions).toHaveLength(2);

    // Both transactions should go to Alice
    for (const t of body.data!.transactions) {
      expect(t.to.id).toBe("p-alice");
    }

    // Total settled should equal Alice's credit ($60)
    const total = body.data!.transactions.reduce((s, t) => s + t.amount, 0);
    expect(total).toBeCloseTo(60, 2);
  });

  it("produces zero transactions when all participants are already balanced", async () => {
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");

    mockParticipantFindMany.mockResolvedValue([alice, bob] as never);
    // Each person pays for themselves only → nets both at 0
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 50, [{ participantId: "p-alice", amount: 50 }]),
      makeExpense("e-2", "p-bob", 50, [{ participantId: "p-bob", amount: 50 }]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    expect(body.data!.transactions).toEqual([]);
  });

  it("handles chain debt: A owes B, B owes C — resolves to A → C directly", async () => {
    // A paid $0, B paid $100 split A/B equally, C paid $100 split B/C equally
    // B: paid 100, owe 50 (B's share of B's expense) + 50 (B's share of C's expense) = 0  → net 100-50-50=0
    // Wait — simpler chain:
    // A paid $100 split only B ($100 → B owes A $100)
    // B paid $100 split only C ($100 → C owes B $100)
    // Net: A +100, B -100+100=0, C -100
    // Min transaction: C → A $100 (1 transaction)
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    mockExpenseFindMany.mockResolvedValue([
      // A pays $100, split is B owes $100 (A owes $0 themselves)
      makeExpense("e-1", "p-alice", 100, [
        { participantId: "p-bob", amount: 100 },
      ]),
      // B pays $100, split is C owes $100
      makeExpense("e-2", "p-bob", 100, [
        { participantId: "p-carol", amount: 100 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    // Net: A +100, B +100-100=0, C -100
    expect(body.data!.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: "p-alice", net: 100 }),
        expect.objectContaining({ participantId: "p-bob", net: 0 }),
        expect.objectContaining({ participantId: "p-carol", net: -100 }),
      ])
    );

    // Should produce exactly 1 transaction: Carol → Alice
    expect(body.data!.transactions).toHaveLength(1);
    expect(body.data!.transactions[0]).toEqual({
      from: { id: "p-carol", name: "Carol" },
      to: { id: "p-alice", name: "Alice" },
      amount: 100,
    });
  });

  it("rounds transaction amounts to 2 decimal places", async () => {
    // $10 split 3 ways: each owes $3.33... — payer gets +$6.67 net
    const alice = makeParticipant("p-alice", "Alice");
    const bob = makeParticipant("p-bob", "Bob");
    const carol = makeParticipant("p-carol", "Carol");

    mockParticipantFindMany.mockResolvedValue([alice, bob, carol] as never);
    // Route rounds per balance entry to 2dp, we set precise splits
    mockExpenseFindMany.mockResolvedValue([
      makeExpense("e-1", "p-alice", 10, [
        { participantId: "p-alice", amount: 3.34 },
        { participantId: "p-bob", amount: 3.33 },
        { participantId: "p-carol", amount: 3.33 },
      ]),
    ] as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await json(res);

    for (const t of body.data!.transactions) {
      // Each amount should have at most 2 decimal places
      const str = t.amount.toString();
      const decimals = str.includes(".") ? str.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});
