import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParticipantsTab } from "../participants-tab";

// ─── Types & fixtures ─────────────────────────────────────────────────────────

interface MockParticipant {
  id: string;
  name: string;
  email: string | null;
  groupName: string | null;
  familyMemberId: string | null;
  familyMember: { id: string; name: string } | null;
}

const TRIP_ID = "trip-abc";

const FAMILY_MEMBERS = [
  { id: "fm-1", name: "Alice Chung" },
  { id: "fm-2", name: "Bob Chung" },
];

const FAMILY_PARTICIPANT: MockParticipant = {
  id: "p-1",
  name: "Alice Chung",
  email: null,
  groupName: null,
  familyMemberId: "fm-1",
  familyMember: { id: "fm-1", name: "Alice Chung" },
};

const GUEST_PARTICIPANT: MockParticipant = {
  id: "p-2",
  name: "Jane Smith",
  email: "jane@example.com",
  groupName: "Friends",
  familyMemberId: null,
  familyMember: null,
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockGetParticipants(participants: MockParticipant[] = []): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ data: participants, error: null }),
    })
  );
}

function mockGetThenPost(
  participants: MockParticipant[],
  newParticipant: MockParticipant
): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: participants, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: newParticipant, error: null }),
      })
  );
}

function mockGetThenPostError(
  participants: MockParticipant[],
  errorMsg: string
): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: participants, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null, error: errorMsg }),
      })
  );
}

function mockGetThenDelete(participants: MockParticipant[]): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: participants, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null, error: null }),
      })
  );
}

function mockGetThenDeleteError(
  participants: MockParticipant[],
  errorMsg: string
): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: participants, error: null }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null, error: errorMsg }),
      })
  );
}

// ─── Render & wait helpers ────────────────────────────────────────────────────

function renderTab(familyMembers = FAMILY_MEMBERS): ReturnType<typeof render> {
  return render(
    <ParticipantsTab tripId={TRIP_ID} familyMembers={familyMembers} />
  );
}

async function waitForLoad(): Promise<void> {
  await waitFor(() =>
    expect(
      screen.queryByText(/loading participants/i)
    ).not.toBeInTheDocument()
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Loading state", () => {
  it("renders only loading text while fetch is pending", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderTab();
    expect(screen.getByText(/loading participants/i)).toBeInTheDocument();
    expect(screen.queryByText(/add participant/i)).not.toBeInTheDocument();
  });
});

describe("Initial render — list", () => {
  it("renders a chip (with remove button) for each participant", async () => {
    mockGetParticipants([FAMILY_PARTICIPANT, GUEST_PARTICIPANT]);
    renderTab();
    await waitForLoad();
    expect(
      screen.getByRole("button", { name: /remove alice chung/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove jane smith/i })
    ).toBeInTheDocument();
  });

  it("shows 'Family' badge only on the family-linked participant", async () => {
    mockGetParticipants([FAMILY_PARTICIPANT, GUEST_PARTICIPANT]);
    renderTab();
    await waitForLoad();
    const badges = screen.getAllByText("Family");
    expect(badges).toHaveLength(1);
  });

  it("shows empty state emoji when no participants", async () => {
    mockGetParticipants([]);
    renderTab();
    await waitForLoad();
    expect(screen.getByText("👥")).toBeInTheDocument();
  });
});

describe("Fetch error", () => {
  it("shows error paragraph and hides empty-state emoji when GET fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null, error: "Server error" }),
      })
    );
    renderTab();
    await waitForLoad();
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument();
    expect(screen.queryByText("👥")).not.toBeInTheDocument();
  });
});

