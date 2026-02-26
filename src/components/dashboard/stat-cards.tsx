import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Props for the StatCards grid on the dashboard. */
interface StatCardsProps {
  familyCount: number;
  activeCardCount: number;
  upcomingTripCount: number;
  totalPoints: number;
}

interface StatConfig {
  label: string;
  value: string | number;
  description: string;
  icon: string;
  accentClass: string;
  iconBgClass: string;
}

export function StatCards({
  familyCount,
  activeCardCount,
  upcomingTripCount,
  totalPoints,
}: StatCardsProps): React.ReactElement {
  const stats: StatConfig[] = [
    {
      label: "Family Members",
      value: familyCount,
      description: "Traveling together",
      icon: "👨‍👩‍👧‍👦",
      accentClass: "border-t-orange-400",
      iconBgClass: "bg-orange-50",
    },
    {
      label: "Active Cards",
      value: activeCardCount,
      description: "Earning rewards",
      icon: "💳",
      accentClass: "border-t-sky-400",
      iconBgClass: "bg-sky-50",
    },
    {
      label: "Upcoming Trips",
      value: upcomingTripCount,
      description: upcomingTripCount === 1 ? "Adventure planned" : "Adventures planned",
      icon: "✈️",
      accentClass: "border-t-emerald-400",
      iconBgClass: "bg-emerald-50",
    },
    {
      label: "Total Points",
      value: totalPoints.toLocaleString(),
      description: "Across all cards",
      icon: "⭐",
      accentClass: "border-t-amber-400",
      iconBgClass: "bg-amber-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={cn(
            "border-t-2 shadow-sm transition-shadow hover:shadow-md",
            stat.accentClass
          )}
        >
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                  stat.iconBgClass
                )}
              >
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
