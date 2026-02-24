"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
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
import { TripForm } from "@/components/trips/trip-form";
import { TRIP_TYPES } from "@/lib/constants";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  budget: number | null;
  type: string;
  notes: string | null;
  expenses: { amount: number }[];
  _count: { expenses: number };
}

function getTripTypeLabel(type: string): string {
  return TRIP_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getTripTypeEmoji(type: string): string {
  switch (type) {
    case "road_trip": return "🚗";
    case "flight":    return "✈️";
    case "local":     return "📍";
    default:          return "🗺️";
  }
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!endDate) return start.toLocaleDateString("en-US", opts);
  const end = new Date(endDate);
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function isFuture(startDate: string): boolean {
  return new Date(startDate) > new Date();
}

interface TripCardProps {
  trip: Trip;
  editTripId: string | null;
  onEditOpen: (trip: Trip) => void;
  onEditClose: () => void;
  onRefresh: () => void;
  onDelete: (id: string, name: string) => void;
}

function TripCard({ trip, editTripId, onEditOpen, onEditClose, onRefresh, onDelete }: TripCardProps): React.ReactElement {
  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPct = trip.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : null;
  const overBudget = trip.budget !== null && totalSpent > trip.budget;

  return (
    <Card className="border-t-2 border-t-sky-400">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{trip.name}</CardTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            {getTripTypeEmoji(trip.type)} {getTripTypeLabel(trip.type)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{trip.destination}</p>
      </CardHeader>

      <CardContent className="pb-2 space-y-2">
        <p className="text-xs text-muted-foreground">
          {formatDateRange(trip.startDate, trip.endDate)}
        </p>

        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {trip._count.expenses} expense{trip._count.expenses !== 1 ? "s" : ""}
            </span>
            <span className={overBudget ? "text-destructive font-medium" : "font-medium"}>
              ${totalSpent.toFixed(2)}
              {trip.budget && (
                <span className="text-muted-foreground font-normal"> / ${trip.budget.toFixed(0)}</span>
              )}
            </span>
          </div>

          {budgetPct !== null && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${overBudget ? "bg-destructive" : "bg-sky-500"}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="default" size="sm" asChild className="flex-1">
          <Link href={`/trips/${trip.id}`}>View</Link>
        </Button>

        <Dialog
          open={editTripId === trip.id}
          onOpenChange={(open) => { if (!open) onEditClose(); }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => onEditOpen(trip)}>
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {trip.name}</DialogTitle>
            </DialogHeader>
            <TripForm
              trip={trip}
              onSuccess={() => { onEditClose(); onRefresh(); }}
              onCancel={onEditClose}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(trip.id, trip.name)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function TripsPage(): React.ReactElement {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);

  const fetchTrips = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/trips");
    const json = (await res.json()) as { data: Trip[] | null; error: string | null };
    if (json.data) setTrips(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!confirm(`Delete trip "${name}"? All expenses will be removed.`)) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    void fetchTrips();
  }

  const upcomingTrips = trips.filter((t) => isFuture(t.startDate));
  const pastTrips = trips.filter((t) => !isFuture(t.startDate));

  return (
    <div className="space-y-8">
      {/* Travel-themed header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-4 -top-4 select-none text-[8rem] leading-none opacity-[0.1]">✈️</div>
        <div className="pointer-events-none absolute -left-2 bottom-0 select-none text-[5rem] leading-none opacity-[0.07]">🗺️</div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">✈️ Trips</h1>
            <p className="mt-1 text-sky-200">
              {trips.length} trip{trips.length !== 1 ? "s" : ""}
              {upcomingTrips.length > 0 && ` · ${upcomingTrips.length} upcoming`}
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Trip</DialogTitle>
              </DialogHeader>
              <TripForm
                onSuccess={() => { setAddOpen(false); void fetchTrips(); }}
                onCancel={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : trips.length === 0 ? (
        <p className="text-muted-foreground">No trips yet. Create one above!</p>
      ) : (
        <div className="space-y-6">
          {upcomingTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
                <span>✈️</span> Coming Up
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    editTripId={editTrip?.id ?? null}
                    onEditOpen={setEditTrip}
                    onEditClose={() => setEditTrip(null)}
                    onRefresh={() => void fetchTrips()}
                    onDelete={(id, name) => void handleDelete(id, name)}
                  />
                ))}
              </div>
            </div>
          )}

          {pastTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                <span>🗺️</span> Past Adventures
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    editTripId={editTrip?.id ?? null}
                    onEditOpen={setEditTrip}
                    onEditClose={() => setEditTrip(null)}
                    onRefresh={() => void fetchTrips()}
                    onDelete={(id, name) => void handleDelete(id, name)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
