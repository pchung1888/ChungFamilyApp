import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExpiringCard {
  id: string;
  name: string;
  lastFour: string;
  pointsBalance: number;
  pointsName: string;
  pointsExpiresAt: Date;
  daysUntilExpiry: number;
}

interface ExpiringMilesAlertProps {
  cards: ExpiringCard[];
}

export function ExpiringMilesAlert({ cards }: ExpiringMilesAlertProps): React.ReactElement | null {
  if (cards.length === 0) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>⚠️</span>
          <span>Expiring Points Alert</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cards.map((card) => {
            const isUrgent = card.daysUntilExpiry <= 30;
            const label =
              card.daysUntilExpiry <= 0
                ? "Expired"
                : card.daysUntilExpiry === 1
                ? "Expires tomorrow"
                : `Expires in ${card.daysUntilExpiry}d`;

            return (
              <div key={card.id} className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">{card.name}</span>
                  <span className="text-muted-foreground ml-1">···{card.lastFour}</span>
                  <span className="text-muted-foreground ml-2">
                    {card.pointsBalance.toLocaleString()} {card.pointsName} pts
                  </span>
                </div>
                <Badge
                  className={
                    isUrgent
                      ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 shrink-0"
                      : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 shrink-0"
                  }
                >
                  {label}
                </Badge>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <Link href="/cards" className="underline underline-offset-2 hover:text-foreground">
            Manage cards →
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