describe("Mode toggle", () => {
  it("shows family member select by default", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    expect(screen.getByLabelText(/family member/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });

  it("switches to guest inputs when 'Guest / Friend' is clicked", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    expect(screen.queryByLabelText(/family member/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});

describe("Family Member mode", () => {
  it("populates select with options from familyMembers prop", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    expect(screen.getByLabelText(/family member/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alice Chung" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob Chung" })).toBeInTheDocument();
  });

  it("shows inline error when Add is clicked with no member selected", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    expect(
      screen.getByText(/please select a family member/i)
    ).toBeInTheDocument();
  });

  it("includes familyMemberId in POST body", async () => {
    mockGetThenPost([], FAMILY_PARTICIPANT);
    renderTab();
    await waitForLoad();
    await userEvent.selectOptions(
      screen.getByLabelText(/family member/i),
      "fm-1"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const [, options] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      familyMemberId: string;
    };
    expect(body.familyMemberId).toBe("fm-1");
  });
});

describe("Guest/Friend mode", () => {
  it("shows inline error when name is empty", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    expect(
      screen.getByText(/name is required for guests/i)
    ).toBeInTheDocument();
  });

  it("includes name and email in POST body", async () => {
    mockGetThenPost([], GUEST_PARTICIPANT);
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Smith");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const [, options] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      name: string;
      email: string;
    };
    expect(body.name).toBe("Jane Smith");
    expect(body.email).toBe("jane@example.com");
  });

  it("sends null email when email field is left blank", async () => {
    const guestNoEmail: MockParticipant = {
      ...GUEST_PARTICIPANT,
      email: null,
      groupName: null,
    };
    mockGetThenPost([], guestNoEmail);
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Smith");
    // Leave email blank
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const [, options] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { email: null };
    expect(body.email).toBeNull();
  });
});

describe("Group name", () => {
  it("is visible in family mode", async () => {
    mockGetParticipants();
    renderTab();
    await waitForLoad();
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
  });

  it("is visible in guest mode and included in POST body", async () => {
    mockGetThenPost([], GUEST_PARTICIPANT);
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Smith");
    await userEvent.type(screen.getByLabelText(/group name/i), "Friends");
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    const [, options] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { groupName: string };
    expect(body.groupName).toBe("Friends");
  });
});

describe("Add success", () => {
  it("new chip appears after successful POST", async () => {
    mockGetThenPost([FAMILY_PARTICIPANT], GUEST_PARTICIPANT);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Smith");
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove jane smith/i })
      ).toBeInTheDocument()
    );
  });

  it("form fields reset to defaults after successful POST", async () => {
    mockGetThenPost([], FAMILY_PARTICIPANT);
    renderTab();
    await waitForLoad();
    await userEvent.selectOptions(
      screen.getByLabelText(/family member/i),
      "fm-1"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/family member/i)).toHaveValue("__none__");
  });
});

describe("Delete flow", () => {
  it("calls window.confirm when remove button is clicked", async () => {
    mockGetThenDelete([FAMILY_PARTICIPANT]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    await userEvent.click(
      screen.getByRole("button", { name: /remove alice chung/i })
    );
    expect(confirmSpy).toHaveBeenCalledOnce();
  });

  it("sends DELETE and removes chip when confirm is accepted", async () => {
    mockGetThenDelete([FAMILY_PARTICIPANT]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    await userEvent.click(
      screen.getByRole("button", { name: /remove alice chung/i })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /remove alice chung/i })
      ).not.toBeInTheDocument()
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    const [deleteUrl, deleteOpts] = vi.mocked(fetch).mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(deleteUrl).toContain(`/participants/${FAMILY_PARTICIPANT.id}`);
    expect(deleteOpts.method).toBe("DELETE");
  });

  it("does not send DELETE when confirm is cancelled", async () => {
    mockGetParticipants([FAMILY_PARTICIPANT]);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    await userEvent.click(
      screen.getByRole("button", { name: /remove alice chung/i })
    );
    // Only the initial GET was called — no DELETE
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /remove alice chung/i })
    ).toBeInTheDocument();
  });
});

describe("Delete error", () => {
  it("calls alert and keeps chip when DELETE returns an error", async () => {
    mockGetThenDeleteError([FAMILY_PARTICIPANT], "Cannot delete");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove alice chung/i })
      ).toBeInTheDocument()
    );
    await userEvent.click(
      screen.getByRole("button", { name: /remove alice chung/i })
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Cannot delete")
    );
    expect(
      screen.getByRole("button", { name: /remove alice chung/i })
    ).toBeInTheDocument();
  });
});

describe("In-flight state", () => {
  it("shows 'Adding…' and disables button while POST is pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: [], error: null }),
        })
        .mockReturnValueOnce(new Promise(() => {})) // POST never resolves
    );
    renderTab();
    await waitForLoad();
    await userEvent.click(
      screen.getByRole("button", { name: /guest \/ friend/i })
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Jane");
    await userEvent.click(
      screen.getByRole("button", { name: /add participant/i })
    );
    expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();
  });
});
