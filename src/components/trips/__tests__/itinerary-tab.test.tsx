import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItineraryTab } from "../itinerary-tab";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/components/trips/itinerary-form", () => ({
  ItineraryForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: (item: unknown) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="itinerary-form">
      <button
        onClick={() =>
          onSuccess({
            id: "new-item",
            date: "2026-07-04T00:00:00.000Z",
            title: "New Item",
            type: "activity",
            location: null,
            startTime: null,
            endTime: null,
            notes: null,
            sortOrder: 0,
          })
        }
      >
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// ─── Types & fixtures ─────────────────────────────────────────────────────────

interface MockItineraryItem {
  id: string;
  tripId: string;
  date: string;
  title: string;
  type: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sortOrder: number;
}

const TRIP_ID = "trip-1";

const sampleItems: MockItineraryItem[] = [
  {
    id: "item-1",
    tripId: "trip-1",
    date: "2026-07-04T00:00:00.000Z",
    title: "Check in at Hotel Granvia",
    type: "accommodation",
    location: "Osaka",
    startTime: "15:00",
    endTime: null,
    notes: null,
    sortOrder: 0,
  },
  {
    id: "item-2",
    tripId: "trip-1",
    date: "2026-07-05T00:00:00.000Z",
    title: "Narita Airport departure",
    type: "flight",
    location: "NRT",
    startTime: "09:00",
    endTime: "12:00",
    notes: "Check gate B22",
    sortOrder: 0,
  },
];

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockGetItems(items: MockItineraryItem[] = []): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ data: items, error: null }),
    })
  );
}

function mockGetThenDelete(items: MockItineraryItem[]): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: items, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null, error: null }),
      })
  );
}

// ─── Render & wait helpers ────────────────────────────────────────────────────

function renderTab(): ReturnType<typeof render> {
  return render(<ItineraryTab tripId={TRIP_ID} />);
}

async function waitForLoad(): Promise<void> {
  await waitFor(() =>
    expect(
      screen.queryByText(/loading itinerary/i)
    ).not.toBeInTheDocument()
  );
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Loading state", () => {
  it("shows loading text while fetch is pending", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderTab();
    expect(screen.getByText(/loading itinerary/i)).toBeInTheDocument();
    expect(screen.getByText(/add item/i)).toBeInTheDocument();
  });
});

describe("Empty state", () => {
  it("shows calendar emoji and empty-state message when no items returned", async () => {
    mockGetItems([]);
    renderTab();
    await waitForLoad();
    expect(screen.getByText("🗓️")).toBeInTheDocument();
    expect(
      screen.getByText(/no itinerary yet/i)
    ).toBeInTheDocument();
  });
});

describe("Rendering items grouped by day", () => {
  it("renders all item titles when items are present", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    expect(
      screen.getByText("Check in at Hotel Granvia")
    ).toBeInTheDocument();
    expect(screen.getByText("Narita Airport departure")).toBeInTheDocument();
  });

  it("renders two day headers for items on different dates", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    // Both July 4 and July 5 should appear as day headers
    expect(screen.getByText(/jul 4/i)).toBeInTheDocument();
    expect(screen.getByText(/jul 5/i)).toBeInTheDocument();
  });
});

describe("Item detail rendering", () => {
  it("shows location for an item that has one", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    // Location is prefixed with 📍 — verify the location text "Osaka" is visible
    expect(screen.getByText(/osaka/i)).toBeInTheDocument();
  });

  it("shows start time for an item that has one", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    // Time is prefixed with 🕐 — verify "15:00" is visible
    expect(screen.getByText(/15:00/)).toBeInTheDocument();
  });

  it("shows notes for an item that has notes", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    expect(screen.getByText(/check gate b22/i)).toBeInTheDocument();
  });

  it("shows the correct type badge for a flight item", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();
    expect(screen.getByText("Flight")).toBeInTheDocument();
  });
});

describe("Delete flow", () => {
  it("calls DELETE and removes the item when confirm is accepted", async () => {
    mockGetThenDelete(sampleItems);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTab();
    await waitForLoad();

    // Click the × delete button on the first item
    const deleteButtons = screen.getAllByRole("button", { name: /×|delete|remove/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(
        screen.queryByText("Check in at Hotel Granvia")
      ).not.toBeInTheDocument()
    );

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    const [deleteUrl, deleteOpts] = vi.mocked(fetch).mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(deleteUrl).toContain(`/itinerary/item-1`);
    expect(deleteOpts.method).toBe("DELETE");
  });

  it("does not call DELETE when confirm is cancelled", async () => {
    mockGetItems(sampleItems);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTab();
    await waitForLoad();

    const deleteButtons = screen.getAllByRole("button", { name: /×|delete|remove/i });
    await userEvent.click(deleteButtons[0]);

    // Only the initial GET — no DELETE
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Check in at Hotel Granvia")
    ).toBeInTheDocument();
  });
});

describe("Add item dialog", () => {
  it("shows the ItineraryForm when '+ Add Item' button is clicked", async () => {
    mockGetItems([]);
    renderTab();
    await waitForLoad();

    await userEvent.click(
      screen.getByRole("button", { name: /add item/i })
    );

    expect(screen.getByTestId("itinerary-form")).toBeInTheDocument();
  });

  it("adds the new item to the list after the form submits successfully", async () => {
    mockGetItems([]);
    renderTab();
    await waitForLoad();

    await userEvent.click(
      screen.getByRole("button", { name: /add item/i })
    );
    // Click the mock form's Submit button
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(screen.getByText("New Item")).toBeInTheDocument()
    );
  });
});

describe("Edit item dialog", () => {
  it("shows the ItineraryForm when Edit button is clicked on an item", async () => {
    mockGetItems(sampleItems);
    renderTab();
    await waitForLoad();

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(screen.getByTestId("itinerary-form")).toBeInTheDocument();
  });
});
