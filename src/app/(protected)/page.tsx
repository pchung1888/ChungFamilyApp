import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ExpiringMilesAlert } from "@/components/dashboard/expiring-miles-alert";
import { UpcomingTrips } from "@/components/dashboard/upcoming-trips";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { Button } from "@/components/ui/button";

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
    .filter(
      (c) =>
        c.pointsExpiresAt !== null &&
        c.pointsExpiresAt > now &&
        c.pointsExpiresAt <= ninetyDaysFromNow
    )
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
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 p-6 text-white shadow-lg sm:p-8">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[9rem] leading-none opacity-10">
          🌴
        </div>
        <div className="pointer-events-none absolute -left-4 bottom-0 select-none text-[6rem] leading-none opacity-[0.07]">
          ✈️
        </div>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-orange-100">
              {now.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome, Chung Family!
            </h1>
            <p className="mt-1.5 text-orange-100 sm:text-base">
              Your travel &amp; rewards command center.
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              asChild
            >
              <Link href="/trips">View Trips</Link>
            </Button>
            <Button
              size="sm"
              className="bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-sm"
              asChild
            >
              <Link href="/cards">Manage Cards</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <StatCards
        familyCount={familyMembers.length}
        activeCardCount={activeCards.length}
        upcomingTripCount={upcomingTrips.length}
        totalPoints={totalPoints}
      />

      {/* Expiring miles alert */}
      {expiringCards.length > 0 && <ExpiringMilesAlert cards={expiringCards} />}

      {/* Two-column content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingTrips trips={upcomingTripCards} />
        <RecentExpenses expenses={recentExpenses} />
      </div>

      {/* Full-width spending chart */}
      <SpendingChart categoryTotals={categoryTotals} grandTotal={grandTotal} />
    </div>
  );
}
