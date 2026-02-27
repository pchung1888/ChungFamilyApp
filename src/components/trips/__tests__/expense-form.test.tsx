import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseForm } from "../expense-form";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// ─── Types & fixtures ─────────────────────────────────────────────────────────

const TRIP_ID = "trip-123";

interface MockParticipant {
  id: string;
  name: string;
  groupName: string | null;
}

interface MockFamilyMember {
  id: string;
  name: string;
}

interface MockCreditCard {
  id: string;
  name: string;
  lastFour: string;
}

interface MockExpense {
  id: string;
  familyMemberId: string | null;
  creditCardId: string | null;
  paidByParticipantId: string | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  pointsEarned: number;
  receiptPath: string | null;
}

const FAMILY_MEMBERS: MockFamilyMember[] = [
  { id: "fm-1", name: "Alice Chung" },
  { id: "fm-2", name: "Bob Chung" },
];

const CREDIT_CARDS: MockCreditCard[] = [
  { id: "cc-1", name: "Chase Sapphire", lastFour: "1234" },
  { id: "cc-2", name: "Amex Gold", lastFour: "5678" },
];

const PARTICIPANTS: MockParticipant[] = [
  { id: "p-1", name: "Alice", groupName: null },
  { id: "p-2", name: "Bob", groupName: "Friends" },
];

const EXISTING_EXPENSE: MockExpense = {
  id: "exp-1",
  familyMemberId: "fm-1",
  creditCardId: "cc-1",
  paidByParticipantId: null,
  category: "hotel",
  description: "Hampton Inn",
  amount: 250.0,
  date: "2025-08-01T00:00:00.000Z",
  pointsEarned: 500,
  receiptPath: null,
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

/** Participants-only mock — no submission. */
function mockParticipantsOnly(participants: MockParticipant[] = []): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: participants, error: null }),
    })
  );
}

/** First call = participants; second call = submission result. */
function mockParticipantsThenSubmit(
  participants: MockParticipant[],
  submitData: unknown = { id: "exp-new" },
  submitError: string | null = null
): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: participants, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: submitData, error: submitError }),
      })
  );
}

// ─── Render helpers ───────────────────────────────────────────────────────────

interface RenderOptions {
  expense?: MockExpense;
  familyMembers?: MockFamilyMember[];
  creditCards?: MockCreditCard[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

function renderForm(opts: RenderOptions = {}): {
  onSuccess: ReturnType<typeof vi.fn>;
  onCancel: ReturnType<typeof vi.fn>;
} {
  const onSuccess = opts.onSuccess ?? vi.fn();
  const onCancel = opts.onCancel ?? vi.fn();

  render(
    <ExpenseForm
      tripId={TRIP_ID}
      expense={opts.expense}
      familyMembers={opts.familyMembers ?? FAMILY_MEMBERS}
      creditCards={opts.creditCards ?? CREDIT_CARDS}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );

  return { onSuccess, onCancel };
}

async function waitForParticipantsLoaded(): Promise<void> {
  // After participants are fetched, the "Paid By" label appears
  await waitFor(() =>
    expect(
      screen.queryByText(/paid by/i)
    ).toBeInTheDocument()
  );
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Submit button label", () => {
  it("renders 'Add Expense' button when no expense prop", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    expect(
      screen.getByRole("button", { name: /add expense/i })
    ).toBeInTheDocument();
  });

  it("renders 'Save Changes' button when expense prop provided", async () => {
    mockParticipantsOnly([]);
    renderForm({ expense: EXISTING_EXPENSE });
    await waitForParticipantsLoaded();
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });
});

describe("Submit button disabled states", () => {
  it("submit is disabled when description is empty (amount filled)", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    await userEvent.type(screen.getByLabelText(/amount/i), "50");
    // description left empty
    expect(screen.getByRole("button", { name: /add expense/i })).toBeDisabled();
  });

  it("submit is disabled when amount is empty (description filled)", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    await userEvent.type(screen.getByLabelText(/description/i), "Hotel stay");
    // amount left empty
    expect(screen.getByRole("button", { name: /add expense/i })).toBeDisabled();
  });
});

