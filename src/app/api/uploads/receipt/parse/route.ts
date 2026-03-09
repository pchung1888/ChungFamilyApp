import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// Gemini supports these image types (including HEIC — bonus over Anthropic)
const GEMINI_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

const VALID_CATEGORIES = new Set(EXPENSE_CATEGORIES.map((c) => c.value));

export interface ReceiptLineItem {
  description: string;
  amount: number;
  category: string;
}

export interface ReceiptParseResult {
  merchantName: string | null;
  date: string | null;
  items: ReceiptLineItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { data: null, error: "AI scanning is not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 });
  }

  const receiptPath = (body as Record<string, unknown>).receiptPath;
  if (typeof receiptPath !== "string" || !receiptPath) {
    return NextResponse.json({ data: null, error: "receiptPath is required" }, { status: 400 });
  }

  // Safety: prevent path traversal — filename only, no slashes or dots-dot
  if (receiptPath.includes("/") || receiptPath.includes("\\") || receiptPath.includes("..")) {
    return NextResponse.json({ data: null, error: "Invalid receiptPath" }, { status: 400 });
  }

  const ext = receiptPath.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = GEMINI_MIME_TYPES[ext];
  if (!mimeType) {
    return NextResponse.json(
      { data: null, error: "Unsupported image type for AI scanning" },
      { status: 422 }
    );
  }

  const filePath = join(process.cwd(), "public", "uploads", "receipts", receiptPath);
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ data: null, error: "Receipt file not found" }, { status: 404 });
  }

  const base64Data = fileBuffer.toString("base64");

  const modelName = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const validCategoryList = EXPENSE_CATEGORIES.map((c) => c.value).join(", ");

  let rawText: string;
  try {
    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: base64Data },
      },
      "Extract the line items from this receipt.\n\n" +
        "Return a JSON object with:\n" +
        '- "merchantName": store/restaurant name (string, max 60 chars, or null)\n' +
        '- "date": transaction date as "YYYY-MM-DD" (or null)\n' +
        '- "items": array of line items, each with:\n' +
        '  - "description": item name (string, max 60 chars)\n' +
        '  - "amount": item price as a number (positive)\n' +
        `  - "category": best match from: ${validCategoryList}\n\n` +
        "Rules:\n" +
        "- Include individual purchased items, not subtotals or totals\n" +
        "- If the receipt is a single-item purchase, return one item\n" +
        "- Exclude tax lines, tip lines, and payment method lines\n" +
        "- If no items can be parsed, return items as empty array\n\n" +
        "Respond ONLY with valid JSON, no markdown, no explanation:\n" +
        '{"merchantName": "<string|null>", "date": "<YYYY-MM-DD|null>", "items": [{"description": "<string>", "amount": <number>, "category": "<string>"}]}',
    ]);
    rawText = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: `AI request failed: ${msg}` }, { status: 502 });
  }

  // Strip markdown code fences if Gemini wraps the JSON
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { data: null, error: "Could not parse AI response" },
      { status: 422 }
    );
  }

  // Validate merchantName
  const rawMerchant = parsed.merchantName;
  const merchantName =
    typeof rawMerchant === "string" && rawMerchant.trim().length > 0
      ? rawMerchant.trim().slice(0, 60)
      : null;

  // Validate date
  const rawDate = parsed.date;
  const isValidDate =
    typeof rawDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    !isNaN(Date.parse(rawDate));
  const date = isValidDate ? (rawDate as string) : null;

  // Validate and sanitize items
  const rawItems = parsed.items;
  const items: ReceiptLineItem[] = [];

  if (Array.isArray(rawItems)) {
    for (const rawItem of rawItems) {
      if (typeof rawItem !== "object" || rawItem === null) continue;
      const item = rawItem as Record<string, unknown>;

      const rawDesc = item.description;
      const description =
        typeof rawDesc === "string" && rawDesc.trim().length > 0
          ? rawDesc.trim().slice(0, 60)
          : null;
      if (!description) continue;

      const rawAmount = item.amount;
      const amount =
        typeof rawAmount === "number" && isFinite(rawAmount) && rawAmount > 0
          ? Math.round(rawAmount * 100) / 100
          : null;
      if (amount === null) continue;

      const rawCat = item.category;
      const category =
        typeof rawCat === "string" && (VALID_CATEGORIES as Set<string>).has(rawCat)
          ? rawCat
          : "other";

      items.push({ description, amount, category });
    }
  }

  const result: ReceiptParseResult = { merchantName, date, items };
  return NextResponse.json({ data: result, error: null });
}
