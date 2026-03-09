/**
 * Tests for LineItemEditor component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { LineItemEditor, LineItem } from "../line-item-editor";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeItems(overrides: Partial<LineItem>[] = []): LineItem[] {
  return overrides.map((o) => ({
    description: "Coffee",
    amount: 4.5,
    category: "food",
    ...o,
  }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LineItemEditor", () => {
  it("renders column headers", () => {
    render(<LineItemEditor items={[]} onChange={() => undefined} />);
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Amount ($)")).toBeInTheDocument();
  });

  it("shows empty state message when items is empty", () => {
    render(<LineItemEditor items={[]} onChange={() => undefined} />);
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });

  it("renders one row per item", () => {
    const items = makeItems([{}, {}]);
    render(<LineItemEditor items={items} onChange={() => undefined} />);
    const descInputs = screen.getAllByRole("textbox");
    // 2 description inputs
    expect(descInputs.length).toBeGreaterThanOrEqual(2);
  });

  it("shows total when items have amounts", () => {
    const items = makeItems([{ amount: 3.99 }, { amount: 2.49 }]);
    render(<LineItemEditor items={items} onChange={() => undefined} />);
    expect(screen.getByText("$6.48")).toBeInTheDocument();
  });

  it("does not show total when items is empty", () => {
    render(<LineItemEditor items={[]} onChange={() => undefined} />);
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
  });

  it("calls onChange with new item when Add Row is clicked", () => {
    const onChange = vi.fn();
    render(<LineItemEditor items={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add row/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems.length).toBe(1);
    expect(newItems[0]?.description).toBe("");
    expect(newItems[0]?.category).toBe("other");
  });

  it("adds to existing items on Add Row click", () => {
    const onChange = vi.fn();
    const items = makeItems([{}]);
    render(<LineItemEditor items={items} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add row/i }));
    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems.length).toBe(2);
  });

  it("calls onChange with item removed when × is clicked", () => {
    const onChange = vi.fn();
    const items = makeItems([{ description: "Milk" }, { description: "Bread" }]);
    render(<LineItemEditor items={items} onChange={onChange} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove item/i });
    fireEvent.click(removeButtons[0]!);

    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems.length).toBe(1);
    expect(newItems[0]?.description).toBe("Bread");
  });

  it("calls onChange with updated description when user types", () => {
    const onChange = vi.fn();
    const items = makeItems([{ description: "Milk" }]);
    render(<LineItemEditor items={items} onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: /item 1 description/i });
    fireEvent.change(input, { target: { value: "Oat Milk" } });

    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems[0]?.description).toBe("Oat Milk");
  });

  it("calls onChange with updated amount when user types a number", () => {
    const onChange = vi.fn();
    const items = makeItems([{ amount: 3.99 }]);
    render(<LineItemEditor items={items} onChange={onChange} />);

    const amountInput = screen.getByRole("spinbutton", { name: /item 1 amount/i });
    fireEvent.change(amountInput, { target: { value: "5.99" } });

    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems[0]?.amount).toBe(5.99);
  });

  it("sets amount to empty string when input is cleared", () => {
    const onChange = vi.fn();
    const items = makeItems([{ amount: 3.99 }]);
    render(<LineItemEditor items={items} onChange={onChange} />);

    const amountInput = screen.getByRole("spinbutton", { name: /item 1 amount/i });
    fireEvent.change(amountInput, { target: { value: "" } });

    const [newItems] = onChange.mock.calls[0] as [LineItem[]];
    expect(newItems[0]?.amount).toBe("");
  });

  it("shows the correct total for a single item", () => {
    const items = makeItems([{ amount: 10.5 }]);
    render(<LineItemEditor items={items} onChange={() => undefined} />);
    expect(screen.getByText("$10.50")).toBeInTheDocument();
  });

  it("ignores items with non-numeric amounts in total calculation", () => {
    const items: LineItem[] = [
      { description: "A", amount: 5.0, category: "food" },
      { description: "B", amount: "", category: "food" },
    ];
    render(<LineItemEditor items={items} onChange={() => undefined} />);
    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });

  it("renders Add Row button", () => {
    render(<LineItemEditor items={[]} onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: /add row/i })).toBeInTheDocument();
  });
});
