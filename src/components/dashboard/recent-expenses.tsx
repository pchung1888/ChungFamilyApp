import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  trip: { id: string; name: string };
  familyMember: { name: string } | null;
}

interface RecentExpensesProps {
  expenses: RecentExpense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "bg-purple-100 text-purple-800",
  flight: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  gas: "bg-yellow-100 text-yellow-800",
  ev_charging: "bg-green-100 text-green-800",
  tours: "bg-pink-100 text-pink-800",
  shopping: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};

function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function RecentExpenses({ expenses }: RecentExpensesProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Expenses</CardTitle>
          <Link href="/trips" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            All trips →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{expense.description}</span>
                    <Badge
                      className={`text-xs ${CATEGORY_COLORS[expense.category] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {getCategoryLabel(expense.category)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Link
                      href={`/trips/${expense.trip.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {expense.trip.name}
                    </Link>
                    {expense.familyMember && (
                      <span> · {expense.familyMember.name}</span>
                    )}
                    <span> · {expense.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  ${expense.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
