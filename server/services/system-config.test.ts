import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    systemConfig: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/movieshare?schema=public",
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret-with-enough-length",
    TMDB_API_TOKEN: "env-token",
    TMDB_API_KEY: "env-api-key",
    TMDB_LANGUAGE: "it-IT",
    SEED_ADMIN_EMAIL: "admin@movieshare.local",
    SEED_ADMIN_NAME: "movieshare admin",
    SMTP_HOST: "smtp.env.local",
    SMTP_PORT: 465,
    SMTP_SECURE: true,
    SMTP_USER: "env-user",
    SMTP_PASSWORD: "env-password",
    SMTP_FROM: "movieshare <env@example.com>",
    AUTH_EMAIL_CODE_ENABLED: true,
    AUTH_MAGIC_LINK_ENABLED: false,
    AUTH_PASSKEY_ENABLED: true,
    AUTH_TWO_FACTOR_ENABLED: false,
    STORAGE_ENDPOINT: "http://minio:9000",
    STORAGE_PUBLIC_BASE_URL: "http://localhost:8080/media/movieshare-media",
    STORAGE_BUCKET: "movieshare-media",
    STORAGE_REGION: "us-east-1",
    STORAGE_ACCESS_KEY: "movieshare",
    STORAGE_SECRET_KEY: "movieshare-secret",
    STORAGE_FORCE_PATH_STYLE: true,
    STREAMING_VIXSRC_ENABLED: false,
    STREAMING_PLEX_ENABLED: false,
    STREAMING_ACTIVE_PROVIDER: null,
  },
  getStreamingAdminState: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
}));

vi.mock("@/server/env", () => ({
  env: mocks.env,
}));

vi.mock("@/server/services/streaming", () => ({
  getStreamingAdminState: mocks.getStreamingAdminState,
}));

import {
  getEmailRuntimeConfig,
  getSystemAdminState,
  getTmdbRuntimeConfig,
} from "@/server/services/system-config";

describe("system-config service", () => {
  beforeEach(() => {
    mocks.getStreamingAdminState.mockResolvedValue({
      configs: [],
      activeConfig: null,
      providers: [],
    });
  });

  it("prefers TMDB credentials stored in the database", async () => {
    mocks.db.systemConfig.upsert.mockResolvedValue({
      tmdbApiToken: "  db-token  ",
      tmdbApiKey: "",
      tmdbLanguage: "  it-IT  ",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      updatedAt: new Date("2026-03-10T10:05:00.000Z"),
    });

    await expect(getTmdbRuntimeConfig()).resolves.toMatchObject({
      apiToken: "db-token",
      apiKey: "env-api-key",
      language: "it-IT",
      source: "database",
      authMode: "api-read-token",
    });
  });

  it("falls back to environment email settings and infers secure SMTP for port 465", async () => {
    mocks.db.systemConfig.upsert.mockResolvedValue({
      smtpHost: " ",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: null,
      smtpPassword: "",
      smtpFrom: null,
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      updatedAt: new Date("2026-03-10T10:00:00.000Z"),
    });

    await expect(getEmailRuntimeConfig()).resolves.toMatchObject({
      host: "smtp.env.local",
      port: 465,
      secure: true,
      from: "movieshare <env@example.com>",
      source: "environment",
      isConfigured: true,
    });
  });

  it("builds the admin state from composed runtime sources", async () => {
    mocks.db.systemConfig.upsert.mockResolvedValue({
      tmdbApiToken: null,
      tmdbApiKey: null,
      tmdbLanguage: "en-US",
      smtpHost: null,
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: null,
      smtpPassword: null,
      smtpFrom: null,
      authEmailPasswordEnabled: true,
      authEmailCodeEnabled: true,
      authMagicLinkEnabled: false,
      authPasskeyEnabled: false,
      authTwoFactorEnabled: true,
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      updatedAt: new Date("2026-03-10T10:05:00.000Z"),
    });

    await expect(getSystemAdminState()).resolves.toMatchObject({
      authBaseUrl: "http://localhost:3000",
      storage: {
        isConfigured: true,
        source: "environment",
      },
      accessMethods: expect.arrayContaining([
        expect.objectContaining({
          key: "EMAIL_PASSWORD",
          availability: "live",
          isEnabled: true,
        }),
        expect.objectContaining({
          key: "EMAIL_CODE",
          availability: "live",
          isEnabled: true,
        }),
        expect.objectContaining({
          key: "TWO_FACTOR",
          availability: "live",
          isEnabled: true,
        }),
      ]),
      accessMethodSettings: {
        authEmailCodeEnabled: true,
        authMagicLinkEnabled: false,
        authPasskeyEnabled: false,
        authTwoFactorEnabled: true,
        source: "database",
      },
      streaming: {
        configs: [],
        activeConfig: null,
      },
    });
  });

  it("uses environment bootstrap values for access methods on a pristine config row", async () => {
    mocks.db.systemConfig.upsert.mockResolvedValue({
      tmdbApiToken: null,
      tmdbApiKey: null,
      tmdbLanguage: "en-US",
      smtpHost: null,
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: null,
      smtpPassword: null,
      smtpFrom: null,
      authEmailPasswordEnabled: true,
      authEmailCodeEnabled: false,
      authMagicLinkEnabled: false,
      authPasskeyEnabled: false,
      authTwoFactorEnabled: false,
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      updatedAt: new Date("2026-03-10T10:00:00.000Z"),
    });

    await expect(getSystemAdminState()).resolves.toMatchObject({
      accessMethodSettings: {
        authEmailCodeEnabled: true,
        authMagicLinkEnabled: false,
        authPasskeyEnabled: true,
        authTwoFactorEnabled: false,
        source: "environment",
      },
      accessMethods: expect.arrayContaining([
        expect.objectContaining({
          key: "EMAIL_CODE",
          isEnabled: true,
          source: "environment",
        }),
        expect.objectContaining({
          key: "PASSKEY",
          isEnabled: true,
          source: "environment",
        }),
      ]),
    });
  });
});
