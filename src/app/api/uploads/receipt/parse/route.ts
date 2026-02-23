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

interface ReceiptParseResult {
  amount: number | null;
  date: string | null;
  description: string | null;
  category: string | null;
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

  let rawText: string;
  try {
    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: base64Data },
      },
      "Extract these fields from the receipt:\n" +
        "- amount: total amount charged (number after tax, e.g. 42.50). Null if unclear.\n" +
        '- date: transaction date as "YYYY-MM-DD". Null if not found.\n' +
        '- description: merchant name, max 60 chars (e.g. "Hilton Garden Inn"). Null if unclear.\n' +
        "- category: best match from: hotel, flight, food, gas, ev_charging, tours, shopping, other.\n\n" +
        "Respond ONLY with valid JSON, no markdown, no explanation:\n" +
        '{"amount": <number|null>, "date": "<YYYY-MM-DD|null>", "description": "<string|null>", "category": "<string|null>"}',
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

  // Validate and sanitize each field
  const rawAmount = parsed.amount;
  const amount =
    typeof rawAmount === "number" && isFinite(rawAmount) && rawAmount > 0
      ? Math.round(rawAmount * 100) / 100
      : null;

  const rawDate = parsed.date;
  const isValidDate =
    typeof rawDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    !isNaN(Date.parse(rawDate));
  const date = isValidDate ? (rawDate as string) : null;

  const rawDesc = parsed.description;
  const description =
    typeof rawDesc === "string" && rawDesc.trim().length > 0
      ? rawDesc.trim().slice(0, 60)
      : null;

  const rawCat = parsed.category;
  const category =
    typeof rawCat === "string" && (VALID_CATEGORIES as Set<string>).has(rawCat) ? rawCat : null;

  const result: ReceiptParseResult = { amount, date, description, category };
  return NextResponse.json({ data: result, error: null });
}
