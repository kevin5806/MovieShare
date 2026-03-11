import { UsersRound, WandSparkles } from "lucide-react";

import { InviteMembersCard } from "@/components/lists/invite-members-card";
import { MemberManagementCard } from "@/components/lists/member-management-card";
import { ListPresentationForm } from "@/components/lists/list-presentation-form";
import { MediaImage } from "@/components/media/media-image";
import { AddMovieDialog } from "@/components/movies/add-movie-dialog";
import { MovieCard } from "@/components/movies/movie-card";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/session";
import { getListDetails } from "@/server/services/list-service";

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const list = await getListDetails(slug, session.user.id);
  const latestSelection = list.selectionRuns[0];
  const viewerMembership = list.members.find((member) => member.userId === session.user.id);
  const isOwner = list.ownerId === session.user.id;
  const canManageList =
    viewerMembership?.role === "OWNER" || viewerMembership?.role === "MANAGER";

  return (
    <div className="space-y-8">
      <RealtimeRefresh channels={[`list:${list.id}`]} />
      <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-card/85 p-6 shadow-sm">
        {list.coverImageUrl ? (
          <MediaImage
            src={list.coverImageUrl}
            alt={list.name}
            fill
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(248,250,252,0.94))]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{list.items.length} movies</Badge>
              <Badge variant="secondary">{list.members.length} members</Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">{list.name}</h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
                {list.description || "No description yet for this room."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UsersRound className="size-4" />
                {list.members.map((member) => member.user.name).join(", ")}
              </span>
            </div>
          </div>
          <AddMovieDialog listId={list.id} listSlug={list.slug} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Movies in this list</CardTitle>
            <Badge variant="secondary">TMDB-backed</Badge>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.items.length ? (
              list.items.map((item) => (
                <MovieCard key={item.id} listSlug={list.slug} item={item} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                No movies yet. Add the first proposal from TMDB to start the conversation.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/85">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <WandSparkles className="size-4" />
              </div>
              <div>
                <CardTitle>Selection snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestSelection ? (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">{latestSelection.summary}</p>
                  {latestSelection.results.slice(0, 3).map((result) => (
                    <div
                      key={result.id}
                      className="rounded-3xl border border-border/70 bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{result.listItem.movie.title}</p>
                          <p className="text-sm text-muted-foreground">Rank #{result.rank}</p>
                        </div>
                        {result.selected ? <Badge>Selected</Badge> : null}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  No selection run yet. Open the selection page to rank candidates.
                </p>
              )}
            </CardContent>
          </Card>

          {canManageList ? (
            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle>List presentation</CardTitle>
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
          ) : null}

          {canManageList ? (
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
          ) : null}

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
        </div>
      </section>
    </div>
  );
}
