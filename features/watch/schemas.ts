import { z } from "zod";

export const savePlaybackCheckpointSchema = z.object({
  sessionId: z.string().min(1),
  positionSeconds: z.coerce.number().int().min(0),
});

export const playbackEventNameSchema = z.enum([
  "play",
  "pause",
  "seeked",
  "ended",
  "timeupdate",
]);

export const recordPlaybackEventSchema = z.object({
  sessionId: z.string().min(1),
  event: playbackEventNameSchema,
  currentTime: z.coerce.number().min(0),
  duration: z.coerce.number().min(0).optional().default(0),
  videoId: z.coerce.number().int().positive(),
});
