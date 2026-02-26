/**
 * Tests for UpcomingTrips dashboard component.
 *
 * Covers: empty state, trip rendering, countdown chip labels
 * (Today!, Tomorrow, Nd away), and budget progress display.
 *
 * Note: The component does NOT render an "Active Now" badge — trips currently
 * in progress show a "Today!" chip (daysUntil <= 0). Tests match actual behaviour.
 */

import { render, screen } from "@testing-library/react";
import { UpcomingTrips } from "../upcoming-trips";

// ─── Mock next/link ───────────────────────────────────────────────────────────
// next/link requires the Next.js router in tests; use a simple passthrough.

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a trip fixture with sensible defaults. startDate is relative to now. */
function makeTrip(overrides: {
  id?: string;
  name?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date | null;
  budget?: number | null;
  type?: string;
  totalSpent?: number;
}) {
  return {
    id: overrides.id ?? "trip-1",
    name: overrides.name ?? "Test Trip",
    destination: overrides.destination ?? "Vancouver, BC",
    startDate: overrides.startDate ?? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    endDate: overrides.endDate ?? null,
    budget: overrides.budget ?? null,
    type: overrides.type ?? "flight",
    totalSpent: overrides.totalSpent ?? 0,
  };
}

/** Create a Date that is N days from now (can be negative for past dates). */
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

describe("UpcomingTrips snapshots", () => {
  it("renders empty state correctly", () => {
    const { container } = render(<UpcomingTrips trips={[]} />);
    expect(container).toMatchSnapshot();
  });

  it("renders a list of trips correctly", () => {
    const trips = [
      makeTrip({ name: "Tokyo Adventure", destination: "Tokyo, Japan" }),
    ];
    const { container } = render(<UpcomingTrips trips={trips} />);
    expect(container).toMatchSnapshot();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("UpcomingTrips — empty state", () => {
  it("shows 'No upcoming trips.' message when trips array is empty", () => {
    render(<UpcomingTrips trips={[]} />);
    expect(screen.getByText(/no upcoming trips/i)).toBeInTheDocument();
  });

  it("shows 'Plan one now' link when trips array is empty", () => {
    render(<UpcomingTrips trips={[]} />);
    expect(screen.getByRole("link", { name: /plan one now/i })).toBeInTheDocument();
  });

  it("does not show trip names when trips array is empty", () => {
    render(<UpcomingTrips trips={[]} />);
    expect(screen.queryByText("Tokyo Adventure")).not.toBeInTheDocument();
  });
});

// ─── Trip list rendering ──────────────────────────────────────────────────────

describe("UpcomingTrips — trip list", () => {
  it("renders the trip name", () => {
    const trips = [makeTrip({ name: "Kyoto & Osaka" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Kyoto & Osaka")).toBeInTheDocument();
  });

  it("renders the trip destination", () => {
    const trips = [makeTrip({ destination: "Tokyo, Japan" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText(/Tokyo, Japan/)).toBeInTheDocument();
  });

  it("renders all trips when multiple are provided", () => {
    const trips = [
      makeTrip({ id: "t-1", name: "Trip One" }),
      makeTrip({ id: "t-2", name: "Trip Two" }),
      makeTrip({ id: "t-3", name: "Trip Three" }),
    ];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Trip One")).toBeInTheDocument();
    expect(screen.getByText("Trip Two")).toBeInTheDocument();
    expect(screen.getByText("Trip Three")).toBeInTheDocument();
  });

  it("renders a link to each trip's detail page", () => {
    const trips = [makeTrip({ id: "trip-xyz", name: "My Trip" })];
    render(<UpcomingTrips trips={trips} />);
    const link = screen.getByRole("link", { name: /my trip/i });
    expect(link).toHaveAttribute("href", "/trips/trip-xyz");
  });

  it("renders the 'All trips' link", () => {
    render(<UpcomingTrips trips={[makeTrip({})]} />);
    expect(screen.getByRole("link", { name: /all trips/i })).toBeInTheDocument();
  });
});

// ─── Countdown chips ─────────────────────────────────────────────────────────

describe("UpcomingTrips — countdown chips", () => {
  it("shows 'Today!' chip for a trip starting today (0 days away)", () => {
    // Set startDate to exactly now — daysUntil will be 0 or negative
    const trips = [makeTrip({ startDate: new Date() })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Today!")).toBeInTheDocument();
  });

  it("shows 'Today!' chip for a trip whose startDate has passed (already started)", () => {
    const trips = [makeTrip({ startDate: daysFromNow(-2) })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Today!")).toBeInTheDocument();
  });

  it("shows 'Tomorrow' chip for a trip starting in 1 day", () => {
    const trips = [makeTrip({ startDate: daysFromNow(1) })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });

  it("shows 'Nd away' chip for a trip starting in 5 days", () => {
    const trips = [makeTrip({ startDate: daysFromNow(5) })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("5d away")).toBeInTheDocument();
  });

  it("shows 'Nd away' chip (muted) for a trip starting in 14 days", () => {
    const trips = [makeTrip({ startDate: daysFromNow(14) })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("14d away")).toBeInTheDocument();
  });
});

// ─── Trip type badges ─────────────────────────────────────────────────────────

describe("UpcomingTrips — trip type badges", () => {
  it("shows 'Road Trip' badge for road_trip type", () => {
    const trips = [makeTrip({ type: "road_trip" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Road Trip")).toBeInTheDocument();
  });

  it("shows 'Flight' badge for flight type", () => {
    const trips = [makeTrip({ type: "flight" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Flight")).toBeInTheDocument();
  });

  it("shows 'Local' badge for local type", () => {
    const trips = [makeTrip({ type: "local" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("Local")).toBeInTheDocument();
  });

  it("falls back to the raw type value for an unknown type", () => {
    const trips = [makeTrip({ type: "cruise" })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText("cruise")).toBeInTheDocument();
  });
});

// ─── Budget progress ──────────────────────────────────────────────────────────

describe("UpcomingTrips — budget progress", () => {
  it("shows spent and budget amounts when budget is set", () => {
    const trips = [makeTrip({ budget: 1000, totalSpent: 400 })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.getByText(/400 spent/i)).toBeInTheDocument();
    expect(screen.getByText(/1000 budget/i)).toBeInTheDocument();
  });

  it("does not show budget progress bar when budget is null", () => {
    const trips = [makeTrip({ budget: null, totalSpent: 0 })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.queryByText(/spent/i)).not.toBeInTheDocument();
  });

  it("does not show budget progress bar when budget is 0 (null passed)", () => {
    // When budget is null, no progress bar is shown at all
    const trips = [makeTrip({ budget: null })];
    render(<UpcomingTrips trips={trips} />);
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
  });
});
