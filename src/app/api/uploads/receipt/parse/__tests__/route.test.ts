// @vitest-environment node
/**
 * Tests for POST /api/uploads/receipt/parse
 *
 * Runs in the Node environment (not happy-dom) so that vi.mock("fs/promises")
 * can intercept the route's readFile import.
 *
 * fs/promises.readFile and @google/generative-ai are fully mocked;
 * tests exercise the HTTP logic and field-sanitization only.
 *
 * NOTE: The response shape changed in CFA-5:
 * {merchantName, date, items: [{description, amount, category}]}
 */

// ─── Mock fs/promises ─────────────────────────────────────────────────────────

const mockReadFile = vi.hoisted(() => vi.fn());
vi.mock("fs/promises", () => ({ default: {}, readFile: mockReadFile }));

// ─── Mock @google/generative-ai ───────────────────────────────────────────────

const mockGenerateContent = vi.hoisted(() => vi.fn());
const MockGoogleGenerativeAI = vi.hoisted(() =>
  vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    };
  })
);
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: MockGoogleGenerativeAI,
}));

import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParseRequest(body: object): Request {
  return new Request("http://localhost/api/uploads/receipt/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/uploads/receipt/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

function mockFileExists(): void {
  mockReadFile.mockResolvedValue(Buffer.from("fake-image-data"));
}

function mockAIResponse(aiResult: object): void {
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify(aiResult) },
  });
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  MockGoogleGenerativeAI.mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    };
  });
  process.env.GOOGLE_AI_API_KEY = "test-api-key";
});

afterEach(() => {
  delete process.env.GOOGLE_AI_API_KEY;
});

// ─── POST /api/uploads/receipt/parse ─────────────────────────────────────────

