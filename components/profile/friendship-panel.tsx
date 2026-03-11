"use client";

import { UserPlus, UsersRound } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  respondToFriendInviteAction,
  sendFriendInviteAction,
} from "@/features/profile/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/time/relative-time";

type FriendshipPanelProps = {
  friends: Array<{
    id: string;
    name: string;
    displayName?: string | null;
    email: string;
  }>;
  incomingInvites: Array<{
    id: string;
    senderName: string;
    senderDisplayName?: string | null;
    senderEmail: string;
    message?: string | null;
    createdAt: string;
  }>;
  outgoingInvites: Array<{
    id: string;
    receiverName: string;
    receiverDisplayName?: string | null;
    receiverEmail: string;
    createdAt: string;
  }>;
};

export function FriendshipPanel({
  friends,
  incomingInvites,
  outgoingInvites,
}: FriendshipPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSendInvite() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("message", message);

      const result = await sendFriendInviteAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEmail("");
      setMessage("");
      router.refresh();
      toast.success(
        result.status === "accepted"
          ? "Reciprocal invite found. Friendship created automatically."
          : result.delivery === "sent"
            ? "Friend invite sent and email delivered."
            : "Friend invite sent.",
      );
    });
  }

  function handleRespond(inviteId: string, action: "accept" | "decline") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("inviteId", inviteId);
      formData.set("action", action);

      const result = await respondToFriendInviteAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success(action === "accept" ? "Friend invite accepted." : "Friend invite declined.");
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Optional app-friends graph</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            This is an optional social graph for people who already have a movieshare
            account. It helps surface recurring collaborators for future list and watch
            flows, but it does not replace list invites from inside a list.
          </p>
          <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            Enter the email of an existing movieshare user. If the account does not exist
            yet, or if you want to invite someone into a specific list, use the invite tools
            on the list page instead.
          </div>
          <div className="space-y-3">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="friend@example.com"
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Optional message"
            />
            <Button type="button" onClick={handleSendInvite} disabled={isPending || !email.trim()}>
              <UserPlus className="size-4" />
              Send friend invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Incoming invites</CardTitle>
            <Badge variant="secondary">{incomingInvites.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingInvites.length ? (
              incomingInvites.map((invite) => (
                <div key={invite.id} className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
                  <div>
                    <p className="font-medium">
                      {invite.senderDisplayName || invite.senderName}
                    </p>
                    <p className="text-sm text-muted-foreground">{invite.senderEmail}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Received <RelativeTime value={invite.createdAt} />
                  </p>
                  {invite.message ? (
                    <p className="text-sm leading-6 text-muted-foreground">{invite.message}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => handleRespond(invite.id, "accept")}>
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(invite.id, "decline")}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No pending friend invites.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Outgoing invites</CardTitle>
            <Badge variant="secondary">{outgoingInvites.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoingInvites.length ? (
              outgoingInvites.map((invite) => (
                <div key={invite.id} className="rounded-3xl border border-border/70 bg-background p-4">
                  <p className="font-medium">
                    {invite.receiverDisplayName || invite.receiverName}
                  </p>
                  <p className="text-sm text-muted-foreground">{invite.receiverEmail}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sent <RelativeTime value={invite.createdAt} />
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No pending outgoing invites.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Friends</CardTitle>
          <Badge variant="secondary">{friends.length}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {friends.length ? (
            friends.map((friend) => (
              <div key={friend.id} className="rounded-3xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4 text-muted-foreground" />
                  <p className="font-medium">{friend.displayName || friend.name}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{friend.email}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No friends connected yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
