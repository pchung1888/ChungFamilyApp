/**
 * Tests for GET/POST /api/trips/[id]/itinerary
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 * The route file does not exist yet — these are TDD tests written before
 * the implementation.  Expect "Cannot find module" until the route is created.
 */

import { GET, POST } from "../itinerary/route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    itineraryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockTripFindUnique = vi.mocked(prisma.trip.findUnique);
const mockItineraryFindMany = vi.mocked(prisma.itineraryItem.findMany);
const mockItineraryCreate = vi.mocked(prisma.itineraryItem.create);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const ITEM_ID = "item-1";

const sampleItem = {
  id: ITEM_ID,
  tripId: TRIP_ID,
  title: "Check in at hotel",
  date: new Date("2026-06-01"),
  type: "accommodation",
  location: "Tokyo Hilton",
  startTime: "14:00",
  endTime: null,
  notes: "King bed requested",
  sortOrder: 1,
  createdAt: new Date("2026-01-01"),
};

// ─── Request factory helpers ──────────────────────────────────────────────────

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary`);
}

function makePostRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary`, {
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockTripFindUnique.mockResolvedValue({ id: TRIP_ID } as never);
});

// ─── GET /api/trips/[id]/itinerary ────────────────────────────────────────────

describe("GET /api/trips/[id]/itinerary", () => {
  it("returns 200 with item list", async () => {
    mockItineraryFindMany.mockResolvedValue([sampleItem] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ITEM_ID,
          tripId: TRIP_ID,
          title: "Check in at hotel",
          type: "accommodation",
          location: "Tokyo Hilton",
          sortOrder: 1,
        }),
      ])
    );
  });

  it("returns 200 with empty array when trip has no itinerary items", async () => {
    mockItineraryFindMany.mockResolvedValue([] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 500 when Prisma throws", async () => {
    mockTripFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch itinerary");
  });
});

// ─── POST /api/trips/[id]/itinerary ───────────────────────────────────────────

describe("POST /api/trips/[id]/itinerary", () => {
  it("creates an itinerary item and returns 201", async () => {
    mockItineraryCreate.mockResolvedValue(sampleItem as never);

    const res = await POST(
      makePostRequest({
        title: "Check in at hotel",
        date: "2026-06-01",
        type: "accommodation",
        location: "Tokyo Hilton",
        startTime: "14:00",
        notes: "King bed requested",
        sortOrder: 1,
      }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: ITEM_ID,
        tripId: TRIP_ID,
        title: "Check in at hotel",
        type: "accommodation",
      })
    );
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(
      makePostRequest({ date: "2026-06-01", type: "activity" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/title/i);
  });

  it("returns 400 when date is missing", async () => {
    const res = await POST(
      makePostRequest({ title: "Museum visit", type: "activity" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/date/i);
  });

  it("returns 400 when type is invalid", async () => {
    const res = await POST(
      makePostRequest({ title: "Spaceship ride", date: "2026-06-01", type: "spaceship" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/type/i);
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await POST(
      makePostRequest({ title: "Museum visit", date: "2026-06-01", type: "activity" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 500 when Prisma throws on create", async () => {
    mockItineraryCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makePostRequest({ title: "Museum visit", date: "2026-06-01", type: "activity" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create itinerary item");
  });
});
