"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CardForm } from "@/components/cards/card-form";
import { BenefitForm } from "@/components/cards/benefit-form";
import { PointsBadge } from "@/components/cards/points-badge";
import { CppCalculator } from "@/components/cards/cpp-calculator";

interface CardBenefit {
  id: string;
  cardId: string;
  name: string;
  value: number;
  frequency: string;
  usedAmount: number;
  resetDate: string | null;
}

interface CreditCard {
  id: string;
  name: string;
  network: string;
  lastFour: string;
  annualFee: number;
  annualFeeDate: string | null;
  pointsBalance: number;
  pointsExpiresAt: string | null;
  pointsName: string;
  pointsCppValue: number;
  isActive: boolean;
  createdAt: string;
  benefits: CardBenefit[];
}

function BenefitRow({
  benefit,
  cardId,
  onRefresh,
}: {
  benefit: CardBenefit;
  cardId: string;
  onRefresh: () => void;
}): React.ReactElement {
  const [editOpen, setEditOpen] = useState(false);
  const remaining = benefit.value - benefit.usedAmount;
  const pct = benefit.value > 0 ? Math.min((benefit.usedAmount / benefit.value) * 100, 100) : 0;

  async function handleDelete(): Promise<void> {
    if (!confirm(`Remove benefit "${benefit.name}"?`)) return;
    await fetch(`/api/cards/${cardId}/benefits/${benefit.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{benefit.name}</span>
          <span className="text-muted-foreground text-xs capitalize">
            ({benefit.frequency.replace("_", " ")})
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            ${benefit.usedAmount.toFixed(0)} / ${benefit.value.toFixed(0)}
            {remaining > 0 && (
              <span className="text-green-600 ml-1">(${remaining.toFixed(0)} left)</span>
            )}
          </span>
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Benefit</DialogTitle>
            </DialogHeader>
            <BenefitForm
              cardId={cardId}
              benefit={benefit}
              onSuccess={() => {
                setEditOpen(false);
                onRefresh();
              }}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => void handleDelete()}
        >
          ×
        </Button>
      </div>
    </div>
  );
}

function CreditCardCard({
  card,
  onRefresh,
}: {
  card: CreditCard;
  onRefresh: () => void;
}): React.ReactElement {
  const [showBenefits, setShowBenefits] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addBenefitOpen, setAddBenefitOpen] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!confirm(`Delete card "${card.name} ···${card.lastFour}"? All benefits will be removed.`)) return;
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    onRefresh();
  }

  const totalBenefitValue = card.benefits.reduce((sum, b) => sum + b.value, 0);
  const usedBenefitValue = card.benefits.reduce((sum, b) => sum + b.usedAmount, 0);

  return (
    <Card className={card.isActive ? "" : "opacity-60"}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base leading-tight">{card.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {card.network} ···{card.lastFour}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="outline" className="text-xs">{card.network}</Badge>
            {!card.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2 space-y-2">
        <PointsBadge
          pointsExpiresAt={card.pointsExpiresAt}
          pointsBalance={card.pointsBalance}
          pointsName={card.pointsName}
        />

        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Annual fee: <strong className="text-foreground">${card.annualFee}</strong></span>
          {card.annualFeeDate && (
            <span>
              Due:{" "}
              <strong className="text-foreground">
                {new Date(card.annualFeeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </strong>
            </span>
          )}
          <span>CPP baseline: <strong className="text-foreground">{card.pointsCppValue}¢</strong></span>
        </div>

        {card.benefits.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Benefits: ${usedBenefitValue.toFixed(0)} / ${totalBenefitValue.toFixed(0)} used
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 pt-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowBenefits((v) => !v)}
          >
            {showBenefits ? "Hide" : "Benefits"} ({card.benefits.length})
          </Button>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Edit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit {card.name}</DialogTitle>
              </DialogHeader>
              <CardForm
                card={card}
                onSuccess={() => {
                  setEditOpen(false);
                  onRefresh();
                }}
                onCancel={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => void handleDelete()}
          >
            Delete
          </Button>
        </div>

        {showBenefits && (
          <div className="space-y-2 pt-1">
            <Separator />
            {card.benefits.length === 0 ? (
              <p className="text-xs text-muted-foreground">No benefits added yet.</p>
            ) : (
              <div className="space-y-2">
                {card.benefits.map((benefit) => (
                  <BenefitRow
                    key={benefit.id}
                    benefit={benefit}
                    cardId={card.id}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            )}

            <Dialog open={addBenefitOpen} onOpenChange={setAddBenefitOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  + Add Benefit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Benefit to {card.name}</DialogTitle>
                </DialogHeader>
                <BenefitForm
                  cardId={card.id}
                  onSuccess={() => {
                    setAddBenefitOpen(false);
                    onRefresh();
                  }}
                  onCancel={() => setAddBenefitOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function CardsPage(): React.ReactElement {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetchCards = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/cards");
    const json = (await res.json()) as { data: CreditCard[] | null; error: string | null };
    if (json.data) setCards(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const activeCards = cards.filter((c) => c.isActive);
  const totalPoints = activeCards.reduce((sum, c) => sum + c.pointsBalance, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Cards</h1>
          <p className="mt-1 text-muted-foreground">
            {activeCards.length} active card{activeCards.length !== 1 ? "s" : ""} ·{" "}
            {totalPoints.toLocaleString()} total points
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Card</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Credit Card</DialogTitle>
            </DialogHeader>
            <CardForm
              onSuccess={() => {
                setAddOpen(false);
                void fetchCards();
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : cards.length === 0 ? (
        <p className="text-muted-foreground">No cards yet. Add one above!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CreditCardCard key={card.id} card={card} onRefresh={fetchCards} />
          ))}
        </div>
      )}

      <div className="max-w-sm">
        <CppCalculator
          defaultCppBaseline={1.5}
          pointsName="Points"
        />
      </div>
    </div>
  );
}
