/**
 * Tests for GET + POST /api/trips/[id]/expenses
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.expense.findMany);
const mockCreate = vi.mocked(prisma.expense.create);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const EXPENSE_ID = "exp-xyz";

const sampleExpense = {
  id: EXPENSE_ID,
  tripId: TRIP_ID,
  familyMemberId: null,
  creditCardId: null,
  paidByParticipantId: null,
  category: "food",
  description: "Dinner",
  amount: 85.5,
  date: new Date("2026-03-15"),
  pointsEarned: 0,
  receiptPath: null,
  createdAt: new Date("2026-01-01"),
  familyMember: null,
  creditCard: null,
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses`);
}

function makePostRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses`, {
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

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/trips/[id]/expenses ─────────────────────────────────────────────

describe("GET /api/trips/[id]/expenses", () => {
  it("returns 200 with a list of expenses including familyMember and creditCard", async () => {
    const expenseWithRelations = {
      ...sampleExpense,
      familyMember: { id: "fm-1", name: "Alice" },
      creditCard: { id: "cc-1", name: "Chase Sapphire", lastFour: "1234", pointsName: "UR Points" },
    };
    mockFindMany.mockResolvedValue([expenseWithRelations] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([
      expect.objectContaining({
        id: EXPENSE_ID,
        tripId: TRIP_ID,
        category: "food",
        description: "Dinner",
        amount: 85.5,
        familyMember: { id: "fm-1", name: "Alice" },
        creditCard: { id: "cc-1", name: "Chase Sapphire", lastFour: "1234", pointsName: "UR Points" },
      }),
    ]);
  });

  it("returns 200 with an empty array when trip has no expenses", async () => {
    mockFindMany.mockResolvedValue([] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([]);
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch expenses");
    expect(body.data).toBeNull();
  });
});

// ─── POST /api/trips/[id]/expenses ────────────────────────────────────────────

describe("POST /api/trips/[id]/expenses", () => {
  it("returns 201 when all required fields are provided", async () => {
    const created = {
      ...sampleExpense,
      familyMember: null,
      creditCard: null,
      paidByParticipant: null,
      splits: [],
    };
    mockCreate.mockResolvedValue(created as never);

    const res = await POST(
      makePostRequest({
        category: "food",
        description: "Dinner",
        amount: 85.5,
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: EXPENSE_ID,
        tripId: TRIP_ID,
        category: "food",
        description: "Dinner",
        amount: 85.5,
      })
    );
  });

  it("returns 400 when category is missing", async () => {
    const res = await POST(
      makePostRequest({
        description: "Dinner",
        amount: 85.5,
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("category, description, amount, and date are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when description is missing", async () => {
    const res = await POST(
      makePostRequest({
        category: "food",
        amount: 85.5,
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("category, description, amount, and date are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when date is missing", async () => {
    const res = await POST(
      makePostRequest({
        category: "food",
        description: "Dinner",
        amount: 85.5,
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("category, description, amount, and date are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when category is invalid", async () => {
    const res = await POST(
      makePostRequest({
        category: "vacation",
        description: "Beach trip",
        amount: 200,
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/category must be one of:/);
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 201 for every valid category value", async () => {
    const validCategories = ["hotel", "flight", "food", "gas", "ev_charging", "tours", "shopping", "other"];

    for (const category of validCategories) {
      mockCreate.mockResolvedValue({ ...sampleExpense, category } as never);

      const res = await POST(
        makePostRequest({ category, description: "Test", amount: 10, date: "2026-03-15" }),
        makeParams()
      );

      expect(res.status).toBe(201);
    }
  });

  it("calls prisma.expense.create with the correct tripId and fields", async () => {
    const created = { ...sampleExpense, paidByParticipant: null, splits: [] };
    mockCreate.mockResolvedValue(created as never);

    await POST(
      makePostRequest({
        category: "hotel",
        description: "Marriott",
        amount: 250,
        date: "2026-04-01",
      }),
      makeParams()
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: TRIP_ID,
          category: "hotel",
          description: "Marriott",
          amount: 250,
        }),
      })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makePostRequest({
        category: "food",
        description: "Dinner",
        amount: 85.5,
        date: "2026-03-15",
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create expense");
    expect(body.data).toBeNull();
  });
});
