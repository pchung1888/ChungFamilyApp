"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRIP_TYPES } from "@/lib/constants";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  budget: number | null;
  type: string;
  notes: string | null;
}

interface TripFormProps {
  trip?: Trip;
  onSuccess: () => void;
  onCancel: () => void;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export function TripForm({ trip, onSuccess, onCancel }: TripFormProps): React.ReactElement {
  const [name, setName] = useState(trip?.name ?? "");
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(trip?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(trip?.endDate));
  const [budget, setBudget] = useState(trip?.budget?.toString() ?? "");
  const [type, setType] = useState(trip?.type ?? "road_trip");
  const [notes, setNotes] = useState(trip?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = trip ? `/api/trips/${trip.id}` : "/api/trips";
    const method = trip ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        destination,
        startDate,
        endDate: endDate || null,
        budget: budget ? parseFloat(budget) : null,
        type,
        notes: notes || null,
      }),
    });

    const json = (await res.json()) as { data: unknown; error: string | null };

    if (json.error) {
      setError(json.error);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trip-name">Trip Name</Label>
        <Input
          id="trip-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Toronto Road Trip"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Toronto, ON"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trip-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="trip-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIP_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="budget">Budget ($)</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="2000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !name || !destination || !startDate}>
          {loading ? "Saving…" : trip ? "Save Changes" : "Create Trip"}
        </Button>
      </div>
    </form>
  );
}
