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
    SEED_ADMIN_EMAIL: "admin@movieshare.local",
    SEED_ADMIN_NAME: "movieshare admin",
    SMTP_HOST: "smtp.env.local",
    SMTP_PORT: 465,
    SMTP_USER: "env-user",
    SMTP_PASSWORD: "env-password",
    SMTP_FROM: "movieshare <env@example.com>",
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
      smtpPort: 465,
      smtpSecure: false,
      smtpUser: null,
      smtpPassword: "",
      smtpFrom: null,
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
    });

    await expect(getSystemAdminState()).resolves.toMatchObject({
      authBaseUrl: "http://localhost:3000",
      streaming: {
        configs: [],
        activeConfig: null,
      },
    });
  });
});
