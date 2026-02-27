/**
 * Tests for GET + POST /api/family
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

import { GET, POST } from "../route";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    familyMember: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.familyMember.findMany);
const mockCreate = vi.mocked(prisma.familyMember.create);

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

function makeGetRequest(): Request {
  return new Request("http://localhost/api/family");
}

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/family", {
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

// ─── GET /api/family ──────────────────────────────────────────────────────────

describe("GET /api/family", () => {
  it("returns 200 with list of members", async () => {
    mockFindMany.mockResolvedValue([sampleMember] as never);

    const res = await GET();
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: MEMBER_ID,
          name: "Alice",
          role: "parent",
          email: "alice@example.com",
        }),
      ])
    );
  });

  it("returns 200 with empty array when no members exist", async () => {
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
    expect(body.error).toBe("Failed to fetch family members");
    expect(body.data).toBeNull();
  });
});

// ─── POST /api/family ─────────────────────────────────────────────────────────

describe("POST /api/family", () => {
  it("creates a member and returns 201", async () => {
    mockCreate.mockResolvedValue(sampleMember as never);

    const res = await POST(makePostRequest({ name: "Alice", role: "parent", email: "alice@example.com" }));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: MEMBER_ID,
        name: "Alice",
        role: "parent",
        email: "alice@example.com",
      })
    );
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({ role: "parent" }));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Name and role are required");
    expect(body.data).toBeNull();
  });

  it("returns 400 when role is missing", async () => {
    const res = await POST(makePostRequest({ name: "Alice" }));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Name and role are required");
    expect(body.data).toBeNull();
  });

  it("returns 400 when role is invalid", async () => {
    const res = await POST(makePostRequest({ name: "Alice", role: "admin" }));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("Role must be 'parent' or 'teen'");
    expect(body.data).toBeNull();
  });

  it("sends email as null when email is omitted", async () => {
    mockCreate.mockResolvedValue({ ...sampleMember, email: null } as never);

    await POST(makePostRequest({ name: "Alice", role: "parent" }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null }),
      })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(makePostRequest({ name: "Alice", role: "parent" }));
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create family member");
    expect(body.data).toBeNull();
  });
});
