import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { data: null, error: "No file provided" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { data: null, error: "Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { data: null, error: "File too large. Maximum size is 10 MB" },
        { status: 400 }
      );
    }

    const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
    const dest = join(process.cwd(), "public", "uploads", "receipts", filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);

    return NextResponse.json({ data: { path: filename }, error: null }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to upload receipt" },
      { status: 500 }
    );
  }
}
