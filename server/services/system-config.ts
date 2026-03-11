import { env } from "@/server/env";
import { db } from "@/server/db";
import { getMediaStorageRuntimeConfig } from "@/server/services/media-storage";
import { getStreamingAdminState } from "@/server/services/streaming";

const SYSTEM_CONFIG_SCOPE = "default";
const DEFAULT_TMDB_LANGUAGE = "en-US";
const DEFAULT_SMTP_PORT = 587;

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

function isSystemConfigPristine(config: Awaited<ReturnType<typeof getSystemConfig>>) {
  return config.createdAt.getTime() === config.updatedAt.getTime();
}

function getAccessMethodEffectiveSettings(config: Awaited<ReturnType<typeof getSystemConfig>>) {
  const environmentHasBootstrapValues =
    env.AUTH_EMAIL_CODE_ENABLED ||
    env.AUTH_MAGIC_LINK_ENABLED ||
    env.AUTH_PASSKEY_ENABLED ||
    env.AUTH_TWO_FACTOR_ENABLED;
  const databaseHasValues =
    config.authEmailCodeEnabled ||
    config.authMagicLinkEnabled ||
    config.authPasskeyEnabled ||
    config.authTwoFactorEnabled;

  if (!databaseHasValues && environmentHasBootstrapValues && isSystemConfigPristine(config)) {
    return {
      authEmailCodeEnabled: env.AUTH_EMAIL_CODE_ENABLED,
      authMagicLinkEnabled: env.AUTH_MAGIC_LINK_ENABLED,
      authPasskeyEnabled: env.AUTH_PASSKEY_ENABLED,
      authTwoFactorEnabled: env.AUTH_TWO_FACTOR_ENABLED,
      source: "environment" as const,
    };
  }

  return {
    authEmailCodeEnabled: config.authEmailCodeEnabled,
    authMagicLinkEnabled: config.authMagicLinkEnabled,
    authPasskeyEnabled: config.authPasskeyEnabled,
    authTwoFactorEnabled: config.authTwoFactorEnabled,
    source: databaseHasValues ? ("database" as const) : ("missing" as const),
  };
}

function buildAccessMethodsAdminState(input: {
  accessMethodSettings: ReturnType<typeof getAccessMethodEffectiveSettings>;
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
      isEnabled: input.accessMethodSettings.authEmailCodeEnabled,
      availability: emailDependentAvailability,
      source: input.accessMethodSettings.source,
      requirement: input.emailConfigured
        ? "SMTP is configured, so rollout can be wired on top of the current auth stack."
        : "Requires working SMTP delivery before it can be turned into a real sign-in method.",
    },
    {
      key: "MAGIC_LINK" as const,
      label: "Magic link",
      description: "Email-link based access for users who do not want a password.",
      isEnabled: input.accessMethodSettings.authMagicLinkEnabled,
      availability: emailDependentAvailability,
      source: input.accessMethodSettings.source,
      requirement: input.emailConfigured
        ? "SMTP is configured, so link delivery can be added without changing the domain model."
        : "Requires working SMTP delivery before link-based access is viable.",
    },
    {
      key: "PASSKEY" as const,
      label: "Passkeys",
      description: "Best future option for passwordless access on modern browsers and devices.",
      isEnabled: input.accessMethodSettings.authPasskeyEnabled,
      availability: "config-only" as const,
      source: input.accessMethodSettings.source,
      requirement:
        "Requires HTTPS, RP configuration and explicit Better Auth passkey wiring before rollout.",
    },
    {
      key: "TWO_FACTOR" as const,
      label: "Two-factor authentication",
      description: "Additional step for protecting sensitive or admin accounts.",
      isEnabled: input.accessMethodSettings.authTwoFactorEnabled,
      availability: emailDependentAvailability,
      source: input.accessMethodSettings.source,
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
      tmdbLanguage: env.TMDB_LANGUAGE || DEFAULT_TMDB_LANGUAGE,
      smtpPort: env.SMTP_PORT,
      smtpSecure: env.SMTP_SECURE,
      authEmailPasswordEnabled: true,
      authEmailCodeEnabled: env.AUTH_EMAIL_CODE_ENABLED,
      authMagicLinkEnabled: env.AUTH_MAGIC_LINK_ENABLED,
      authPasskeyEnabled: env.AUTH_PASSKEY_ENABLED,
      authTwoFactorEnabled: env.AUTH_TWO_FACTOR_ENABLED,
      pushNotificationsEnabled: env.PUSH_NOTIFICATIONS_ENABLED,
    },
  });
}

export async function getSystemConfig() {
  return ensureSystemConfigSeeded();
}

export async function getTmdbRuntimeConfig() {
  const config = await getSystemConfig();

  const databaseApiToken = normalizeOptionalString(config.tmdbApiToken);
  const databaseApiKey = normalizeOptionalString(config.tmdbApiKey);
  const databaseLanguage = normalizeOptionalString(config.tmdbLanguage) ?? DEFAULT_TMDB_LANGUAGE;
  const usesEnvironmentFallback =
    !databaseApiToken &&
    !databaseApiKey &&
    databaseLanguage === DEFAULT_TMDB_LANGUAGE &&
    Boolean(env.TMDB_API_TOKEN || env.TMDB_API_KEY || env.TMDB_LANGUAGE);
  const apiToken = databaseApiToken ?? env.TMDB_API_TOKEN;
  const apiKey = databaseApiKey ?? env.TMDB_API_KEY;
  const language = usesEnvironmentFallback ? env.TMDB_LANGUAGE || DEFAULT_TMDB_LANGUAGE : databaseLanguage;
  const source: ConfigSource =
    databaseApiToken || databaseApiKey || !usesEnvironmentFallback
      ? databaseApiToken || databaseApiKey || databaseLanguage !== DEFAULT_TMDB_LANGUAGE
        ? "database"
        : apiToken || apiKey || language
          ? "environment"
          : "missing"
      : apiToken || apiKey || language
        ? "environment"
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

  const databaseHost = normalizeOptionalString(config.smtpHost);
  const databaseUser = normalizeOptionalString(config.smtpUser);
  const databasePassword = normalizeOptionalString(config.smtpPassword);
  const databaseFrom = normalizeOptionalString(config.smtpFrom);
  const usesEnvironmentFallback =
    !databaseHost &&
    !databaseUser &&
    !databasePassword &&
    !databaseFrom &&
    config.smtpPort === DEFAULT_SMTP_PORT &&
    config.smtpSecure === false;
  const host = databaseHost ?? env.SMTP_HOST;
  const port = usesEnvironmentFallback ? env.SMTP_PORT : config.smtpPort || env.SMTP_PORT;
  const secure = usesEnvironmentFallback
    ? env.SMTP_SECURE || port === 465
    : config.smtpSecure || port === 465;
  const user = databaseUser ?? env.SMTP_USER;
  const password = databasePassword ?? env.SMTP_PASSWORD;
  const from = databaseFrom ?? env.SMTP_FROM;
  const source: ConfigSource =
    host || user || password || from || port || secure
      ? usesEnvironmentFallback
        ? "environment"
        : databaseHost ||
            databaseUser ||
            databasePassword ||
            databaseFrom ||
            config.smtpPort !== DEFAULT_SMTP_PORT ||
            config.smtpSecure
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
  const accessMethodSettings = getAccessMethodEffectiveSettings(config);

  return {
    config,
    tmdb,
    email,
    storage,
    accessMethodSettings,
    accessMethods: buildAccessMethodsAdminState({
      accessMethodSettings,
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
