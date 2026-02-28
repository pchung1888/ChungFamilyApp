/**
 * Tests for RecentExpenses dashboard component.
 *
 * Covers: empty state, expense description/amount/category/date rendering,
 * trip name link, family member display (present and null), heading, and
 * the "All trips" link.
 */

import { render, screen } from "@testing-library/react";
import { RecentExpenses } from "../recent-expenses";

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

interface ExpenseOverrides {
  id?: string;
  description?: string;
  amount?: number;
  category?: string;
  date?: Date;
  trip?: { id: string; name: string };
  familyMember?: { name: string } | null;
}

function makeExpense(overrides: ExpenseOverrides = {}) {
  return {
    id: overrides.id ?? "exp-1",
    description: overrides.description ?? "Test expense",
    amount: overrides.amount ?? 50.0,
    category: overrides.category ?? "food",
    date: overrides.date ?? new Date("2026-03-15"),
    trip: overrides.trip ?? { id: "trip-1", name: "Spring Trip" },
    familyMember:
      overrides.familyMember !== undefined
        ? overrides.familyMember
        : { name: "Alice" },
  };
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("RecentExpenses — empty state", () => {
  it("shows 'No expenses yet.' when expenses array is empty", () => {
    render(<RecentExpenses expenses={[]} />);
    expect(screen.getByText("No expenses yet.")).toBeInTheDocument();
  });

  it("does not show expense descriptions when expenses is empty", () => {
    render(<RecentExpenses expenses={[]} />);
    expect(screen.queryByText("Test expense")).not.toBeInTheDocument();
  });
});

// ─── Heading ──────────────────────────────────────────────────────────────────

describe("RecentExpenses — heading", () => {
  it("shows 'Recent Expenses' heading", () => {
    render(<RecentExpenses expenses={[]} />);
    expect(screen.getByText("Recent Expenses")).toBeInTheDocument();
  });
});

// ─── Expense fields ───────────────────────────────────────────────────────────

describe("RecentExpenses — expense fields", () => {
  it("shows the expense description", () => {
    render(
      <RecentExpenses
        expenses={[makeExpense({ description: "Ramen dinner" })]}
      />
    );
    expect(screen.getByText("Ramen dinner")).toBeInTheDocument();
  });

  it("shows the formatted amount as '$85.50'", () => {
    render(<RecentExpenses expenses={[makeExpense({ amount: 85.5 })]} />);
    expect(screen.getByText("$85.50")).toBeInTheDocument();
  });

  it("shows the category label 'Food' for category 'food'", () => {
    render(
      <RecentExpenses expenses={[makeExpense({ category: "food" })]} />
    );
    expect(screen.getByText("Food")).toBeInTheDocument();
  });

  it("shows the category label 'EV Charging' for category 'ev_charging'", () => {
    render(
      <RecentExpenses expenses={[makeExpense({ category: "ev_charging" })]} />
    );
    expect(screen.getByText("EV Charging")).toBeInTheDocument();
  });

  it("shows the category label 'Hotel' for category 'hotel'", () => {
    render(
      <RecentExpenses expenses={[makeExpense({ category: "hotel" })]} />
    );
    expect(screen.getByText("Hotel")).toBeInTheDocument();
  });

  it("shows the category label 'Flight' for category 'flight'", () => {
    render(
      <RecentExpenses expenses={[makeExpense({ category: "flight" })]} />
    );
    expect(screen.getByText("Flight")).toBeInTheDocument();
  });

  it("shows the category label 'Tours & Activities' for category 'tours'", () => {
    render(
      <RecentExpenses expenses={[makeExpense({ category: "tours" })]} />
    );
    expect(screen.getByText("Tours & Activities")).toBeInTheDocument();
  });

  it("shows date formatted as 'Mar 15' for March 15 2026", () => {
    // Use local Date constructor (year, monthIndex, day) to avoid UTC midnight
    // shifting the date to the previous day in negative-offset timezones.
    render(
      <RecentExpenses
        expenses={[makeExpense({ date: new Date(2026, 2, 15) })]}
      />
    );
    expect(screen.getByText("Mar 15")).toBeInTheDocument();
  });

  it("shows date formatted as 'Jan 1' for January 1 2026", () => {
    render(
      <RecentExpenses
        expenses={[makeExpense({ date: new Date(2026, 0, 1) })]}
      />
    );
    expect(screen.getByText("Jan 1")).toBeInTheDocument();
  });
});

// ─── Trip link ────────────────────────────────────────────────────────────────

describe("RecentExpenses — trip link", () => {
  it("shows trip name as a link to /trips/{id}", () => {
    render(
      <RecentExpenses
        expenses={[
          makeExpense({ trip: { id: "trip-abc", name: "Tokyo Adventure" } }),
        ]}
      />
    );
    const link = screen.getByRole("link", { name: "Tokyo Adventure" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/trips/trip-abc");
  });
});

// ─── Family member ────────────────────────────────────────────────────────────

describe("RecentExpenses — family member", () => {
  it("shows family member name when familyMember is present", () => {
    render(
      <RecentExpenses
        expenses={[makeExpense({ familyMember: { name: "Bob" } })]}
      />
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("does not show a family member name when familyMember is null", () => {
    render(
      <RecentExpenses
        expenses={[makeExpense({ familyMember: null })]}
      />
    );
    // The component renders the name inside a <span>; if null it emits nothing.
    // We check the member name from the default fixture is absent.
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});

// ─── All trips link ───────────────────────────────────────────────────────────

describe("RecentExpenses — 'All trips' link", () => {
  it("renders an 'All trips' link to /trips", () => {
    render(<RecentExpenses expenses={[]} />);
    const link = screen.getByRole("link", { name: /all trips/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/trips");
  });
});

// ─── Multiple expenses ────────────────────────────────────────────────────────

describe("RecentExpenses — multiple expenses", () => {
  it("renders all provided expenses", () => {
    render(
      <RecentExpenses
        expenses={[
          makeExpense({
            id: "e-1",
            description: "Hotel checkin",
            category: "hotel",
          }),
          makeExpense({
            id: "e-2",
            description: "Gas fill-up",
            category: "gas",
          }),
        ]}
      />
    );
    expect(screen.getByText("Hotel checkin")).toBeInTheDocument();
    expect(screen.getByText("Gas fill-up")).toBeInTheDocument();
    expect(screen.getByText("Hotel")).toBeInTheDocument();
    expect(screen.getByText("Gas")).toBeInTheDocument();
  });
});
