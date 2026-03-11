import { PlayCircle, UsersRound } from "lucide-react";

import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { DateTimeText } from "@/components/time/date-time";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckpointCard } from "@/components/watch/checkpoint-card";
import { PlaybackEmbed } from "@/components/watch/playback-embed";
import { formatSeconds } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getWatchSession } from "@/server/services/watch-service";

function formatProviderLabel(provider: string | null) {
  if (!provider) {
    return "tracking-only";
  }

  if (provider === "VIXSRC") {
    return "VixSrc";
  }

  if (provider === "PLEX") {
    return "Plex";
  }

  return provider.replaceAll("_", " ");
}

export default async function WatchSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await requireSession();
  const watchSession = await getWatchSession(sessionId, session.user.id);
  const currentMember = watchSession.members.find((member) => member.userId === session.user.id);
  const playbackInfo =
    watchSession.groupState && typeof watchSession.groupState === "object"
      ? (watchSession.groupState as { kind?: string; message?: string })
      : null;
  const startedAt = watchSession.startedAt ?? watchSession.createdAt;
  const startedBy =
    watchSession.startedBy.profile?.displayName || watchSession.startedBy.name;
  const joinedMembers = watchSession.members.filter((member) => member.presence === "JOINED");
  const providerLabel = formatProviderLabel(watchSession.streamingProvider);
  const playbackProviderLabel = watchSession.streamingPlaybackUrl
    ? `${providerLabel} playback`
    : watchSession.streamingProvider
      ? `${providerLabel} configured`
      : providerLabel;
  const runtimeSeconds = watchSession.listItem.movie.runtimeMinutes
    ? watchSession.listItem.movie.runtimeMinutes * 60
    : 0;

  return (
    <div className="space-y-8">
      <RealtimeRefresh channels={[`watch:${watchSession.id}`]} />
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{watchSession.type}</Badge>
          <Badge variant="secondary">{watchSession.status}</Badge>
          <Badge variant="secondary">
            Resume {formatSeconds(watchSession.resumeFromSeconds)}
          </Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          {watchSession.listItem.movie.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          This area keeps a trace of who watched together, where each person really got,
          and which watch entries happened over time. It is not a synced teleparty or
          remote co-watching room.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Tracking mode</p>
            <p className="text-lg font-semibold">
              {watchSession.type === "GROUP" ? "Group tracking" : "Solo tracking"}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Group sessions track members under the same title, without synced playback.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Started by</p>
            <p className="text-lg font-semibold">{startedBy}</p>
            <p className="text-sm text-muted-foreground">
              <DateTimeText value={startedAt.toISOString()} />
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Members joined</p>
            <p className="text-lg font-semibold">
              {joinedMembers.length}/{watchSession.members.length}
            </p>
            <p className="text-sm text-muted-foreground">
              People added to the same watch entry are assumed to be in the room already.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Playback provider</p>
            <p className="text-lg font-semibold">{playbackProviderLabel}</p>
            <p className="text-sm text-muted-foreground">
              {watchSession.streamingPlaybackUrl
                ? "Embedded source available"
                : playbackInfo?.message ||
                  (watchSession.streamingProvider
                    ? "Provider slot exists, but playback is not available for this session."
                    : "Tracking-only session")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <PlayCircle className="size-4" />
            </div>
            <div>
              <CardTitle>Playback source</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {watchSession.streamingPlaybackUrl ? (
              <PlaybackEmbed
                sessionId={watchSession.id}
                playbackUrl={watchSession.streamingPlaybackUrl}
                title={watchSession.listItem.movie.title}
                providerLabel={playbackProviderLabel}
                expectedVideoId={watchSession.listItem.movie.tmdbId}
                initialCurrentPositionSeconds={currentMember?.currentPositionSeconds ?? 0}
                initialResumeFromSeconds={watchSession.resumeFromSeconds}
              />
            ) : (
              <div className="space-y-4 rounded-[28px] border border-dashed border-border bg-background p-8">
                <div>
                  <p className="font-medium">No embedded streaming source available</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {playbackInfo?.message ||
                      "No playback provider is currently available for this deployment."}
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
                  Use this watch entry as a shared tracking space: each person can play the
                  movie in their own setup and keep the group informed here.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/85">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <UsersRound className="size-4" />
              </div>
              <div>
                <CardTitle>Session members</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {watchSession.members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {member.user.profile?.displayName || member.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last session point {formatSeconds(member.currentPositionSeconds)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {member.isHost ? <Badge>Host</Badge> : null}
                      <Badge variant="secondary">{member.presence}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <CheckpointCard
            sessionId={watchSession.id}
            resumeFromSeconds={watchSession.resumeFromSeconds}
            yourCurrentPositionSeconds={currentMember?.currentPositionSeconds ?? 0}
            runtimeSeconds={runtimeSeconds}
            checkpoints={watchSession.checkpoints.map((checkpoint) => ({
              id: checkpoint.id,
              positionSeconds: checkpoint.positionSeconds,
              savedAt: checkpoint.savedAt.toISOString(),
              userName: checkpoint.user.profile?.displayName || checkpoint.user.name,
            }))}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Per-person progress</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {watchSession.aggregateProgress.startedCount} started
              </Badge>
              <Badge variant="secondary">
                {watchSession.aggregateProgress.completedCount} finished
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {watchSession.progressBoard.length ? (
              watchSession.progressBoard.map((row) => (
                <div
                  key={row.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{row.userName}</p>
                    <Badge variant={row.completionState === "COMPLETED" ? "default" : "secondary"}>
                      {row.completionState === "COMPLETED"
                        ? "Finished"
                        : row.completionState === "IN_PROGRESS"
                          ? "In progress"
                          : "Not started"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Last known point {formatSeconds(row.lastPositionSeconds)}
                  </p>
                  {row.lastWatchedAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated <DateTimeText value={row.lastWatchedAt.toISOString()} />
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Nobody has tracked progress for this title yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Watch history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchSession.history.length ? (
              watchSession.history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">
                      {entry.type === "GROUP" ? "Group watch" : "Solo watch"}
                    </p>
                    <Badge variant="secondary">{entry.participantCount} people</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Started by {entry.startedByName}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Started <DateTimeText value={entry.startedAt.toISOString()} />
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Started from {formatSeconds(entry.resumeFromSeconds)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No older watch entries yet for this title.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
