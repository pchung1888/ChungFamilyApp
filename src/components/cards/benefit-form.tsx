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

interface CardBenefit {
  id: string;
  name: string;
  value: number;
  frequency: string;
  usedAmount: number;
  resetDate: string | null;
}

interface BenefitFormProps {
  cardId: string;
  benefit?: CardBenefit;
  onSuccess: () => void;
  onCancel: () => void;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export function BenefitForm({ cardId, benefit, onSuccess, onCancel }: BenefitFormProps): React.ReactElement {
  const [name, setName] = useState(benefit?.name ?? "");
  const [value, setValue] = useState(benefit?.value?.toString() ?? "");
  const [frequency, setFrequency] = useState(benefit?.frequency ?? "annual");
  const [usedAmount, setUsedAmount] = useState(benefit?.usedAmount?.toString() ?? "0");
  const [resetDate, setResetDate] = useState(toDateInputValue(benefit?.resetDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = benefit
      ? `/api/cards/${cardId}/benefits/${benefit.id}`
      : `/api/cards/${cardId}/benefits`;
    const method = benefit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        value: parseFloat(value),
        frequency,
        usedAmount: parseFloat(usedAmount),
        resetDate: resetDate || null,
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
      <div className="space-y-2">
        <Label htmlFor="benefit-name">Benefit Name</Label>
        <Input
          id="benefit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="$300 Travel Credit"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="benefit-value">Value ($)</Label>
          <Input
            id="benefit-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="300"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="benefit-frequency">Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="benefit-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="per_trip">Per Trip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="used-amount">Used ($)</Label>
          <Input
            id="used-amount"
            type="number"
            min="0"
            step="0.01"
            value={usedAmount}
            onChange={(e) => setUsedAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-date">Reset Date</Label>
          <Input
            id="reset-date"
            type="date"
            value={resetDate}
            onChange={(e) => setResetDate(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !name || !value}>
          {loading ? "Saving…" : benefit ? "Save Changes" : "Add Benefit"}
        </Button>
      </div>
    </form>
  );
}
