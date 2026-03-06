import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import TripDetailPage from "../page";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/trips/participants-tab", () => ({
  ParticipantsTab: () => <div>Participants</div>,
}));
vi.mock("@/components/trips/balance-tab", () => ({
  BalanceTab: () => <div>Balance</div>,
}));
vi.mock("@/components/trips/itinerary-tab", () => ({
  ItineraryTab: () => <div>Itinerary</div>,
}));
vi.mock("@/components/trips/expense-form", () => ({
  ExpenseForm: () => <div>Expense Form</div>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRIP_ID = "trip-abc";

function makeExpense(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "exp-1",
    tripId: TRIP_ID,
    familyMemberId: null,
    creditCardId: null,
    paidByParticipantId: null,
    category: "shopping",
    description: "Bulk paper",
    amount: 15.99,
    date: "2026-03-01T00:00:00.000Z",
    pointsEarned: 0,
    receiptPath: null,
    receiptGroupId: null,
    receiptGroupName: null,
    lineItemIndex: null,
    familyMember: null,
    creditCard: null,
    paidByParticipant: null,
    ...overrides,
  };
}

const GROUP_EXPENSE_1 = makeExpense({
  id: "exp-1",
  receiptGroupId: "group-1",
  receiptGroupName: "Costco",
  description: "Bulk paper",
  amount: 15.99,
  lineItemIndex: 0,
});

const GROUP_EXPENSE_2 = makeExpense({
  id: "exp-2",
  receiptGroupId: "group-1",
  receiptGroupName: "Costco",
  description: "Rotisserie chicken",
  amount: 4.99,
  lineItemIndex: 1,
});

const GROUP_EXPENSE_NO_NAME = makeExpense({
  id: "exp-3",
  receiptGroupId: "group-2",
  receiptGroupName: null,
  description: "Item A",
  amount: 10.0,
  lineItemIndex: 0,
});

const GROUP_EXPENSE_NO_NAME_2 = makeExpense({
  id: "exp-4",
  receiptGroupId: "group-2",
  receiptGroupName: null,
  description: "Item B",
  amount: 5.0,
  lineItemIndex: 1,
});

function makeTripData(expenses: ReturnType<typeof makeExpense>[]) {
  return {
    id: TRIP_ID,
    name: "Summer Trip",
    destination: "Seattle",
    startDate: "2026-03-01T00:00:00.000Z",
    endDate: null,
    budget: null,
    type: "local",
    notes: null,
    expenses,
  };
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

function stubFetch(tripData: ReturnType<typeof makeTripData>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/participants")) {
        return Promise.resolve({ json: () => Promise.resolve({ data: [], error: null }) });
      }
      if (typeof url === "string" && url.includes(`/api/trips/${TRIP_ID}`)) {
        return Promise.resolve({ json: () => Promise.resolve({ data: tripData, error: null }) });
      }
      if (url === "/api/family") {
        return Promise.resolve({ json: () => Promise.resolve({ data: [], error: null }) });
      }
      if (url === "/api/cards") {
        return Promise.resolve({ json: () => Promise.resolve({ data: [], error: null }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ data: null, error: "Not found" }) });
    })
  );
}

/**
 * React 19's use() checks for `.status === 'fulfilled'` on a thenable before
 * throwing to Suspense. Pre-priming the Promise avoids the Suspense boundary in tests.
 */
function makeResolvedParams(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id });
  return Object.assign(p, { status: "fulfilled" as const, value: { id } }) as Promise<{
    id: string;
  }>;
}

function renderPage() {
  return render(
    <Suspense fallback={<div>Loading…</div>}>
      <TripDetailPage params={makeResolvedParams(TRIP_ID)} />
    </Suspense>
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Receipt group row", () => {
  it("shows receiptGroupName when present", async () => {
    stubFetch(makeTripData([GROUP_EXPENSE_1, GROUP_EXPENSE_2]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Costco")).toBeInTheDocument();
    });
  });

  it("falls back to 'Receipt' when receiptGroupName is null", async () => {
    stubFetch(makeTripData([GROUP_EXPENSE_NO_NAME, GROUP_EXPENSE_NO_NAME_2]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Receipt")).toBeInTheDocument();
    });
  });

  it("shows '· N items' sub-label on the group row", async () => {
    stubFetch(makeTripData([GROUP_EXPENSE_1, GROUP_EXPENSE_2]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("· 2 items")).toBeInTheDocument();
    });
  });

  it("shows Edit button on the group header row", async () => {
    stubFetch(makeTripData([GROUP_EXPENSE_1, GROUP_EXPENSE_2]));
    renderPage();

    await waitFor(() => {
      // The group row Edit button appears (not expanded yet, so line-item Edit buttons aren't shown)
      expect(screen.getByText("Costco")).toBeInTheDocument();
    });

    // The Edit button is in the group row action cell
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Delete × button on the group header row", async () => {
    stubFetch(makeTripData([GROUP_EXPENSE_1, GROUP_EXPENSE_2]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Costco")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("×");
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Edit and Delete buttons on expanded line items", async () => {
    const user = userEvent.setup();
    stubFetch(makeTripData([GROUP_EXPENSE_1, GROUP_EXPENSE_2]));
    renderPage();

    // Wait for group row to appear
    await waitFor(() => {
      expect(screen.getByText("Costco")).toBeInTheDocument();
    });

    // Click the group row to expand it
    const groupRow = screen.getByText("Costco").closest("tr");
    expect(groupRow).not.toBeNull();
    await user.click(groupRow!);

    // After expanding, each line item row should have both Edit and Delete buttons
    await waitFor(() => {
      expect(screen.getByText("Bulk paper")).toBeInTheDocument();
    });

    // Should have multiple Edit buttons (1 for group row + N for line items)
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBeGreaterThanOrEqual(2);

    // Should have multiple × buttons (1 for group row + N for line items)
    const deleteButtons = screen.getAllByText("×");
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });
});
