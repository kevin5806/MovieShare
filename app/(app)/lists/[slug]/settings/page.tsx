import Link from "next/link";

import { InviteMembersCard } from "@/components/lists/invite-members-card";
import { MemberManagementCard } from "@/components/lists/member-management-card";
import { DeleteListButton } from "@/components/lists/delete-list-button";
import { ListPresentationForm } from "@/components/lists/list-presentation-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getListDetails } from "@/server/services/list-service";

export default async function ListSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const list = await getListDetails(slug, session.user.id);
  const viewerMembership = list.members.find((member) => member.userId === session.user.id);
  const isOwner = list.ownerId === session.user.id;
  const canManageList =
    viewerMembership?.role === "OWNER" || viewerMembership?.role === "MANAGER";

  if (!canManageList) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">List settings</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">{list.name}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Only the owner or a manager can edit the settings for this list.
          </p>
        </div>
        <Link href={`/lists/${list.slug}`} className={cn(buttonVariants())}>
          Back to the list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">List settings</Badge>
          <Badge variant="secondary">{list.name}</Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Manage this list</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Edit the presentation, manage members and invite links, or remove the list when
          it is no longer needed.
        </p>
        <Link
          href={`/lists/${list.slug}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to the movie view
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Presentation</CardTitle>
          </CardHeader>
          <CardContent>
            <ListPresentationForm
              list={{
                id: list.id,
                slug: list.slug,
                name: list.name,
                description: list.description,
                coverImageUrl: list.coverImageUrl,
              }}
            />
          </CardContent>
        </Card>

        <InviteMembersCard
          listId={list.id}
          listSlug={list.slug}
          canGrantManagerRole={isOwner}
          invites={list.invites.map((invite) => ({
            id: invite.id,
            kind: invite.kind,
            email: invite.email,
            status: invite.status,
            token: invite.token,
            expiresAt: invite.expiresAt.toISOString(),
            invitedUserId: invite.invitedUserId,
            invitedUserName:
              invite.invitedUser?.profile?.displayName || invite.invitedUser?.name || null,
            invitedUserEmail: invite.invitedUser?.email || null,
            targetRole: invite.targetRole,
            maxUses: invite.maxUses,
            useCount: invite.useCount,
            note: invite.note,
          }))}
        />
      </section>

      {isOwner ? (
        <MemberManagementCard
          listId={list.id}
          listSlug={list.slug}
          ownerUserId={list.ownerId}
          currentUserId={session.user.id}
          members={list.members.map((member) => ({
            id: member.id,
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt.toISOString(),
            user: {
              name: member.user.name,
              email: member.user.email,
              profile: member.user.profile
                ? {
                    displayName: member.user.profile.displayName,
                  }
                : null,
            },
          }))}
        />
      ) : null}

      {isOwner ? (
        <Card className="border-destructive/20 bg-card/85">
          <CardHeader>
            <CardTitle>Delete list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              This permanently removes the list, its invites, feedback, watch history and
              shared activity for everyone.
            </p>
            <DeleteListButton listId={list.id} listSlug={list.slug} listName={list.name} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
