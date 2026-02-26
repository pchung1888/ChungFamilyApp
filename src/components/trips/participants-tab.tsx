"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** A family member that can be linked to a participant */
interface FamilyMember {
  id: string;
  name: string;
}

/** A trip participant */
interface TripParticipant {
  id: string;
  name: string;
  email: string | null;
  groupName: string | null;
  familyMemberId: string | null;
  familyMember: { id: string; name: string } | null;
}

/** Props for ParticipantsTab */
interface ParticipantsTabProps {
  /** The trip ID */
  tripId: string;
  /** Available family members to link */
  familyMembers: FamilyMember[];
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "bg-slate-500";
}

const NONE = "__none__";

export function ParticipantsTab({
  tripId,
  familyMembers,
}: ParticipantsTabProps): React.ReactElement {
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [addMode, setAddMode] = useState<"family" | "guest">("family");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>(NONE);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/trips/${tripId}/participants`);
      const json = (await res.json()) as {
        data: TripParticipant[] | null;
        error: string | null;
      };
      if (json.data) setParticipants(json.data);
      else setError(json.error ?? "Failed to load participants");
    } catch {
      setError("Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  async function handleAdd(): Promise<void> {
    setAddError(null);

    let name = "";
    let familyMemberId: string | null = null;

    if (addMode === "family") {
      if (selectedFamilyMemberId === NONE) {
        setAddError("Please select a family member");
        return;
      }
      const member = familyMembers.find((m) => m.id === selectedFamilyMemberId);
      if (!member) {
        setAddError("Selected family member not found");
        return;
      }
      name = member.name;
      familyMemberId = member.id;
    } else {
      name = guestName.trim();
      if (!name) {
        setAddError("Name is required for guests");
        return;
      }
    }

    setAdding(true);

    const res = await fetch(`/api/trips/${tripId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: (addMode === "guest" ? guestEmail.trim() : null) || null,
        familyMemberId,
        groupName: groupName.trim() || null,
      }),
    });

    const json = (await res.json()) as {
      data: TripParticipant | null;
      error: string | null;
    };

    setAdding(false);

    if (json.error || !json.data) {
      setAddError(json.error ?? "Failed to add participant");
      return;
    }

    setParticipants((prev) => [...prev, json.data as TripParticipant]);

    // Reset form
    setSelectedFamilyMemberId(NONE);
    setGuestName("");
    setGuestEmail("");
    setGroupName("");
  }

  async function handleDelete(pid: string, name: string): Promise<void> {
    if (!confirm(`Remove "${name}" from this trip?`)) return;

    const res = await fetch(`/api/trips/${tripId}/participants/${pid}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { data: unknown; error: string | null };

    if (json.error) {
      alert(json.error);
      return;
    }

    setParticipants((prev) => prev.filter((p) => p.id !== pid));
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading participants…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-muted-foreground">No participants yet. Add family members or guests below.</p>
      )}
      {/* Participant chips */}
      {participants.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">👥</span>
          <p className="text-muted-foreground text-sm">
            No participants yet. Add family members or guests below.
          </p>
        </div>
      ) : participants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-sm"
            >
              {/* Avatar initial */}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                  avatarColor(p.name)
                )}
                aria-hidden="true"
              >
                {p.name.charAt(0).toUpperCase()}
              </span>

              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{p.name}</span>
                {p.groupName && (
                  <span className="text-xs text-muted-foreground">{p.groupName}</span>
                )}
              </div>

              {p.familyMember && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Family
                </Badge>
              )}

              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => void handleDelete(p.id, p.name)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add participant form */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold">Add Participant</h3>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border bg-background p-0.5 w-fit">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              addMode === "family"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setAddMode("family")}
          >
            Family Member
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              addMode === "guest"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setAddMode("guest")}
          >
            Guest / Friend
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {addMode === "family" ? (
            <div className="space-y-1.5">
              <Label htmlFor="add-family-member">Family Member</Label>
              <Select
                value={selectedFamilyMemberId}
                onValueChange={setSelectedFamilyMemberId}
              >
                <SelectTrigger id="add-family-member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} disabled>
                    Select member
                  </SelectItem>
                  {familyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="add-guest-name">Name</Label>
                <Input
                  id="add-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-guest-email">Email (optional)</Label>
                <Input
                  id="add-guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="add-group-name">Group Name (optional)</Label>
            <Input
              id="add-group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Chung Family"
            />
          </div>
        </div>

        {addError && <p className="text-sm text-destructive">{addError}</p>}

        <Button
          type="button"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={adding}
        >
          {adding ? "Adding…" : "Add Participant"}
        </Button>
      </div>
    </div>
  );
}
