import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface CategoryTotal {
  category: string;
  total: number;
}

interface SpendingChartProps {
  categoryTotals: CategoryTotal[];
  grandTotal: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "bg-purple-400",
  flight: "bg-blue-400",
  food: "bg-orange-400",
  gas: "bg-yellow-400",
  ev_charging: "bg-green-400",
  tours: "bg-pink-400",
  shopping: "bg-red-400",
  other: "bg-gray-400",
};

const CATEGORY_TEXT: Record<string, string> = {
  hotel: "text-purple-700",
  flight: "text-blue-700",
  food: "text-orange-700",
  gas: "text-yellow-700",
  ev_charging: "text-green-700",
  tours: "text-pink-700",
  shopping: "text-red-700",
  other: "text-gray-700",
};

function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function SpendingChart({ categoryTotals, grandTotal }: SpendingChartProps): React.ReactElement {
  const sorted = [...categoryTotals].sort((a, b) => b.total - a.total);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Spending by Category</CardTitle>
          <span className="text-sm font-semibold">${grandTotal.toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((item) => {
              const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
              const barColor = CATEGORY_COLORS[item.category] ?? "bg-gray-400";
              const textColor = CATEGORY_TEXT[item.category] ?? "text-gray-700";

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${textColor}`}>
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-muted-foreground">
                      ${item.total.toFixed(2)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
