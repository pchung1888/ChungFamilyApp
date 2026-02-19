import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyForm } from "../family-form";

// ─── Shared test data ───────────────────────────────────────────────────────

const existingMember = {
  id: "abc-123",
  name: "Alice Chung",
  role: "parent",
  email: "alice@example.com",
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

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Snapshot tests ──────────────────────────────────────────────────────────

describe("FamilyForm snapshots", () => {
  it("renders create form correctly (no member prop)", () => {
    const { container } = render(
      <FamilyForm onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders edit form correctly (member prop provided)", () => {
    const { container } = render(
      <FamilyForm member={existingMember} onSuccess={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});

// ─── Behavioral tests ────────────────────────────────────────────────────────

describe("FamilyForm behavior", () => {
  it("calls onCancel when Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(<FamilyForm onSuccess={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables submit button when name is empty", () => {
    render(<FamilyForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // name is empty, role is empty → button should be disabled
    const submitButton = screen.getByRole("button", { name: /add member/i });
    expect(submitButton).toBeDisabled();
  });

  it("disables submit button when role is not selected", async () => {
    render(<FamilyForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // Type a name but leave role unselected
    await userEvent.type(screen.getByLabelText(/name/i), "Bob");

    const submitButton = screen.getByRole("button", { name: /add member/i });
    expect(submitButton).toBeDisabled();
  });

  it("shows 'Saving…' and disables submit while request is in flight", async () => {
    // Never resolves — keeps loading state active
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );

    render(<FamilyForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Bob");
    await userEvent.selectOptions(screen.getByLabelText(/role/i), "parent");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("sends POST to /api/family and calls onSuccess for a new member", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<FamilyForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Bob Chung");
    await userEvent.selectOptions(screen.getByLabelText(/role/i), "teen");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/family",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends PATCH to /api/family/:id and calls onSuccess when editing", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(
      <FamilyForm member={existingMember} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    // Clear and retype the name to trigger a change
    const nameInput = screen.getByLabelText(/name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Alice Updated");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/family/${existingMember.id}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows API error message when request fails", async () => {
    mockFetchError("Name is required");

    render(<FamilyForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Bob");
    await userEvent.selectOptions(screen.getByLabelText(/role/i), "teen");
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(() =>
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    );
  });

  it("sends email as null when the email field is left empty", async () => {
    mockFetchSuccess();
    const onSuccess = vi.fn();

    render(<FamilyForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Carol Chung");
    await userEvent.selectOptions(screen.getByLabelText(/role/i), "parent");
    // Leave email empty
    await userEvent.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { email: null };
    expect(body.email).toBeNull();
  });
});
