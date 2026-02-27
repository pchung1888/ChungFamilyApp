/**
 * Tests for GET + PATCH + DELETE /api/cards/[id]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditCard: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { GET, PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.creditCard.findUnique);
const mockUpdate = vi.mocked(prisma.creditCard.update);
const mockDelete = vi.mocked(prisma.creditCard.delete);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CARD_ID = "card-abc";

const sampleCard = {
  id: CARD_ID,
  name: "Chase Sapphire",
  network: "Visa",
  lastFour: "1234",
  annualFee: 95,
  annualFeeDate: null,
  pointsBalance: 50000,
  pointsExpiresAt: null,
  pointsName: "UR Points",
  pointsCppValue: 0.015,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  benefits: [],
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}`);
}

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}`, { method: "DELETE" });
}

function makeParams(id = CARD_ID) {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/cards/[id] ──────────────────────────────────────────────────────

describe("GET /api/cards/[id]", () => {
  it("returns 200 with the card and benefits", async () => {
    mockFindUnique.mockResolvedValue(sampleCard as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: CARD_ID,
        name: "Chase Sapphire",
        network: "Visa",
        lastFour: "1234",
        annualFee: 95,
        pointsName: "UR Points",
        pointsCppValue: 0.015,
        benefits: [],
      })
    );
  });

  it("returns 404 when card is not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Credit card not found");
    expect(body.data).toBeNull();
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch credit card");
    expect(body.data).toBeNull();
  });
});

// ─── PATCH /api/cards/[id] ────────────────────────────────────────────────────

describe("PATCH /api/cards/[id]", () => {
  it("updates a card and returns 200", async () => {
    const updated = { ...sampleCard, name: "Chase Sapphire Preferred" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ name: "Chase Sapphire Preferred" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: CARD_ID,
        name: "Chase Sapphire Preferred",
      })
    );
  });

  it("returns 400 when lastFour is not 4 digits (too short)", async () => {
    const res = await PATCH(makePatchRequest({ lastFour: "123" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("lastFour must be exactly 4 digits");
    expect(body.data).toBeNull();
  });

  it("returns 400 when lastFour contains non-digit characters", async () => {
    const res = await PATCH(makePatchRequest({ lastFour: "abcd" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("lastFour must be exactly 4 digits");
    expect(body.data).toBeNull();
  });

  it("returns 500 when Prisma throws", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(makePatchRequest({ name: "Chase Sapphire Preferred" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update credit card");
    expect(body.data).toBeNull();
  });
});

// ─── DELETE /api/cards/[id] ───────────────────────────────────────────────────

describe("DELETE /api/cards/[id]", () => {
  it("deletes a card and returns 200 with { id }", async () => {
    mockDelete.mockResolvedValue(sampleCard as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: CARD_ID });
  });

  it("returns 500 when Prisma throws", async () => {
    mockDelete.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete credit card");
    expect(body.data).toBeNull();
  });
});
