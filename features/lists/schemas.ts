import {
  FeedbackInterest,
  FeedbackSeenState,
  SelectionMode,
  WatchSessionType,
} from "@/generated/prisma/client";
import { z } from "zod";

export const createListSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional().default(""),
});

export const addMovieToListSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  tmdbId: z.coerce.number().int().positive(),
  note: z.string().max(200).optional().default(""),
});

export const saveFeedbackSchema = z.object({
  listItemId: z.string().min(1),
  listSlug: z.string().min(1),
  seenState: z.nativeEnum(FeedbackSeenState),
  interest: z.nativeEnum(FeedbackInterest),
  wouldRewatch: z.coerce.boolean().default(false),
  comment: z.string().max(180).optional().default(""),
});

export const runSelectionSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  mode: z.nativeEnum(SelectionMode),
});

export const startWatchSessionSchema = z.object({
  listItemId: z.string().min(1),
  listSlug: z.string().min(1),
  type: z.nativeEnum(WatchSessionType),
  memberIds: z.array(z.string()).optional().default([]),
});
