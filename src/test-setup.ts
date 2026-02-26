import "@testing-library/jest-dom";

// happy-dom does not implement window.confirm / window.alert by default.
// Stub them so vi.spyOn(window, "confirm") and vi.spyOn(window, "alert") work.
if (typeof window.confirm !== "function") {
  window.confirm = () => false;
}
if (typeof window.alert !== "function") {
  window.alert = () => undefined;
}
