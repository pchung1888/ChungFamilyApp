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

interface CreditCard {
  id: string;
  name: string;
  network: string;
  lastFour: string;
  annualFee: number;
  annualFeeDate: string | null;
  pointsBalance: number;
  pointsExpiresAt: string | null;
  pointsName: string;
  pointsCppValue: number;
  isActive: boolean;
}

interface CardFormProps {
  card?: CreditCard;
  onSuccess: () => void;
  onCancel: () => void;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export function CardForm({ card, onSuccess, onCancel }: CardFormProps): React.ReactElement {
  const [name, setName] = useState(card?.name ?? "");
  const [network, setNetwork] = useState(card?.network ?? "");
  const [lastFour, setLastFour] = useState(card?.lastFour ?? "");
  const [annualFee, setAnnualFee] = useState(card?.annualFee?.toString() ?? "0");
  const [annualFeeDate, setAnnualFeeDate] = useState(toDateInputValue(card?.annualFeeDate));
  const [pointsBalance, setPointsBalance] = useState(card?.pointsBalance?.toString() ?? "0");
  const [pointsExpiresAt, setPointsExpiresAt] = useState(toDateInputValue(card?.pointsExpiresAt));
  const [pointsName, setPointsName] = useState(card?.pointsName ?? "");
  const [pointsCppValue, setPointsCppValue] = useState(card?.pointsCppValue?.toString() ?? "1.0");
  const [isActive, setIsActive] = useState<string>(card?.isActive === false ? "inactive" : "active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = card ? `/api/cards/${card.id}` : "/api/cards";
    const method = card ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        network,
        lastFour,
        annualFee: parseFloat(annualFee),
        annualFeeDate: annualFeeDate || null,
        pointsBalance: parseInt(pointsBalance, 10),
        pointsExpiresAt: pointsExpiresAt || null,
        pointsName,
        pointsCppValue: parseFloat(pointsCppValue),
        isActive: isActive === "active",
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

  const isValid = name && network && lastFour.length === 4 && pointsName;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="card-name">Card Name</Label>
          <Input
            id="card-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chase Sapphire Reserve"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="network">Network</Label>
          <Select value={network} onValueChange={setNetwork} required>
            <SelectTrigger id="network">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Visa">Visa</SelectItem>
              <SelectItem value="Mastercard">Mastercard</SelectItem>
              <SelectItem value="Amex">Amex</SelectItem>
              <SelectItem value="Discover">Discover</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="last-four">Last 4 Digits</Label>
          <Input
            id="last-four"
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annual-fee">Annual Fee ($)</Label>
          <Input
            id="annual-fee"
            type="number"
            min="0"
            step="0.01"
            value={annualFee}
            onChange={(e) => setAnnualFee(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annual-fee-date">Annual Fee Date</Label>
          <Input
            id="annual-fee-date"
            type="date"
            value={annualFeeDate}
            onChange={(e) => setAnnualFeeDate(e.target.value)}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="points-name">Points Program Name</Label>
          <Input
            id="points-name"
            value={pointsName}
            onChange={(e) => setPointsName(e.target.value)}
            placeholder="Chase Ultimate Rewards"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="points-balance">Points Balance</Label>
          <Input
            id="points-balance"
            type="number"
            min="0"
            value={pointsBalance}
            onChange={(e) => setPointsBalance(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpp-value">Baseline CPP (cents/pt)</Label>
          <Input
            id="cpp-value"
            type="number"
            min="0"
            step="0.1"
            value={pointsCppValue}
            onChange={(e) => setPointsCppValue(e.target.value)}
            placeholder="1.5"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="points-expiry">Points Expire On</Label>
          <Input
            id="points-expiry"
            type="date"
            value={pointsExpiresAt}
            onChange={(e) => setPointsExpiresAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="is-active">Status</Label>
          <Select value={isActive} onValueChange={setIsActive}>
            <SelectTrigger id="is-active">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !isValid}>
          {loading ? "Saving…" : card ? "Save Changes" : "Add Card"}
        </Button>
      </div>
    </form>
  );
}
