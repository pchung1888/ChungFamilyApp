"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface FamilyMember {
  id: string;
  name: string;
}

interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
}

interface Expense {
  id: string;
  familyMemberId: string | null;
  creditCardId: string | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  pointsEarned: number;
}

interface ExpenseFormProps {
  tripId: string;
  expense?: Expense;
  familyMembers: FamilyMember[];
  creditCards: CreditCard[];
  onSuccess: () => void;
  onCancel: () => void;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split("T")[0];
  return new Date(value).toISOString().split("T")[0];
}

const NONE = "__none__";

export function ExpenseForm({
  tripId,
  expense,
  familyMembers,
  creditCards,
  onSuccess,
  onCancel,
}: ExpenseFormProps): React.ReactElement {
  const [familyMemberId, setFamilyMemberId] = useState(expense?.familyMemberId ?? NONE);
  const [creditCardId, setCreditCardId] = useState(expense?.creditCardId ?? NONE);
  const [category, setCategory] = useState(expense?.category ?? "other");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [date, setDate] = useState(toDateInputValue(expense?.date));
  const [pointsEarned, setPointsEarned] = useState(expense?.pointsEarned?.toString() ?? "0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = expense
      ? `/api/trips/${tripId}/expenses/${expense.id}`
      : `/api/trips/${tripId}/expenses`;
    const method = expense ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyMemberId: familyMemberId === NONE ? null : familyMemberId,
        creditCardId: creditCardId === NONE ? null : creditCardId,
        category,
        description,
        amount: parseFloat(amount),
        date,
        pointsEarned: parseInt(pointsEarned, 10) || 0,
      }),
    });

    const json = (await res.json()) as { data: unknown; error: string | null };

    if (json.error) {
      setError(json.error);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expense-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="expense-category">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="expense-description">Description</Label>
          <Input
            id="expense-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hampton Inn, 2 nights"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount ($)</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="250.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="points-earned">Points Earned</Label>
          <Input
            id="points-earned"
            type="number"
            min="0"
            value={pointsEarned}
            onChange={(e) => setPointsEarned(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="family-member">Paid By</Label>
          <Select value={familyMemberId} onValueChange={setFamilyMemberId}>
            <SelectTrigger id="family-member">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Anyone</SelectItem>
              {familyMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit-card">Card Used</Label>
          <Select value={creditCardId} onValueChange={setCreditCardId}>
            <SelectTrigger id="credit-card">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {creditCards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ···{c.lastFour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !description || !amount}>
          {loading ? "Saving…" : expense ? "Save Changes" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
