// @vitest-environment node
/**
 * Tests for POST /api/uploads/receipt
 *
 * Runs in the Node environment (not happy-dom) so that vi.mock("fs/promises")
 * can intercept the route's writeFile import.  In happy-dom mode, Vite marks
 * fs/promises as a "browser external" and the mock factory cannot intercept
 * the route module's binding.
 *
 * happy-dom note: happy-dom's FormData.append validates that the second
 * argument is a Blob, which our fake File class is not.  We work around this
 * by building a mock Request whose formData() method returns a plain object
 * whose .get() returns whatever we want.  The route only calls:
 *   const formData = await request.formData();
 *   const file = formData.get("file");
 * so this is sufficient.
 */

// ─── Mock fs/promises ─────────────────────────────────────────────────────────

const mockWriteFile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("fs/promises", () => ({ default: {}, writeFile: mockWriteFile }));

import { POST } from "../route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A minimal File-like object that:
 * - passes `instanceof File` (because we vi.stubGlobal("File", FakeFile))
 * - has a working arrayBuffer() implementation
 * - reports the correct .type and .size
 */
class FakeFile {
  name: string;
  type: string;
  size: number;
  private _data: Uint8Array;

  constructor(data: Uint8Array, name: string, type: string) {
    this._data = data;
    this.name = name;
    this.type = type;
    this.size = data.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._data.buffer.slice(
      this._data.byteOffset,
      this._data.byteOffset + this._data.byteLength
    ) as ArrayBuffer;
  }
}

// Patch the global File so `instanceof File` in the route returns true.
vi.stubGlobal("File", FakeFile);

/** Build a fake file with the given MIME type and byte size. */
function makeFile(type: string, sizeBytes: number): FakeFile {
  return new FakeFile(new Uint8Array(sizeBytes).fill(0xab), "test.jpg", type);
}

/**
 * Build a mock Request whose formData() resolves to an object that
 * returns the given value from .get("file").
 */
function makeUploadRequest(fileValue: unknown): Request {
  return {
    formData: () =>
      Promise.resolve({
        get: (key: string) => (key === "file" ? fileValue : null),
      }),
  } as unknown as Request;
}

async function json(res: Response): Promise<{ data: unknown; error: string | null }> {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteFile.mockResolvedValue(undefined);
});

// ─── POST /api/uploads/receipt ────────────────────────────────────────────────

describe("POST /api/uploads/receipt", () => {
  it("returns 400 when no file field is present in the form data (null)", async () => {
    const res = await POST(makeUploadRequest(null));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("No file provided");
    expect(body.data).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 400 when the form value is a plain string (not a File)", async () => {
    const res = await POST(makeUploadRequest("not-a-file"));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe("No file provided");
    expect(body.data).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 400 when the file MIME type is not allowed (image/gif)", async () => {
    const file = makeFile("image/gif", 1024);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Unsupported file type/);
    expect(body.data).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 400 when the file MIME type is not allowed (application/pdf)", async () => {
    const file = makeFile("application/pdf", 1024);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Unsupported file type/);
    expect(body.data).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 400 when the file exceeds 10 MB", async () => {
    const elevenMB = 11 * 1024 * 1024;
    const file = makeFile("image/jpeg", elevenMB);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/too large/i);
    expect(body.data).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("returns 201 with { data: { path: <filename> }, error: null } for a valid JPEG", async () => {
    const file = makeFile("image/jpeg", 1024);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ path: expect.stringMatching(/\.jpg$/) });
  });

  it("returns 201 for a valid PNG", async () => {
    const file = makeFile("image/png", 512);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ path: expect.stringMatching(/\.png$/) });
  });

  it("returns 201 for a valid WebP", async () => {
    const file = makeFile("image/webp", 512);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ path: expect.stringMatching(/\.webp$/) });
  });

  it("returns 201 for a valid HEIC", async () => {
    const file = makeFile("image/heic", 512);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ path: expect.stringMatching(/\.heic$/) });
  });

  it("calls writeFile exactly once with a Buffer of the correct size", async () => {
    const file = makeFile("image/jpeg", 1024);
    await POST(makeUploadRequest(file));

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const [_dest, buffer] = mockWriteFile.mock.calls[0] as [string, Buffer];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBe(1024);
  });

  it("returns 500 when writeFile throws", async () => {
    mockWriteFile.mockRejectedValueOnce(new Error("ENOENT: no such file or directory"));

    const file = makeFile("image/jpeg", 512);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to upload receipt");
    expect(body.data).toBeNull();
  });

  it("accepts a file exactly at the 10 MB limit", async () => {
    const exactlyTenMB = 10 * 1024 * 1024;
    const file = makeFile("image/jpeg", exactlyTenMB);
    const res = await POST(makeUploadRequest(file));
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
  });

  it("generates a unique filename on each successful upload", async () => {
    const file1 = makeFile("image/jpeg", 512);
    const file2 = makeFile("image/jpeg", 512);

    const res1 = await POST(makeUploadRequest(file1));
    const res2 = await POST(makeUploadRequest(file2));

    const body1 = (await res1.json()) as { data: { path: string }; error: null };
    const body2 = (await res2.json()) as { data: { path: string }; error: null };

    expect(body1.data.path).not.toBe(body2.data.path);
  });
});
