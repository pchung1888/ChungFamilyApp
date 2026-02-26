import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** A single expense entry shown on the dashboard. */
interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  trip: { id: string; name: string };
  familyMember: { name: string } | null;
}

/** Props for the RecentExpenses dashboard card. */
interface RecentExpensesProps {
  expenses: RecentExpense[];
}

interface CategoryStyle {
  dot: string;
  text: string;
  bg: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  hotel:       { dot: "bg-purple-400",  text: "text-purple-700",  bg: "bg-purple-50"  },
  flight:      { dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50"    },
  food:        { dot: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50"  },
  gas:         { dot: "bg-yellow-400",  text: "text-yellow-700",  bg: "bg-yellow-50"  },
  ev_charging: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  tours:       { dot: "bg-pink-400",    text: "text-pink-700",    bg: "bg-pink-50"    },
  shopping:    { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  other:       { dot: "bg-gray-400",    text: "text-gray-600",    bg: "bg-gray-50"    },
};

const DEFAULT_STYLE: CategoryStyle = {
  dot: "bg-gray-400",
  text: "text-gray-600",
  bg: "bg-gray-50",
};

function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentExpenses({ expenses }: RecentExpensesProps): React.ReactElement {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Expenses</CardTitle>
          <Link
            href="/trips"
            className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            All trips
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              🧾
            </span>
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {expenses.map((expense, index) => {
              const style = CATEGORY_STYLES[expense.category] ?? DEFAULT_STYLE;

              return (
                <div
                  key={expense.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50",
                    index < expenses.length - 1 && "border-b border-border/60"
                  )}
                >
                  {/* Category dot */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      style.bg
                    )}
                    aria-hidden="true"
                  >
                    <div className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                  </div>

                  {/* Description + metadata */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {expense.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-xs font-medium",
                          style.bg,
                          style.text
                        )}
                      >
                        {getCategoryLabel(expense.category)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <Link
                        href={`/trips/${expense.trip.id}`}
                        className="truncate max-w-[100px] hover:underline underline-offset-2"
                      >
                        {expense.trip.name}
                      </Link>
                      {expense.familyMember && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">{expense.familyMember.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount + date */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      ${expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
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
