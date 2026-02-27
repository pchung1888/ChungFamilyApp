/**
 * Tests for GET + POST /api/trips
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.trip.findMany);
const mockCreate = vi.mocked(prisma.trip.create);

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
  return new Request("http://localhost/api/trips");
}

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/trips ───────────────────────────────────────────────────────────

describe("GET /api/trips", () => {
  it("returns 200 with trip list including _count and expenses", async () => {
    const tripWithMeta = {
      ...sampleTrip,
      expenses: [{ amount: 200 }, { amount: 350 }],
      _count: { expenses: 2 },
    };
    mockFindMany.mockResolvedValue([tripWithMeta] as never);

    const res = await GET();
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TRIP_ID,
          name: "Tokyo 2026",
          destination: "Tokyo, Japan",
          type: "flight",
          _count: { expenses: 2 },
          expenses: [{ amount: 200 }, { amount: 350 }],
        }),
      ])
    );
  });

  it("returns 200 with empty array when no trips exist", async () => {
    mockFindMany.mockResolvedValue([] as never);

    const res = await GET();
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([]);
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error") as never);

    const res = await GET();
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch trips");
    expect(body.data).toBeNull();
  });
});

// ─── POST /api/trips ──────────────────────────────────────────────────────────

describe("POST /api/trips", () => {
  it("creates a trip and returns 201 when all required fields are provided", async () => {
    mockCreate.mockResolvedValue(sampleTrip as never);

    const res = await POST(
      makePostRequest({
        name: "Tokyo 2026",
        destination: "Tokyo, Japan",
        startDate: "2026-03-10",
        type: "flight",
      })
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: TRIP_ID,
        name: "Tokyo 2026",
        destination: "Tokyo, Japan",
        type: "flight",
      })
    );
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      makePostRequest({
        destination: "Tokyo, Japan",
        startDate: "2026-03-10",
        type: "flight",
      })
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name, destination, startDate, and type are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when type is invalid", async () => {
    const res = await POST(
      makePostRequest({
        name: "Tokyo 2026",
        destination: "Tokyo, Japan",
        startDate: "2026-03-10",
        type: "cruise",
      })
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("type must be 'road_trip', 'flight', or 'local'");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when Prisma throws", async () => {
    mockCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makePostRequest({
        name: "Tokyo 2026",
        destination: "Tokyo, Japan",
        startDate: "2026-03-10",
        type: "flight",
      })
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create trip");
    expect(body.data).toBeNull();
  });
});
