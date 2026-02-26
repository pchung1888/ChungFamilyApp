"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  name: string;
}

interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
}

interface TripParticipant {
  id: string;
  name: string;
  groupName: string | null;
}

interface Expense {
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
}

/** Props for ExpenseForm */
interface ExpenseFormProps {
  /** The trip ID — used for API calls */
  tripId: string;
  /** Existing expense when editing; undefined when adding */
  expense?: Expense;
  /** Family members for the "Paid By" dropdown */
  familyMembers: FamilyMember[];
  /** Active credit cards for the "Card Used" dropdown */
  creditCards: CreditCard[];
  /** Called after a successful save */
  onSuccess: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

interface ReceiptParseResult {
  amount: number | null;
  date: string | null;
  description: string | null;
  category: string | null;
}

type SplitMode = "equal_person" | "equal_group" | "none";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split("T")[0] ?? "";
  return new Date(value).toISOString().split("T")[0] ?? "";
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
  const [paidByParticipantId, setPaidByParticipantId] = useState(
    expense?.paidByParticipantId ?? NONE
  );
  const [category, setCategory] = useState(expense?.category ?? "other");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [date, setDate] = useState(toDateInputValue(expense?.date));
  const [pointsEarned, setPointsEarned] = useState(expense?.pointsEarned?.toString() ?? "0");
  const [receiptPath, setReceiptPath] = useState<string | null>(expense?.receiptPath ?? null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Participants and split state
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("none");

  const fetchParticipants = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/trips/${tripId}/participants`);
      const json = (await res.json()) as {
        data: TripParticipant[] | null;
        error: string | null;
      };
      if (json.data) setParticipants(json.data);
    } catch {
      // Non-fatal — participants are optional
    }
  }, [tripId]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalPreviewUrl(URL.createObjectURL(file));
    setUploadingReceipt(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/uploads/receipt", { method: "POST", body: formData });
    const json = (await res.json()) as { data: { path: string } | null; error: string | null };

    setUploadingReceipt(false);

    if (json.error || !json.data) {
      setError(json.error ?? "Upload failed");
      setLocalPreviewUrl(null);
      return;
    }

    setReceiptPath(json.data.path);
  }

  function handleRemoveReceipt(): void {
    setReceiptPath(null);
    setLocalPreviewUrl(null);
    setScanStatus("idle");
    setScanMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleScanReceipt(): Promise<void> {
    if (!receiptPath) return;
    setScanning(true);
    setScanStatus("idle");
    setScanMessage(null);

    const res = await fetch("/api/uploads/receipt/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptPath }),
    });
    const json = (await res.json()) as { data: ReceiptParseResult | null; error: string | null };

    setScanning(false);

    if (json.error || !json.data) {
      setScanStatus("error");
      setScanMessage(json.error ?? "AI scan failed");
      return;
    }

    const result = json.data;
    let filled = 0;
    if (result.amount !== null) { setAmount(result.amount.toString()); filled++; }
    if (result.date !== null) { setDate(result.date); filled++; }
    if (result.description !== null) { setDescription(result.description); filled++; }
    if (result.category !== null) { setCategory(result.category); filled++; }

    if (filled === 0) {
      setScanStatus("error");
      setScanMessage("AI could not read any fields from this receipt");
    } else {
      setScanStatus("success");
      setScanMessage(`${filled} field${filled > 1 ? "s" : ""} filled from receipt`);
    }
  }

  /**
   * Build splits array based on split mode.
   * Returns null if split mode is "none" or there are no participants.
   */
  function buildSplits(): Array<{ participantId: string; amount: number }> | null {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || participants.length === 0 || splitMode === "none") return null;

    if (splitMode === "equal_person") {
      const perPerson = Math.round((parsedAmount / participants.length) * 100) / 100;
      return participants.map((p) => ({ participantId: p.id, amount: perPerson }));
    }

    if (splitMode === "equal_group") {
      // Group by groupName (participants with no group name each get their own group)
      const groups = new Map<string, TripParticipant[]>();
      for (const p of participants) {
        const key = p.groupName ?? `__solo_${p.id}`;
        const existing = groups.get(key) ?? [];
        groups.set(key, [...existing, p]);
      }
      const groupCount = groups.size;
      const perGroup = Math.round((parsedAmount / groupCount) * 100) / 100;

      const splits: Array<{ participantId: string; amount: number }> = [];
      for (const [, members] of groups) {
        const perMember = Math.round((perGroup / members.length) * 100) / 100;
        for (const p of members) {
          splits.push({ participantId: p.id, amount: perMember });
        }
      }
      return splits;
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = expense
      ? `/api/trips/${tripId}/expenses/${expense.id}`
      : `/api/trips/${tripId}/expenses`;
    const method = expense ? "PATCH" : "POST";

    const splits = buildSplits();

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyMemberId: familyMemberId === NONE ? null : familyMemberId,
        creditCardId: creditCardId === NONE ? null : creditCardId,
        paidByParticipantId: paidByParticipantId === NONE ? null : paidByParticipantId,
        category,
        description,
        amount: parseFloat(amount),
        date,
        pointsEarned: parseInt(pointsEarned, 10) || 0,
        receiptPath,
        ...(splits !== null && { splits }),
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

  const previewSrc = localPreviewUrl ?? (receiptPath ? `/uploads/receipts/${receiptPath}` : null);
  const parsedAmount = parseFloat(amount) || 0;

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

        {/* Paid By — show participant dropdown if participants exist, else family member dropdown */}
        {participants.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="paid-by-participant">Paid By (Participant)</Label>
            <Select value={paidByParticipantId} onValueChange={setPaidByParticipantId}>
              <SelectTrigger id="paid-by-participant">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Anyone</SelectItem>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.groupName ? ` (${p.groupName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
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
        )}

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

        {/* Split section — only shown if participants exist */}
        {participants.length > 0 && (
          <div className="col-span-2 space-y-3 rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium mb-2">Split</p>
              <div className="flex gap-1 rounded-lg border bg-background p-0.5 w-fit">
                {(
                  [
                    { id: "none" as const, label: "No Split" },
                    { id: "equal_person" as const, label: "Equal per Person" },
                    { id: "equal_group" as const, label: "Equal by Group" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      splitMode === opt.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSplitMode(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {splitMode === "equal_person" && parsedAmount > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Split equally among {participants.length} participant
                  {participants.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        ${(parsedAmount / participants.length).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {splitMode === "equal_group" && parsedAmount > 0 && (() => {
              const groups = new Map<string, TripParticipant[]>();
              for (const p of participants) {
                const key = p.groupName ?? `__solo_${p.id}`;
                const existing = groups.get(key) ?? [];
                groups.set(key, [...existing, p]);
              }
              const groupCount = groups.size;
              const perGroup = parsedAmount / groupCount;

              return (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Split equally among {groupCount} group{groupCount !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1.5">
                    {Array.from(groups.entries()).map(([key, members]) => {
                      const label = members[0]?.groupName ?? members[0]?.name ?? key;
                      const perMember = perGroup / members.length;
                      return (
                        <div key={key} className="rounded border bg-background p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">${perGroup.toFixed(2)} total</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {members.map((p) => (
                              <span key={p.id} className="text-muted-foreground">
                                {p.name}: ${perMember.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="col-span-2 space-y-2">
          <Label>Receipt (optional)</Label>
          {previewSrc ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt="Receipt preview"
                    className="h-16 w-16 rounded object-cover ring-1 ring-border"
                  />
                  {uploadingReceipt && (
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50 text-xs text-white">
                      Uploading…
                    </div>
                  )}
                </div>
                {!uploadingReceipt && receiptPath && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleScanReceipt()}
                    disabled={scanning}
                  >
                    {scanning ? "Scanning…" : "✨ Scan with AI"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveReceipt}
                  disabled={uploadingReceipt || scanning}
                >
                  × Remove
                </Button>
              </div>
              {scanMessage && (
                <p className={`text-sm ${scanStatus === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                  {scanStatus === "success" ? "✓ " : "⚠ "}
                  {scanMessage}
                </p>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                id="receipt-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => void handleReceiptChange(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                📎 Attach Receipt
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploadingReceipt || !description || !amount}>
          {loading ? "Saving…" : expense ? "Save Changes" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
