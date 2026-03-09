// @vitest-environment node
/**
 * Tests for PATCH/DELETE /api/trips/[id]/expenses/receipt-group/[groupId]
 */

// ─── Mock fs/promises ────────────────────────────────────────────────────────

vi.mock("fs/promises", () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.expense.findFirst);
const mockUpdateMany = vi.mocked(prisma.expense.updateMany);
const mockDeleteMany = vi.mocked(prisma.expense.deleteMany);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";
const GROUP_ID = "group-uuid-1";

function makeParams(tripId = TRIP_ID, groupId = GROUP_ID) {
  return { params: Promise.resolve({ id: tripId, groupId }) };
}

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/receipt-group/${GROUP_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/receipt-group/${GROUP_ID}`, {
    method: "DELETE",
  });
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── PATCH ───────────────────────────────────────────────────────────────────

describe("PATCH /api/trips/[id]/expenses/receipt-group/[groupId]", () => {
  it("returns 404 when group does not exist in trip", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const res = await PATCH(
      makePatchRequest({ paidByParticipantId: "participant-1" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Receipt group not found");
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when group belongs to a different trip", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const res = await PATCH(
      makePatchRequest({ paidByParticipantId: "participant-1" }),
      makeParams("other-trip", GROUP_ID)
    );
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Receipt group not found");
  });

  it("updates paidByParticipantId on all expenses in the group", async () => {
    mockFindFirst.mockResolvedValue({ id: "exp-1" } as never);
    mockUpdateMany.mockResolvedValue({ count: 3 } as never);

    const res = await PATCH(
      makePatchRequest({ paidByParticipantId: "participant-1" }),
      makeParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect((body.data as Record<string, unknown>).updatedCount).toBe(3);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { receiptGroupId: GROUP_ID, tripId: TRIP_ID },
      data: { paidByParticipantId: "participant-1" },
    });
  });

  it("updates date when provided", async () => {
    mockFindFirst.mockResolvedValue({ id: "exp-1" } as never);
    mockUpdateMany.mockResolvedValue({ count: 2 } as never);

    await PATCH(makePatchRequest({ date: "2026-03-10" }), makeParams());

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { receiptGroupId: GROUP_ID, tripId: TRIP_ID },
      data: { date: new Date("2026-03-10") },
    });
  });

  it("updates creditCardId when provided", async () => {
    mockFindFirst.mockResolvedValue({ id: "exp-1" } as never);
    mockUpdateMany.mockResolvedValue({ count: 2 } as never);

    await PATCH(makePatchRequest({ creditCardId: "card-abc" }), makeParams());

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { receiptGroupId: GROUP_ID, tripId: TRIP_ID },
      data: { creditCardId: "card-abc" },
    });
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request(
      `http://localhost/api/trips/${TRIP_ID}/expenses/receipt-group/${GROUP_ID}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "not-json{{" }
    );
    const res = await PATCH(req, makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 500 when updateMany throws", async () => {
    mockFindFirst.mockResolvedValue({ id: "exp-1" } as never);
    mockUpdateMany.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(makePatchRequest({ paidByParticipantId: "p1" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update receipt group");
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/trips/[id]/expenses/receipt-group/[groupId]", () => {
  it("returns 404 when group does not exist", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Receipt group not found");
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("returns 404 when group belongs to a different trip", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const res = await DELETE(makeDeleteRequest(), makeParams("other-trip", GROUP_ID));
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Receipt group not found");
  });

  it("deletes all expenses in the group and returns deleted count", async () => {
    mockFindFirst.mockResolvedValue({ receiptPath: null } as never);
    mockDeleteMany.mockResolvedValue({ count: 4 } as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect((body.data as Record<string, unknown>).deletedCount).toBe(4);
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { receiptGroupId: GROUP_ID, tripId: TRIP_ID },
    });
  });

  it("leaves other expenses in the trip intact (targets only the group)", async () => {
    mockFindFirst.mockResolvedValue({ receiptPath: null } as never);
    mockDeleteMany.mockResolvedValue({ count: 2 } as never);

    await DELETE(makeDeleteRequest(), makeParams());

    // deleteMany is called with the specific groupId/tripId — other expenses are untouched
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { receiptGroupId: GROUP_ID, tripId: TRIP_ID },
    });
  });

  it("deletes the receipt file when receiptPath is set", async () => {
    mockFindFirst.mockResolvedValue({ receiptPath: "receipt.jpg" } as never);
    mockDeleteMany.mockResolvedValue({ count: 2 } as never);

    const { unlink } = await import("fs/promises");
    await DELETE(makeDeleteRequest(), makeParams());

    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("receipt.jpg"));
  });

  it("skips file deletion when receiptPath is null", async () => {
    mockFindFirst.mockResolvedValue({ receiptPath: null } as never);
    mockDeleteMany.mockResolvedValue({ count: 1 } as never);

    const { unlink } = await import("fs/promises");
    await DELETE(makeDeleteRequest(), makeParams());

    expect(unlink).not.toHaveBeenCalled();
  });

  it("returns 500 when deleteMany throws", async () => {
    mockFindFirst.mockResolvedValue({ receiptPath: null } as never);
    mockDeleteMany.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete receipt group");
  });
});
