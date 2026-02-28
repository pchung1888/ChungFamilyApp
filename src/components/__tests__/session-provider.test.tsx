import { render, screen } from "@testing-library/react";
import { SessionProviderWrapper } from "../session-provider";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SessionProviderWrapper", () => {
  it("renders children inside the SessionProvider", () => {
    render(
      <SessionProviderWrapper>
        <span>child content</span>
      </SessionProviderWrapper>
    );

    const provider = screen.getByTestId("session-provider");
    expect(provider).toBeInTheDocument();
    expect(provider).toContainElement(screen.getByText("child content"));
  });

  it("children are accessible in the DOM", () => {
    render(
      <SessionProviderWrapper>
        <button>Click me</button>
      </SessionProviderWrapper>
    );

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("renders multiple children correctly", () => {
    render(
      <SessionProviderWrapper>
        <p>First child</p>
        <p>Second child</p>
      </SessionProviderWrapper>
    );

    expect(screen.getByText("First child")).toBeInTheDocument();
    expect(screen.getByText("Second child")).toBeInTheDocument();
  });
});
