import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripForm } from "../trip-form";
import { TRIP_TYPES } from "@/lib/constants";

// ─── Shared test data ───────────────────────────────────────────────────────

const existingTrip = {
  id: "trip-xyz",
  name: "Toronto Road Trip",
  destination: "Toronto, ON",
  startDate: "2025-07-01T00:00:00.000Z",
  endDate: "2025-07-07T00:00:00.000Z",
  budget: 2000,
  type: "road_trip",
  notes: "Exciting trip!",
};

// Helper: resolve fetch with a success response
function mockFetchSuccess(data: unknown = { id: "new-id" }): void {
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

// Fill the minimum required fields to enable the submit button:
// name, destination, startDate
async function fillRequiredFields(): Promise<void> {
  await userEvent.type(screen.getByLabelText(/trip name/i), "Summer Vacation");
  await userEvent.type(screen.getByLabelText(/destination/i), "Vancouver, BC");
  await userEvent.type(screen.getByLabelText(/start date/i), "2025-08-01");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Snapshot tests ──────────────────────────────────────────────────────────

describe("TripForm snapshots", () => {
  it("renders create form correctly (no trip prop)", () => {
    const { container } = render(
      <TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders edit form correctly (trip prop provided)", () => {
    const { container } = render(
      <TripForm trip={existingTrip} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});

// ─── Behavioral tests ────────────────────────────────────────────────────────

describe("TripForm behavior", () => {
  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(<TripForm onSuccess={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables submit button when name is empty", async () => {
    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // Fill destination and startDate but not name
    await userEvent.type(screen.getByLabelText(/destination/i), "Vancouver, BC");
    await userEvent.type(screen.getByLabelText(/start date/i), "2025-08-01");

    expect(screen.getByRole("button", { name: /create trip/i })).toBeDisabled();
  });

  it("disables submit button when destination is empty", async () => {
    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // Fill name and startDate but not destination
    await userEvent.type(screen.getByLabelText(/trip name/i), "Summer Vacation");
    await userEvent.type(screen.getByLabelText(/start date/i), "2025-08-01");

    expect(screen.getByRole("button", { name: /create trip/i })).toBeDisabled();
  });

  it("disables submit button when startDate is empty", async () => {
    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // Fill name and destination but not startDate
    await userEvent.type(screen.getByLabelText(/trip name/i), "Summer Vacation");
    await userEvent.type(screen.getByLabelText(/destination/i), "Vancouver, BC");

    expect(screen.getByRole("button", { name: /create trip/i })).toBeDisabled();
  });

  it("shows 'Saving…' and disables submit while request is in flight", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /create trip/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("sends POST to /api/trips and calls onSuccess for a new trip", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<TripForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /create trip/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trips",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends PATCH to /api/trips/:id and calls onSuccess when editing", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <TripForm trip={existingTrip} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    // Modify name, then submit
    const nameInput = screen.getByLabelText(/trip name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Toronto Extended Trip");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/trips/${existingTrip.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows API error message when request fails", async () => {
    mockFetchError("Trip name already exists");

    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /create trip/i }));

    await waitFor(() =>
      expect(screen.getByText("Trip name already exists")).toBeInTheDocument()
    );
  });

  it("sends endDate, budget, and notes as null when left empty", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<TripForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    // Fill only the required fields — leave optional fields blank
    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /create trip/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      endDate: unknown;
      budget: unknown;
      notes: unknown;
    };
    expect(body.endDate).toBeNull();
    expect(body.budget).toBeNull();
    expect(body.notes).toBeNull();
  });

  it("submits the selected trip type in the request body", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<TripForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillRequiredFields();
    // Change from the default 'road_trip' to 'flight'
    await userEvent.selectOptions(screen.getByLabelText(/type/i), "flight");
    await userEvent.click(screen.getByRole("button", { name: /create trip/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { type: string };
    expect(body.type).toBe("flight");
  });

  it("renders an option for every TRIP_TYPE constant", () => {
    render(<TripForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const typeSelect = screen.getByLabelText(/type/i);
    const options = Array.from(typeSelect.querySelectorAll("option")).map(
      (o) => o.value
    );

    for (const tripType of TRIP_TYPES) {
      expect(options).toContain(tripType.value);
    }
  });
});
