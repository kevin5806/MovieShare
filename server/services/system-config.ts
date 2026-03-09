import { env } from "@/server/env";
import { db } from "@/server/db";
import { getStreamingAdminState } from "@/server/services/streaming";

const SYSTEM_CONFIG_SCOPE = "default";

export type ConfigSource = "database" | "environment" | "missing";
export type TmdbAuthMode = "api-read-token" | "api-key" | "not-configured";

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function ensureSystemConfigSeeded() {
  return db.systemConfig.upsert({
    where: {
      scope: SYSTEM_CONFIG_SCOPE,
    },
    update: {},
    create: {
      scope: SYSTEM_CONFIG_SCOPE,
      tmdbLanguage: "en-US",
      smtpPort: 587,
      smtpSecure: false,
    },
  });
}

export async function getSystemConfig() {
  return ensureSystemConfigSeeded();
}

export async function getTmdbRuntimeConfig() {
  const config = await getSystemConfig();

  const apiToken = normalizeOptionalString(config.tmdbApiToken) ?? env.TMDB_API_TOKEN;
  const apiKey = normalizeOptionalString(config.tmdbApiKey) ?? env.TMDB_API_KEY;
  const language = normalizeOptionalString(config.tmdbLanguage) ?? "en-US";
  const source: ConfigSource =
    apiToken || apiKey
      ? normalizeOptionalString(config.tmdbApiToken) || normalizeOptionalString(config.tmdbApiKey)
        ? "database"
        : "environment"
      : "missing";
  const authMode: TmdbAuthMode = apiToken
    ? "api-read-token"
    : apiKey
      ? "api-key"
      : "not-configured";

  return {
    apiToken,
    apiKey,
    language,
    source,
    authMode,
  };
}

export async function getEmailRuntimeConfig() {
  const config = await getSystemConfig();

  const host = normalizeOptionalString(config.smtpHost) ?? env.SMTP_HOST;
  const port = config.smtpPort || env.SMTP_PORT;
  const secure = config.smtpSecure || port === 465;
  const user = normalizeOptionalString(config.smtpUser) ?? env.SMTP_USER;
  const password = normalizeOptionalString(config.smtpPassword) ?? env.SMTP_PASSWORD;
  const from = normalizeOptionalString(config.smtpFrom) ?? env.SMTP_FROM;
  const source: ConfigSource =
    host || user || password || from
      ? normalizeOptionalString(config.smtpHost) ||
        normalizeOptionalString(config.smtpUser) ||
        normalizeOptionalString(config.smtpPassword) ||
        normalizeOptionalString(config.smtpFrom)
        ? "database"
        : "environment"
      : "missing";

  return {
    host,
    port,
    secure,
    user,
    password,
    from,
    source,
    isConfigured: Boolean(host && from),
  };
}

export async function getSystemAdminState() {
  const [config, tmdb, email, streaming] = await Promise.all([
    getSystemConfig(),
    getTmdbRuntimeConfig(),
    getEmailRuntimeConfig(),
    getStreamingAdminState(),
  ]);

  return {
    config,
    tmdb,
    email,
    streaming,
    authBaseUrl: env.BETTER_AUTH_URL,
  };
}

export async function updateTmdbSettings(input: {
  tmdbApiToken: string;
  tmdbApiKey: string;
  tmdbLanguage: string;
}) {
  await ensureSystemConfigSeeded();

  await db.systemConfig.update({
    where: {
      scope: SYSTEM_CONFIG_SCOPE,
    },
    data: {
      tmdbApiToken: normalizeOptionalString(input.tmdbApiToken),
      tmdbApiKey: normalizeOptionalString(input.tmdbApiKey),
      tmdbLanguage: normalizeOptionalString(input.tmdbLanguage) ?? "en-US",
    },
  });
}

export async function updateEmailSettings(input: {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
}) {
  await ensureSystemConfigSeeded();

  await db.systemConfig.update({
    where: {
      scope: SYSTEM_CONFIG_SCOPE,
    },
    data: {
      smtpHost: normalizeOptionalString(input.smtpHost),
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: normalizeOptionalString(input.smtpUser),
      smtpPassword: normalizeOptionalString(input.smtpPassword),
      smtpFrom: normalizeOptionalString(input.smtpFrom),
    },
  });
}
