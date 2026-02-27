import "@testing-library/jest-dom";

// happy-dom does not implement window.confirm / window.alert by default.
// Stub them so vi.spyOn(window, "confirm") and vi.spyOn(window, "alert") work.
// Guard for node environment tests (e.g. API route tests using @vitest-environment node).
if (typeof window !== "undefined") {
  if (typeof window.confirm !== "function") {
    window.confirm = () => false;
  }
  if (typeof window.alert !== "function") {
    window.alert = () => undefined;
  }
}
