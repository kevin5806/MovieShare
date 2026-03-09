import Link from "next/link";
import { Clapperboard, PlayCircle, Radio, TimerReset } from "lucide-react";

import { DateTimeText } from "@/components/time/date-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatSeconds } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getWatchSessionsOverview } from "@/server/services/watch-service";

function WatchSessionCard({
  session,
  tone = "default",
}: {
  session: Awaited<ReturnType<typeof getWatchSessionsOverview>>["liveSessions"][number];
  tone?: "default" | "muted";
}) {
  const startedBy = session.startedBy.profile?.displayName || session.startedBy.name;
  const latestCheckpoint = session.checkpoints[0];

  return (
    <Link
      href={`/watch/${session.id}`}
      className={cn(
        "block rounded-3xl border p-5 transition-colors",
        tone === "default"
          ? "border-border/70 bg-background hover:bg-accent/50"
          : "border-border/70 bg-muted/20 hover:bg-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold">{session.listItem.movie.title}</p>
          <p className="text-sm text-muted-foreground">
            {session.list.name} • Started by {startedBy}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="secondary">{session.type}</Badge>
          <Badge>{session.status}</Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{session.members.length} joined</span>
        <span>Resume {formatSeconds(session.resumeFromSeconds)}</span>
        <span>
          {latestCheckpoint
            ? `Your last checkpoint ${formatSeconds(latestCheckpoint.positionSeconds)}`
            : "No personal checkpoint yet"}
        </span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Started <DateTimeText value={(session.startedAt ?? session.createdAt).toISOString()} />
      </div>
    </Link>
  );
}

export default async function WatchIndexPage() {
  const session = await requireSession();
  const overview = await getWatchSessionsOverview(session.user.id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">Tracking</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Watch sessions</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Re-enter live sessions quickly and keep an eye on recent checkpoints without
          hunting through individual list pages.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Tracked sessions</p>
            <p className="text-3xl font-semibold">{overview.counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Live now</p>
            <p className="text-3xl font-semibold">{overview.counts.live}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Recent history</p>
            <p className="text-3xl font-semibold">{overview.counts.history}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Embedded sources</p>
            <p className="text-3xl font-semibold">{overview.counts.withEmbeds}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <Radio className="size-4" />
            </div>
            <div>
              <CardTitle>Live sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.liveSessions.length ? (
              overview.liveSessions.map((watchSession) => (
                <WatchSessionCard key={watchSession.id} session={watchSession} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                No live session right now. Start one from a movie detail page whenever the
                group is ready.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <TimerReset className="size-4" />
            </div>
            <div>
              <CardTitle>Recent sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentSessions.length ? (
              overview.recentSessions.map((watchSession) => (
                <WatchSessionCard
                  key={watchSession.id}
                  session={watchSession}
                  tone="muted"
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                Your watch history will appear here after the first tracked session.
              </div>
            )}

            <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-1">
              <Link
                href="/lists"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Clapperboard className="mr-2 size-4" />
                Browse lists
              </Link>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <PlayCircle className="mr-2 size-4" />
                Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
