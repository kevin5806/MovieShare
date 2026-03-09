import { PlayCircle, UsersRound } from "lucide-react";

import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { DateTimeText } from "@/components/time/date-time";
import { CheckpointCard } from "@/components/watch/checkpoint-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeconds } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getWatchSession } from "@/server/services/watch-service";

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
  const providerLabel = watchSession.streamingPlaybackUrl
    ? watchSession.streamingProvider || "embedded"
    : watchSession.streamingProvider
      ? `${watchSession.streamingProvider} placeholder`
      : "tracking-only";

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
          This area tracks who started the title, who joined the same session and where each
          member stopped. It is not a realtime teleparty or synced screen-sharing flow.
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
              Presence and checkpoints remain shareable across the list.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">Playback provider</p>
            <p className="text-lg font-semibold">{providerLabel}</p>
            <p className="text-sm text-muted-foreground">
              {watchSession.streamingPlaybackUrl ? "Embedded source available" : "Tracking-only session"}
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
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[28px] border border-border/70 bg-black">
                  <iframe
                    src={watchSession.streamingPlaybackUrl}
                    title={watchSession.listItem.movie.title}
                    className="aspect-video w-full"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Provider {providerLabel}</span>
                  <span>Resume point {formatSeconds(watchSession.resumeFromSeconds)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-[28px] border border-dashed border-border bg-background p-8">
                <div>
                  <p className="font-medium">No embedded streaming source available</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {playbackInfo?.message ||
                      "No active playback provider is configured for this deployment."}
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
                  Use this session as a shared tracking space: each member can play the movie
                  in their own setup and save checkpoints here to keep the group informed.
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
                        Position {formatSeconds(member.currentPositionSeconds)}
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
            checkpoints={watchSession.checkpoints.map((checkpoint) => ({
              id: checkpoint.id,
              positionSeconds: checkpoint.positionSeconds,
              savedAt: checkpoint.savedAt.toISOString(),
              userName: checkpoint.user.profile?.displayName || checkpoint.user.name,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
