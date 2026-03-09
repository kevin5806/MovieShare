"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { savePlaybackCheckpointAction } from "@/features/watch/actions";
import { formatSeconds } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CheckpointCardProps = {
  sessionId: string;
  resumeFromSeconds: number;
  yourCurrentPositionSeconds: number;
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
        <CardTitle>Resume checkpoints</CardTitle>
        <Badge variant="secondary">{formatSeconds(resumeFromSeconds)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Save the current playback position manually to keep the session resume point in
            sync.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="number"
              min={0}
              value={positionSeconds}
              onChange={(event) => setPositionSeconds(event.target.value)}
              placeholder="Position in seconds"
            />
            <Button type="button" onClick={handleSave} disabled={isPending}>
              Save checkpoint
            </Button>
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
                  {new Date(checkpoint.savedAt).toLocaleString()}
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
