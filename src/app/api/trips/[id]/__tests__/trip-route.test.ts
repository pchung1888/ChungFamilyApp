/**
 * Tests for GET (single), PATCH, DELETE /api/trips/[id]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { GET, PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.trip.findUnique);
const mockUpdate = vi.mocked(prisma.trip.update);
const mockDelete = vi.mocked(prisma.trip.delete);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";

const sampleTrip = {
  id: TRIP_ID,
  name: "Tokyo 2026",
  destination: "Tokyo, Japan",
  startDate: new Date("2026-03-10"),
  endDate: new Date("2026-03-20"),
  budget: 5000,
  type: "flight",
  notes: null,
  createdAt: new Date("2026-01-01"),
  expenses: [],
  _count: { expenses: 0 },
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}`);
}

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}`, { method: "DELETE" });
}

function makeParams(id = TRIP_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/trips/[id] ──────────────────────────────────────────────────────

describe("GET /api/trips/[id]", () => {
  it("returns 200 with the trip including expenses", async () => {
    const tripWithExpenses = {
      ...sampleTrip,
      expenses: [
        {
          id: "exp-1",
          amount: 200,
          date: new Date("2026-03-11"),
          familyMember: { id: "fm-1", name: "Alice" },
          creditCard: { id: "cc-1", name: "Sapphire", lastFour: "1234", pointsName: "Chase UR" },
        },
      ],
    };
    mockFindUnique.mockResolvedValue(tripWithExpenses as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: TRIP_ID,
        name: "Tokyo 2026",
        destination: "Tokyo, Japan",
        type: "flight",
        expenses: expect.arrayContaining([
          expect.objectContaining({ id: "exp-1", amount: 200 }),
        ]),
      })
    );
  });

  it("returns 404 when trip is not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
    expect(body.data).toBeNull();
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch trip");
    expect(body.data).toBeNull();
  });
});

// ─── PATCH /api/trips/[id] ────────────────────────────────────────────────────

describe("PATCH /api/trips/[id]", () => {
  it("returns 200 with the updated trip when valid fields are provided", async () => {
    const updatedTrip = { ...sampleTrip, name: "Tokyo & Kyoto 2026", budget: 7000 };
    mockUpdate.mockResolvedValue(updatedTrip as never);

    const res = await PATCH(
      makePatchRequest({ name: "Tokyo & Kyoto 2026", budget: 7000 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: TRIP_ID,
        name: "Tokyo & Kyoto 2026",
        budget: 7000,
      })
    );
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("returns 400 when type is invalid", async () => {
    const res = await PATCH(
      makePatchRequest({ type: "cruise" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("type must be 'road_trip', 'flight', or 'local'");
    expect(body.data).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 when Prisma throws", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(
      makePatchRequest({ name: "Updated Name" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update trip");
    expect(body.data).toBeNull();
  });
});

// ─── DELETE /api/trips/[id] ───────────────────────────────────────────────────

describe("DELETE /api/trips/[id]", () => {
  it("returns 200 with { data: { id }, error: null }", async () => {
    mockDelete.mockResolvedValue(sampleTrip as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: TRIP_ID });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: TRIP_ID } });
  });

  it("returns 500 when Prisma throws", async () => {
    mockDelete.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete trip");
    expect(body.data).toBeNull();
  });
});
