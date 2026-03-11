import {
  FeedbackInterest,
  FeedbackSeenState,
  ListMemberRole,
  SelectionMode,
  WatchSessionType,
} from "@/generated/prisma/client";
import { formBoolean, optionalFormText } from "@/lib/schema-utils";
import { z } from "zod";

export const createListSchema = z.object({
  name: z.string().min(2).max(80),
  description: optionalFormText(240).optional().default(""),
});

export const updateListPresentationSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  name: z.string().min(2).max(80),
  description: optionalFormText(240).optional().default(""),
  removeCoverImage: formBoolean,
});

export const deleteListSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
});

export const addMovieToListSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  tmdbId: z.coerce.number().int().positive(),
  note: optionalFormText(200).optional().default(""),
});

export const createListInviteSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  kind: z.enum(["email", "public"]).default("email"),
  email: z
    .union([z.email(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => value ?? "")
    .default(""),
  targetRole: z.nativeEnum(ListMemberRole).default(ListMemberRole.MEMBER),
  maxUses: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }

      return value;
    },
    z.coerce.number().int().positive().max(500).nullable().default(null),
  ),
  note: optionalFormText(180).optional().default(""),
});

export const revokeListInviteSchema = z.object({
  inviteId: z.string().min(1),
  listSlug: z.string().min(1),
});

export const respondToListInviteSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["accept", "decline"]),
});

export const updateListMemberRoleSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  memberId: z.string().min(1),
  role: z.nativeEnum(ListMemberRole),
});

export const removeListMemberSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  memberId: z.string().min(1),
});

export const removeMovieFromListSchema = z.object({
  listItemId: z.string().min(1),
  listSlug: z.string().min(1),
});

export const saveFeedbackSchema = z.object({
  listItemId: z.string().min(1),
  listSlug: z.string().min(1),
  seenState: z.nativeEnum(FeedbackSeenState),
  interest: z.nativeEnum(FeedbackInterest),
  wouldRewatch: formBoolean,
  comment: optionalFormText(180).optional().default(""),
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

export const updateListViewPreferencesSchema = z.object({
  listId: z.string().min(1),
  listSlug: z.string().min(1),
  sortBy: z.enum(["RECENT", "TITLE", "TMDB_RATING", "INTEREST", "COMMENTS"]),
  proposerId: z
    .union([z.string().min(1), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.trim() ? value : null))
    .default(null),
});
