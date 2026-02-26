import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CategoryTotal {
  category: string;
  total: number;
}

/** Props for the SpendingChart dashboard card. */
interface SpendingChartProps {
  categoryTotals: CategoryTotal[];
  grandTotal: number;
}

interface CategoryStyle {
  bar: string;
  text: string;
  bg: string;
  dot: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  hotel:       { bar: "bg-purple-400",  text: "text-purple-700",  bg: "bg-purple-50",  dot: "bg-purple-400"  },
  flight:      { bar: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50",    dot: "bg-blue-400"    },
  food:        { bar: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50",  dot: "bg-orange-400"  },
  gas:         { bar: "bg-yellow-400",  text: "text-yellow-700",  bg: "bg-yellow-50",  dot: "bg-yellow-400"  },
  ev_charging: { bar: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-400" },
  tours:       { bar: "bg-pink-400",    text: "text-pink-700",    bg: "bg-pink-50",    dot: "bg-pink-400"    },
  shopping:    { bar: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50",     dot: "bg-red-400"     },
  other:       { bar: "bg-gray-400",    text: "text-gray-600",    bg: "bg-gray-50",    dot: "bg-gray-400"    },
};

const DEFAULT_STYLE: CategoryStyle = {
  bar: "bg-gray-400",
  text: "text-gray-600",
  bg: "bg-gray-50",
  dot: "bg-gray-400",
};

function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function SpendingChart({ categoryTotals, grandTotal }: SpendingChartProps): React.ReactElement {
  const sorted = [...categoryTotals].sort((a, b) => b.total - a.total);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">${grandTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">total across all trips</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              📊
            </span>
            <p className="text-sm text-muted-foreground">No spending data yet.</p>
          </div>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full">
              {sorted.map((item) => {
                const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
                const style = CATEGORY_STYLES[item.category] ?? DEFAULT_STYLE;
                return (
                  <div
                    key={item.category}
                    className={cn("h-full first:rounded-l-full last:rounded-r-full", style.bar)}
                    style={{ width: `${pct}%` }}
                    role="presentation"
                    aria-label={`${getCategoryLabel(item.category)}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Breakdown rows */}
            <div className="space-y-2">
              {sorted.map((item) => {
                const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
                const style = CATEGORY_STYLES[item.category] ?? DEFAULT_STYLE;

                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)}
                          aria-hidden="true"
                        />
                        <span className={cn("text-xs font-medium truncate", style.text)}>
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          ${item.total.toFixed(2)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                            style.bg,
                            style.text
                          )}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", style.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
