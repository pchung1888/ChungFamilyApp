/**
 * Tests for GET + POST /api/cards
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditCard: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.creditCard.findMany);
const mockCreate = vi.mocked(prisma.creditCard.create);

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
  return new Request("http://localhost/api/cards");
}

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/cards", {
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

// ─── GET /api/cards ───────────────────────────────────────────────────────────

describe("GET /api/cards", () => {
  it("returns 200 with list of cards including benefits", async () => {
    mockFindMany.mockResolvedValue([sampleCard] as never);

    const res = await GET();
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: CARD_ID,
          name: "Chase Sapphire",
          network: "Visa",
          lastFour: "1234",
          annualFee: 95,
          pointsName: "UR Points",
          pointsCppValue: 0.015,
          benefits: [],
        }),
      ])
    );
  });

  it("returns 200 with empty array when no cards exist", async () => {
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
    expect(body.error).toBe("Failed to fetch credit cards");
    expect(body.data).toBeNull();
  });
});

// ─── POST /api/cards ──────────────────────────────────────────────────────────

const validPostBody = {
  name: "Chase Sapphire",
  network: "Visa",
  lastFour: "1234",
  annualFee: 95,
  pointsName: "UR Points",
  pointsCppValue: 0.015,
};

describe("POST /api/cards", () => {
  it("creates a card and returns 201 when all required fields provided", async () => {
    mockCreate.mockResolvedValue(sampleCard as never);

    const res = await POST(makePostRequest(validPostBody));
    const body = await json(res);

    expect(res.status).toBe(201);
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

  it("returns 400 when name is missing", async () => {
    const { name: _name, ...bodyWithoutName } = validPostBody;

    const res = await POST(makePostRequest(bodyWithoutName));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "name, network, lastFour, annualFee, pointsName, and pointsCppValue are required"
    );
    expect(body.data).toBeNull();
  });

  it("returns 400 when lastFour is not 4 digits (too short)", async () => {
    const res = await POST(makePostRequest({ ...validPostBody, lastFour: "123" }));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("lastFour must be exactly 4 digits");
    expect(body.data).toBeNull();
  });

  it("returns 400 when lastFour contains non-digit characters", async () => {
    const res = await POST(makePostRequest({ ...validPostBody, lastFour: "abcd" }));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("lastFour must be exactly 4 digits");
    expect(body.data).toBeNull();
  });

  it("sends annualFeeDate as null when not provided", async () => {
    mockCreate.mockResolvedValue(sampleCard as never);

    await POST(makePostRequest(validPostBody));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ annualFeeDate: null }),
      })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(makePostRequest(validPostBody));
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create credit card");
    expect(body.data).toBeNull();
  });
});
