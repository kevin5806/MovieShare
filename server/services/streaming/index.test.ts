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
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
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
    vi.unstubAllEnvs();
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
    vi.stubEnv("VIXSRC_BASE_URL", "https://vixsrc.to");

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
    vi.stubEnv(
      "PLEX_WATCH_URL_TEMPLATE",
      "https://plex.example.com/watch/{tmdbId}?session={watchSessionId}",
    );

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
});
