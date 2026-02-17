import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home(): React.ReactElement {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, Chung Family!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your family travel &amp; expense tracker.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Family</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage family members and roles.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track credit cards, points, and rewards.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Plan trips and log expenses.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
