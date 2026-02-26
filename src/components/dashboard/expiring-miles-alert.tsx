import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** A single credit card with expiring points. */
interface ExpiringCard {
  id: string;
  name: string;
  lastFour: string;
  pointsBalance: number;
  pointsName: string;
  pointsExpiresAt: Date;
  daysUntilExpiry: number;
}

/** Props for the ExpiringMilesAlert banner. */
interface ExpiringMilesAlertProps {
  cards: ExpiringCard[];
}

export function ExpiringMilesAlert({ cards }: ExpiringMilesAlertProps): React.ReactElement | null {
  if (cards.length === 0) return null;

  const hasUrgent = cards.some((c) => c.daysUntilExpiry <= 30);

  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-4",
        hasUrgent
          ? "border-red-200 bg-red-50/60"
          : "border-amber-200 bg-amber-50/60"
      )}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {hasUrgent ? "🚨" : "⚠️"}
          </span>
          <p
            className={cn(
              "text-sm font-semibold",
              hasUrgent ? "text-red-800" : "text-amber-800"
            )}
          >
            {hasUrgent ? "Urgent: Points Expiring Soon" : "Points Expiring Within 90 Days"}
          </p>
        </div>
        <Link
          href="/cards"
          className={cn(
            "text-xs underline underline-offset-2 transition-colors",
            hasUrgent
              ? "text-red-700 hover:text-red-900"
              : "text-amber-700 hover:text-amber-900"
          )}
        >
          Manage cards
        </Link>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {cards.map((card) => {
          const isUrgent = card.daysUntilExpiry <= 30;
          const label =
            card.daysUntilExpiry <= 0
              ? "Expired"
              : card.daysUntilExpiry === 1
              ? "Tomorrow"
              : `${card.daysUntilExpiry}d left`;

          return (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {card.name}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ···{card.lastFour}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.pointsBalance.toLocaleString()} {card.pointsName} pts
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 font-medium",
                  isUrgent
                    ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
                    : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                )}
              >
                {label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
