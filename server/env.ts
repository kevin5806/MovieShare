import "dotenv/config";

import { z } from "zod";

import { StreamingProviderKey } from "@/generated/prisma/client";

const envBoolean = z
  .enum(["true", "false"])
  .optional()
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  TMDB_API_TOKEN: z.string().optional().default(""),
  TMDB_API_KEY: z.string().optional().default(""),
  TMDB_LANGUAGE: z.string().optional().default("en-US"),
  SEED_ADMIN_EMAIL: z.string().email().optional().default("admin@movieshare.local"),
  SEED_ADMIN_NAME: z.string().optional().default("movieshare admin"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_SECURE: envBoolean,
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("movieshare <noreply@movieshare.local>"),
  PUSH_NOTIFICATIONS_ENABLED: envBoolean,
  VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  VAPID_SUBJECT: z.string().optional().default(""),
  AUTH_EMAIL_CODE_ENABLED: envBoolean,
  AUTH_MAGIC_LINK_ENABLED: envBoolean,
  AUTH_PASSKEY_ENABLED: envBoolean,
  AUTH_TWO_FACTOR_ENABLED: envBoolean,
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_PUBLIC_BASE_URL: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default("us-east-1"),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  VIXSRC_BASE_URL: z.string().optional().default(""),
  VIXSRC_LANG: z.string().optional().default(""),
  PLEX_WATCH_URL_TEMPLATE: z.string().optional().default(""),
  STREAMING_VIXSRC_ENABLED: envBoolean,
  STREAMING_PLEX_ENABLED: envBoolean,
  STREAMING_ACTIVE_PROVIDER: z
    .union([z.nativeEnum(StreamingProviderKey), z.literal("")])
    .optional()
    .default("")
    .transform((value) => (value === "" ? null : value)),
  STORAGE_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
});

const parsedEnv = envSchema.parse(process.env);

function isLocalHost(url: string) {
  const hostname = new URL(url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

if (process.env.NODE_ENV === "production" && !isLocalHost(parsedEnv.BETTER_AUTH_URL)) {
  if (
    parsedEnv.BETTER_AUTH_SECRET.length < 32 ||
    parsedEnv.BETTER_AUTH_SECRET.includes("change-this")
  ) {
    throw new Error(
      "BETTER_AUTH_SECRET must be a strong random secret in production deployments.",
    );
  }

  if (new URL(parsedEnv.BETTER_AUTH_URL).protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use https in production deployments.");
  }
}

export const env = parsedEnv;

export const isTmdbConfigured = Boolean(env.TMDB_API_TOKEN || env.TMDB_API_KEY);
export const isStorageConfigured = Boolean(
  env.STORAGE_ENDPOINT &&
    env.STORAGE_PUBLIC_BASE_URL &&
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY &&
    env.STORAGE_SECRET_KEY,
);
