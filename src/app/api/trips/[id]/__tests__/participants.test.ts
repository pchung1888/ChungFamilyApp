/**
 * Tests for GET/POST /api/trips/[id]/participants
 * and DELETE /api/trips/[id]/participants/[pid]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

import { GET, POST } from "../participants/route";
import { DELETE } from "../participants/[pid]/route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    tripParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockTripFindUnique = vi.mocked(prisma.trip.findUnique);
const mockParticipantFindMany = vi.mocked(prisma.tripParticipant.findMany);
const mockParticipantFindUnique = vi.mocked(prisma.tripParticipant.findUnique);
const mockParticipantCreate = vi.mocked(prisma.tripParticipant.create);
const mockParticipantDelete = vi.mocked(prisma.tripParticipant.delete);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const PARTICIPANT_ID = "part-1";

const sampleParticipant = {
  id: PARTICIPANT_ID,
  tripId: TRIP_ID,
  name: "Alice",
  email: "alice@example.com",
  familyMemberId: null,
  groupName: null,
  createdAt: new Date("2026-01-01"),
  familyMember: null,
};

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/participants`);
}

function makePostRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(
    `http://localhost/api/trips/${TRIP_ID}/participants/${PARTICIPANT_ID}`,
    { method: "DELETE" }
  );
}

function makeListParams(id = TRIP_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeDeleteParams(id = TRIP_ID, pid = PARTICIPANT_ID) {
  return { params: Promise.resolve({ id, pid }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockTripFindUnique.mockResolvedValue({ id: TRIP_ID } as never);
});

// ─── GET /api/trips/[id]/participants ─────────────────────────────────────────

describe("GET /api/trips/[id]/participants", () => {
  it("returns 200 with participant list", async () => {
    mockParticipantFindMany.mockResolvedValue([sampleParticipant] as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    // Dates are serialised to ISO strings in JSON; compare only stable scalar fields
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PARTICIPANT_ID,
          tripId: TRIP_ID,
          name: "Alice",
          email: "alice@example.com",
          familyMemberId: null,
          groupName: null,
        }),
      ])
    );
  });

  it("returns 200 with empty array when trip has no participants", async () => {
    mockParticipantFindMany.mockResolvedValue([] as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 500 when Prisma throws", async () => {
    mockTripFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch participants");
  });
});

// ─── POST /api/trips/[id]/participants ────────────────────────────────────────

describe("POST /api/trips/[id]/participants", () => {
  it("creates a participant and returns 201", async () => {
    mockParticipantFindUnique.mockResolvedValue(null as never); // no existing participant
    mockParticipantCreate.mockResolvedValue(sampleParticipant as never);

    const res = await POST(makePostRequest({ name: "Alice" }), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    // Dates are serialised to ISO strings in JSON; compare only stable scalar fields
    expect(body.data).toEqual(
      expect.objectContaining({
        id: PARTICIPANT_ID,
        tripId: TRIP_ID,
        name: "Alice",
        email: "alice@example.com",
      })
    );
  });

  it("calls prisma.tripParticipant.create with trimmed name", async () => {
    mockParticipantFindUnique.mockResolvedValue(null as never);
    mockParticipantCreate.mockResolvedValue(sampleParticipant as never);

    await POST(makePostRequest({ name: "  Alice  " }), makeListParams());

    expect(mockParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Alice" }),
      })
    );
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({}), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name is required");
  });

  it("returns 400 when name is an empty string", async () => {
    const res = await POST(makePostRequest({ name: "   " }), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name is required");
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await POST(makePostRequest({ name: "Alice" }), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 400 when participant with same name already exists on this trip", async () => {
    mockParticipantFindUnique.mockResolvedValue(sampleParticipant as never); // already exists

    const res = await POST(makePostRequest({ name: "Alice" }), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain("Alice");
    expect(body.error).toContain("already exists");
  });

  it("includes optional fields (email, groupName, familyMemberId) in create call", async () => {
    mockParticipantFindUnique.mockResolvedValue(null as never);
    mockParticipantCreate.mockResolvedValue({ ...sampleParticipant, email: "bob@example.com", groupName: "Chungs" } as never);

    await POST(
      makePostRequest({
        name: "Bob",
        email: "bob@example.com",
        groupName: "Chungs",
        familyMemberId: "fam-1",
      }),
      makeListParams()
    );

    expect(mockParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "bob@example.com",
          groupName: "Chungs",
          familyMemberId: "fam-1",
        }),
      })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockParticipantFindUnique.mockResolvedValue(null as never);
    mockParticipantCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(makePostRequest({ name: "Alice" }), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create participant");
  });
});

// ─── DELETE /api/trips/[id]/participants/[pid] ────────────────────────────────

describe("DELETE /api/trips/[id]/participants/[pid]", () => {
  it("deletes participant and returns 200 with the deleted id", async () => {
    mockParticipantFindUnique.mockResolvedValue({
      id: PARTICIPANT_ID,
      tripId: TRIP_ID,
    } as never);
    mockParticipantDelete.mockResolvedValue(sampleParticipant as never);

    const res = await DELETE(makeDeleteRequest(), makeDeleteParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: PARTICIPANT_ID });
  });

  it("calls prisma.tripParticipant.delete with the correct id", async () => {
    mockParticipantFindUnique.mockResolvedValue({
      id: PARTICIPANT_ID,
      tripId: TRIP_ID,
    } as never);
    mockParticipantDelete.mockResolvedValue(sampleParticipant as never);

    await DELETE(makeDeleteRequest(), makeDeleteParams());

    expect(mockParticipantDelete).toHaveBeenCalledWith({
      where: { id: PARTICIPANT_ID },
    });
  });

  it("returns 404 when participant does not exist", async () => {
    mockParticipantFindUnique.mockResolvedValue(null as never);

    const res = await DELETE(makeDeleteRequest(), makeDeleteParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Participant not found");
  });

  it("returns 404 when participant belongs to a different trip", async () => {
    mockParticipantFindUnique.mockResolvedValue({
      id: PARTICIPANT_ID,
      tripId: "different-trip",
    } as never);

    const res = await DELETE(makeDeleteRequest(), makeDeleteParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Participant does not belong to this trip");
  });

  it("returns 500 when Prisma throws", async () => {
    mockParticipantFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeDeleteParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete participant");
  });
});
