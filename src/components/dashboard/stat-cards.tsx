import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardsProps {
  familyCount: number;
  activeCardCount: number;
  upcomingTripCount: number;
  totalPoints: number;
}

export function StatCards({
  familyCount,
  activeCardCount,
  upcomingTripCount,
  totalPoints,
}: StatCardsProps): React.ReactElement {
  const stats = [
    { label: "Family Members", value: familyCount, unit: "" },
    { label: "Active Cards", value: activeCardCount, unit: "" },
    { label: "Upcoming Trips", value: upcomingTripCount, unit: "" },
    { label: "Total Points", value: totalPoints.toLocaleString(), unit: "" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}{stat.unit}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
