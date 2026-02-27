/**
 * Smoke tests for /api/auth/[...nextauth]/route.ts
 *
 * The route simply re-exports GET and POST from the NextAuth handlers object.
 * We mock @/auth so that no real NextAuth configuration is required.
 */

// ─── Mock @/auth ──────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({
  handlers: {
    GET: vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    POST: vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
  },
}));

import { GET, POST } from "../route";

// ─── Smoke tests ──────────────────────────────────────────────────────────────

describe("auth route smoke tests", () => {
  it("exports a GET function", () => {
    expect(typeof GET).toBe("function");
  });

  it("exports a POST function", () => {
    expect(typeof POST).toBe("function");
  });

  it("GET is callable and returns a Response", async () => {
    const req = new Request("http://localhost/api/auth/session");
    const res = await GET(req);
    expect(res).toBeInstanceOf(Response);
  });

  it("POST is callable and returns a Response", async () => {
    const req = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res).toBeInstanceOf(Response);
  });
});
