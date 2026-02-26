# Trip Itinerary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a day-by-day itinerary to each trip so the Chung family can plan or document locations, activities, accommodations, and transport (flights, trains, etc.) at specific times.

**Architecture:** New `ItineraryItem` Prisma model linked to `Trip` (cascade delete). REST API at `/api/trips/[id]/itinerary` (GET, POST) and `/api/trips/[id]/itinerary/[itemId]` (PATCH, DELETE). New "Itinerary" tab added to the trip detail page alongside Expenses / Participants / Balance, rendered by an `ItineraryTab` component that groups items by day in a timeline layout.

**Tech Stack:** Next.js App Router, TypeScript strict, Prisma PostgreSQL, Tailwind CSS v4, shadcn/ui (Button, Badge, Input, Label, Select, Dialog, Card), Vitest + happy-dom.

---

## Task 1: Prisma schema — add ItineraryItem model

**Files:**
- Modify: `prisma/schema.prisma`

### Step 1: Add the model and relation to schema

In `prisma/schema.prisma`, add to the `Trip` model:
```prisma
itineraryItems ItineraryItem[]
```

Then add the new model at the end of the file (before the auth models):
```prisma
model ItineraryItem {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  date      DateTime
  title     String
  type      String   // "accommodation", "activity", "transport", "flight"
  location  String?
  startTime String?  // "09:00" — HH:MM string, nullable
  endTime   String?  // "17:00" — HH:MM string, nullable
  notes     String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Step 2: Run migration

```bash
cd D:/playground/ChungFamilyApp/.claude/worktrees/loving-khorana
npx prisma migrate dev --name add_itinerary_items
```

Expected output: `Your database is now in sync with your schema.`

### Step 3: Verify generated client

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

### Step 4: Commit

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ItineraryItem model to schema"
```

---

## Task 2: Add ITINERARY_TYPES constant

**Files:**
- Modify: `src/lib/constants.ts`

### Step 1: Add constant

Append to `src/lib/constants.ts`:
```typescript
export const ITINERARY_TYPES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "activity",      label: "Activity" },
  { value: "transport",     label: "Transport" },
  { value: "flight",        label: "Flight" },
] as const;

export type ItineraryItemType = (typeof ITINERARY_TYPES)[number]["value"];
```

### Step 2: Commit

```bash
git add src/lib/constants.ts
git commit -m "feat: add ITINERARY_TYPES constant"
```

---

## Task 3: API — GET + POST /api/trips/[id]/itinerary

**Files:**
- Create: `src/app/api/trips/[id]/itinerary/route.ts`
- Create: `src/app/api/trips/[id]/__tests__/itinerary.test.ts`

### Step 1: Write the failing tests

Create `src/app/api/trips/[id]/__tests__/itinerary.test.ts`:

```typescript
/**
 * Tests for GET/POST /api/trips/[id]/itinerary
 */
import { GET, POST } from "../itinerary/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    itineraryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockTripFindUnique = vi.mocked(prisma.trip.findUnique);
const mockItemFindMany = vi.mocked(prisma.itineraryItem.findMany);
const mockItemCreate = vi.mocked(prisma.itineraryItem.create);

const TRIP_ID = "trip-abc";
const ITEM_ID = "item-1";

const sampleItem = {
  id: ITEM_ID,
  tripId: TRIP_ID,
  date: new Date("2026-07-04"),
  title: "Check in at Hotel Granvia",
  type: "accommodation",
  location: "1 Chome-3 Nishishinsaibashi, Osaka",
  startTime: "15:00",
  endTime: null,
  notes: null,
  sortOrder: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function makeGetRequest() {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary`);
}

function makePostRequest(body: object) {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = TRIP_ID) {
  return { params: Promise.resolve({ id }) };
}

async function json(res: Response) {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTripFindUnique.mockResolvedValue({ id: TRIP_ID } as never);
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe("GET /api/trips/[id]/itinerary", () => {
  it("returns 200 with itinerary items list", async () => {
    mockItemFindMany.mockResolvedValue([sampleItem] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ITEM_ID, title: "Check in at Hotel Granvia", type: "accommodation" }),
      ])
    );
  });

  it("returns 200 with empty array when no items", async () => {
    mockItemFindMany.mockResolvedValue([] as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 500 when Prisma throws", async () => {
    mockTripFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await GET(makeGetRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch itinerary");
  });
});

