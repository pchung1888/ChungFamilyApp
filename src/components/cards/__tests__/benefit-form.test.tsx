import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BenefitForm } from "../benefit-form";

// ─── Shared test data ────────────────────────────────────────────────────────

const existingBenefit = {
  id: "benefit-xyz",
  name: "$300 Travel Credit",
  value: 300,
  frequency: "annual",
  usedAmount: 150,
  resetDate: "2026-01-01T00:00:00.000Z",
};

const CARD_ID = "card-abc";

// ─── Fetch helpers ───────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown = { id: "new-id" }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data, error: null }),
    })
  );
}

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

// ─── Helper: fill required fields and bypass happy-dom step validation ───────

async function fillRequiredFields(): Promise<void> {
  await userEvent.type(screen.getByLabelText(/benefit name/i), "Lounge Access");
  await userEvent.type(screen.getByLabelText(/value/i), "50");
  // happy-dom bug: step="0.01" always reports stepMismatch, blocking form submission.
  document.querySelector("form")!.setAttribute("novalidate", "");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BenefitForm — button labels", () => {
  it('renders "Add Benefit" submit button for create form (no benefit prop)', () => {
    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: /add benefit/i })
    ).toBeInTheDocument();
  });

  it('renders "Save Changes" submit button for edit form (benefit prop provided)', () => {
    render(
      <BenefitForm
        cardId={CARD_ID}
        benefit={existingBenefit}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });
});

describe("BenefitForm — submit button disabled states", () => {
  it("disables submit button when name is empty", async () => {
    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    // Fill value only — name stays empty
    await userEvent.type(screen.getByLabelText(/value/i), "100");

    expect(screen.getByRole("button", { name: /add benefit/i })).toBeDisabled();
  });

  it("disables submit button when value is empty", async () => {
    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    // Fill name only — value stays empty
    await userEvent.type(screen.getByLabelText(/benefit name/i), "Some Benefit");

    expect(screen.getByRole("button", { name: /add benefit/i })).toBeDisabled();
  });
});

describe("BenefitForm — cancel", () => {
  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={onCancel} />
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("BenefitForm — loading state", () => {
  it('shows "Saving…" and disables submit while request is in flight', async () => {
    // Never resolves — keeps loading state active
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add benefit/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });
});

describe("BenefitForm — API calls", () => {
  it("sends POST to /api/cards/{cardId}/benefits for create", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <BenefitForm cardId={CARD_ID} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add benefit/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/cards/${CARD_ID}/benefits`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends PATCH to /api/cards/{cardId}/benefits/{id} for edit", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <BenefitForm
        cardId={CARD_ID}
        benefit={existingBenefit}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    );

    // Modify name to ensure form is submittable, then submit
    const nameInput = screen.getByLabelText(/benefit name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Benefit");
    // happy-dom bug: step="0.01" always reports stepMismatch, blocking form submission.
    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/cards/${CARD_ID}/benefits/${existingBenefit.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows error message when API returns error", async () => {
    mockFetchError("Benefit name already exists");

    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add benefit/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Benefit name already exists")
      ).toBeInTheDocument()
    );
  });

  it("calls onSuccess when API call succeeds", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <BenefitForm cardId={CARD_ID} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    await fillRequiredFields();
    await userEvent.click(screen.getByRole("button", { name: /add benefit/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});

describe("BenefitForm — frequency select", () => {
  it("defaults frequency to annual", () => {
    render(
      <BenefitForm cardId={CARD_ID} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );

    const select = screen.getByLabelText(/frequency/i) as HTMLSelectElement;
    expect(select.value).toBe("annual");
  });

  it("sends selected frequency in POST body", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <BenefitForm cardId={CARD_ID} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    await fillRequiredFields();
    await userEvent.selectOptions(screen.getByLabelText(/frequency/i), "monthly");
    await userEvent.click(screen.getByRole("button", { name: /add benefit/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { frequency: string };
    expect(body.frequency).toBe("monthly");
  });
});
