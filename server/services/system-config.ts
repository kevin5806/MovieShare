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

type AccessMethodSettings = ReturnType<typeof getAccessMethodEffectiveSettings>;

function isLocalAuthOrigin(url: string) {
  const { hostname } = new URL(url);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function canUsePasskeys(authBaseUrl: string) {
  const parsed = new URL(authBaseUrl);

  return parsed.protocol === "https:" || isLocalAuthOrigin(authBaseUrl);
}

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
  accessMethodSettings: AccessMethodSettings;
  emailConfigured: boolean;
  authBaseUrl: string;
}) {
  const passkeysSupported = canUsePasskeys(input.authBaseUrl);
  const emailCodeAvailability: AccessMethodAvailability = input.accessMethodSettings.authEmailCodeEnabled
    ? input.emailConfigured
      ? "live"
      : "blocked"
    : "config-only";
  const magicLinkAvailability: AccessMethodAvailability = input.accessMethodSettings.authMagicLinkEnabled
    ? input.emailConfigured
      ? "live"
      : "blocked"
    : "config-only";
  const passkeyAvailability: AccessMethodAvailability = input.accessMethodSettings.authPasskeyEnabled
    ? passkeysSupported
      ? "live"
      : "blocked"
    : "config-only";
  const twoFactorAvailability: AccessMethodAvailability = input.accessMethodSettings.authTwoFactorEnabled
    ? "live"
    : "config-only";

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
      description: "A quick sign-in code sent to the user email address.",
      isEnabled: input.accessMethodSettings.authEmailCodeEnabled,
      availability: emailCodeAvailability,
      source: input.accessMethodSettings.source,
      requirement:
        emailCodeAvailability === "live"
          ? "Live now. Users can request a one-time code from the login page."
          : input.emailConfigured
            ? "SMTP is ready. Turn this on to expose one-time codes on the login page."
            : "Requires working SMTP delivery before it can be exposed.",
    },
    {
      key: "MAGIC_LINK" as const,
      label: "Magic link",
      description: "A sign-in link sent by email for people who prefer to skip passwords.",
      isEnabled: input.accessMethodSettings.authMagicLinkEnabled,
      availability: magicLinkAvailability,
      source: input.accessMethodSettings.source,
      requirement:
        magicLinkAvailability === "live"
          ? "Live now. Users can request a sign-in link directly from the login page."
          : input.emailConfigured
            ? "SMTP is ready. Turn this on to expose magic links on the login page."
            : "Requires working SMTP delivery before link-based sign-in is viable.",
    },
    {
      key: "PASSKEY" as const,
      label: "Passkeys",
      description: "Passwordless access on supported browsers and devices.",
      isEnabled: input.accessMethodSettings.authPasskeyEnabled,
      availability: passkeyAvailability,
      source: input.accessMethodSettings.source,
      requirement:
        passkeyAvailability === "live"
          ? "Live now. Users can sign in with a saved passkey and add new ones from their profile."
          : passkeysSupported
            ? "The deployment supports passkeys. Turn this on to expose passkey sign-in and profile management."
            : "Passkeys require HTTPS or localhost, plus a stable Better Auth URL hostname.",
    },
    {
      key: "TWO_FACTOR" as const,
      label: "Two-factor authentication",
      description: "Extra protection for password-based sign-ins with an authenticator app.",
      isEnabled: input.accessMethodSettings.authTwoFactorEnabled,
      availability: twoFactorAvailability,
      source: input.accessMethodSettings.source,
      requirement:
        twoFactorAvailability === "live"
          ? "Live now. Users with a password login can enable it from their profile."
          : "Turn this on to let eligible users add authenticator-app protection from their profile.",
    },
  ];
}

async function getAuthRuntimeState() {
  const [config, email] = await Promise.all([getSystemConfig(), getEmailRuntimeConfig()]);
  const accessMethodSettings = getAccessMethodEffectiveSettings(config);
  const allMethods = buildAccessMethodsAdminState({
    accessMethodSettings,
    emailConfigured: email.isConfigured,
    authBaseUrl: env.BETTER_AUTH_URL,
  });

  return {
    allMethods,
    accessMethodSettings,
  };
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
      vapidPublicKey: env.VAPID_PUBLIC_KEY || null,
      vapidPrivateKey: env.VAPID_PRIVATE_KEY || null,
      vapidSubject: env.VAPID_SUBJECT || null,
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
      authBaseUrl: env.BETTER_AUTH_URL,
    }),
    streaming,
    authBaseUrl: env.BETTER_AUTH_URL,
  };
}

export async function getPublicAuthState() {
  const { allMethods, accessMethodSettings } = await getAuthRuntimeState();
  const methods = allMethods.filter((method) => method.key !== "TWO_FACTOR");
  const securityMethods = allMethods.filter(
    (method) => method.key === "PASSKEY" || method.key === "TWO_FACTOR",
  );

  return {
    methods,
    securityMethods,
    settings: accessMethodSettings,
    twoFactorEnabled: accessMethodSettings.authTwoFactorEnabled,
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

export async function updatePushDeliverySettings(input: {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}) {
  await ensureSystemConfigSeeded();

  await db.systemConfig.update({
    where: {
      scope: SYSTEM_CONFIG_SCOPE,
    },
    data: {
      vapidPublicKey: normalizeOptionalString(input.vapidPublicKey),
      vapidPrivateKey: normalizeOptionalString(input.vapidPrivateKey),
      vapidSubject: normalizeOptionalString(input.vapidSubject),
    },
  });
}
