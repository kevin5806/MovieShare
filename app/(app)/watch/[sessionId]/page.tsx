import { PlayCircle, UsersRound } from "lucide-react";

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

  return (
    <div className="space-y-8">
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
          Watch sessions store membership, progress, resume checkpoints and provider state so
          realtime sync can be layered in later without redesigning the domain.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <PlayCircle className="size-4" />
            </div>
            <div>
              <CardTitle>Playback area</CardTitle>
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
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Provider {watchSession.streamingProvider || "unassigned"}</span>
                  <span>Resume point {formatSeconds(watchSession.resumeFromSeconds)}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-background p-8">
                <p className="font-medium">Streaming currently unavailable</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {playbackInfo?.message ||
                    "No active streaming provider is configured for this deployment yet."}
                </p>
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
