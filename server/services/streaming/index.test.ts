import { beforeEach, describe, expect, it, vi } from "vitest";

import { StreamingProviderKey } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    streamingProviderConfig: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    streamingProviderConfig: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
  env: {
    VIXSRC_BASE_URL: "",
    VIXSRC_LANG: "it",
    PLEX_WATCH_URL_TEMPLATE: "",
    STREAMING_VIXSRC_ENABLED: false,
    STREAMING_PLEX_ENABLED: false,
    STREAMING_ACTIVE_PROVIDER: null as StreamingProviderKey | null,
  },
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
}));

vi.mock("@/server/env", () => ({
  env: mocks.env,
}));

import {
  getStreamingAdminState,
  resolvePlaybackSource,
  updateStreamingProviderConfig,
} from "@/server/services/streaming";
import vixsrcProvider from "@/server/services/streaming/providers/vixsrc";

describe("streaming service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.streamingProviderConfig.upsert.mockResolvedValue({});
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.env.VIXSRC_BASE_URL = "";
    mocks.env.VIXSRC_LANG = "it";
    mocks.env.PLEX_WATCH_URL_TEMPLATE = "";
    mocks.env.STREAMING_VIXSRC_ENABLED = false;
    mocks.env.STREAMING_PLEX_ENABLED = false;
    mocks.env.STREAMING_ACTIVE_PROVIDER = null;
    delete process.env.PLEX_WATCH_URL_TEMPLATE;
  });

  it("keeps VixSrc available as a ready deployment-specific provider", () => {
    expect(vixsrcProvider.isReady).toBe(true);
    expect(vixsrcProvider.maturity).toBe("deployment-specific");
    expect(vixsrcProvider.compliance).toBe("deployment-review");
  });

  it("returns both configured provider slots in the admin catalog", async () => {
    mocks.db.streamingProviderConfig.findMany.mockResolvedValue([
      {
        id: "vixsrc-1",
        provider: StreamingProviderKey.VIXSRC,
        label: "VixSrc",
        isEnabled: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "plex-1",
        provider: StreamingProviderKey.PLEX,
        label: "Plex",
        isEnabled: false,
        isActive: false,
        createdAt: new Date(),
      },
    ]);

    const state = await getStreamingAdminState();

    expect(mocks.db.streamingProviderConfig.upsert).toHaveBeenCalledTimes(2);
    expect(state.activeConfig?.provider).toBe(StreamingProviderKey.VIXSRC);
    expect(state.providers).toContainEqual(
      expect.objectContaining({
        id: StreamingProviderKey.VIXSRC,
        isReady: true,
      }),
    );
    expect(state.providers).toContainEqual(
      expect.objectContaining({
        id: StreamingProviderKey.PLEX,
      }),
    );
  });

  it("resolves a VixSrc playback URL when the runtime env is configured", async () => {
    mocks.env.VIXSRC_BASE_URL = "https://vixsrc.to";

    const result = await resolvePlaybackSource({
      provider: StreamingProviderKey.VIXSRC,
      tmdbId: 27205,
      watchSessionId: "test-session",
    });

    expect(result.kind).toBe("embed");

    if (result.kind !== "embed") {
      throw new Error("Expected an embed playback source.");
    }

    expect(result.url).toMatch(/https:\/\/vixsrc\.to\/movie\/27205/);
    expect(result.url).toContain("?lang=");
  });

  it("resolves a Plex playback URL from the configured template", async () => {
    process.env.PLEX_WATCH_URL_TEMPLATE =
      "https://plex.example.com/watch/{tmdbId}?session={watchSessionId}";

    const result = await resolvePlaybackSource({
      provider: StreamingProviderKey.PLEX,
      tmdbId: 603,
      watchSessionId: "session-42",
    });

    expect(result).toEqual({
      kind: "embed",
      url: "https://plex.example.com/watch/603?session=session-42",
      message:
        "Playback URL resolved from the configured Plex watch template for this deployment.",
    });
  });

  it("keeps Plex inactive until its runtime template is configured", async () => {
    await updateStreamingProviderConfig({
      provider: StreamingProviderKey.PLEX,
      isEnabled: true,
      isActive: true,
    });

    expect(mocks.tx.streamingProviderConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isEnabled: true,
          isActive: false,
        },
      }),
    );
  });

  it("uses environment defaults for untouched provider slot records", async () => {
    mocks.env.STREAMING_VIXSRC_ENABLED = true;
    mocks.env.STREAMING_ACTIVE_PROVIDER = StreamingProviderKey.VIXSRC;
    mocks.db.streamingProviderConfig.findMany.mockResolvedValue([
      {
        id: "vixsrc-1",
        provider: StreamingProviderKey.VIXSRC,
        label: "VixSrc",
        isEnabled: false,
        isActive: false,
        createdAt: new Date("2026-03-10T10:00:00.000Z"),
        updatedAt: new Date("2026-03-10T10:00:00.000Z"),
      },
      {
        id: "plex-1",
        provider: StreamingProviderKey.PLEX,
        label: "Plex",
        isEnabled: false,
        isActive: false,
        createdAt: new Date("2026-03-10T10:00:00.000Z"),
        updatedAt: new Date("2026-03-10T10:00:00.000Z"),
      },
    ]);

    const state = await getStreamingAdminState();

    expect(state.configs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: StreamingProviderKey.VIXSRC,
          isEnabled: true,
          isActive: true,
          source: "environment",
        }),
      ]),
    );
    expect(state.activeConfig).toEqual(
      expect.objectContaining({
        provider: StreamingProviderKey.VIXSRC,
        source: "environment",
      }),
    );
  });
});
