import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIP_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** A single upcoming trip summary for the dashboard. */
interface UpcomingTrip {
  id: string;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date | null;
  budget: number | null;
  type: string;
  totalSpent: number;
}

/** Props for the UpcomingTrips dashboard card. */
interface UpcomingTripsProps {
  trips: UpcomingTrip[];
}

function getTripTypeLabel(type: string): string {
  return TRIP_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getTripTypeIcon(type: string): string {
  switch (type) {
    case "road_trip":
      return "🚗";
    case "flight":
      return "✈️";
    case "local":
      return "📍";
    default:
      return "🗺️";
  }
}

function formatDateRange(start: Date, end: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  if (!end) return startStr;
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DaysChip({ days }: { days: number }): React.ReactElement {
  if (days <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Today!
      </span>
    );
  }
  if (days === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
        Tomorrow
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
        {days}d away
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {days}d away
    </span>
  );
}

export function UpcomingTrips({ trips }: UpcomingTripsProps): React.ReactElement {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming Trips</CardTitle>
          <Link
            href="/trips"
            className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            All trips
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {trips.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              🗺️
            </span>
            <p className="text-sm text-muted-foreground">No upcoming trips.</p>
            <Link
              href="/trips"
              className="text-sm font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Plan one now
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {trips.map((trip, index) => {
              const days = daysUntil(trip.startDate);
              const budgetPct =
                trip.budget !== null
                  ? Math.min((trip.totalSpent / trip.budget) * 100, 100)
                  : null;
              const overBudget =
                trip.budget !== null && trip.totalSpent > trip.budget;

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className={cn(
                    "group block rounded-xl px-3 py-3 transition-colors hover:bg-muted/60",
                    index < trips.length - 1 && "border-b border-border/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: icon + info */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg"
                        aria-hidden="true"
                      >
                        {getTripTypeIcon(trip.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:underline group-hover:underline-offset-2">
                          {trip.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                        </p>
                        {/* Budget progress */}
                        {budgetPct !== null && (
                          <div className="mt-2 space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                ${trip.totalSpent.toFixed(0)} spent
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  overBudget ? "text-destructive" : "text-muted-foreground"
                                )}
                              >
                                ${trip.budget!.toFixed(0)} budget
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  overBudget ? "bg-destructive" : "bg-sky-500"
                                )}
                                style={{ width: `${budgetPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: type badge + countdown */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {getTripTypeLabel(trip.type)}
                      </Badge>
                      <DaysChip days={days} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
