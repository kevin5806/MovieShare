"use server";

import { revalidatePath } from "next/cache";

import { savePlaybackCheckpointSchema } from "@/features/watch/schemas";
import { requireSession } from "@/server/session";
import { savePlaybackCheckpoint } from "@/server/services/watch-service";

export async function savePlaybackCheckpointAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = savePlaybackCheckpointSchema.parse({
      sessionId: formData.get("sessionId"),
      positionSeconds: formData.get("positionSeconds"),
    });

    await savePlaybackCheckpoint({
      sessionId: parsed.sessionId,
      userId: session.user.id,
      positionSeconds: parsed.positionSeconds,
    });

    revalidatePath(`/watch/${parsed.sessionId}`);

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("savePlaybackCheckpointAction failed", error);

    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Unable to save the playback checkpoint.",
    };
  }
}