describe("POST /api/uploads/receipt/parse", () => {
  // ── API key guard ──────────────────────────────────────────────────────────

  it("returns 503 when GOOGLE_AI_API_KEY is not set", async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect(res.status).toBe(503);
    expect(body.error).toBe("AI scanning is not configured");
    expect(body.data).toBeNull();
  });

  // ── Body validation ────────────────────────────────────────────────────────

  it("returns 400 when the request body is not valid JSON", async () => {
    const res = await POST(makeRawRequest("not-json{{"));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request body");
    expect(body.data).toBeNull();
  });

  it("returns 400 when receiptPath is missing", async () => {
    const res = await POST(makeParseRequest({}));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("receiptPath is required");
  });

  it("returns 400 when receiptPath is an empty string", async () => {
    const res = await POST(makeParseRequest({ receiptPath: "" }));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("receiptPath is required");
  });

  // ── Path traversal guard ───────────────────────────────────────────────────

  it("returns 400 when receiptPath contains forward-slash", async () => {
    const res = await POST(makeParseRequest({ receiptPath: "../../etc/passwd" }));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid receiptPath");
  });

  it("returns 400 when receiptPath contains backslash", async () => {
    const res = await POST(makeParseRequest({ receiptPath: "..\\..\\windows\\system32" }));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid receiptPath");
  });

  it("returns 400 when receiptPath contains '..'", async () => {
    const res = await POST(makeParseRequest({ receiptPath: "receipt..jpg" }));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid receiptPath");
  });

  // ── Extension validation ───────────────────────────────────────────────────

  it("returns 422 when file extension is not supported (.pdf)", async () => {
    const res = await POST(makeParseRequest({ receiptPath: "receipt.pdf" }));
    const body = await json(res);
    expect(res.status).toBe(422);
    expect(body.error).toMatch(/Unsupported image type/);
  });

  // ── File read error ────────────────────────────────────────────────────────

  it("returns 404 when readFile throws", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect(res.status).toBe(404);
    expect(body.error).toBe("Receipt file not found");
  });

  // ── AI errors ─────────────────────────────────────────────────────────────

  it("returns 502 when generateContent throws", async () => {
    mockFileExists();
    mockGenerateContent.mockRejectedValue(new Error("quota exceeded"));
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect(res.status).toBe(502);
    expect(body.error).toMatch(/AI request failed/);
  });

  it("returns 422 when AI returns non-JSON text", async () => {
    mockFileExists();
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Sorry, I cannot process this image." },
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect(res.status).toBe(422);
    expect(body.error).toBe("Could not parse AI response");
  });

  it("strips markdown code fences before parsing", async () => {
    mockFileExists();
    const fenced =
      "```json\n" +
      JSON.stringify({ merchantName: "Store", date: "2026-03-15", items: [] }) +
      "\n```";
    mockGenerateContent.mockResolvedValue({ response: { text: () => fenced } });

    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);

    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).merchantName).toBe("Store");
  });

  // ── Success path — new multi-item response shape ────────────────────────────

  it("returns 200 with merchantName, date, and items array on full valid response", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: "Trader Joe's",
      date: "2026-03-15",
      items: [
        { description: "Milk", amount: 3.99, category: "food" },
        { description: "Bread", amount: 2.49, category: "food" },
      ],
    });

    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
      merchantName: "Trader Joe's",
      date: "2026-03-15",
      items: [
        { description: "Milk", amount: 3.99, category: "food" },
        { description: "Bread", amount: 2.49, category: "food" },
      ],
    });
  });

  it("returns empty items array when AI returns no items", async () => {
    mockFileExists();
    mockAIResponse({ merchantName: "Store", date: null, items: [] });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).items).toEqual([]);
  });

  it("filters out items with empty description", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: null,
      date: null,
      items: [
        { description: "", amount: 3.99, category: "food" },
        { description: "Bread", amount: 2.49, category: "food" },
      ],
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    const items = (body.data as Record<string, unknown>).items as Array<{ description: string }>;
    expect(items.length).toBe(1);
    expect(items[0]?.description).toBe("Bread");
  });

  it("filters out items with non-positive amount", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: null,
      date: null,
      items: [
        { description: "Refund", amount: -1, category: "food" },
        { description: "Coffee", amount: 4.5, category: "food" },
      ],
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    const items = (body.data as Record<string, unknown>).items as unknown[];
    expect(items.length).toBe(1);
  });

  it("falls back to 'other' for unknown item category", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: null,
      date: null,
      items: [{ description: "Widget", amount: 5.0, category: "electronics" }],
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    const items = (body.data as Record<string, unknown>).items as Array<{ category: string }>;
    expect(items[0]?.category).toBe("other");
  });

  it("rounds item amounts to 2 decimal places", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: null,
      date: null,
      items: [{ description: "Coffee", amount: 4.555, category: "food" }],
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    const items = (body.data as Record<string, unknown>).items as Array<{ amount: number }>;
    expect(items[0]?.amount).toBe(4.56);
  });

  it("truncates merchantName to 60 chars", async () => {
    mockFileExists();
    mockAIResponse({ merchantName: "A".repeat(80), date: null, items: [] });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect((body.data as Record<string, unknown>).merchantName).toBe("A".repeat(60));
  });

  it("truncates item description to 60 chars", async () => {
    mockFileExists();
    mockAIResponse({
      merchantName: null,
      date: null,
      items: [{ description: "B".repeat(80), amount: 1.0, category: "food" }],
    });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    const items = (body.data as Record<string, unknown>).items as Array<{ description: string }>;
    expect(items[0]?.description).toBe("B".repeat(60));
  });

  it("returns merchantName=null when AI returns null", async () => {
    mockFileExists();
    mockAIResponse({ merchantName: null, date: null, items: [] });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect((body.data as Record<string, unknown>).merchantName).toBeNull();
  });

  it("returns date=null when date format is wrong (MM/DD/YYYY)", async () => {
    mockFileExists();
    mockAIResponse({ merchantName: null, date: "03/15/2026", items: [] });
    const res = await POST(makeParseRequest({ receiptPath: "receipt.jpg" }));
    const body = await json(res);
    expect((body.data as Record<string, unknown>).date).toBeNull();
  });

  it("accepts all valid extensions: jpg, jpeg, png, webp, heic", async () => {
    for (const ext of ["jpg", "jpeg", "png", "webp", "heic"]) {
      vi.clearAllMocks();
      MockGoogleGenerativeAI.mockImplementation(function () {
        return { getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }) };
      });
      process.env.GOOGLE_AI_API_KEY = "test-api-key";
      mockFileExists();
      mockAIResponse({ merchantName: null, date: null, items: [] });

      const res = await POST(makeParseRequest({ receiptPath: `receipt.${ext}` }));
      expect(res.status).toBe(200);
    }
  });
});
