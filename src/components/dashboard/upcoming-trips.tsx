import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIP_TYPES } from "@/lib/constants";

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

interface UpcomingTripsProps {
  trips: UpcomingTrip[];
}

function getTripTypeLabel(type: string): string {
  return TRIP_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function UpcomingTrips({ trips }: UpcomingTripsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Upcoming Trips</CardTitle>
          <Link href="/trips" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            All trips →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming trips.{" "}
            <Link href="/trips" className="underline underline-offset-2 hover:text-foreground">
              Plan one →
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const days = daysUntil(trip.startDate);
              const budgetPct = trip.budget
                ? Math.min((trip.totalSpent / trip.budget) * 100, 100)
                : null;

              return (
                <Link key={trip.id} href={`/trips/${trip.id}`} className="block group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:underline underline-offset-2 truncate">
                        {trip.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.destination} · {formatDate(trip.startDate)}
                        {trip.endDate && ` – ${formatDate(trip.endDate)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {getTripTypeLabel(trip.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `In ${days}d`}
                      </span>
                    </div>
                  </div>
                  {budgetPct !== null && (
                    <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
