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
import { FamilyForm } from "@/components/family/family-form";

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  createdAt: string;
}

export default function FamilyPage(): React.ReactElement {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);

  const fetchMembers = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/family");
    const json = (await res.json()) as {
      data: FamilyMember[] | null;
      error: string | null;
    };
    if (json.data) setMembers(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  async function handleDelete(id: string): Promise<void> {
    if (!confirm("Remove this family member?")) return;
    await fetch(`/api/family/${id}`, { method: "DELETE" });
    void fetchMembers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family</h1>
          <p className="mt-1 text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
            </DialogHeader>
            <FamilyForm
              onSuccess={() => {
                setAddOpen(false);
                void fetchMembers();
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground">
          No family members yet. Add one above!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <Badge variant={member.role === "parent" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {member.email ? (
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No email</p>
                )}
              </CardContent>
              <CardFooter className="gap-2">
                <Dialog
                  open={editMember?.id === member.id}
                  onOpenChange={(open) => {
                    if (!open) setEditMember(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMember(member)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit {member.name}</DialogTitle>
                    </DialogHeader>
                    <FamilyForm
                      member={member}
                      onSuccess={() => {
                        setEditMember(null);
                        void fetchMembers();
                      }}
                      onCancel={() => setEditMember(null)}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void handleDelete(member.id)}
                >
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
