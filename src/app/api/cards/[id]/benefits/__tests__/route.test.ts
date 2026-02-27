/**
 * Tests for GET + POST /api/cards/[id]/benefits
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cardBenefit: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.cardBenefit.findMany);
const mockCreate = vi.mocked(prisma.cardBenefit.create);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CARD_ID = "card-abc";
const BENEFIT_ID = "benefit-xyz";

const sampleBenefit = {
  id: BENEFIT_ID,
  cardId: CARD_ID,
  name: "Travel Credit",
  value: 300,
  frequency: "annual",
  usedAmount: 0,
  resetDate: null,
  createdAt: new Date("2026-01-01"),
};

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}/benefits`);
}

function makePostRequest(body: object): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}/benefits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeListParams(id = CARD_ID) {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/cards/[id]/benefits ────────────────────────────────────────────

describe("GET /api/cards/[id]/benefits", () => {
  it("returns 200 with benefit list", async () => {
    mockFindMany.mockResolvedValue([sampleBenefit] as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([
      expect.objectContaining({
        id: BENEFIT_ID,
        cardId: CARD_ID,
        name: "Travel Credit",
        value: 300,
        frequency: "annual",
      }),
    ]);
  });

  it("returns 200 with empty array when no benefits exist", async () => {
    mockFindMany.mockResolvedValue([] as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([]);
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeListParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch card benefits");
    expect(body.data).toBeNull();
  });
});

// ─── POST /api/cards/[id]/benefits ───────────────────────────────────────────

describe("POST /api/cards/[id]/benefits", () => {
  it("returns 201 when valid fields are provided", async () => {
    mockCreate.mockResolvedValue(sampleBenefit as never);

    const res = await POST(
      makePostRequest({ name: "Travel Credit", value: 300, frequency: "annual" }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: BENEFIT_ID,
        cardId: CARD_ID,
        name: "Travel Credit",
        value: 300,
        frequency: "annual",
      })
    );
  });

  it("returns 201 with optional usedAmount and resetDate", async () => {
    const benefitWithReset = {
      ...sampleBenefit,
      usedAmount: 100,
      resetDate: new Date("2026-12-31"),
    };
    mockCreate.mockResolvedValue(benefitWithReset as never);

    const res = await POST(
      makePostRequest({
        name: "Travel Credit",
        value: 300,
        frequency: "annual",
        usedAmount: 100,
        resetDate: "2026-12-31",
      }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      makePostRequest({ value: 300, frequency: "annual" }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name, value, and frequency are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when value is missing", async () => {
    const res = await POST(
      makePostRequest({ name: "Travel Credit", frequency: "annual" }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name, value, and frequency are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when frequency is missing", async () => {
    const res = await POST(
      makePostRequest({ name: "Travel Credit", value: 300 }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("name, value, and frequency are required");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when frequency is invalid", async () => {
    const res = await POST(
      makePostRequest({ name: "Travel Credit", value: 300, frequency: "weekly" }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("frequency must be 'annual', 'monthly', or 'per_trip'");
    expect(body.data).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when Prisma throws", async () => {
    mockCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(
      makePostRequest({ name: "Travel Credit", value: 300, frequency: "annual" }),
      makeListParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create card benefit");
    expect(body.data).toBeNull();
  });
});
