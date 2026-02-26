import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItineraryForm } from "../itinerary-form";
import type { ItineraryItemType } from "@/lib/constants";

// ─── Shared test data ───────────────────────────────────────────────────────

const TRIP_ID = "trip-1";

interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  type: ItineraryItemType;
  title: string;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}

const existingItem: ItineraryItem = {
  id: "item-1",
  tripId: TRIP_ID,
  date: "2026-07-04",
  type: "accommodation",
  title: "Grand Hyatt Hotel",
  location: "Vancouver, BC",
  startTime: "14:00",
  endTime: "12:00",
  notes: "Check-in at 3pm",
};

// Helper: resolve fetch with a success response
function mockFetchSuccess(data: unknown = existingItem): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data, error: null }),
    })
  );
}

// Helper: resolve fetch with an API error response
function mockFetchError(message: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: null, error: message }),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Behavioral tests ────────────────────────────────────────────────────────

describe("ItineraryForm behavior", () => {
  it("renders all fields in add mode", () => {
    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
  });

  it("shows 'Save Changes' button and pre-fills title in edit mode", () => {
    render(
      <ItineraryForm
        tripId={TRIP_ID}
        item={existingItem}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue(existingItem.title);
  });

  it("pre-fills date from defaultDate prop in add mode", () => {
    render(
      <ItineraryForm
        tripId={TRIP_ID}
        defaultDate="2026-07-04"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/date/i)).toHaveValue("2026-07-04");
  });

  it("shows validation error for missing title without calling fetch", async () => {
    mockFetchSuccess();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Fill date but leave title empty
    await userEvent.type(screen.getByLabelText(/date/i), "2026-07-04");
    // Ensure title is empty
    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.clear(titleInput);

    await userEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("shows validation error for missing date without calling fetch", async () => {
    mockFetchSuccess();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Fill title but leave date empty
    await userEvent.type(screen.getByLabelText(/title/i), "Grand Hyatt");
    // Ensure date is empty
    const dateInput = screen.getByLabelText(/date/i);
    await userEvent.clear(dateInput);

    await userEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(screen.getByText(/date is required/i)).toBeInTheDocument()
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("calls POST to correct URL on valid add-mode submit", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/date/i), "2026-07-04");
    await userEvent.type(screen.getByLabelText(/title/i), "City Tour");

    await userEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/trips/${TRIP_ID}/itinerary`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls PATCH to correct URL on edit-mode submit", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        item={existingItem}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );

    // Modify the title
    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Grand Hyatt Updated");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/trips/${TRIP_ID}/itinerary/${existingItem.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("calls onSuccess with returned item when API returns 201", async () => {
    const returnedItem: ItineraryItem = {
      id: "item-1",
      tripId: TRIP_ID,
      date: "2026-07-04",
      type: "activity",
      title: "City Tour",
      location: null,
      startTime: null,
      endTime: null,
      notes: null,
    };
    mockFetchSuccess(returnedItem);
    const onSuccess = vi.fn();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/date/i), "2026-07-04");
    await userEvent.type(screen.getByLabelText(/title/i), "City Tour");

    await userEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(returnedItem)
    );
  });

  it("shows API error message when server returns an error", async () => {
    mockFetchError("Server error");

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/date/i), "2026-07-04");
    await userEvent.type(screen.getByLabelText(/title/i), "City Tour");

    await userEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();

    render(
      <ItineraryForm
        tripId={TRIP_ID}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
