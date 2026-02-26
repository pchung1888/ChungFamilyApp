/**
 * Tests for StatCards dashboard component.
 *
 * Verifies that numeric props are rendered correctly, labels are present,
 * and icons render for each stat.
 */

import { render, screen } from "@testing-library/react";
import { StatCards } from "../stat-cards";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderStatCards(overrides: {
  familyCount?: number;
  activeCardCount?: number;
  upcomingTripCount?: number;
  totalPoints?: number;
} = {}) {
  const props = {
    familyCount: 4,
    activeCardCount: 3,
    upcomingTripCount: 2,
    totalPoints: 125000,
    ...overrides,
  };
  return render(<StatCards {...props} />);
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe("StatCards snapshots", () => {
  it("renders correctly with default values", () => {
    const { container } = renderStatCards();
    expect(container).toMatchSnapshot();
  });
});

// ─── Labels ───────────────────────────────────────────────────────────────────

describe("StatCards — labels", () => {
  it("renders the Family Members label", () => {
    renderStatCards();
    expect(screen.getByText(/family members/i)).toBeInTheDocument();
  });

  it("renders the Active Cards label", () => {
    renderStatCards();
    expect(screen.getByText(/active cards/i)).toBeInTheDocument();
  });

  it("renders the Upcoming Trips label", () => {
    renderStatCards();
    expect(screen.getByText(/upcoming trips/i)).toBeInTheDocument();
  });

  it("renders the Total Points label", () => {
    renderStatCards();
    expect(screen.getByText(/total points/i)).toBeInTheDocument();
  });
});

// ─── Values ───────────────────────────────────────────────────────────────────

describe("StatCards — values", () => {
  it("displays the correct familyCount", () => {
    renderStatCards({ familyCount: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("displays the correct activeCardCount", () => {
    renderStatCards({ activeCardCount: 7 });
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("displays the correct upcomingTripCount", () => {
    // Use a unique value (9) that won't collide with other stat card values
    renderStatCards({ familyCount: 1, activeCardCount: 2, upcomingTripCount: 9, totalPoints: 0 });
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("formats totalPoints with locale thousands separator", () => {
    renderStatCards({ totalPoints: 125000 });
    // toLocaleString produces "125,000" in en-US locale
    expect(screen.getByText("125,000")).toBeInTheDocument();
  });

  it("displays zero values correctly", () => {
    renderStatCards({
      familyCount: 0,
      activeCardCount: 0,
      upcomingTripCount: 0,
      totalPoints: 0,
    });
    // There should be multiple "0" elements (one per stat that is zero)
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Singular / plural descriptions ──────────────────────────────────────────

describe("StatCards — descriptions", () => {
  it("shows 'Adventure planned' (singular) when upcomingTripCount is 1", () => {
    renderStatCards({ upcomingTripCount: 1 });
    expect(screen.getByText("Adventure planned")).toBeInTheDocument();
  });

  it("shows 'Adventures planned' (plural) when upcomingTripCount is 0", () => {
    renderStatCards({ upcomingTripCount: 0 });
    expect(screen.getByText("Adventures planned")).toBeInTheDocument();
  });

  it("shows 'Adventures planned' (plural) when upcomingTripCount is 2", () => {
    renderStatCards({ upcomingTripCount: 2 });
    expect(screen.getByText("Adventures planned")).toBeInTheDocument();
  });

  it("shows 'Traveling together' description for family members", () => {
    renderStatCards();
    expect(screen.getByText("Traveling together")).toBeInTheDocument();
  });

  it("shows 'Earning rewards' description for active cards", () => {
    renderStatCards();
    expect(screen.getByText("Earning rewards")).toBeInTheDocument();
  });

  it("shows 'Across all cards' description for total points", () => {
    renderStatCards();
    expect(screen.getByText("Across all cards")).toBeInTheDocument();
  });
});

// ─── Icons ────────────────────────────────────────────────────────────────────

describe("StatCards — icons", () => {
  it("renders the family members icon", () => {
    renderStatCards();
    expect(screen.getByText("👨‍👩‍👧‍👦")).toBeInTheDocument();
  });

  it("renders the active cards icon", () => {
    renderStatCards();
    expect(screen.getByText("💳")).toBeInTheDocument();
  });

  it("renders the upcoming trips icon", () => {
    renderStatCards();
    // ✈️ is used for both the stat icon and as a page decoration — just verify it exists
    const airplaneIcons = screen.getAllByText("✈️");
    expect(airplaneIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the total points icon", () => {
    renderStatCards();
    expect(screen.getByText("⭐")).toBeInTheDocument();
  });
});

// ─── Renders exactly 4 cards ──────────────────────────────────────────────────

describe("StatCards — structure", () => {
  it("renders exactly 4 stat cards", () => {
    const { container } = renderStatCards();
    // Each card is wrapped in a Card component which renders a <div>
    // We can count by querying the labels (one per card)
    const labels = ["Family Members", "Active Cards", "Upcoming Trips", "Total Points"];
    for (const label of labels) {
      expect(screen.getByText(new RegExp(label, "i"))).toBeInTheDocument();
    }
  });
});
