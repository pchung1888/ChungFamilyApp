/**
 * Tests for ExpiringMilesAlert dashboard component.
 *
 * Covers: null render for empty cards, urgent vs non-urgent heading and styling,
 * per-card badge labels (Expired, Tomorrow, Nd left), card details display,
 * and the "Manage cards" link.
 */

import { render, screen } from "@testing-library/react";
import { ExpiringMilesAlert } from "../expiring-miles-alert";

// ─── Mock next/link ───────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface CardOverrides {
  id?: string;
  name?: string;
  lastFour?: string;
  pointsBalance?: number;
  pointsName?: string;
  pointsExpiresAt?: Date;
  daysUntilExpiry?: number;
}

function makeCard(overrides: CardOverrides = {}) {
  return {
    id: overrides.id ?? "card-1",
    name: overrides.name ?? "Chase Sapphire",
    lastFour: overrides.lastFour ?? "4242",
    pointsBalance: overrides.pointsBalance ?? 50000,
    pointsName: overrides.pointsName ?? "UR",
    pointsExpiresAt: overrides.pointsExpiresAt ?? new Date("2026-06-01"),
    daysUntilExpiry: overrides.daysUntilExpiry ?? 60,
  };
}

// ─── Null render ──────────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — null render", () => {
  it("returns null (renders nothing) when cards array is empty", () => {
    const { container } = render(<ExpiringMilesAlert cards={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ─── Heading / urgency ────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — heading", () => {
  it("shows 'Points Expiring Within 90 Days' for a non-urgent card (daysUntilExpiry = 60)", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 60 })]} />);
    expect(
      screen.getByText("Points Expiring Within 90 Days")
    ).toBeInTheDocument();
  });

  it("shows 'Urgent: Points Expiring Soon' when any card has daysUntilExpiry <= 30", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 30 })]} />);
    expect(
      screen.getByText("Urgent: Points Expiring Soon")
    ).toBeInTheDocument();
  });

  it("shows urgent heading when at least one card is urgent among multiple", () => {
    render(
      <ExpiringMilesAlert
        cards={[
          makeCard({ id: "c-1", daysUntilExpiry: 60 }),
          makeCard({ id: "c-2", daysUntilExpiry: 15 }),
        ]}
      />
    );
    expect(
      screen.getByText("Urgent: Points Expiring Soon")
    ).toBeInTheDocument();
  });

  it("shows the warning emoji for non-urgent cards", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 60 })]} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("shows the siren emoji for urgent cards", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 10 })]} />);
    expect(screen.getByText("🚨")).toBeInTheDocument();
  });
});

// ─── Card details ─────────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — card details", () => {
  it("shows the card name", () => {
    render(
      <ExpiringMilesAlert
        cards={[makeCard({ name: "Amex Gold" })]}
      />
    );
    expect(screen.getByText("Amex Gold")).toBeInTheDocument();
  });

  it("shows the last four digits in the format ···XXXX", () => {
    render(
      <ExpiringMilesAlert
        cards={[makeCard({ lastFour: "9999" })]}
      />
    );
    expect(screen.getByText("···9999")).toBeInTheDocument();
  });

  it("shows formatted points balance and points name", () => {
    render(
      <ExpiringMilesAlert
        cards={[
          makeCard({ pointsBalance: 125000, pointsName: "MR" }),
        ]}
      />
    );
    // toLocaleString produces "125,000" in en-US
    expect(screen.getByText("125,000 MR pts")).toBeInTheDocument();
  });
});

// ─── Badge labels ─────────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — badge labels", () => {
  it("shows 'Nd left' badge for daysUntilExpiry = 60", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 60 })]} />);
    expect(screen.getByText("60d left")).toBeInTheDocument();
  });

  it("shows 'Tomorrow' badge for daysUntilExpiry = 1", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 1 })]} />);
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });

  it("shows 'Expired' badge for daysUntilExpiry = 0", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: 0 })]} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows 'Expired' badge for negative daysUntilExpiry", () => {
    render(<ExpiringMilesAlert cards={[makeCard({ daysUntilExpiry: -5 })]} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows correct badge for each card when multiple cards are present", () => {
    render(
      <ExpiringMilesAlert
        cards={[
          makeCard({ id: "c-1", daysUntilExpiry: 45 }),
          makeCard({ id: "c-2", daysUntilExpiry: 1 }),
          makeCard({ id: "c-3", daysUntilExpiry: 0 }),
        ]}
      />
    );
    expect(screen.getByText("45d left")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});

// ─── Link ─────────────────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — manage cards link", () => {
  it("renders 'Manage cards' link pointing to /cards", () => {
    render(<ExpiringMilesAlert cards={[makeCard()]} />);
    const link = screen.getByRole("link", { name: /manage cards/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/cards");
  });
});

// ─── Multiple cards ───────────────────────────────────────────────────────────

describe("ExpiringMilesAlert — multiple cards", () => {
  it("renders all cards when multiple are provided", () => {
    render(
      <ExpiringMilesAlert
        cards={[
          makeCard({ id: "c-1", name: "Chase Sapphire", lastFour: "1111" }),
          makeCard({ id: "c-2", name: "Amex Platinum", lastFour: "2222" }),
        ]}
      />
    );
    expect(screen.getByText("Chase Sapphire")).toBeInTheDocument();
    expect(screen.getByText("Amex Platinum")).toBeInTheDocument();
    expect(screen.getByText("···1111")).toBeInTheDocument();
    expect(screen.getByText("···2222")).toBeInTheDocument();
  });
});
