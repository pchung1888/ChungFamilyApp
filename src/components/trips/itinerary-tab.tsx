"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItineraryForm } from "@/components/trips/itinerary-form";
import { ITINERARY_TYPES } from "@/lib/constants";
import type { ItineraryItemType } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** A single itinerary item as returned by the API */
interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  title: string;
  type: ItineraryItemType;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sortOrder: number;
}

/** Props for ItineraryTab */
interface ItineraryTabProps {
  /** The trip ID to load itinerary for */
  tripId: string;
}

/** Maps type value to badge colour classes */
const TYPE_COLORS: Record<string, string> = {
  accommodation: "bg-violet-100 text-violet-800",
  activity: "bg-sky-100 text-sky-800",
  transport: "bg-amber-100 text-amber-800",
  flight: "bg-indigo-100 text-indigo-800",
};

/** Maps type value to emoji icon */
const TYPE_ICON: Record<string, string> = {
  accommodation: "🏨",
  activity: "🗺️",
  transport: "🚌",
  flight: "✈️",
};

function formatDate(iso: string): string {
  // Parse YYYY-MM-DD as a local date to avoid UTC offset shifting the displayed day.
  const parts = iso.slice(0, 10).split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Group a flat list of items into day buckets, ordered by date */
function groupByDay(
  items: ItineraryItem[]
): { day: string; items: ItineraryItem[] }[] {
  const map = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const day = item.date.slice(0, 10);
    const group = map.get(day) ?? [];
    group.push(item);
    map.set(day, group);
  }
  return Array.from(map.entries()).map(([day, dayItems]) => ({
    day,
    items: dayItems,
  }));
}

export function ItineraryTab({ tripId }: ItineraryTabProps): React.ReactElement {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);

  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`);
      const json = (await res.json()) as {
        data: ItineraryItem[] | null;
        error: string | null;
      };
      if (json.error) {
        setError(json.error);
      } else {
        setItems(json.data ?? []);
        setError(null);
      }
    } catch {
      setError("Failed to load itinerary");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function handleDelete(itemId: string, title: string): Promise<void> {
    if (!confirm(`Remove "${title}" from itinerary?`)) return;
    await fetch(`/api/trips/${tripId}/itinerary/${itemId}`, {
      method: "DELETE",
    });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  const days = groupByDay(items);

  return (
    <div className="space-y-4">
      {/* Toolbar — always visible */}
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Itinerary Item</DialogTitle>
            </DialogHeader>
            <ItineraryForm
              tripId={tripId}
              onSuccess={(newItem) => {
                setItems((prev) =>
                  [...prev, newItem as ItineraryItem].sort(
                    (a, b) =>
                      a.date.localeCompare(b.date) ||
                      a.sortOrder - b.sortOrder
                  )
                );
                setAddOpen(false);
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {loading && (
        <p className="text-muted-foreground text-sm">Loading itinerary…</p>
      )}

      {/* Error state — inline so Add button stays visible */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl" aria-hidden="true">⚠️</span>
          <p className="text-sm text-destructive">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setLoading(true); void fetchItems(); }}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="text-5xl" aria-hidden="true">
            🗓️
          </span>
          <p className="text-muted-foreground text-sm">
            No itinerary yet. Add your first item above!
          </p>
        </div>
      )}

      {/* Day groups */}
      {!loading && !error && days.map(({ day, items: dayItems }) => (
        <div key={day} className="space-y-2">
          {/* Day header */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatDate(day)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Timeline items */}
          <div className="space-y-2 pl-2">
            {dayItems.map((item) => (
              <div
                key={item.id}
                className="relative flex gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                {/* Type icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                  {TYPE_ICON[item.type] ?? "📌"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge
                      className={cn(
                        "px-1.5 py-0 text-xs",
                        TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-800"
                      )}
                    >
                      {ITINERARY_TYPES.find((t) => t.value === item.type)
                        ?.label ?? item.type}
                    </Badge>
                  </div>

                  {item.location && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      📍 {item.location}
                    </p>
                  )}

                  {(item.startTime ?? item.endTime) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      🕐 {item.startTime ?? ""}
                      {item.startTime && item.endTime ? " – " : ""}
                      {item.endTime ?? ""}
                    </p>
                  )}

                  {item.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <Dialog
                    open={editItem?.id === item.id}
                    onOpenChange={(open) => {
                      if (!open) setEditItem(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditItem(item)}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit Itinerary Item</DialogTitle>
                      </DialogHeader>
                      <ItineraryForm
                        tripId={tripId}
                        item={editItem ?? undefined}
                        onSuccess={(updated) => {
                          setItems((prev) =>
                            prev
                              .map((i) =>
                                i.id === (updated as ItineraryItem).id
                                  ? (updated as ItineraryItem)
                                  : i
                              )
                              .sort(
                                (a, b) =>
                                  a.date.localeCompare(b.date) ||
                                  a.sortOrder - b.sortOrder
                              )
                          );
                          setEditItem(null);
                        }}
                        onCancel={() => setEditItem(null)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(item.id, item.title)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
