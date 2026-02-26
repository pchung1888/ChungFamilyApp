"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BalanceEntry {
  participantId: string;
  name: string;
  net: number;
}

interface TransactionEntry {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

interface BalanceData {
  balances: BalanceEntry[];
  transactions: TransactionEntry[];
}

/** Props for BalanceTab */
interface BalanceTabProps {
  /** The trip ID */
  tripId: string;
}

interface SettleDialogState {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export function BalanceTab({ tripId }: BalanceTabProps): React.ReactElement {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settle dialog state
  const [settleDialog, setSettleDialog] = useState<SettleDialogState | null>(null);
  const [settleNote, setSettleNote] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/balance`);
      const json = (await res.json()) as {
        data: BalanceData | null;
        error: string | null;
      };
      if (json.data) setData(json.data);
      else setError(json.error ?? "Failed to load balance");
    } catch {
      setError("Failed to load balance");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  function openSettleDialog(tx: TransactionEntry): void {
    setSettleDialog({
      fromId: tx.from.id,
      fromName: tx.from.name,
      toId: tx.to.id,
      toName: tx.to.name,
      amount: tx.amount,
    });
    setSettleNote("");
    setSettleError(null);
  }

  async function handleMarkPaid(): Promise<void> {
    if (!settleDialog) return;
    setSettleError(null);
    setSettling(true);

    const res = await fetch(`/api/trips/${tripId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromId: settleDialog.fromId,
        toId: settleDialog.toId,
        amount: settleDialog.amount,
        note: settleNote.trim() || null,
      }),
    });

    const json = (await res.json()) as { data: unknown; error: string | null };
    setSettling(false);

    if (json.error) {
      setSettleError(json.error);
      return;
    }

    setSettleDialog(null);
    void fetchBalance();
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Computing balances…</p>;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!data || data.balances.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-4xl" aria-hidden="true">💰</span>
        <p className="text-muted-foreground text-sm">
          Add participants first to track balances.
        </p>
      </div>
    );
  }

  const hasActivity = data.balances.some((b) => Math.abs(b.net) > 0.005);

  return (
    <div className="space-y-6">
      {/* Net balances */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Net Balances
        </h3>
        <div className="space-y-2">
          {data.balances.map((b) => {
            const isOwed = b.net > 0.005;
            const owes = b.net < -0.005;
            return (
              <div
                key={b.participantId}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5"
              >
                <span className="font-medium text-sm">{b.name}</span>
                <div className="flex items-center gap-1.5">
                  {isOwed && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium" aria-label="arrow up">
                      ↑
                    </span>
                  )}
                  {owes && (
                    <span className="text-red-500 dark:text-red-400 text-xs font-medium" aria-label="arrow down">
                      ↓
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isOwed && "text-emerald-600 dark:text-emerald-400",
                      owes && "text-red-500 dark:text-red-400",
                      !isOwed && !owes && "text-muted-foreground"
                    )}
                  >
                    {isOwed && "+"}
                    {b.net === 0 ? "$0.00" : `$${Math.abs(b.net).toFixed(2)}`}
                  </span>
                  {!isOwed && !owes && (
                    <span className="text-xs text-muted-foreground">(settled)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested transactions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          To Settle
        </h3>

        {!hasActivity || data.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasActivity
              ? "No settlement transactions needed."
              : "No expenses with splits recorded yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-medium">{tx.from.name}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{tx.to.name}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="font-semibold tabular-nums">${tx.amount.toFixed(2)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => openSettleDialog(tx)}
                >
                  Mark Paid
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settle confirmation dialog */}
      <Dialog
        open={settleDialog !== null}
        onOpenChange={(open) => { if (!open) setSettleDialog(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
          </DialogHeader>
          {settleDialog && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{settleDialog.fromName}</span>
                {" pays "}
                <span className="font-medium text-foreground">{settleDialog.toName}</span>
                {" "}
                <span className="font-semibold text-foreground">
                  ${settleDialog.amount.toFixed(2)}
                </span>
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="settle-note">Note (optional)</Label>
                <Input
                  id="settle-note"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="Venmo, cash, etc."
                />
              </div>

              {settleError && (
                <p className="text-sm text-destructive">{settleError}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSettleDialog(null)}
                  disabled={settling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleMarkPaid()}
                  disabled={settling}
                >
                  {settling ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
