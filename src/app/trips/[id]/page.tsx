"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseForm } from "@/components/trips/expense-form";
import { EXPENSE_CATEGORIES, TRIP_TYPES } from "@/lib/constants";

interface FamilyMember {
  id: string;
  name: string;
}

interface CreditCard {
  id: string;
  name: string;
  lastFour: string;
  pointsName: string;
  isActive: boolean;
}

interface Expense {
  id: string;
  tripId: string;
  familyMemberId: string | null;
  creditCardId: string | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  pointsEarned: number;
  receiptPath: string | null;
  familyMember: { id: string; name: string } | null;
  creditCard: { id: string; name: string; lastFour: string; pointsName: string } | null;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  budget: number | null;
  type: string;
  notes: string | null;
  expenses: Expense[];
}

function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function getTripTypeLabel(type: string): string {
  return TRIP_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "bg-violet-100 text-violet-800",
  flight: "bg-sky-100 text-sky-800",
  food: "bg-orange-100 text-orange-800",
  gas: "bg-amber-100 text-amber-800",
  ev_charging: "bg-emerald-100 text-emerald-800",
  tours: "bg-pink-100 text-pink-800",
  shopping: "bg-rose-100 text-rose-800",
  other: "bg-stone-100 text-stone-700",
};

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchTrip = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/trips/${id}`);
    const json = (await res.json()) as { data: Trip | null; error: string | null };
    if (json.data) setTrip(json.data);
  }, [id]);

  useEffect(() => {
    async function loadAll(): Promise<void> {
      const [tripRes, membersRes, cardsRes] = await Promise.all([
        fetch(`/api/trips/${id}`),
        fetch("/api/family"),
        fetch("/api/cards"),
      ]);
      const [tripJson, membersJson, cardsJson] = await Promise.all([
        tripRes.json() as Promise<{ data: Trip | null; error: string | null }>,
        membersRes.json() as Promise<{ data: FamilyMember[] | null; error: string | null }>,
        cardsRes.json() as Promise<{ data: CreditCard[] | null; error: string | null }>,
      ]);
      if (tripJson.data) setTrip(tripJson.data);
      if (membersJson.data) setFamilyMembers(membersJson.data);
      if (cardsJson.data) setCreditCards(cardsJson.data.filter((c) => c.isActive));
      setLoading(false);
    }
    void loadAll();
  }, [id]);

  async function handleDeleteExpense(expenseId: string, description: string): Promise<void> {
    if (!confirm(`Remove expense "${description}"?`)) return;
    await fetch(`/api/trips/${id}/expenses/${expenseId}`, { method: "DELETE" });
    void fetchTrip();
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!trip) return <p className="text-destructive">Trip not found.</p>;

  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPoints = trip.expenses.reduce((sum, e) => sum + e.pointsEarned, 0);
  const budgetPct = trip.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : null;
  const overBudget = trip.budget !== null && totalSpent > trip.budget;

  // Category totals
  const categoryTotals = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: trip.expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      {/* Header — travel theme banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-4 -top-4 select-none text-[7rem] leading-none opacity-[0.1]">
          {trip.type === "road_trip" ? "🚗" : trip.type === "local" ? "📍" : "✈️"}
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-1">
              <Link
                href="/trips"
                className="text-sm text-sky-200 hover:text-white transition-colors"
              >
                ← Trips
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="border-white/30 bg-white/15 text-white">
                {getTripTypeLabel(trip.type)}
              </Badge>
              <span className="text-sky-200 text-sm">{trip.destination}</span>
              <span className="text-sky-300 text-sm">·</span>
              <span className="text-sky-200 text-sm">
                {formatDate(trip.startDate)}
                {trip.endDate && ` – ${formatDate(trip.endDate)}`}
              </span>
            </div>
            {trip.notes && (
              <p className="text-sm text-sky-200 mt-1">{trip.notes}</p>
            )}
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                tripId={trip.id}
                familyMembers={familyMembers}
                creditCards={creditCards}
                onSuccess={() => { setAddOpen(false); void fetchTrip(); }}
                onCancel={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overBudget ? "text-destructive" : ""}`}>
              ${totalSpent.toFixed(2)}
            </p>
            {trip.budget && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Budget: ${trip.budget.toFixed(0)}</span>
                  <span className={overBudget ? "text-destructive" : ""}>
                    {overBudget
                      ? `$${(totalSpent - trip.budget).toFixed(0)} over`
                      : `$${(trip.budget - totalSpent).toFixed(0)} left`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overBudget ? "bg-destructive" : "bg-sky-500"}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{trip.expenses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Points Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryTotals.map((cat) => (
                <div key={cat.value} className="flex items-center gap-3">
                  <Badge
                    className={`text-xs w-28 justify-center shrink-0 ${CATEGORY_COLORS[cat.value] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {cat.label}
                  </Badge>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: totalSpent > 0 ? `${(cat.total / totalSpent) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    ${cat.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Expenses</h2>

        {trip.expenses.length === 0 ? (
          <p className="text-muted-foreground">No expenses yet. Add one above!</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="w-12">📷</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trip.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${CATEGORY_COLORS[expense.category] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.familyMember?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.creditCard
                        ? `···${expense.creditCard.lastFour}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {expense.pointsEarned > 0 ? expense.pointsEarned.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      {expense.receiptPath ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(`/uploads/receipts/${expense.receiptPath}`)}
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/uploads/receipts/${expense.receiptPath}`}
                            alt="Receipt"
                            className="h-9 w-9 rounded object-cover ring-1 ring-border"
                          />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-lg">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Dialog
                          open={editExpense?.id === expense.id}
                          onOpenChange={(open) => { if (!open) setEditExpense(null); }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditExpense(expense)}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Edit Expense</DialogTitle>
                            </DialogHeader>
                            <ExpenseForm
                              tripId={trip.id}
                              expense={editExpense ?? undefined}
                              familyMembers={familyMembers}
                              creditCards={creditCards}
                              onSuccess={() => { setEditExpense(null); void fetchTrip(); }}
                              onCancel={() => setEditExpense(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteExpense(expense.id, expense.description)}
                        >
                          ×
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Receipt lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl bg-black/90 p-2 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxUrl} alt="Receipt" className="max-h-[85vh] w-full object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
