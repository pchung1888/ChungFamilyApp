/**
 * Tests for PATCH + DELETE /api/trips/[id]/expenses/[expenseId]
 *
 * Prisma is fully mocked; fs/promises.unlink is mocked to prevent
 * actual file deletion during tests.
 */

// ─── Hoisted mock values ──────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock factories so these refs are valid inside them.

const { mockUnlinkFn } = vi.hoisted(() => ({
  mockUnlinkFn: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// ─── Mock fs/promises ────────────────────────────────────────────────────────
// fs/promises is a Node built-in that Vite/happy-dom treats as browser-external.
// We provide a self-contained factory (including a `default` export) and
// reference the hoisted mockUnlinkFn so the same spy is used by the route.

vi.mock("fs/promises", () => ({
  default: { unlink: mockUnlinkFn },
  unlink: mockUnlinkFn,
}));

import { PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";

const mockFindUnique = vi.mocked(prisma.expense.findUnique);
const mockUpdate = vi.mocked(prisma.expense.update);
const mockDelete = vi.mocked(prisma.expense.delete);
const mockUnlink = vi.mocked(unlink);

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
  paidByParticipant: null,
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/${EXPENSE_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/expenses/${EXPENSE_ID}`, {
    method: "DELETE",
  });
}

function makeParams(id = TRIP_ID, expenseId = EXPENSE_ID) {
  return { params: Promise.resolve({ id, expenseId }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply the default resolved value after clearAllMocks resets it
  mockUnlinkFn.mockResolvedValue(undefined);
});

// ─── PATCH /api/trips/[id]/expenses/[expenseId] ───────────────────────────────

describe("PATCH /api/trips/[id]/expenses/[expenseId]", () => {
  it("returns 200 when valid fields are provided", async () => {
    const updated = { ...sampleExpense, description: "Lunch" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ description: "Lunch" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: EXPENSE_ID,
        description: "Lunch",
      })
    );
  });

  it("returns 200 when updating category to a valid value", async () => {
    const updated = { ...sampleExpense, category: "hotel" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ category: "hotel" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({ category: "hotel" })
    );
  });

  it("returns 400 when category is invalid", async () => {
    const res = await PATCH(makePatchRequest({ category: "vacation" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/category must be one of:/);
    expect(body.data).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when category is an empty string", async () => {
    const res = await PATCH(makePatchRequest({ category: "" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/category must be one of:/);
    expect(body.data).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("calls unlink when receiptPath is set to null and expense has an existing receipt", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: "receipt.jpg" } as never);
    const updated = { ...sampleExpense, receiptPath: null };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ receiptPath: null }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(mockUnlink).toHaveBeenCalledOnce();
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("receipt.jpg"));
  });

  it("calls unlink when receiptPath is replaced with a new path", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: "old-receipt.jpg" } as never);
    const updated = { ...sampleExpense, receiptPath: "new-receipt.jpg" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ receiptPath: "new-receipt.jpg" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(mockUnlink).toHaveBeenCalledOnce();
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("old-receipt.jpg"));
  });

  it("does not call unlink when receiptPath is not included in the update body", async () => {
    const updated = { ...sampleExpense, description: "Brunch" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ description: "Brunch" }), makeParams());

    expect(res.status).toBe(200);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("does not call unlink when expense has no existing receipt and receiptPath is set to null", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: null } as never);
    const updated = { ...sampleExpense, receiptPath: null };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ receiptPath: null }), makeParams());

    expect(res.status).toBe(200);
    expect(mockFindUnique).toHaveBeenCalledOnce();
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("calls prisma.expense.update with the correct expenseId", async () => {
    mockUpdate.mockResolvedValue(sampleExpense as never);

    await PATCH(makePatchRequest({ description: "Lunch" }), makeParams());

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID },
      })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(makePatchRequest({ description: "Lunch" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update expense");
    expect(body.data).toBeNull();
  });
});

// ─── DELETE /api/trips/[id]/expenses/[expenseId] ──────────────────────────────

describe("DELETE /api/trips/[id]/expenses/[expenseId]", () => {
  it("returns 200 with { data: { id: expenseId }, error: null } when expense has no receipt", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: null } as never);
    mockDelete.mockResolvedValue(sampleExpense as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: EXPENSE_ID });
  });

  it("does not call unlink when expense has no receipt", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: null } as never);
    mockDelete.mockResolvedValue(sampleExpense as never);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("calls unlink before deleting when expense has a receipt path", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: "receipt.jpg" } as never);
    mockDelete.mockResolvedValue(sampleExpense as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: EXPENSE_ID });
    expect(mockUnlink).toHaveBeenCalledOnce();
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("receipt.jpg"));
  });

  it("calls prisma.expense.delete with the correct expenseId", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: null } as never);
    mockDelete.mockResolvedValue(sampleExpense as never);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: EXPENSE_ID } });
  });

  it("returns 500 when Prisma throws on findUnique", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete expense");
    expect(body.data).toBeNull();
  });

  it("returns 500 when Prisma throws on delete", async () => {
    mockFindUnique.mockResolvedValue({ receiptPath: null } as never);
    mockDelete.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete expense");
    expect(body.data).toBeNull();
  });
});
