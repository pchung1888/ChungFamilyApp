/**
 * Tests for SpendingChart dashboard component.
 *
 * Covers: empty state, heading, grand total formatting, category label + amount +
 * percentage display, descending sort order, and stacked bar aria-labels.
 */

import { render, screen } from "@testing-library/react";
import { SpendingChart } from "../spending-chart";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface CategoryTotal {
  category: string;
  total: number;
}

function renderChart(
  categoryTotals: CategoryTotal[],
  grandTotal: number
) {
  return render(
    <SpendingChart categoryTotals={categoryTotals} grandTotal={grandTotal} />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("SpendingChart — empty state", () => {
  it("shows 'No spending data yet.' when categoryTotals is empty", () => {
    renderChart([], 0);
    expect(screen.getByText("No spending data yet.")).toBeInTheDocument();
  });

  it("does not render a stacked bar when categoryTotals is empty", () => {
    renderChart([], 0);
    // No segments with role="presentation" should exist.
    expect(
      screen.queryByRole("presentation")
    ).not.toBeInTheDocument();
  });
});

// ─── Heading ──────────────────────────────────────────────────────────────────

describe("SpendingChart — heading", () => {
  it("shows 'Spending by Category' heading", () => {
    renderChart([], 0);
    expect(screen.getByText("Spending by Category")).toBeInTheDocument();
  });
});

// ─── Grand total ──────────────────────────────────────────────────────────────

describe("SpendingChart — grand total", () => {
  it("shows grand total formatted as '$1500.00'", () => {
    renderChart([{ category: "food", total: 1500 }], 1500);
    // React splits the JSX `${}` expression into sibling text nodes, so the
    // dollar sign and the number may live in separate DOM nodes. Use
    // getAllByText with a regex to locate the paragraph by partial content,
    // then verify its full text.
    const grandTotalEl = screen
      .getAllByText(/\$1500\.00/)
      .find((el) => el.textContent === "$1500.00");
    expect(grandTotalEl).toBeDefined();
  });

  it("shows '$0.00' when grandTotal is 0", () => {
    renderChart([], 0);
    const grandTotalEl = screen
      .getAllByText(/\$0\.00/)
      .find((el) => el.textContent === "$0.00");
    expect(grandTotalEl).toBeDefined();
  });

  it("shows two decimal places for whole dollar amounts", () => {
    // With total 500, there's only a grand total element and no breakdown
    // collision at the same value.
    renderChart([{ category: "hotel", total: 500 }], 500);
    const els = screen.getAllByText(/\$500\.00/);
    // At least the grand total paragraph must contain "$500.00".
    const grandTotalEl = els.find((el) => el.textContent === "$500.00");
    expect(grandTotalEl).toBeDefined();
  });
});

// ─── Category rows ────────────────────────────────────────────────────────────

describe("SpendingChart — category rows", () => {
  it("shows category label 'Food' for category 'food'", () => {
    renderChart([{ category: "food", total: 750 }], 1500);
    // The label appears in both the stacked bar aria-label and the breakdown row.
    // getAllByText handles multiple matches.
    expect(screen.getAllByText("Food").length).toBeGreaterThanOrEqual(1);
  });

  it("shows category label 'EV Charging' for category 'ev_charging'", () => {
    renderChart([{ category: "ev_charging", total: 100 }], 100);
    expect(screen.getAllByText("EV Charging").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the formatted amount '$750.00' for a food category with total 750", () => {
    renderChart([{ category: "food", total: 750 }], 1500);
    expect(screen.getByText("$750.00")).toBeInTheDocument();
  });

  it("shows percentage '50%' when food is half of grand total", () => {
    renderChart([{ category: "food", total: 750 }], 1500);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows percentage '100%' when a single category is the entire total", () => {
    renderChart([{ category: "hotel", total: 500 }], 500);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows percentage '33%' when a category is one-third of total", () => {
    renderChart(
      [
        { category: "food", total: 100 },
        { category: "hotel", total: 100 },
        { category: "gas", total: 100 },
      ],
      300
    );
    // All three should be 33%
    const pcts = screen.getAllByText("33%");
    expect(pcts.length).toBe(3);
  });
});

// ─── Sort order ───────────────────────────────────────────────────────────────

describe("SpendingChart — sort order", () => {
  it("renders the highest-total category first", () => {
    renderChart(
      [
        { category: "food", total: 300 },
        { category: "hotel", total: 900 },
        { category: "gas", total: 150 },
      ],
      1350
    );

    // The breakdown labels appear in the DOM in sorted order.
    // Query all category-text elements and verify hotel precedes food precedes gas.
    const labels = screen.getAllByText(/^(Hotel|Food|Gas)$/);
    const texts = labels.map((el) => el.textContent);

    const hotelIdx = texts.indexOf("Hotel");
    const foodIdx = texts.indexOf("Food");
    const gasIdx = texts.indexOf("Gas");

    expect(hotelIdx).toBeLessThan(foodIdx);
    expect(foodIdx).toBeLessThan(gasIdx);
  });
});

// ─── Stacked bar aria-labels ──────────────────────────────────────────────────

describe("SpendingChart — stacked bar aria-labels", () => {
  it("stacked bar segment has aria-label 'Food: 50.0%' when food is 50% of total", () => {
    renderChart([{ category: "food", total: 750 }], 1500);
    // The component renders role="presentation" segments with aria-label.
    const segment = screen
      .getAllByRole("presentation")
      .find((el) => el.getAttribute("aria-label") === "Food: 50.0%");
    expect(segment).toBeDefined();
  });

  it("stacked bar segment has aria-label 'Hotel: 100.0%' for a single category", () => {
    renderChart([{ category: "hotel", total: 200 }], 200);
    const segment = screen
      .getAllByRole("presentation")
      .find((el) => el.getAttribute("aria-label") === "Hotel: 100.0%");
    expect(segment).toBeDefined();
  });

  it("renders one stacked bar segment per category", () => {
    renderChart(
      [
        { category: "food", total: 500 },
        { category: "gas", total: 250 },
        { category: "shopping", total: 250 },
      ],
      1000
    );
    expect(screen.getAllByRole("presentation").length).toBe(3);
  });
});
