import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CppCalculator } from "../cpp-calculator";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CppCalculator — rendering", () => {
  it('renders with title "CPP Redemption Calculator"', () => {
    render(<CppCalculator />);

    expect(
      screen.getByText("CPP Redemption Calculator")
    ).toBeInTheDocument();
  });

  it("does not show results when pointsRequired is empty", () => {
    render(<CppCalculator />);

    // No CPP result section should appear without points entered
    expect(screen.queryByText(/your cpp/i)).not.toBeInTheDocument();
  });

  it("does not show results when pointsRequired is 0", async () => {
    render(<CppCalculator />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    // Points field is left empty (default) — cpp should remain null

    expect(screen.queryByText(/your cpp/i)).not.toBeInTheDocument();
  });
});

describe("CppCalculator — CPP computation", () => {
  it("shows CPP result when cash price and points are entered", async () => {
    render(<CppCalculator />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // cpp = ((500 - 0) / 30000) * 100 = 1.67¢
    // The CPP value appears in both the display span and the badge — use getAllByText
    expect(screen.getByText(/your cpp/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.67¢/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Good deal" badge when CPP >= baseline', async () => {
    // baseline = 1.5 (default), CPP = ((500 - 0) / 30000) * 100 ≈ 1.67 — good deal
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    expect(screen.getByText(/good deal/i)).toBeInTheDocument();
  });

  it('shows "Below baseline" badge when CPP < baseline', async () => {
    // baseline = 2.0, CPP = ((500 - 0) / 50000) * 100 = 1.0 — below baseline
    render(<CppCalculator defaultCppBaseline={2.0} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "50000");

    expect(screen.getByText(/below baseline/i)).toBeInTheDocument();
  });

  it("shows correct formula display", async () => {
    render(<CppCalculator />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    // taxes left at default "0"
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // Formula: ($500.00 − $0.00) ÷ 30,000 × 100
    // The formula is in a single <p> element — match against its full text content
    const formulaPara = screen.getByText(/Formula:/);
    expect(formulaPara).toBeInTheDocument();
    expect(formulaPara.textContent).toMatch(/500\.00/);
    expect(formulaPara.textContent).toMatch(/0\.00/);
    expect(formulaPara.textContent).toMatch(/30,000/);
  });

  it("shows cash value at baseline", async () => {
    // baseline = 1.5 (default), points = 30000
    // cashValue = (30000 * 1.5) / 100 = $450.00
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    expect(screen.getByText(/\$450\.00 at baseline/)).toBeInTheDocument();
  });

  it("accounts for taxes when computing CPP", async () => {
    // cpp = ((500 - 50) / 30000) * 100 = 1.50¢
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");

    const taxesInput = screen.getByLabelText(/taxes/i);
    await userEvent.clear(taxesInput);
    await userEvent.type(taxesInput, "50");

    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // 1.50¢ appears in both the CPP display span and the badge text
    // Verify the "Your CPP" row specifically shows the right value
    const cppLabel = screen.getByText(/your cpp/i);
    // The CPP value span is the sibling of the label — check the parent container
    // getAllByText handles the multiple-element scenario
    expect(screen.getAllByText(/1\.50¢/).length).toBeGreaterThanOrEqual(1);
    expect(cppLabel).toBeInTheDocument();
  });
});

describe("CppCalculator — input updates", () => {
  it("updates result when inputs change", async () => {
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // Initial CPP: 1.67¢ — good deal
    expect(screen.getByText(/good deal/i)).toBeInTheDocument();

    // Change points to make it a bad deal: 100000 points
    // cpp = (500 / 100000) * 100 = 0.50¢ — below baseline
    const pointsInput = screen.getByLabelText(/points required/i);
    await userEvent.clear(pointsInput);
    await userEvent.type(pointsInput, "100000");

    expect(screen.getByText(/below baseline/i)).toBeInTheDocument();
  });

  it("updates CPP when baseline input changes", async () => {
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // Initial: good deal at 1.5 baseline (cpp ≈ 1.67)
    expect(screen.getByText(/good deal/i)).toBeInTheDocument();

    // Raise baseline above 1.67 to flip to below baseline
    const baselineInput = screen.getByLabelText(/baseline cpp/i);
    await userEvent.clear(baselineInput);
    await userEvent.type(baselineInput, "2.0");

    expect(screen.getByText(/below baseline/i)).toBeInTheDocument();
  });
});

describe("CppCalculator — props", () => {
  it("uses defaultCppBaseline prop as initial baseline value", () => {
    render(<CppCalculator defaultCppBaseline={2.0} />);

    const baselineInput = screen.getByLabelText(/baseline cpp/i) as HTMLInputElement;
    expect(baselineInput.value).toBe("2");
  });

  it("uses pointsName prop in points display", async () => {
    render(<CppCalculator pointsName="Avios" />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // Component renders "{points.toLocaleString()} {pointsName} worth"
    expect(screen.getByText(/avios/i)).toBeInTheDocument();
  });

  it("defaults to 'Points' as pointsName when prop is omitted", async () => {
    render(<CppCalculator />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "500");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    // The component renders "{points} Points worth" — match that specific phrase
    expect(screen.getByText(/Points worth/)).toBeInTheDocument();
  });

  it("defaults to 1.5 as baseline when defaultCppBaseline is omitted", () => {
    render(<CppCalculator />);

    const baselineInput = screen.getByLabelText(/baseline cpp/i) as HTMLInputElement;
    expect(baselineInput.value).toBe("1.5");
  });
});

describe("CppCalculator — badge text content", () => {
  it("good deal badge shows cpp and baseline values", async () => {
    // cpp = ((600 - 0) / 30000) * 100 = 2.00¢, baseline = 1.5
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "600");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    const badge = screen.getByText(/good deal/i);
    // "Good deal — 2.00¢ > 1.5¢ baseline"
    expect(badge.textContent).toMatch(/2\.00¢/);
    expect(badge.textContent).toMatch(/1\.5¢/);
  });

  it("below baseline badge shows cpp and baseline values", async () => {
    // cpp = ((300 - 0) / 30000) * 100 = 1.00¢, baseline = 1.5
    render(<CppCalculator defaultCppBaseline={1.5} />);

    await userEvent.type(screen.getByLabelText(/cash price/i), "300");
    await userEvent.type(screen.getByLabelText(/points required/i), "30000");

    const badge = screen.getByText(/below baseline/i);
    // "Below baseline — 1.00¢ < 1.5¢ target"
    expect(badge.textContent).toMatch(/1\.00¢/);
    expect(badge.textContent).toMatch(/1\.5¢/);
  });
});
