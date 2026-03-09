import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().max(60).optional().default(""),
  bio: z.string().max(320).optional().default(""),
  location: z.string().max(80).optional().default(""),
  favoriteGenres: z.string().max(240).optional().default(""),
});
