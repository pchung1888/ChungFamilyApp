/**
 * Tests for POST /api/trips/[id]/settlements
 *
 * Prisma is fully mocked; tests exercise the HTTP validation and creation logic.
 */

import { POST } from "../settlements/route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    tripParticipant: { findUnique: vi.fn() },
    settlement: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockTripFindUnique = vi.mocked(prisma.trip.findUnique);
const mockParticipantFindUnique = vi.mocked(prisma.tripParticipant.findUnique);
const mockSettlementCreate = vi.mocked(prisma.settlement.create);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const FROM_ID = "part-from";
const TO_ID = "part-to";

const sampleSettlement = {
  id: "settlement-1",
  tripId: TRIP_ID,
  fromId: FROM_ID,
  toId: TO_ID,
  amount: 50,
  note: null,
  settledAt: new Date("2026-01-01"),
  from: { id: FROM_ID, name: "Bob" },
  to: { id: TO_ID, name: "Alice" },
};

function makeRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/settlements`, {
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
  mockTripFindUnique.mockResolvedValue({ id: TRIP_ID } as never);
  mockSettlementCreate.mockResolvedValue(sampleSettlement as never);
});

/** Helper: set up both participants as belonging to the current trip. */
function mockBothParticipantsValid(): void {
  mockParticipantFindUnique
    .mockResolvedValueOnce({ id: FROM_ID, tripId: TRIP_ID } as never)
    .mockResolvedValueOnce({ id: TO_ID, tripId: TRIP_ID } as never);
}

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("POST /api/trips/[id]/settlements — success", () => {
  it("creates a settlement and returns 201", async () => {
    mockBothParticipantsValid();

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    // Dates serialise to ISO strings in JSON; compare only scalar fields
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "settlement-1",
        tripId: TRIP_ID,
        fromId: FROM_ID,
        toId: TO_ID,
        amount: 50,
        note: null,
      })
    );
  });

  it("passes note to prisma.settlement.create when provided", async () => {
    mockBothParticipantsValid();

    await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50, note: "Lunch repayment" }),
      makeParams()
    );

    expect(mockSettlementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "Lunch repayment" }),
      })
    );
  });

  it("stores note as null when not provided", async () => {
    mockBothParticipantsValid();

    await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );

    expect(mockSettlementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: null }),
      })
    );
  });
});

// ─── Validation error paths ───────────────────────────────────────────────────

describe("POST /api/trips/[id]/settlements — validation", () => {
  it("returns 400 when fromId is missing", async () => {
    const res = await POST(
      makeRequest({ toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when toId is missing", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when amount is missing", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("returns 400 when amount is zero", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 0 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("positive");
  });

  it("returns 400 when amount is negative", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: -25 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("positive");
  });

  it("returns 400 when amount is a string instead of a number", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: "fifty" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("positive");
  });

  it("returns 400 when fromId equals toId", async () => {
    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: FROM_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("different");
  });
});

// ─── Not-found error paths ────────────────────────────────────────────────────

describe("POST /api/trips/[id]/settlements — not found", () => {
  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 404 when fromId participant is not on this trip", async () => {
    mockParticipantFindUnique
      .mockResolvedValueOnce({ id: FROM_ID, tripId: "other-trip" } as never) // wrong trip
      .mockResolvedValueOnce({ id: TO_ID, tripId: TRIP_ID } as never);

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toContain("fromId");
  });

  it("returns 404 when toId participant is not on this trip", async () => {
    mockParticipantFindUnique
      .mockResolvedValueOnce({ id: FROM_ID, tripId: TRIP_ID } as never)
      .mockResolvedValueOnce({ id: TO_ID, tripId: "other-trip" } as never); // wrong trip

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toContain("toId");
  });

  it("returns 404 when fromId participant does not exist at all", async () => {
    mockParticipantFindUnique
      .mockResolvedValueOnce(null as never) // from not found
      .mockResolvedValueOnce({ id: TO_ID, tripId: TRIP_ID } as never);

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toContain("fromId");
  });
});

// ─── Server error ─────────────────────────────────────────────────────────────

describe("POST /api/trips/[id]/settlements — server error", () => {
  it("returns 500 when Prisma throws during create", async () => {
    mockBothParticipantsValid();
    mockSettlementCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makeRequest({ fromId: FROM_ID, toId: TO_ID, amount: 50 }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create settlement");
  });
});
