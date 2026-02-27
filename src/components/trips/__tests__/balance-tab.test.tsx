import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BalanceTab } from "../balance-tab";

// ─── Types & fixtures ─────────────────────────────────────────────────────────

const TRIP_ID = "trip-bal-1";

interface MockBalanceData {
  balances: Array<{ participantId: string; name: string; net: number }>;
  transactions: Array<{
    from: { id: string; name: string };
    to: { id: string; name: string };
    amount: number;
  }>;
}

const EMPTY_DATA: MockBalanceData = { balances: [], transactions: [] };

const ALL_SETTLED_DATA: MockBalanceData = {
  balances: [
    { participantId: "p-1", name: "Alice", net: 0 },
    { participantId: "p-2", name: "Bob", net: 0 },
  ],
  transactions: [],
};

const ACTIVE_DATA: MockBalanceData = {
  balances: [
    { participantId: "p-1", name: "Alice", net: 30.5 },
    { participantId: "p-2", name: "Bob", net: -30.5 },
    { participantId: "p-3", name: "Carol", net: 0 },
  ],
  transactions: [
    { from: { id: "p-2", name: "Bob" }, to: { id: "p-1", name: "Alice" }, amount: 30.5 },
  ],
};

const ACTIVE_NO_TRANSACTIONS_DATA: MockBalanceData = {
  balances: [
    { participantId: "p-1", name: "Alice", net: 10 },
    { participantId: "p-2", name: "Bob", net: -10 },
  ],
  transactions: [],
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetchData(data: MockBalanceData): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ data, error: null }),
    })
  );
}

function mockFetchError(errorMsg: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ data: null, error: errorMsg }),
    })
  );
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderTab(): ReturnType<typeof render> {
  return render(<BalanceTab tripId={TRIP_ID} />);
}

async function waitForLoaded(): Promise<void> {
  await waitFor(() =>
    expect(screen.queryByText(/computing balances/i)).not.toBeInTheDocument()
  );
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Loading state", () => {
  it("shows loading text while fetch is pending", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderTab();
    expect(screen.getByText(/computing balances…/i)).toBeInTheDocument();
  });
});

describe("Empty state", () => {
  it("shows empty state message when API returns empty balances array", async () => {
    mockFetchData(EMPTY_DATA);
    renderTab();
    await waitForLoaded();
    expect(
      screen.getByText(/add participants first to track balances/i)
    ).toBeInTheDocument();
  });
});

describe("Error states", () => {
  it("shows API error message when API returns an error", async () => {
    mockFetchError("Something went wrong");
    renderTab();
    await waitForLoaded();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows 'Failed to load balance' when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("Network failure"))
    );
    renderTab();
    await waitForLoaded();
    expect(screen.getByText("Failed to load balance")).toBeInTheDocument();
  });
});

describe("Net Balances display", () => {
  it("shows 'Net Balances' heading and all participant names", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();
    expect(screen.getByText("Net Balances")).toBeInTheDocument();
    // Names appear in both balances and transactions — use getAllByText
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("shows positive net as +$X.XX with arrow up icon", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();
    expect(screen.getByText("+$30.50")).toBeInTheDocument();
    expect(screen.getByLabelText("arrow up")).toBeInTheDocument();
  });

  it("shows negative net as $X.XX with arrow down icon (no leading minus)", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();
    // Math.abs is used so it shows 30.50, not -30.50
    const amountEls = screen.getAllByText("$30.50");
    expect(amountEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("arrow down")).toBeInTheDocument();
  });

  it("shows $0.00 and '(settled)' for participant with net = 0", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("(settled)")).toBeInTheDocument();
  });
});

describe("To Settle section", () => {
  it("shows 'No expenses with splits recorded yet.' when hasActivity is false and no transactions", async () => {
    mockFetchData(ALL_SETTLED_DATA);
    renderTab();
    await waitForLoaded();
    expect(
      screen.getByText("No expenses with splits recorded yet.")
    ).toBeInTheDocument();
  });

  it("shows 'No settlement transactions needed.' when hasActivity is true but transactions is empty", async () => {
    mockFetchData(ACTIVE_NO_TRANSACTIONS_DATA);
    renderTab();
    await waitForLoaded();
    expect(
      screen.getByText("No settlement transactions needed.")
    ).toBeInTheDocument();
  });

  it("shows Mark Paid buttons for each transaction", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();
    const markPaidButtons = screen.getAllByRole("button", { name: /mark paid/i });
    expect(markPaidButtons).toHaveLength(ACTIVE_DATA.transactions.length);
  });
});

describe("Settle dialog", () => {
  it("clicking Mark Paid opens Confirm Settlement dialog with correct from/to/amount", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();

    await userEvent.click(screen.getByRole("button", { name: /mark paid/i }));

    expect(screen.getByText("Confirm Settlement")).toBeInTheDocument();
    // "Bob pays Alice $30.50" — names may appear elsewhere too, use getAllByText
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    // The dialog contains " pays " text connecting the two names
    expect(screen.getByText(/pays/i)).toBeInTheDocument();
    // Dialog shows the settlement amount
    expect(screen.getAllByText("$30.50").length).toBeGreaterThanOrEqual(1);
  });

  it("clicking Cancel in dialog closes it", async () => {
    mockFetchData(ACTIVE_DATA);
    renderTab();
    await waitForLoaded();

    await userEvent.click(screen.getByRole("button", { name: /mark paid/i }));
    expect(screen.getByText("Confirm Settlement")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.queryByText("Confirm Settlement")).not.toBeInTheDocument()
    );
  });

  it("confirming settlement calls POST to settlements API and closes dialog on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: ACTIVE_DATA, error: null }),
        })
        .mockResolvedValueOnce({
          // POST settlement
          json: () => Promise.resolve({ data: { id: "settle-1" }, error: null }),
        })
        .mockResolvedValueOnce({
          // re-fetch balance after settling
          json: () => Promise.resolve({ data: ALL_SETTLED_DATA, error: null }),
        })
    );

    renderTab();
    await waitForLoaded();

    await userEvent.click(screen.getByRole("button", { name: /mark paid/i }));
    expect(screen.getByText("Confirm Settlement")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() =>
      expect(screen.queryByText("Confirm Settlement")).not.toBeInTheDocument()
    );

    const fetchMock = vi.mocked(fetch);
    const settlementCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes("/settlements")
    );
    expect(settlementCall).toBeDefined();
    const [, opts] = settlementCall as [string, RequestInit];
    expect(opts.method).toBe("POST");
  });

  it("shows settle error from API in dialog", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: ACTIVE_DATA, error: null }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ data: null, error: "Settlement already exists" }),
        })
    );

    renderTab();
    await waitForLoaded();

    await userEvent.click(screen.getByRole("button", { name: /mark paid/i }));
    await userEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Settlement already exists")
      ).toBeInTheDocument()
    );
    // Dialog should still be open
    expect(screen.getByText("Confirm Settlement")).toBeInTheDocument();
  });
});
