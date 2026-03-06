import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  receiptGroupId: string | null;
  lineItemIndex: number | null;
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
  receiptGroupId: null,
  lineItemIndex: null,
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

const EXPENSE_WITH_RECEIPT: MockExpense = {
  ...EXISTING_EXPENSE,
  receiptPath: "receipts/test-receipt.jpg",
};

describe("Receipt UI — with existing receiptPath", () => {
  it("shows receipt image preview when expense has receiptPath", async () => {
    mockParticipantsOnly([]);
    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();
    const img = screen.getByAltText(/receipt preview/i);
    expect(img).toBeInTheDocument();
    expect((img as HTMLImageElement).src).toContain("receipts/test-receipt.jpg");
  });

  it("shows '× Remove' button when receipt is set", async () => {
    mockParticipantsOnly([]);
    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("shows '✨ Scan with AI' button when receiptPath is set", async () => {
    mockParticipantsOnly([]);
    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();
    expect(screen.getByRole("button", { name: /scan with ai/i })).toBeInTheDocument();
  });

  it("clicking '× Remove' switches back to Attach Receipt button", async () => {
    mockParticipantsOnly([]);
    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /attach receipt/i })).toBeInTheDocument()
    );
    expect(screen.queryByAltText(/receipt preview/i)).not.toBeInTheDocument();
  });

  it("scan fills fields on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }), // participants
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              data: {
                merchantName: "Grand Hotel",
                date: "2025-09-10",
                items: [{ description: "Scanned Hotel", amount: 123.45, category: "hotel" }],
              },
              error: null,
            }),
        })
    );

    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /scan with ai/i }));

    await waitFor(() =>
      expect(screen.getByText(/fields filled from receipt/i)).toBeInTheDocument()
    );

    const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    expect(descriptionInput.value).toBe("Scanned Hotel");
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe("123.45");
  });

  it("scan shows error when AI cannot read fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              data: { merchantName: null, date: null, items: [] },
              error: null,
            }),
        })
    );

    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /scan with ai/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/AI could not read any fields from this receipt/i)
      ).toBeInTheDocument()
    );
  });

  it("scan shows error message from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: null, error: "Scan failed" }),
        })
    );

    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /scan with ai/i }));

    await waitFor(() =>
      expect(screen.getByText(/scan failed/i)).toBeInTheDocument()
    );
  });
});

describe("Split mode UI", () => {
  it("shows per-person breakdown text in Equal per Person mode when amount is filled", async () => {
    mockParticipantsOnly(PARTICIPANTS);
    renderForm();
    await waitFor(() =>
      expect(screen.getByText(/^split$/i)).toBeInTheDocument()
    );

    await userEvent.type(screen.getByLabelText(/amount/i), "100");
    await userEvent.click(screen.getByRole("button", { name: /equal per person/i }));

    // "Split equally among 2 participants" is unique to the pills section
    await waitFor(() =>
      expect(screen.getByText(/split equally among 2 participant/i)).toBeInTheDocument()
    );
  });

  it("shows group breakdown in Equal by Group mode when amount is filled", async () => {
    const groupParticipants: MockParticipant[] = [
      { id: "p-1", name: "Alice", groupName: "Family" },
      { id: "p-2", name: "Bob", groupName: "Family" },
      { id: "p-3", name: "Carol", groupName: null },
    ];
    mockParticipantsOnly(groupParticipants);
    renderForm();
    await waitFor(() =>
      expect(screen.getByText(/^split$/i)).toBeInTheDocument()
    );

    await userEvent.type(screen.getByLabelText(/amount/i), "90");
    await userEvent.click(screen.getByRole("button", { name: /equal by group/i }));

    // 2 groups (Family + Carol solo) → $45.00 per group
    await waitFor(() =>
      expect(screen.getByText(/split equally among 2 group/i)).toBeInTheDocument()
    );
  });

  it("includes splits in POST body when equal_person mode active", async () => {
    mockParticipantsOnly(PARTICIPANTS);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: PARTICIPANTS, error: null }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: { id: "exp-new" }, error: null }),
        })
    );

    const { onSuccess } = renderForm();
    await waitFor(() =>
      expect(screen.getByText(/^split$/i)).toBeInTheDocument()
    );

    await userEvent.type(screen.getByLabelText(/description/i), "Hotel");
    await userEvent.type(screen.getByLabelText(/amount/i), "100");
    await userEvent.click(screen.getByRole("button", { name: /equal per person/i }));

    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const submitCall = fetchMock.mock.calls.find(([url]) =>
      (url as string) === `/api/trips/${TRIP_ID}/expenses`
    );
    expect(submitCall).toBeDefined();
    const [, opts] = submitCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { splits: Array<{ participantId: string; amount: number }> };
    expect(body.splits).toBeDefined();
    expect(body.splits).toHaveLength(2);
    expect(body.splits[0].amount).toBe(50);
  });
});

