"use client";

import { Badge } from "@/components/ui/badge";

interface PointsBadgeProps {
  pointsExpiresAt: Date | string | null;
  pointsBalance: number;
  pointsName: string;
}

function getExpirationStatus(expiresAt: Date | string | null): "expired" | "soon" | "ok" | "none" {
  if (!expiresAt) return "none";
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "soon";
  if (daysUntilExpiry <= 90) return "soon";
  return "ok";
}

function formatExpiry(expiresAt: Date | string): string {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)}d ago`;
  if (daysUntilExpiry === 0) return "Expires today";
  if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry}d`;
  if (daysUntilExpiry <= 90) return `Expires in ${daysUntilExpiry}d`;
  return expiry.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function PointsBadge({ pointsExpiresAt, pointsBalance, pointsName }: PointsBadgeProps): React.ReactElement {
  const status = getExpirationStatus(pointsExpiresAt);

  const balanceStr = pointsBalance.toLocaleString();

  if (status === "none") {
    return (
      <Badge variant="secondary">
        {balanceStr} {pointsName}
      </Badge>
    );
  }

  const expiryLabel = formatExpiry(pointsExpiresAt!);

  if (status === "expired") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
        {balanceStr} pts · {expiryLabel}
      </Badge>
    );
  }

  if (status === "soon") {
    const expiry = new Date(pointsExpiresAt!);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilExpiry <= 30;
    return (
      <Badge
        className={
          isUrgent
            ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
            : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
        }
      >
        {balanceStr} pts · {expiryLabel}
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
      {balanceStr} pts · {expiryLabel}
    </Badge>
  );
}
