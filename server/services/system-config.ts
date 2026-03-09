import { env } from "@/server/env";
import { db } from "@/server/db";
import { getMediaStorageRuntimeConfig } from "@/server/services/media-storage";
import { getStreamingAdminState } from "@/server/services/streaming";

const SYSTEM_CONFIG_SCOPE = "default";

export type ConfigSource = "database" | "environment" | "missing";
export type TmdbAuthMode = "api-read-token" | "api-key" | "not-configured";
export type AccessMethodKey =
  | "EMAIL_PASSWORD"
  | "EMAIL_CODE"
  | "MAGIC_LINK"
  | "PASSKEY"
  | "TWO_FACTOR";
export type AccessMethodAvailability = "live" | "config-only" | "blocked";

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildAccessMethodsAdminState(input: {
  config: Awaited<ReturnType<typeof getSystemConfig>>;
  emailConfigured: boolean;
}) {
  const emailDependentAvailability: AccessMethodAvailability = input.emailConfigured
    ? "config-only"
    : "blocked";

  return [
    {
      key: "EMAIL_PASSWORD" as const,
      label: "Email and password",
      description: "Primary access flow already live in the app.",
      isEnabled: true,
      availability: "live" as const,
      requirement: "No extra dependency beyond Better Auth itself.",
    },
    {
      key: "EMAIL_CODE" as const,
      label: "Email code",
      description: "Useful for low-friction sign-in and lightweight account recovery.",
      isEnabled: input.config.authEmailCodeEnabled,
      availability: emailDependentAvailability,
      requirement: input.emailConfigured
        ? "SMTP is configured, so rollout can be wired on top of the current auth stack."
        : "Requires working SMTP delivery before it can be turned into a real sign-in method.",
    },
    {
      key: "MAGIC_LINK" as const,
      label: "Magic link",
      description: "Email-link based access for users who do not want a password.",
      isEnabled: input.config.authMagicLinkEnabled,
      availability: emailDependentAvailability,
      requirement: input.emailConfigured
        ? "SMTP is configured, so link delivery can be added without changing the domain model."
        : "Requires working SMTP delivery before link-based access is viable.",
    },
    {
      key: "PASSKEY" as const,
      label: "Passkeys",
      description: "Best future option for passwordless access on modern browsers and devices.",
      isEnabled: input.config.authPasskeyEnabled,
      availability: "config-only" as const,
      requirement:
        "Requires HTTPS, RP configuration and explicit Better Auth passkey wiring before rollout.",
    },
    {
      key: "TWO_FACTOR" as const,
      label: "Two-factor authentication",
      description: "Additional step for protecting sensitive or admin accounts.",
      isEnabled: input.config.authTwoFactorEnabled,
      availability: emailDependentAvailability,
      requirement: input.emailConfigured
        ? "SMTP exists, so OTP-based 2FA can be layered on top of the current login flow."
        : "Needs a delivery channel such as email OTP or TOTP onboarding before activation.",
    },
  ];
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
      authEmailPasswordEnabled: true,
      authEmailCodeEnabled: false,
      authMagicLinkEnabled: false,
      authPasskeyEnabled: false,
      authTwoFactorEnabled: false,
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
  const storage = getMediaStorageRuntimeConfig();

  return {
    config,
    tmdb,
    email,
    storage,
    accessMethods: buildAccessMethodsAdminState({
      config,
      emailConfigured: email.isConfigured,
    }),
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

export async function updateAccessMethodSettings(input: {
  authEmailCodeEnabled: boolean;
  authMagicLinkEnabled: boolean;
  authPasskeyEnabled: boolean;
  authTwoFactorEnabled: boolean;
}) {
  await ensureSystemConfigSeeded();

  await db.systemConfig.update({
    where: {
      scope: SYSTEM_CONFIG_SCOPE,
    },
    data: {
      authEmailCodeEnabled: input.authEmailCodeEnabled,
      authMagicLinkEnabled: input.authMagicLinkEnabled,
      authPasskeyEnabled: input.authPasskeyEnabled,
      authTwoFactorEnabled: input.authTwoFactorEnabled,
    },
  });
}