describe("Line-item mode — switch controls", () => {
  it("clicking 'Switch to line-item mode' shows LineItemEditor", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();

    expect(screen.queryByText(/switch to single expense/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/switch to line-item mode/i));

    await waitFor(() =>
      expect(screen.getByText(/switch to single expense/i)).toBeInTheDocument()
    );
  });

  it("clicking 'Switch to single expense' returns to single mode", async () => {
    mockParticipantsOnly([]);
    renderForm();
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByText(/switch to line-item mode/i));
    await waitFor(() =>
      expect(screen.getByText(/switch to single expense/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText(/switch to single expense/i));

    await waitFor(() =>
      expect(screen.queryByText(/switch to single expense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/switch to line-item mode/i)).toBeInTheDocument();
  });
});

describe("Multi-item scan → line-item mode", () => {
  it("switches to line-item mode when scan returns multiple items", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              data: {
                merchantName: "Costco",
                date: "2026-03-01",
                items: [
                  { description: "Bulk paper", amount: 15.99, category: "shopping" },
                  { description: "Rotisserie chicken", amount: 4.99, category: "food" },
                ],
              },
              error: null,
            }),
        })
    );

    renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /scan with ai/i }));

    await waitFor(() =>
      expect(screen.getByText(/2 line items found from Costco/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/switch to single expense/i)).toBeInTheDocument();
  });
});

describe("Line-item batch submit", () => {
  it("submits to from-receipt endpoint and calls onSuccess", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: { count: 1 }, error: null }),
        })
    );

    const { onSuccess } = renderForm();
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByText(/switch to line-item mode/i));
    await waitFor(() =>
      expect(screen.getByLabelText(/item 1 description/i)).toBeInTheDocument()
    );

    // Use fireEvent.change for reliable controlled-input updates in happy-dom
    fireEvent.change(screen.getByLabelText(/item 1 description/i), {
      target: { value: "Bulk paper" },
    });
    fireEvent.change(screen.getByLabelText(/item 1 amount/i), {
      target: { value: "15.99" },
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save 1 items/i })).not.toBeDisabled()
    );
    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /save 1 items/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const submitCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes("from-receipt")
    );
    expect(submitCall).toBeDefined();
    const [, opts] = submitCall as [string, RequestInit];
    expect(opts.method).toBe("POST");
  });

  it("shows error when from-receipt API returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: null, error: "Batch save failed" }),
        })
    );

    renderForm();
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByText(/switch to line-item mode/i));
    await waitFor(() =>
      expect(screen.getByLabelText(/item 1 description/i)).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText(/item 1 description/i), {
      target: { value: "Item A" },
    });
    fireEvent.change(screen.getByLabelText(/item 1 amount/i), {
      target: { value: "10.00" },
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save 1 items/i })).not.toBeDisabled()
    );
    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /save 1 items/i }));

    await waitFor(() =>
      expect(screen.getByText("Batch save failed")).toBeInTheDocument()
    );
  });

  it("includes receiptGroupName in from-receipt payload when merchantName is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              data: {
                merchantName: "Target",
                date: "2026-03-01",
                items: [
                  { description: "Shampoo", amount: 8.99, category: "other" },
                  { description: "Soap", amount: 3.49, category: "other" },
                ],
              },
              error: null,
            }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: { count: 2 }, error: null }),
        })
    );

    const { onSuccess } = renderForm({ expense: EXPENSE_WITH_RECEIPT });
    await waitForParticipantsLoaded();

    await userEvent.click(screen.getByRole("button", { name: /scan with ai/i }));
    await waitFor(() =>
      expect(screen.getByText(/switch to single expense/i)).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save 2 items/i })).not.toBeDisabled()
    );
    document.querySelector("form")!.setAttribute("novalidate", "");
    await userEvent.click(screen.getByRole("button", { name: /save 2 items/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const submitCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes("from-receipt")
    );
    expect(submitCall).toBeDefined();
    const [, opts] = submitCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { receiptGroupName: string | null };
    expect(body.receiptGroupName).toBe("Target");
  });
});

describe("Receipt file upload", () => {
  it("sets receiptPath and shows preview after successful upload", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-preview");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ data: { path: "receipts/uploaded.jpg" }, error: null }),
        })
    );

    renderForm();
    await waitForParticipantsLoaded();

    const fileInput = document.getElementById("receipt-file") as HTMLInputElement;
    const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
    await userEvent.upload(fileInput, file);

    await waitFor(() =>
      expect(screen.getByAltText(/receipt preview/i)).toBeInTheDocument()
    );
  });

  it("shows error when upload API fails", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-preview");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: null, error: "File too large" }),
        })
    );

    renderForm();
    await waitForParticipantsLoaded();

    const fileInput = document.getElementById("receipt-file") as HTMLInputElement;
    const file = new File(["content"], "receipt.jpg", { type: "image/jpeg" });
    await userEvent.upload(fileInput, file);

    await waitFor(() =>
      expect(screen.getByText("File too large")).toBeInTheDocument()
    );
  });
});
