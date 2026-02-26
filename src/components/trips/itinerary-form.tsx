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
import { ITINERARY_TYPES } from "@/lib/constants";
import type { ItineraryItemType } from "@/lib/constants";

/** Shape of a single itinerary item returned by the API */
interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  title: string;
  type: ItineraryItemType;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

/** Props for ItineraryForm */
interface ItineraryFormProps {
  /** The trip this item belongs to */
  tripId: string;
  /** If provided, the form is in edit mode and pre-fills all fields */
  item?: ItineraryItem;
  /** Default date (YYYY-MM-DD) to pre-fill in add mode */
  defaultDate?: string;
  /** Called with the saved item on success */
  onSuccess: (item: ItineraryItem) => void;
  /** Called when user clicks Cancel */
  onCancel: () => void;
}

export function ItineraryForm({
  tripId,
  item,
  defaultDate,
  onSuccess,
  onCancel,
}: ItineraryFormProps): React.ReactElement {
  const [date, setDate] = useState(
    item ? item.date.slice(0, 10) : (defaultDate ?? "")
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<string>(item?.type ?? "activity");
  const [location, setLocation] = useState(item?.location ?? "");
  const [startTime, setStartTime] = useState(item?.startTime ?? "");
  const [endTime, setEndTime] = useState(item?.endTime ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setSaving(true);

    const url = item
      ? `/api/trips/${tripId}/itinerary/${item.id}`
      : `/api/trips/${tripId}/itinerary`;
    const method = item ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        title: title.trim(),
        type,
        location: location.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        notes: notes.trim() || null,
      }),
    });

    const json = (await res.json()) as {
      data: ItineraryItem | null;
      error: string | null;
    };
    setSaving(false);

    if (json.error || !json.data) {
      setError(json.error ?? "Failed to save");
      return;
    }

    onSuccess(json.data);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="itin-date">Date</Label>
          <Input
            id="itin-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="itin-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="itin-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITINERARY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="itin-title">Title</Label>
          <Input
            id="itin-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hotel Granvia check-in, Narita Airport departure..."
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="itin-location">Location (optional)</Label>
          <Input
            id="itin-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. 1 Chome-3 Nishishinsaibashi, Osaka"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="itin-start">Start time (optional)</Label>
          <Input
            id="itin-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="itin-end">End time (optional)</Label>
          <Input
            id="itin-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="itin-notes">Notes (optional)</Label>
          <Input
            id="itin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any details, confirmation numbers, etc."
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : item ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}
