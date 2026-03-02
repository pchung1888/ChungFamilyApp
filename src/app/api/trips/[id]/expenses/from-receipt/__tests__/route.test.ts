// @vitest-environment node
/**
 * Tests for POST /api/trips/[id]/expenses/from-receipt
 *
 * Prisma is fully mocked; tests exercise HTTP logic and split distribution.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
    },
    expense: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Mock crypto.randomUUID ───────────────────────────────────────────────────

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomUUID: vi.fn().mockReturnValue("test-group-uuid"),
  };
});

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.trip.findUnique);
const mockTransaction = vi.mocked(prisma.$transaction);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";

const sampleExpense = {
  id: "exp-1",
  tripId: TRIP_ID,
  category: "food",
  description: "Milk",
  amount: 3.99,
  date: new Date("2026-03-15"),
  receiptPath: null,
  receiptGroupId: "test-group-uuid",
  lineItemIndex: 0,
  pointsEarned: 0,
  paidByParticipantId: null,
  familyMemberId: null,
  creditCardId: null,
  familyMember: null,
  creditCard: null,
  paidByParticipant: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/from-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = TRIP_ID) {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

function mockTripExists(): void {
  mockFindUnique.mockResolvedValue({ id: TRIP_ID } as never);
}

function mockTransactionSuccess(count = 1): void {
  const expenses = Array.from({ length: count }, (_, i) => ({
    ...sampleExpense,
    id: `exp-${i}`,
    lineItemIndex: i,
  }));
  mockTransaction.mockResolvedValue(expenses as never);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── POST /api/trips/[id]/expenses/from-receipt ──────────────────────────────

describe("POST /api/trips/[id]/expenses/from-receipt", () => {
  // ── Body validation ────────────────────────────────────────────────────────

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/from-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req, makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when items is missing", async () => {
    const res = await POST(makePostRequest({ date: "2026-03-15" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("items must be a non-empty array");
  });

  it("returns 400 when items is an empty array", async () => {
    const res = await POST(makePostRequest({ items: [], date: "2026-03-15" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("items must be a non-empty array");
  });

  it("returns 400 when date is missing", async () => {
    const res = await POST(
      makePostRequest({ items: [{ description: "Milk", amount: 3.99, category: "food" }] }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("date is required");
  });

  it("returns 400 when an item description is empty", async () => {
    const res = await POST(
      makePostRequest({
        items: [{ description: "", amount: 3.99, category: "food" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("items[0].description is required");
  });

  it("returns 400 when an item amount is zero", async () => {
    const res = await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: 0, category: "food" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("items[0].amount must be a positive number");
  });

  it("returns 400 when an item amount is negative", async () => {
    const res = await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: -1, category: "food" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("items[0].amount must be a positive number");
  });

  it("returns 400 when an item category is invalid", async () => {
    const res = await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: 3.99, category: "groceries" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/items\[0\]\.category must be one of:/);
  });

  // ── Trip not found ─────────────────────────────────────────────────────────

  it("returns 404 when trip does not exist", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: 3.99, category: "food" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ── Success ────────────────────────────────────────────────────────────────

  it("returns 201 with receiptGroupId and expenses on success", async () => {
    mockTripExists();
    mockTransactionSuccess(2);

    const res = await POST(
      makePostRequest({
        items: [
          { description: "Milk", amount: 3.99, category: "food" },
          { description: "Bread", amount: 2.49, category: "food" },
        ],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect((body.data as Record<string, unknown>).receiptGroupId).toBe("test-group-uuid");
    expect(Array.isArray((body.data as Record<string, unknown>).expenses)).toBe(true);
  });

  it("calls $transaction with N expense creates for N items", async () => {
    mockTripExists();
    mockTransactionSuccess(3);

    await POST(
      makePostRequest({
        items: [
          { description: "Item A", amount: 10, category: "food" },
          { description: "Item B", amount: 20, category: "shopping" },
          { description: "Item C", amount: 30, category: "other" },
        ],
        date: "2026-03-15",
      }),
      makeParams()
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // $transaction is called with an array of 3 promises
    const transactionArg = mockTransaction.mock.calls[0]?.[0];
    expect(Array.isArray(transactionArg)).toBe(true);
    expect((transactionArg as unknown as unknown[]).length).toBe(3);
  });

  it("passes receiptPath to every expense create", async () => {
    mockTripExists();
    mockTransactionSuccess(1);

    await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: 3.99, category: "food" }],
        date: "2026-03-15",
        receiptPath: "receipt.jpg",
      }),
      makeParams()
    );

    // $transaction was called; check prisma.expense.create was called with receiptPath
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiptPath: "receipt.jpg",
          receiptGroupId: "test-group-uuid",
        }),
      })
    );
  });

  it("returns 500 when $transaction throws", async () => {
    mockTripExists();
    mockTransaction.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makePostRequest({
        items: [{ description: "Milk", amount: 3.99, category: "food" }],
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create expenses");
  });

  // ── Split distribution ─────────────────────────────────────────────────────

  it("passes paidByParticipantId to every expense", async () => {
    mockTripExists();
    mockTransactionSuccess(2);

    await POST(
      makePostRequest({
        items: [
          { description: "Milk", amount: 3.99, category: "food" },
          { description: "Bread", amount: 2.49, category: "food" },
        ],
        date: "2026-03-15",
        paidByParticipantId: "participant-1",
      }),
      makeParams()
    );

    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidByParticipantId: "participant-1" }),
      })
    );
  });

  it("assigns lineItemIndex 0, 1, 2 for three items", async () => {
    mockTripExists();
    mockTransactionSuccess(3);

    await POST(
      makePostRequest({
        items: [
          { description: "A", amount: 1, category: "food" },
          { description: "B", amount: 2, category: "food" },
          { description: "C", amount: 3, category: "food" },
        ],
        date: "2026-03-15",
      }),
      makeParams()
    );

    const calls = vi.mocked(prisma.expense.create).mock.calls;
    expect(calls[0]?.[0]).toEqual(expect.objectContaining({ data: expect.objectContaining({ lineItemIndex: 0 }) }));
    expect(calls[1]?.[0]).toEqual(expect.objectContaining({ data: expect.objectContaining({ lineItemIndex: 1 }) }));
    expect(calls[2]?.[0]).toEqual(expect.objectContaining({ data: expect.objectContaining({ lineItemIndex: 2 }) }));
  });
});
