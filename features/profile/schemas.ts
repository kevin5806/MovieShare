import { z } from "zod";

const optionalFormText = (max: number) =>
  z.preprocess((value) => (value == null ? "" : value), z.string().max(max));

export const profileSchema = z.object({
  displayName: optionalFormText(60).optional().default(""),
  bio: optionalFormText(320).optional().default(""),
  location: optionalFormText(80).optional().default(""),
  favoriteGenres: optionalFormText(240).optional().default(""),
});

export const friendInviteSchema = z.object({
  email: z.email(),
  message: optionalFormText(240).optional().default(""),
});

export const respondToFriendInviteSchema = z.object({
  inviteId: z.string().min(1),
  action: z.enum(["accept", "decline"]),
});