// ─── POST ────────────────────────────────────────────────────────────────────

describe("POST /api/trips/[id]/itinerary", () => {
  const validBody = {
    date: "2026-07-04",
    title: "Check in at Hotel Granvia",
    type: "accommodation",
    location: "Osaka",
    startTime: "15:00",
  };

  it("creates an item and returns 201", async () => {
    mockItemCreate.mockResolvedValue(sampleItem as never);

    const res = await POST(makePostRequest(validBody), makeParams());
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(expect.objectContaining({ id: ITEM_ID }));
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePostRequest({ ...validBody, title: undefined }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/title/i);
  });

  it("returns 400 when date is missing", async () => {
    const res = await POST(makePostRequest({ ...validBody, date: undefined }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/date/i);
  });

  it("returns 400 when type is invalid", async () => {
    const res = await POST(makePostRequest({ ...validBody, type: "spaceship" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/type/i);
  });

  it("returns 404 when trip does not exist", async () => {
    mockTripFindUnique.mockResolvedValue(null as never);

    const res = await POST(makePostRequest(validBody), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Trip not found");
  });

  it("returns 500 when Prisma throws on create", async () => {
    mockItemCreate.mockRejectedValue(new Error("DB error") as never);

    const res = await POST(makePostRequest(validBody), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create itinerary item");
  });
});
```

### Step 2: Run tests to verify they fail

```bash
cd D:/playground/ChungFamilyApp/.claude/worktrees/loving-khorana
npx vitest run src/app/api/trips/\\[id\\]/__tests__/itinerary.test.ts
```

Expected: FAIL (module not found)

### Step 3: Implement the route

Create `src/app/api/trips/[id]/itinerary/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITINERARY_TYPES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ data: null, error: "Trip not found" }, { status: 404 });
    }

    const items = await prisma.itineraryItem.findMany({
      where: { tripId: id },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: items, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to fetch itinerary" }, { status: 500 });
  }
}

interface CreateItineraryBody {
  date: string;
  title: string;
  type: string;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json() as CreateItineraryBody;
    const { date, title, type, location, startTime, endTime, notes, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ data: null, error: "title is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ data: null, error: "date is required" }, { status: 400 });
    }

    const validTypes = ITINERARY_TYPES.map((t) => t.value);
    if (!type || !validTypes.includes(type as (typeof validTypes)[number])) {
      return NextResponse.json(
        { data: null, error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ data: null, error: "Trip not found" }, { status: 404 });
    }

    const item = await prisma.itineraryItem.create({
      data: {
        tripId: id,
        date: new Date(date),
        title: title.trim(),
        type,
        location: location ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        notes: notes ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ data: item, error: null }, { status: 201 });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to create itinerary item" }, { status: 500 });
  }
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/app/api/trips/\\[id\\]/__tests__/itinerary.test.ts
```

Expected: all tests PASS

### Step 5: Commit

```bash
git add src/app/api/trips/\\[id\\]/itinerary/route.ts src/app/api/trips/\\[id\\]/__tests__/itinerary.test.ts
git commit -m "feat: GET + POST /api/trips/[id]/itinerary"
```

---

## Task 4: API — PATCH + DELETE /api/trips/[id]/itinerary/[itemId]

**Files:**
- Create: `src/app/api/trips/[id]/itinerary/[itemId]/route.ts`
- Create: `src/app/api/trips/[id]/__tests__/itinerary-item.test.ts`

### Step 1: Write the failing tests

Create `src/app/api/trips/[id]/__tests__/itinerary-item.test.ts`:

```typescript
/**
 * Tests for PATCH/DELETE /api/trips/[id]/itinerary/[itemId]
 */
import { PATCH, DELETE } from "../itinerary/[itemId]/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    itineraryItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockItemFindUnique = vi.mocked(prisma.itineraryItem.findUnique);
const mockItemUpdate = vi.mocked(prisma.itineraryItem.update);
const mockItemDelete = vi.mocked(prisma.itineraryItem.delete);

const TRIP_ID = "trip-abc";
const ITEM_ID = "item-1";

const sampleItem = {
  id: ITEM_ID,
  tripId: TRIP_ID,
  date: new Date("2026-07-04"),
  title: "Check in at Hotel Granvia",
  type: "accommodation",
  location: null,
  startTime: "15:00",
  endTime: null,
  notes: null,
  sortOrder: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function makePatchRequest(body: object) {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary/${ITEM_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new Request(`http://localhost/api/trips/${TRIP_ID}/itinerary/${ITEM_ID}`, {
    method: "DELETE",
  });
}

function makeParams(id = TRIP_ID, itemId = ITEM_ID) {
  return { params: Promise.resolve({ id, itemId }) };
}

async function json(res: Response) {
  return res.json() as Promise<{ data: unknown; error: string | null }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockItemFindUnique.mockResolvedValue(sampleItem as never);
});

// ─── PATCH ───────────────────────────────────────────────────────────────────

describe("PATCH /api/trips/[id]/itinerary/[itemId]", () => {
  it("updates an item and returns 200", async () => {
    const updated = { ...sampleItem, title: "Late check-in" };
    mockItemUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(makePatchRequest({ title: "Late check-in" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(expect.objectContaining({ title: "Late check-in" }));
  });

  it("returns 404 when item does not exist", async () => {
    mockItemFindUnique.mockResolvedValue(null as never);

    const res = await PATCH(makePatchRequest({ title: "x" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 404 when item belongs to a different trip", async () => {
    mockItemFindUnique.mockResolvedValue({ ...sampleItem, tripId: "other-trip" } as never);

    const res = await PATCH(makePatchRequest({ title: "x" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 400 when type is invalid", async () => {
    const res = await PATCH(makePatchRequest({ type: "spaceship" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/type/i);
  });

  it("returns 500 when Prisma throws", async () => {
    mockItemUpdate.mockRejectedValue(new Error("DB error") as never);

    const res = await PATCH(makePatchRequest({ title: "x" }), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to update itinerary item");
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/trips/[id]/itinerary/[itemId]", () => {
  it("deletes item and returns 200 with id", async () => {
    mockItemDelete.mockResolvedValue(sampleItem as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ id: ITEM_ID });
  });

  it("calls prisma.itineraryItem.delete with the correct id", async () => {
    mockItemDelete.mockResolvedValue(sampleItem as never);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockItemDelete).toHaveBeenCalledWith({ where: { id: ITEM_ID } });
  });

  it("returns 404 when item does not exist", async () => {
    mockItemFindUnique.mockResolvedValue(null as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 404 when item belongs to a different trip", async () => {
    mockItemFindUnique.mockResolvedValue({ ...sampleItem, tripId: "other-trip" } as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe("Itinerary item not found");
  });

  it("returns 500 when Prisma throws", async () => {
    mockItemFindUnique.mockRejectedValue(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const body = await json(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to delete itinerary item");
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/app/api/trips/\\[id\\]/__tests__/itinerary-item.test.ts
```

Expected: FAIL (module not found)

### Step 3: Implement the route

Create `src/app/api/trips/[id]/itinerary/[itemId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITINERARY_TYPES } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

async function findItem(id: string, itemId: string) {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== id) return null;
  return item;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id, itemId } = await params;
    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json({ data: null, error: "Itinerary item not found" }, { status: 404 });
    }

    const body = await request.json() as {
      date?: string;
      title?: string;
      type?: string;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string | null;
      sortOrder?: number;
    };

    if (body.type !== undefined) {
      const validTypes = ITINERARY_TYPES.map((t) => t.value);
      if (!validTypes.includes(body.type as (typeof validTypes)[number])) {
        return NextResponse.json(
          { data: null, error: `type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime !== undefined && { endTime: body.endTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to update itinerary item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id, itemId } = await params;
    const item = await findItem(id, itemId);
    if (!item) {
      return NextResponse.json({ data: null, error: "Itinerary item not found" }, { status: 404 });
    }

    await prisma.itineraryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ data: { id: itemId }, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Failed to delete itinerary item" }, { status: 500 });
  }
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/app/api/trips/\\[id\\]/__tests__/itinerary-item.test.ts
```

Expected: all tests PASS

### Step 5: Commit

```bash
git add src/app/api/trips/\\[id\\]/itinerary/
git commit -m "feat: PATCH + DELETE /api/trips/[id]/itinerary/[itemId]"
```

---

## Task 5: ItineraryForm component

**Files:**
- Create: `src/components/trips/itinerary-form.tsx`

No unit tests needed — pure controlled form, behaviour tested in integration via the tab.

### Step 1: Create the form component

Create `src/components/trips/itinerary-form.tsx`:

```typescript
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

interface ItineraryItem {
  id: string;
  date: string;
  title: string;
  type: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sortOrder: number;
}

interface ItineraryFormProps {
  tripId: string;
  /** Pre-fill for edit mode */
  item?: ItineraryItem;
  /** Default date to pre-fill when adding (YYYY-MM-DD) */
  defaultDate?: string;
  onSuccess: (item: ItineraryItem) => void;
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
  const [type, setType] = useState(item?.type ?? "activity");
  const [location, setLocation] = useState(item?.location ?? "");
  const [startTime, setStartTime] = useState(item?.startTime ?? "");
  const [endTime, setEndTime] = useState(item?.endTime ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("Title is required"); return; }
    if (!date) { setError("Date is required"); return; }

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

    const json = (await res.json()) as { data: ItineraryItem | null; error: string | null };
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
            required
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
            placeholder="e.g. Hotel Granvia check-in, Narita Airport departure…"
            required
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
          {saving ? "Saving…" : item ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}
```

### Step 2: Commit

```bash
git add src/components/trips/itinerary-form.tsx
git commit -m "feat: ItineraryForm component"
```

---

## Task 6: ItineraryTab component

**Files:**
- Create: `src/components/trips/itinerary-tab.tsx`

### Step 1: Create the tab component

Create `src/components/trips/itinerary-tab.tsx`:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ItineraryForm } from "@/components/trips/itinerary-form";
import { ITINERARY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ItineraryItem {
  id: string;
  date: string;
  title: string;
  type: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sortOrder: number;
}

interface ItineraryTabProps {
  tripId: string;
}

/** Maps type → colour classes for the badge */
const TYPE_COLORS: Record<string, string> = {
  accommodation: "bg-violet-100 text-violet-800",
  activity:      "bg-sky-100 text-sky-800",
  transport:     "bg-amber-100 text-amber-800",
  flight:        "bg-indigo-100 text-indigo-800",
};

/** Maps type → simple emoji icon */
const TYPE_ICON: Record<string, string> = {
  accommodation: "🏨",
  activity:      "🗺️",
  transport:     "🚌",
  flight:        "✈️",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

/** Group items by their date string (YYYY-MM-DD) */
function groupByDay(items: ItineraryItem[]): { day: string; items: ItineraryItem[] }[] {
  const map = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const day = item.date.slice(0, 10);
    const group = map.get(day) ?? [];
    group.push(item);
    map.set(day, group);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

export function ItineraryTab({ tripId }: ItineraryTabProps): React.ReactElement {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);

  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`);
      const json = (await res.json()) as { data: ItineraryItem[] | null; error: string | null };
      if (json.data) setItems(json.data);
      else setError(json.error ?? "Failed to load itinerary");
    } catch {
      setError("Failed to load itinerary");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  async function handleDelete(itemId: string, title: string): Promise<void> {
    if (!confirm(`Remove "${title}" from itinerary?`)) return;
    await fetch(`/api/trips/${tripId}/itinerary/${itemId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading itinerary…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  const days = groupByDay(items);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Itinerary Item</DialogTitle>
            </DialogHeader>
            <ItineraryForm
              tripId={tripId}
              onSuccess={(newItem) => {
                setItems((prev) =>
                  [...prev, newItem].sort((a, b) =>
                    a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder
                  )
                );
                setAddOpen(false);
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="text-5xl" aria-hidden="true">🗓️</span>
          <p className="text-muted-foreground text-sm">
            No itinerary yet. Add your first item above!
          </p>
        </div>
      )}

      {/* Day groups */}
      {days.map(({ day, items: dayItems }) => (
        <div key={day} className="space-y-2">
          {/* Day header */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatDate(day)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Timeline items */}
          <div className="space-y-2 pl-2">
            {dayItems.map((item) => (
              <div
                key={item.id}
                className="relative flex gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                {/* Type icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                  {TYPE_ICON[item.type] ?? "📌"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.title}</span>
                    <Badge
                      className={cn(
                        "text-xs px-1.5 py-0",
                        TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-800"
                      )}
                    >
                      {ITINERARY_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
                    </Badge>
                  </div>

                  {item.location && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      📍 {item.location}
                    </p>
                  )}

                  {(item.startTime ?? item.endTime) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      🕐 {item.startTime ?? ""}
                      {item.startTime && item.endTime ? " – " : ""}
                      {item.endTime ?? ""}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Dialog
                    open={editItem?.id === item.id}
                    onOpenChange={(open) => { if (!open) setEditItem(null); }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditItem(item)}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit Itinerary Item</DialogTitle>
                      </DialogHeader>
                      <ItineraryForm
                        tripId={tripId}
                        item={editItem ?? undefined}
                        onSuccess={(updated) => {
                          setItems((prev) =>
                            prev
                              .map((i) => (i.id === updated.id ? updated : i))
                              .sort((a, b) =>
                                a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder
                              )
                          );
                          setEditItem(null);
                        }}
                        onCancel={() => setEditItem(null)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(item.id, item.title)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Step 2: Commit

```bash
git add src/components/trips/itinerary-tab.tsx
git commit -m "feat: ItineraryTab component"
```

---

## Task 7: Wire Itinerary tab into trip detail page

**Files:**
- Modify: `src/app/(protected)/trips/[id]/page.tsx`

### Step 1: Add "itinerary" to the tab list and import the component

In `src/app/(protected)/trips/[id]/page.tsx`:

1. Change `TabId` type:
```typescript
type TabId = "expenses" | "participants" | "balance" | "itinerary";
```

2. Add to `TABS` array (after `"balance"`):
```typescript
{ id: "itinerary", label: "Itinerary" },
```

3. Add import at top of file:
```typescript
import { ItineraryTab } from "@/components/trips/itinerary-tab";
```

4. Add the tabpanel after the Balance tabpanel:
```tsx
{/* Itinerary tab */}
<div
  role="tabpanel"
  id="tabpanel-itinerary"
  aria-labelledby="tab-itinerary"
  hidden={activeTab !== "itinerary"}
>
  {activeTab === "itinerary" && (
    <ItineraryTab tripId={trip.id} />
  )}
</div>
```

### Step 2: Run the full test suite

```bash
npx vitest run
```

Expected: all tests pass.

### Step 3: Build check

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

### Step 4: Commit

```bash
git add src/app/\\(protected\\)/trips/\\[id\\]/page.tsx
git commit -m "feat: add Itinerary tab to trip detail page"
```

---

## Task 8: Manual smoke test

With `npm run dev` running at http://localhost:3000:

1. Open any trip detail page.
2. Click the **Itinerary** tab — should show empty state with calendar icon.
3. Click **+ Add Item** — fill in date, type (Flight), title "Narita Airport departure", location "NRT", start time 08:00 → Save.
4. Item appears grouped under its day with ✈️ icon.
5. Click **Edit** → change start time to 09:00 → Save. Verify update.
6. Click **×** → confirm deletion. Item removed.
7. Add a mix of types (Accommodation, Activity, Transport) across multiple days → verify days are sorted chronologically.

---

## Done

All itinerary CRUD is complete:
- `ItineraryItem` model in Prisma (cascades with Trip)
- REST API: GET, POST, PATCH, DELETE
- `ItineraryForm` component (add + edit)
- `ItineraryTab` component (timeline grouped by day)
- Wired into trip detail page as 4th tab
