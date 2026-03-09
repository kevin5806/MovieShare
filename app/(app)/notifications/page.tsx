import Link from "next/link";
import { Bell, Film, Inbox, Radio, Sparkles, Users } from "lucide-react";

import { RelativeTime } from "@/components/time/relative-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getNotificationsOverview } from "@/server/services/notification-service";

export default async function NotificationsPage() {
  const session = await requireSession();
  const overview = await getNotificationsOverview({
    userId: session.user.id,
    email: session.user.email,
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">Inbox</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Notifications</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Track invites, live sessions and recent workspace activity from one place.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Action summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pending items that may need your attention.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <Bell className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Action required</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.actionRequired}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Live sessions</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.liveSessions}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Friend invites</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.friendInvites}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">List invites</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.listInvites}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Actionable items</CardTitle>
              <p className="text-sm text-muted-foreground">
                Direct routes to invites and collaborative work already waiting for you.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <Sparkles className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.listInvites.map((invite) => (
              <Link
                key={invite.id}
                href={`/invites/lists/${invite.token}`}
                className="flex items-start justify-between gap-3 rounded-3xl border border-border/70 bg-background p-4 transition-colors hover:bg-accent/50"
              >
                <div className="space-y-1">
                  <p className="font-medium">{invite.list.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {invite.sender.profile?.displayName || invite.sender.name} invited you to join
                    this list.
                  </p>
                </div>
                <Badge variant="secondary">List invite</Badge>
              </Link>
            ))}

            {overview.friendInvites.map((invite) => (
              <Link
                key={invite.id}
                href="/profile"
                className="flex items-start justify-between gap-3 rounded-3xl border border-border/70 bg-background p-4 transition-colors hover:bg-accent/50"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {invite.sender.profile?.displayName || invite.sender.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sent you a friend invite{invite.message ? `: ${invite.message}` : "."}
                  </p>
                </div>
                <Badge variant="secondary">Friend invite</Badge>
              </Link>
            ))}

            {!overview.listInvites.length && !overview.friendInvites.length ? (
              <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Nothing urgent right now. New invites and workflow signals will surface here.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Recent activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shared list events and your own latest actions.
              </p>
            </div>
            <Badge variant="secondary">{overview.counts.recentActivity} items</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentActivity.length ? (
              overview.recentActivity.map((activity) => {
                const actorName =
                  activity.actorUser?.profile?.displayName || activity.actorUser?.name || "System";
                const content = (
                  <div className="space-y-1">
                    <p className="font-medium">{activity.event.replaceAll(".", " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {actorName} in {activity.list?.name || "system"} |{" "}
                      <RelativeTime value={activity.createdAt.toISOString()} />
                    </p>
                  </div>
                );

                return activity.list ? (
                  <Link
                    key={activity.id}
                    href={`/lists/${activity.list.slug}`}
                    className="block rounded-3xl border border-border/70 bg-background p-4 transition-colors hover:bg-accent/50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={activity.id}
                    className="rounded-3xl border border-border/70 bg-background p-4"
                  >
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Activity will appear here as lists, feedback and watch sessions evolve.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Live watch sessions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Quick access to the sessions you are already part of.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <Radio className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.liveSessions.length ? (
              overview.liveSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/watch/${session.id}`}
                  className="block rounded-3xl border border-border/70 bg-background p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{session.listItem.movie.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.list.name} | {session.members.length} joined now
                      </p>
                    </div>
                    <Badge>LIVE</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No live sessions right now. Start one from a movie detail page when needed.
              </div>
            )}

            <div className="grid gap-3 pt-2 sm:grid-cols-3 xl:grid-cols-1">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Film className="mr-2 size-4" />
                Dashboard
              </Link>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Users className="mr-2 size-4" />
                Profile and invites
              </Link>
              <Link
                href="/notifications"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Inbox className="mr-2 size-4" />
                Refresh inbox
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