describe("Cancel", () => {
  it("calls onCancel when Cancel button is clicked", async () => {
    mockParticipantsOnly([]);
    const { onCancel } = renderForm();
    await waitForParticipantsLoaded();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("Paid By dropdown", () => {
  it("shows 'Paid By' label (family member dropdown) when no participants returned", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    // Should have family member dropdown
    expect(screen.getByLabelText(/^paid by$/i)).toBeInTheDocument();
    // Should NOT have participant dropdown
    expect(screen.queryByLabelText(/paid by \(participant\)/i)).not.toBeInTheDocument();
  });

  it("shows 'Paid By (Participant)' label when participants returned", async () => {
    mockParticipantsOnly(PARTICIPANTS);
    renderForm();
    await waitFor(() =>
      expect(screen.queryByLabelText(/paid by \(participant\)/i)).toBeInTheDocument()
    );
    expect(screen.queryByLabelText(/^paid by$/i)).not.toBeInTheDocument();
  });
});

describe("Split section", () => {
  it("does not show split section when no participants", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    expect(screen.queryByText(/^split$/i)).not.toBeInTheDocument();
  });

  it("shows split section when participants exist", async () => {
    mockParticipantsOnly(PARTICIPANTS);
    renderForm();
    await waitFor(() =>
      expect(screen.getByText(/^split$/i)).toBeInTheDocument()
    );
  });
});

describe("Credit card select", () => {
  it("shows credit card options in Card Used select", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    const cardSelect = screen.getByLabelText(/card used/i);
    const options = Array.from(cardSelect.querySelectorAll("option")).map(
      (o) => o.textContent
    );
    expect(options.some((o) => o?.includes("Chase Sapphire"))).toBe(true);
    expect(options.some((o) => o?.includes("Amex Gold"))).toBe(true);
  });
});

describe("Category select", () => {
  it("shows all EXPENSE_CATEGORIES in category select", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    const categorySelect = screen.getByLabelText(/category/i);
    const optionValues = Array.from(
      categorySelect.querySelectorAll("option")
    ).map((o) => o.value);
    for (const cat of EXPENSE_CATEGORIES) {
      expect(optionValues).toContain(cat.value);
    }
  });
});

describe("Form submission", () => {
  it("sends POST to /api/trips/trip-123/expenses on submit for new expense", async () => {
    mockParticipantsThenSubmit([], { id: "exp-new" });
    const { onSuccess } = renderForm();
    await waitForParticipantsLoaded();

    await userEvent.type(screen.getByLabelText(/description/i), "Dinner");
    await userEvent.type(screen.getByLabelText(/amount/i), "45.50");

    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const submitCall = fetchMock.mock.calls.find(([url]) =>
      (url as string) === `/api/trips/${TRIP_ID}/expenses`
    );
    expect(submitCall).toBeDefined();
    const [, opts] = submitCall as [string, RequestInit];
    expect(opts.method).toBe("POST");
  });

  it("sends PATCH to /api/trips/trip-123/expenses/exp-1 on submit for edit", async () => {
    mockParticipantsThenSubmit([], { id: "exp-1" });
    const { onSuccess } = renderForm({ expense: EXISTING_EXPENSE });
    await waitForParticipantsLoaded();

    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes(`/expenses/${EXISTING_EXPENSE.id}`)
    );
    expect(patchCall).toBeDefined();
    const [, opts] = patchCall as [string, RequestInit];
    expect(opts.method).toBe("PATCH");
  });

  it("shows API error message on failed submission", async () => {
    mockParticipantsThenSubmit([], null, "Expense amount too large");
    renderForm();
    await waitForParticipantsLoaded();

    await userEvent.type(screen.getByLabelText(/description/i), "Hotel");
    await userEvent.type(screen.getByLabelText(/amount/i), "99999");

    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() =>
      expect(screen.getByText("Expense amount too large")).toBeInTheDocument()
    );
  });
});

describe("Receipt UI", () => {
  it("shows 'Attach Receipt' button when no receipt set", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();
    expect(
      screen.getByRole("button", { name: /attach receipt/i })
    ).toBeInTheDocument();
  });
});

describe("onSuccess callback", () => {
  it("calls onSuccess after successful submission", async () => {
    mockParticipantsThenSubmit([], { id: "exp-new" });
    const { onSuccess } = renderForm();
    await waitForParticipantsLoaded();

    await userEvent.type(screen.getByLabelText(/description/i), "Gas stop");
    await userEvent.type(screen.getByLabelText(/amount/i), "60");

    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
