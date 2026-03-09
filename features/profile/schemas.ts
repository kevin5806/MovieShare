import { optionalFormText } from "@/lib/schema-utils";
import { z } from "zod";

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
