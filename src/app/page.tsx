import { prisma } from "@/lib/prisma";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ExpiringMilesAlert } from "@/components/dashboard/expiring-miles-alert";
import { UpcomingTrips } from "@/components/dashboard/upcoming-trips";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { SpendingChart } from "@/components/dashboard/spending-chart";

export default async function Home(): Promise<React.ReactElement> {
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [familyMembers, activeCards, trips, recentExpenses] = await Promise.all([
    prisma.familyMember.findMany({ select: { id: true } }),
    prisma.creditCard.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        lastFour: true,
        pointsBalance: true,
        pointsName: true,
        pointsExpiresAt: true,
      },
      orderBy: { pointsExpiresAt: "asc" },
    }),
    prisma.trip.findMany({
      orderBy: { startDate: "asc" },
      include: {
        expenses: { select: { amount: true, category: true } },
      },
    }),
    prisma.expense.findMany({
      take: 8,
      orderBy: { date: "desc" },
      include: {
        trip: { select: { id: true, name: true } },
        familyMember: { select: { name: true } },
      },
    }),
  ]);

  // Stat card data
  const upcomingTrips = trips.filter((t) => t.startDate > now);
  const totalPoints = activeCards.reduce((sum, c) => sum + c.pointsBalance, 0);

  // Expiring miles — cards with points expiring within 90 days
  const expiringCards = activeCards
    .filter((c) => c.pointsExpiresAt !== null && c.pointsExpiresAt > now && c.pointsExpiresAt <= ninetyDaysFromNow)
    .map((c) => ({
      ...c,
      pointsExpiresAt: c.pointsExpiresAt!,
      daysUntilExpiry: Math.floor(
        (c.pointsExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

  // Upcoming trips with spending total (next 3)
  const upcomingTripCards = upcomingTrips.slice(0, 3).map((t) => ({
    id: t.id,
    name: t.name,
    destination: t.destination,
    startDate: t.startDate,
    endDate: t.endDate,
    budget: t.budget,
    type: t.type,
    totalSpent: t.expenses.reduce((sum, e) => sum + e.amount, 0),
  }));

  // Spending by category — aggregate across all trips
  const categoryMap: Record<string, number> = {};
  for (const trip of trips) {
    for (const expense of trip.expenses) {
      categoryMap[expense.category] = (categoryMap[expense.category] ?? 0) + expense.amount;
    }
  }
  const categoryTotals = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total,
  }));
  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Chung Family!</h1>
        <p className="mt-1 text-muted-foreground">Your travel &amp; rewards command center.</p>
      </div>

      <StatCards
        familyCount={familyMembers.length}
        activeCardCount={activeCards.length}
        upcomingTripCount={upcomingTrips.length}
        totalPoints={totalPoints}
      />

      {expiringCards.length > 0 && (
        <ExpiringMilesAlert cards={expiringCards} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingTrips trips={upcomingTripCards} />
        <RecentExpenses expenses={recentExpenses} />
      </div>

      <SpendingChart categoryTotals={categoryTotals} grandTotal={grandTotal} />
    </div>
  );
}
