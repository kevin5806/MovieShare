import Link from "next/link";
import { Bell, Film, Inbox, Radio } from "lucide-react";

import { NotificationInbox } from "@/components/notifications/notification-inbox";
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
          The inbox now keeps persistent read state for invites, live sessions and shared
          activity instead of acting as a summary-only placeholder.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Unread</p>
            <p className="text-3xl font-semibold">{overview.counts.unread}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Action required</p>
            <p className="text-3xl font-semibold">{overview.counts.actionRequired}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Read</p>
            <p className="text-3xl font-semibold">{overview.counts.read}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Tracked items</p>
            <p className="text-3xl font-semibold">{overview.counts.total}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <NotificationInbox notifications={overview.notifications} />

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/85">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Inbox breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Current composition of the notification feed.
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <Bell className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <p className="text-sm text-muted-foreground">Friend invites</p>
                <p className="mt-2 text-2xl font-semibold">{overview.counts.friendInvites}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <p className="text-sm text-muted-foreground">List invites</p>
                <p className="mt-2 text-2xl font-semibold">{overview.counts.listInvites}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <p className="text-sm text-muted-foreground">Live sessions</p>
                <p className="mt-2 text-2xl font-semibold">{overview.counts.liveSessions}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <p className="text-sm text-muted-foreground">Activity items</p>
                <p className="mt-2 text-2xl font-semibold">{overview.counts.recentActivity}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Quick routes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Jump directly to the areas most often linked from notifications.
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <Radio className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Film className="mr-2 size-4" />
                Dashboard
              </Link>
              <Link
                href="/watch"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Radio className="mr-2 size-4" />
                Watch sessions
              </Link>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Inbox className="mr-2 size-4" />
                Profile and invites
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
