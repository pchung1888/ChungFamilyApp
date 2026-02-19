import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardForm } from "../card-form";

// ─── Shared test data ───────────────────────────────────────────────────────

const existingCard = {
  id: "card-abc",
  name: "Chase Sapphire Reserve",
  network: "Visa",
  lastFour: "1234",
  annualFee: 550,
  annualFeeDate: null,
  pointsBalance: 50000,
  pointsExpiresAt: null,
  pointsName: "Chase Ultimate Rewards",
  pointsCppValue: 1.5,
  isActive: true,
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
// name, network (select), lastFour (4 digits), pointsName
async function fillRequiredFields(): Promise<void> {
  await userEvent.type(screen.getByLabelText(/card name/i), "Test Card");
  await userEvent.selectOptions(screen.getByLabelText(/network/i), "Visa");
  await userEvent.type(screen.getByLabelText(/last 4 digits/i), "5678");
  await userEvent.type(screen.getByLabelText(/points program name/i), "Test Points");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Snapshot tests ──────────────────────────────────────────────────────────

describe("CardForm snapshots", () => {
  it("renders create form correctly (no card prop)", () => {
    const { container } = render(
      <CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders edit form correctly (card prop provided)", () => {
    const { container } = render(
      <CardForm card={existingCard} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});

// ─── Behavioral tests ────────────────────────────────────────────────────────

describe("CardForm behavior", () => {
  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(<CardForm onSuccess={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables submit button when name is empty", async () => {
    render(<CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // Fill every required field except name
    await userEvent.selectOptions(screen.getByLabelText(/network/i), "Visa");
    await userEvent.type(screen.getByLabelText(/last 4 digits/i), "1234");
    await userEvent.type(screen.getByLabelText(/points program name/i), "Chase UR");

    expect(screen.getByRole("button", { name: /add card/i })).toBeDisabled();
  });

  it("disables submit button when lastFour has fewer than 4 digits", async () => {
    render(<CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/card name/i), "My Card");
    await userEvent.selectOptions(screen.getByLabelText(/network/i), "Visa");
    await userEvent.type(screen.getByLabelText(/last 4 digits/i), "123"); // only 3 digits
    await userEvent.type(screen.getByLabelText(/points program name/i), "Rewards");

    expect(screen.getByRole("button", { name: /add card/i })).toBeDisabled();
  });

  it("lastFour input strips non-digit characters", async () => {
    render(<CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const lastFourInput = screen.getByLabelText(/last 4 digits/i);
    await userEvent.type(lastFourInput, "12ab");

    // Non-digit characters are stripped by the onChange handler
    expect(lastFourInput).toHaveValue("12");
  });

  it("shows 'Saving…' and disables submit while request is in flight", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(<CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add card/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("sends POST to /api/cards and calls onSuccess for a new card", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<CardForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add card/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends PATCH to /api/cards/:id and calls onSuccess when editing", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <CardForm card={existingCard} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    // Modify name to trigger a change, then submit
    const nameInput = screen.getByLabelText(/card name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Chase Sapphire Preferred");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/cards/${existingCard.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows API error message when request fails", async () => {
    mockFetchError("Card name already exists");

    render(<CardForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add card/i }));

    await waitFor(() =>
      expect(screen.getByText("Card name already exists")).toBeInTheDocument()
    );
  });

  it("sends isActive: false when 'Inactive' status is selected", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<CardForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillRequiredFields();
    await userEvent.selectOptions(screen.getByLabelText(/status/i), "inactive");
    await userEvent.click(screen.getByRole("button", { name: /add card/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { isActive: boolean };
    expect(body.isActive).toBe(false);
  });

  it("sends annualFeeDate and pointsExpiresAt as null when left empty", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<CardForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillRequiredFields();
    // Leave both date fields empty (they default to "")
    await userEvent.click(screen.getByRole("button", { name: /add card/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      annualFeeDate: unknown;
      pointsExpiresAt: unknown;
    };
    expect(body.annualFeeDate).toBeNull();
    expect(body.pointsExpiresAt).toBeNull();
  });
});
