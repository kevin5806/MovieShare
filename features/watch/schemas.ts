import { z } from "zod";

export const savePlaybackCheckpointSchema = z.object({
  sessionId: z.string().min(1),
  positionSeconds: z.coerce.number().int().min(0),
});
