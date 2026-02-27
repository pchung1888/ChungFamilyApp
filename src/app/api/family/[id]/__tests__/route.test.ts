/**
 * Tests for PATCH + DELETE /api/family/[id]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

import { PATCH, DELETE } from "../route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    familyMember: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUpdate = vi.mocked(prisma.familyMember.update);
const mockDelete = vi.mocked(prisma.familyMember.delete);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MEMBER_ID = "member-abc";

const sampleMember = {
  id: MEMBER_ID,
  name: "Alice",
  role: "parent",
  email: "alice@example.com",
  createdAt: new Date("2026-01-01"),
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/family/${MEMBER_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/family/${MEMBER_ID}`, {
    method: "DELETE",
  });
}

function makeParams(id = MEMBER_ID) {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── PATCH /api/family/[id] ───────────────────────────────────────────────────

describe("PATCH /api/family/[id]", () => {
  it("updates a member and returns 200", async () => {
    const updated = { ...sampleMember, name: "Alice Updated" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ name: "Alice Updated" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: MEMBER_ID,
        name: "Alice Updated",
        role: "parent",
      })
    );
  });

  it("returns 400 when role is invalid", async () => {
    const res = await PATCH(makePatchRequest({ role: "admin" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Role must be 'parent' or 'teen'");
    expect(body.data).toBeNull();
  });

  it("returns 500 when Prisma throws", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(makePatchRequest({ name: "Alice" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update family member");
    expect(body.data).toBeNull();
  });
});

// ─── DELETE /api/family/[id] ──────────────────────────────────────────────────

describe("DELETE /api/family/[id]", () => {
  it("deletes a member and returns 200 with { id }", async () => {
    mockDelete.mockResolvedValue(sampleMember as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: MEMBER_ID });
  });

  it("calls prisma.familyMember.delete with the correct id", async () => {
    mockDelete.mockResolvedValue(sampleMember as never);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: MEMBER_ID } });
  });

  it("returns 500 when Prisma throws", async () => {
    mockDelete.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete family member");
    expect(body.data).toBeNull();
  });
});
