import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut } from "next-auth/react";
import { Nav } from "../nav";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockUseSession = vi.mocked(useSession);
const mockSignOut = vi.mocked(signOut);

function setUnauthenticated(): void {
  mockUseSession.mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  });
}

function setAuthenticated(user: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): void {
  mockUseSession.mockReturnValue({
    data: { user, expires: "2099-01-01" },
    status: "authenticated",
    update: vi.fn(),
  });
}

beforeEach(() => {
  mockSignOut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Nav", () => {
  describe("navigation links", () => {
    it("renders all four navigation links", () => {
      setUnauthenticated();
      render(<Nav />);

      // Use exact label text to avoid the brand link ("ChungFamily") matching
      // broader queries like /family/i. The nav links include an emoji prefix,
      // so we match on the text content of the <a> rather than an exact name.
      const links = screen.getAllByRole("link");
      const hrefs = links.map((l) => l.getAttribute("href"));
      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/family");
      expect(hrefs).toContain("/cards");
      expect(hrefs).toContain("/trips");

      // The nav renders each label as a text node inside a link that also
      // contains an emoji. Use getAllByText with a regex to match the label
      // text regardless of its sibling emoji node.
      expect(screen.getByText(/\bHome\b/)).toBeInTheDocument();
      expect(screen.getByText(/\bFamily\b/)).toBeInTheDocument();
      expect(screen.getByText(/\bCards\b/)).toBeInTheDocument();
      expect(screen.getByText(/\bTrips\b/)).toBeInTheDocument();
    });

    it("navigation links point to the correct hrefs", () => {
      setUnauthenticated();
      render(<Nav />);

      // Find each nav link by its unique href attribute
      const homeLink = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/" && l.textContent?.includes("Home"));
      const familyLink = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/family");
      const cardsLink = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/cards");
      const tripsLink = screen
        .getAllByRole("link")
        .find((l) => l.getAttribute("href") === "/trips");

      expect(homeLink).toBeInTheDocument();
      expect(familyLink).toBeInTheDocument();
      expect(cardsLink).toBeInTheDocument();
      expect(tripsLink).toBeInTheDocument();
    });
  });

  describe("unauthenticated state", () => {
    it("does not render user info when there is no session", () => {
      setUnauthenticated();
      render(<Nav />);

      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    });

    it("does not render any user name or email when unauthenticated", () => {
      setUnauthenticated();
      render(<Nav />);

      expect(screen.queryByText("Alice Chung")).not.toBeInTheDocument();
      expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    });
  });

  describe("authenticated state — name", () => {
    it("renders user name when session has user.name", () => {
      setAuthenticated({ name: "Alice Chung", email: "alice@example.com", image: null });
      render(<Nav />);

      expect(screen.getByText("Alice Chung")).toBeInTheDocument();
    });

    it("renders email as fallback when user.name is null", () => {
      setAuthenticated({ name: null, email: "alice@example.com", image: null });
      render(<Nav />);

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });
  });

  describe("authenticated state — avatar", () => {
    it("renders user image when session.user.image is set", () => {
      setAuthenticated({
        name: "Alice Chung",
        email: "alice@example.com",
        image: "https://example.com/avatar.jpg",
      });
      render(<Nav />);

      const img = screen.getByRole("img", { name: "Alice Chung" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("renders initial letter avatar when session.user.image is null", () => {
      setAuthenticated({ name: "Alice Chung", email: "alice@example.com", image: null });
      render(<Nav />);

      // The initial-letter div should show "A"
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("renders initial from email when name is null and image is null", () => {
      setAuthenticated({ name: null, email: "bob@example.com", image: null });
      render(<Nav />);

      expect(screen.getByText("B")).toBeInTheDocument();
    });
  });

  describe("sign out", () => {
    it("renders Sign out button when authenticated", () => {
      setAuthenticated({ name: "Alice Chung", email: "alice@example.com", image: null });
      render(<Nav />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("calls signOut with callbackUrl '/login' when Sign out is clicked", async () => {
      setAuthenticated({ name: "Alice Chung", email: "alice@example.com", image: null });
      render(<Nav />);

      await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

      await waitFor(() =>
        expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" })
      );
    });
  });
});
