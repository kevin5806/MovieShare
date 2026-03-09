import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  TMDB_API_TOKEN: z.string().optional().default(""),
  SEED_ADMIN_EMAIL: z.string().email().optional().default("admin@movielist.local"),
  SEED_ADMIN_NAME: z.string().optional().default("MovieList Admin"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("MovieList <noreply@movielist.local>"),
});

export const env = envSchema.parse(process.env);

export const isTmdbConfigured = Boolean(env.TMDB_API_TOKEN);
