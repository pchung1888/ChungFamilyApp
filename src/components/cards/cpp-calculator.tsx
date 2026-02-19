"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CppCalculatorProps {
  defaultCppBaseline?: number;
  pointsName?: string;
}

export function CppCalculator({
  defaultCppBaseline = 1.5,
  pointsName = "Points",
}: CppCalculatorProps): React.ReactElement {
  const [cashPrice, setCashPrice] = useState("");
  const [taxesFees, setTaxesFees] = useState("0");
  const [pointsRequired, setPointsRequired] = useState("");
  const [baseline, setBaseline] = useState(defaultCppBaseline.toString());

  const cash = parseFloat(cashPrice) || 0;
  const taxes = parseFloat(taxesFees) || 0;
  const points = parseFloat(pointsRequired) || 0;
  const baselineCpp = parseFloat(baseline) || 1.0;

  const cpp = points > 0 ? ((cash - taxes) / points) * 100 : null;
  const isGoodDeal = cpp !== null && cpp >= baselineCpp;
  const cashValue = points > 0 ? (points * baselineCpp) / 100 : null;

  function getCppColor(): string {
    if (cpp === null) return "text-muted-foreground";
    if (cpp >= baselineCpp * 1.2) return "text-green-600";
    if (cpp >= baselineCpp) return "text-green-500";
    if (cpp >= baselineCpp * 0.8) return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CPP Redemption Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cpp-cash-price" className="text-xs">
              Cash Price ($)
            </Label>
            <Input
              id="cpp-cash-price"
              type="number"
              min="0"
              step="0.01"
              value={cashPrice}
              onChange={(e) => setCashPrice(e.target.value)}
              placeholder="500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpp-taxes" className="text-xs">
              Taxes &amp; Fees ($)
            </Label>
            <Input
              id="cpp-taxes"
              type="number"
              min="0"
              step="0.01"
              value={taxesFees}
              onChange={(e) => setTaxesFees(e.target.value)}
              placeholder="50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpp-points" className="text-xs">
              Points Required
            </Label>
            <Input
              id="cpp-points"
              type="number"
              min="0"
              value={pointsRequired}
              onChange={(e) => setPointsRequired(e.target.value)}
              placeholder="30000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpp-baseline" className="text-xs">
              Baseline CPP (your target)
            </Label>
            <Input
              id="cpp-baseline"
              type="number"
              min="0"
              step="0.1"
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
            />
          </div>
        </div>

        {cpp !== null && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your CPP</span>
              <span className={`text-xl font-bold ${getCppColor()}`}>
                {cpp.toFixed(2)}¢
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {points.toLocaleString()} {pointsName} worth
              </span>
              <span className="text-xs font-medium">
                ${cashValue?.toFixed(2)} at baseline
              </span>
            </div>

            <div className="pt-1">
              {isGoodDeal ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 w-full justify-center">
                  Good deal — {cpp.toFixed(2)}¢ &gt; {baselineCpp}¢ baseline
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 w-full justify-center">
                  Below baseline — {cpp.toFixed(2)}¢ &lt; {baselineCpp}¢ target
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              Formula: (${cash.toFixed(2)} − ${taxes.toFixed(2)}) ÷ {points.toLocaleString()} × 100
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
