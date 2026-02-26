/**
 * Tests for PATCH and DELETE /api/trips/[id]/itinerary/[itemId]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 * Both handlers share a guard: findUnique the item and verify item.tripId === id.
 */

import { PATCH, DELETE } from "../itinerary/[itemId]/route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    itineraryItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.itineraryItem.findUnique);
const mockUpdate = vi.mocked(prisma.itineraryItem.update);
const mockDelete = vi.mocked(prisma.itineraryItem.delete);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const ITEM_ID = "item-1";

const sampleItem = {
  id: ITEM_ID,
  tripId: TRIP_ID,
  date: new Date("2026-06-01"),
  title: "Check in",
  type: "accommodation",
  location: "Hotel ABC",
  startTime: "14:00",
  endTime: null,
  notes: null,
  sortOrder: 1,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePatchRequest(body: object = {}): Request {
  return new Request(
    `http://localhost/api/trips/${TRIP_ID}/itinerary/${ITEM_ID}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function makeDeleteRequest(): Request {
  return new Request(
    `http://localhost/api/trips/${TRIP_ID}/itinerary/${ITEM_ID}`,
    { method: "DELETE" }
  );
}

function makeParams(id = TRIP_ID, itemId = ITEM_ID) {
  return { params: Promise.resolve({ id, itemId }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: item exists and belongs to the trip
  mockFindUnique.mockResolvedValue(sampleItem as never);
});

// ─── PATCH /api/trips/[id]/itinerary/[itemId] ─────────────────────────────────

describe("PATCH /api/trips/[id]/itinerary/[itemId]", () => {
  it("updates item and returns 200 with the updated item", async () => {
    const updatedItem = { ...sampleItem, title: "Updated Check In" };
    mockUpdate.mockResolvedValue(updatedItem as never);

    const res = await PATCH(
      makePatchRequest({ title: "Updated Check In" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: ITEM_ID,
        tripId: TRIP_ID,
        title: "Updated Check In",
      })
    );
  });

  it("returns 404 when item is not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await PATCH(
      makePatchRequest({ title: "Anything" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 404 when item belongs to a different trip", async () => {
    mockFindUnique.mockResolvedValue({
      ...sampleItem,
      tripId: "different-trip",
    } as never);

    const res = await PATCH(
      makePatchRequest({ title: "Anything" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 400 when type is an invalid value", async () => {
    const res = await PATCH(
      makePatchRequest({ type: "invalid_type" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/type/i);
  });

  it("calls prisma.itineraryItem.update with where: { id: itemId }", async () => {
    const updatedItem = { ...sampleItem, notes: "Bring passport" };
    mockUpdate.mockResolvedValue(updatedItem as never);

    await PATCH(
      makePatchRequest({ notes: "Bring passport" }),
      makeParams()
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ITEM_ID },
      })
    );
  });

  it("returns 500 when Prisma throws on update", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(
      makePatchRequest({ title: "Anything" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update itinerary item");
  });
});

// ─── DELETE /api/trips/[id]/itinerary/[itemId] ────────────────────────────────

describe("DELETE /api/trips/[id]/itinerary/[itemId]", () => {
  it("deletes item and returns 200 with { id: itemId }", async () => {
    mockDelete.mockResolvedValue(sampleItem as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: ITEM_ID });
  });

  it("calls prisma.itineraryItem.delete with where: { id: itemId }", async () => {
    mockDelete.mockResolvedValue(sampleItem as never);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
    });
  });

  it("returns 404 when item is not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 404 when item belongs to a different trip", async () => {
    mockFindUnique.mockResolvedValue({
      ...sampleItem,
      tripId: "different-trip",
    } as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 500 when Prisma throws on delete", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete itinerary item");
  });
});
