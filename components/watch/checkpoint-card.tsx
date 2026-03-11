"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { savePlaybackCheckpointAction } from "@/features/watch/actions";
import { formatSeconds } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimeText } from "@/components/time/date-time";

type CheckpointCardProps = {
  sessionId: string;
  resumeFromSeconds: number;
  yourCurrentPositionSeconds: number;
  runtimeSeconds: number;
  checkpoints: Array<{
    id: string;
    positionSeconds: number;
    savedAt: string;
    userName: string;
  }>;
};

export function CheckpointCard({
  sessionId,
  resumeFromSeconds,
  yourCurrentPositionSeconds,
  runtimeSeconds,
  checkpoints,
}: CheckpointCardProps) {
  const router = useRouter();
  const [positionSeconds, setPositionSeconds] = useState(
    String(yourCurrentPositionSeconds || resumeFromSeconds || 0),
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("positionSeconds", positionSeconds);

      const result = await savePlaybackCheckpointAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success("Playback checkpoint saved.");
    });
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Viewing checkpoints</CardTitle>
        <Badge variant="secondary">{formatSeconds(resumeFromSeconds)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Save your current position manually so the session keeps a shared trace of where
            members stopped watching.
          </p>
          <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium">{formatSeconds(Number(positionSeconds) || 0)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(runtimeSeconds || resumeFromSeconds || yourCurrentPositionSeconds || 0, 1)}
              step={15}
              value={Math.min(Number(positionSeconds) || 0, Math.max(runtimeSeconds || 0, 1))}
              onChange={(event) => setPositionSeconds(event.target.value)}
              className="w-full cursor-pointer accent-foreground"
              aria-label="Playback position"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Start</span>
              <span>{runtimeSeconds ? formatSeconds(runtimeSeconds) : "Unknown duration"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleSave} disabled={isPending}>
              Save checkpoint
            </Button>
            {runtimeSeconds ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setPositionSeconds(String(runtimeSeconds))}
              >
                Mark as finished
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Your current member position: {formatSeconds(yourCurrentPositionSeconds)}
          </p>
        </div>

        <div className="space-y-3">
          {checkpoints.length ? (
            checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="rounded-3xl border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{checkpoint.userName}</p>
                  <Badge variant="secondary">{formatSeconds(checkpoint.positionSeconds)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <DateTimeText value={checkpoint.savedAt} />
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No checkpoints saved yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
