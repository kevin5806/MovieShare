"use client";

import { Copy, MailPlus, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createListInviteAction,
  revokeListInviteAction,
} from "@/features/lists/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RelativeTime } from "@/components/time/relative-time";

type InviteMembersCardProps = {
  listId: string;
  listSlug: string;
  invites: Array<{
    id: string;
    email: string;
    status: string;
    token: string;
    expiresAt: string;
    invitedUserId?: string | null;
  }>;
};

export function InviteMembersCard({
  listId,
  listSlug,
  invites,
}: InviteMembersCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const pendingInvites = invites.filter((invite) => invite.status === "PENDING");

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("email", email);

      const result = await createListInviteAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEmail("");
      router.refresh();
      toast.success(
        result.delivery === "sent"
          ? "Invite created and email sent."
          : "Invite created. Email delivery was skipped or unavailable.",
      );
    });
  }

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("inviteId", inviteId);
      formData.set("listSlug", listSlug);

      const result = await revokeListInviteAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success("Invite revoked.");
    });
  }

  async function handleCopy(token: string) {
    const inviteUrl = `${window.location.origin}/invites/lists/${token}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Invite members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-muted-foreground">
            Send a private invite by email. If SMTP is configured, movieshare also sends
            the invite message automatically.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="friend@example.com"
            />
            <Button type="button" onClick={handleSubmit} disabled={isPending || !email.trim()}>
              <MailPlus className="size-4" />
              Send invite
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Pending invites</p>
            <Badge variant="secondary">{pendingInvites.length}</Badge>
          </div>

          {pendingInvites.length ? (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="space-y-3 rounded-3xl border border-border/70 bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invite.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires <RelativeTime value={invite.expiresAt} />
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {invite.invitedUserId ? "Existing user" : "External email"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(invite.token)}
                  >
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(invite.id)}
                    disabled={isPending}
                  >
                    <XCircle className="size-4" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No pending invites. Use the form above to invite the next collaborator.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
