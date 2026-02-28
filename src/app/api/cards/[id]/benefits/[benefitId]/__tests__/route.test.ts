/**
 * Tests for PATCH + DELETE /api/cards/[id]/benefits/[benefitId]
 *
 * Prisma is fully mocked; tests exercise the HTTP logic only.
 */

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cardBenefit: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

const mockUpdate = vi.mocked(prisma.cardBenefit.update);
const mockDelete = vi.mocked(prisma.cardBenefit.delete);

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

function makePatchRequest(body: object): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}/benefits/${BENEFIT_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/cards/${CARD_ID}/benefits/${BENEFIT_ID}`, {
    method: "DELETE",
  });
}

function makeBenefitParams(id = CARD_ID, benefitId = BENEFIT_ID) {
  return { params: Promise.resolve({ id, benefitId }) };
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── PATCH /api/cards/[id]/benefits/[benefitId] ───────────────────────────────

describe("PATCH /api/cards/[id]/benefits/[benefitId]", () => {
  it("returns 200 when valid fields are provided", async () => {
    const updated = { ...sampleBenefit, name: "Airport Lounge" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(
      makePatchRequest({ name: "Airport Lounge" }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: BENEFIT_ID,
        name: "Airport Lounge",
      })
    );
  });

  it("returns 200 when updating value and usedAmount", async () => {
    const updated = { ...sampleBenefit, value: 500, usedAmount: 150 };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(
      makePatchRequest({ value: 500, usedAmount: 150 }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({
        value: 500,
        usedAmount: 150,
      })
    );
  });

  it("returns 200 when updating with a valid frequency", async () => {
    const updated = { ...sampleBenefit, frequency: "monthly" };
    mockUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(
      makePatchRequest({ frequency: "monthly" }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.objectContaining({ frequency: "monthly" })
    );
  });

  it("returns 400 when frequency is invalid", async () => {
    const res = await PATCH(
      makePatchRequest({ frequency: "weekly" }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("frequency must be 'annual', 'monthly', or 'per_trip'");
    expect(body.data).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when frequency is an empty string", async () => {
    const res = await PATCH(
      makePatchRequest({ frequency: "" }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("frequency must be 'annual', 'monthly', or 'per_trip'");
    expect(body.data).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 when Prisma throws", async () => {
    mockUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(
      makePatchRequest({ name: "Airport Lounge" }),
      makeBenefitParams()
    );
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update card benefit");
    expect(body.data).toBeNull();
  });
});

// ─── DELETE /api/cards/[id]/benefits/[benefitId] ──────────────────────────────

describe("DELETE /api/cards/[id]/benefits/[benefitId]", () => {
  it("returns 200 with { data: { id: benefitId }, error: null }", async () => {
    mockDelete.mockResolvedValue(sampleBenefit as never);

    const res = await DELETE(makeDeleteRequest(), makeBenefitParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: BENEFIT_ID });
  });

  it("calls prisma.cardBenefit.delete with the correct benefitId", async () => {
    mockDelete.mockResolvedValue(sampleBenefit as never);

    await DELETE(makeDeleteRequest(), makeBenefitParams());

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: BENEFIT_ID } });
  });

  it("returns 500 when Prisma throws", async () => {
    mockDelete.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeBenefitParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete card benefit");
    expect(body.data).toBeNull();
  });
});
