"use client";

import { Copy, Globe2, MailPlus, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createListInviteAction,
  revokeListInviteAction,
} from "@/features/lists/actions";
import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/time/relative-time";

type InviteMembersCardProps = {
  listId: string;
  listSlug: string;
  canGrantManagerRole: boolean;
  invites: Array<{
    id: string;
    kind: "APP_USER" | "EMAIL_LINK" | "PUBLIC_LINK";
    email?: string | null;
    status: string;
    token: string;
    expiresAt: string;
    invitedUserId?: string | null;
    invitedUserName?: string | null;
    invitedUserEmail?: string | null;
    targetRole: "OWNER" | "MANAGER" | "MEMBER";
    maxUses?: number | null;
    useCount: number;
    note?: string | null;
  }>;
};

type InviteRoleValue = "MANAGER" | "MEMBER";

const roleOptions = [
  {
    value: "MEMBER" as const,
    label: "Member",
  },
  {
    value: "MANAGER" as const,
    label: "Manager",
  },
];

function InviteTypeBadge({ kind }: { kind: InviteMembersCardProps["invites"][number]["kind"] }) {
  if (kind === "APP_USER") {
    return <Badge variant="secondary">App user</Badge>;
  }

  if (kind === "EMAIL_LINK") {
    return <Badge variant="secondary">Email link</Badge>;
  }

  return <Badge variant="secondary">Public link</Badge>;
}

export function InviteMembersCard({
  listId,
  listSlug,
  invites,
  canGrantManagerRole,
}: InviteMembersCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<InviteRoleValue>("MEMBER");
  const [emailNote, setEmailNote] = useState("");
  const [publicRole, setPublicRole] = useState<InviteRoleValue>("MEMBER");
  const [publicMaxUses, setPublicMaxUses] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "PENDING"),
    [invites],
  );

  function getRoleValue(role: InviteRoleValue) {
    return canGrantManagerRole ? role : "MEMBER";
  }

  function handleSubmit(kind: "email" | "public") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("kind", kind);

      if (kind === "email") {
        formData.set("email", email);
        formData.set("targetRole", getRoleValue(emailRole));
        formData.set("note", emailNote);
      } else {
        formData.set("targetRole", getRoleValue(publicRole));
        formData.set("maxUses", publicMaxUses);
        formData.set("note", publicNote);
      }

      const result = await createListInviteAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (kind === "email") {
        setEmail("");
        setEmailNote("");
      } else {
        setPublicMaxUses("");
        setPublicNote("");
      }

      router.refresh();
      toast.success(
        kind === "public"
          ? "Public invite link created."
          : result.delivery === "sent"
            ? "Invite created and email sent."
            : "Invite created. In-app delivery or email fallback will be used when available.",
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
        <CardTitle>Invites and access links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                <MailPlus className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Invite by email</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  If the email already belongs to a movieshare account, the user gets an
                  in-app invite plus email delivery when SMTP is configured. Otherwise the
                  invite stays bound to that email address.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="friend@example.com"
                />
              </Field>
              {canGrantManagerRole ? (
                <Field>
                  <FieldLabel>Role on join</FieldLabel>
                  <Select
                    value={emailRole}
                    onValueChange={(value) => setEmailRole(value as InviteRoleValue)}
                  >
                    <SelectTrigger className="h-10 rounded-2xl bg-card px-3">
                      <SelectValue placeholder="Member" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Owners can pre-assign manager access directly from the invite.
                  </FieldDescription>
                </Field>
              ) : null}
              <Field>
                <FieldLabel>Note</FieldLabel>
                <Textarea
                  value={emailNote}
                  onChange={(event) => setEmailNote(event.target.value)}
                  placeholder="Optional context for this invite"
                />
              </Field>
              <Button
                type="button"
                onClick={() => handleSubmit("email")}
                disabled={isPending || !email.trim()}
                className="w-full"
              >
                <MailPlus className="size-4" />
                Send invite
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                <Globe2 className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Create a public invite link</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Anyone with the link can join this list after signing in. Leave max uses
                  empty to keep the link reusable until it expires or gets revoked.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {canGrantManagerRole ? (
                <Field>
                  <FieldLabel>Role on join</FieldLabel>
                  <Select
                    value={publicRole}
                    onValueChange={(value) => setPublicRole(value as InviteRoleValue)}
                  >
                    <SelectTrigger className="h-10 rounded-2xl bg-card px-3">
                      <SelectValue placeholder="Member" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabel>Max uses</FieldLabel>
                <Input
                  value={publicMaxUses}
                  onChange={(event) => setPublicMaxUses(event.target.value)}
                  type="number"
                  min={1}
                  max={500}
                  placeholder="Unlimited"
                />
              </Field>
              <Field>
                <FieldLabel>Note</FieldLabel>
                <Textarea
                  value={publicNote}
                  onChange={(event) => setPublicNote(event.target.value)}
                  placeholder="Optional note shown in invite management"
                />
              </Field>
              <Button
                type="button"
                onClick={() => handleSubmit("public")}
                disabled={isPending}
                variant="outline"
                className="w-full"
              >
                <Globe2 className="size-4" />
                Create public link
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Pending invites</p>
            <Badge variant="secondary">{pendingInvites.length}</Badge>
          </div>

          {pendingInvites.length ? (
            pendingInvites.map((invite) => {
              const usageCopy =
                invite.kind === "PUBLIC_LINK"
                  ? invite.maxUses
                    ? `${invite.useCount}/${invite.maxUses} uses`
                    : `${invite.useCount} uses - reusable`
                  : "Single-use invite";
              const identityCopy =
                invite.kind === "PUBLIC_LINK"
                  ? "Anyone with the link can join"
                  : invite.invitedUserName
                    ? `${invite.invitedUserName} - ${invite.invitedUserEmail || invite.email || ""}`
                    : invite.email || "Restricted invite";

              return (
                <div
                  key={invite.id}
                  className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <InviteTypeBadge kind={invite.kind} />
                        <Badge variant="secondary">
                          {invite.targetRole === "MANAGER" ? "Manager" : "Member"}
                        </Badge>
                      </div>
                      <p className="font-medium">{identityCopy}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Expires <RelativeTime value={invite.expiresAt} /></span>
                        <span>{usageCopy}</span>
                      </div>
                      {invite.note ? (
                        <p className="text-sm leading-6 text-muted-foreground">{invite.note}</p>
                      ) : null}
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
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No pending invites. Use email invites for app users or restricted access, or
              mint a public link for broader onboarding.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
