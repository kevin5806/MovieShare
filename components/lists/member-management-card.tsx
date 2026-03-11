"use client";

import { Trash2, UsersRound } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  removeListMemberAction,
  updateListMemberRoleAction,
} from "@/features/lists/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RelativeTime } from "@/components/time/relative-time";

type MemberManagementCardProps = {
  listId: string;
  listSlug: string;
  ownerUserId: string;
  currentUserId: string;
  members: Array<{
    id: string;
    userId: string;
    role: "OWNER" | "MANAGER" | "MEMBER";
    joinedAt: string;
    user: {
      name: string;
      email: string;
      profile?: {
        displayName?: string | null;
      } | null;
    };
  }>;
};

type EditableRoleValue = "MANAGER" | "MEMBER";

const editableRoles = [
  {
    value: "MEMBER" as const,
    label: "Member",
  },
  {
    value: "MANAGER" as const,
    label: "Manager",
  },
];

export function MemberManagementCard({
  listId,
  listSlug,
  ownerUserId,
  currentUserId,
  members,
}: MemberManagementCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roleMap, setRoleMap] = useState<Record<string, EditableRoleValue>>(
    Object.fromEntries(
      members.map((member) => [
        member.id,
        member.role === "MANAGER" ? "MANAGER" : "MEMBER",
      ]),
    ),
  );

  function handleRoleSave(memberId: string) {
    startTransition(async () => {
      const nextRole = roleMap[memberId] ?? "MEMBER";
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("memberId", memberId);
      formData.set("role", nextRole);

      const result = await updateListMemberRoleAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success("Member role updated.");
    });
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("memberId", memberId);

      const result = await removeListMemberAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success("Member removed from the list.");
    });
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Member permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Owners can promote trusted collaborators to manager so they can curate invites,
          update the list presentation and moderate proposals.
        </p>

        <div className="space-y-3">
          {members.map((member) => {
            const displayName = member.user.profile?.displayName || member.user.name;
            const isOwner = member.userId === ownerUserId || member.role === "OWNER";
            const isSelf = member.userId === currentUserId;

            return (
              <div
                key={member.id}
                data-testid="member-management-row"
                data-member-email={member.user.email}
                className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UsersRound className="size-4 text-muted-foreground" />
                      <p className="font-medium">{displayName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined <RelativeTime value={member.joinedAt} />
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {isOwner ? (
                        <Badge>Owner</Badge>
                      ) : (
                        <Badge variant="secondary">{member.role}</Badge>
                      )}
                      {isSelf ? <Badge variant="secondary">You</Badge> : null}
                    </div>
                  </div>

                  {!isOwner ? (
                    <div className="flex w-full max-w-sm flex-col gap-3">
                      <Select
                        value={roleMap[member.id] ?? "MEMBER"}
                        onValueChange={(value) =>
                          setRoleMap((current) => ({
                            ...current,
                            [member.id]: value as EditableRoleValue,
                          }))
                        }
                      >
                        <SelectTrigger
                          aria-label={`Role for ${displayName}`}
                          className="h-10 rounded-2xl bg-card px-3"
                        >
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          {editableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          aria-label={`Save role for ${displayName}`}
                          disabled={isPending}
                          onClick={() => handleRoleSave(member.id)}
                        >
                          Save role
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`Remove ${displayName} from the list`}
                          disabled={isPending}
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
