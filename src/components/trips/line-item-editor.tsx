"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export interface LineItem {
  description: string;
  amount: number | "";
  category: string;
}

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export function LineItemEditor({ items, onChange }: LineItemEditorProps): React.ReactElement {
  function updateItem(index: number, patch: Partial<LineItem>): void {
    const updated = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(updated);
  }

  function addRow(): void {
    onChange([...items, { description: "", amount: "", category: "other" }]);
  }

  function deleteRow(index: number): void {
    onChange(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => {
    const n = typeof item.amount === "number" ? item.amount : parseFloat(String(item.amount));
    return sum + (isFinite(n) && n > 0 ? n : 0);
  }, 0);

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Description</TableHead>
              <TableHead className="w-[28%]">Category</TableHead>
              <TableHead className="w-[22%]">Amount ($)</TableHead>
              <TableHead className="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                  No items yet — click &quot;Add Row&quot; to start
                </TableCell>
              </TableRow>
            )}
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="py-1.5 pr-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Item description"
                    className="h-8 text-sm"
                    aria-label={`Item ${index + 1} description`}
                  />
                </TableCell>
                <TableCell className="py-1.5 pr-2">
                  <Select
                    value={item.category}
                    onValueChange={(val) => updateItem(index, { category: val })}
                  >
                    <SelectTrigger className="h-8 text-sm" aria-label={`Item ${index + 1} category`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateItem(index, { amount: raw === "" ? "" : parseFloat(raw) });
                    }}
                    placeholder="0.00"
                    className="h-8 text-sm"
                    aria-label={`Item ${index + 1} amount`}
                  />
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => deleteRow(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-base leading-none"
                    aria-label={`Remove item ${index + 1}`}
                  >
                    ×
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add Row
        </Button>
        {items.length > 0 && (
          <p className="text-sm font-medium text-muted-foreground">
            Total: <span className="text-foreground">${total.toFixed(2)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
