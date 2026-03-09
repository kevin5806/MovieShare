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
  getActiveStreamingProviderConfig,
  getStreamingAdminState,
  resolvePlaybackSource,
  updateStreamingProviderConfig,
} from "@/server/services/streaming";
import { vixsrcProvider } from "@/server/services/streaming/providers/vixsrc";

describe("streaming service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.streamingProviderConfig.upsert.mockResolvedValue({});
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
  });

  it("keeps the vixsrc adapter marked as a placeholder", () => {
    expect(vixsrcProvider).toMatchObject({
      key: StreamingProviderKey.VIXSRC,
      isReady: false,
      maturity: "placeholder",
      compliance: "do-not-enable",
    });
  });

  it("does not expose placeholder adapters as the active provider", async () => {
    mocks.db.streamingProviderConfig.findMany.mockResolvedValue([
      {
        id: "provider-1",
        provider: StreamingProviderKey.VIXSRC,
        label: "vixsrc",
        isEnabled: true,
        isActive: true,
      },
    ]);

    await expect(getStreamingAdminState()).resolves.toMatchObject({
      activeConfig: null,
      providers: [
        expect.objectContaining({
          compliance: "do-not-enable",
          key: StreamingProviderKey.VIXSRC,
          maturity: "placeholder",
          isReady: false,
        }),
      ],
    });
  });

  it("keeps placeholder adapters disabled for playback even if marked active in the form", async () => {
    await updateStreamingProviderConfig({
      provider: StreamingProviderKey.VIXSRC,
      isEnabled: true,
      isActive: true,
    });

    expect(mocks.tx.streamingProviderConfig.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.streamingProviderConfig.update).toHaveBeenCalledWith({
      where: {
        provider: StreamingProviderKey.VIXSRC,
      },
      data: {
        isEnabled: true,
        isActive: false,
      },
    });
  });

  it("returns null when the stored active config points to a placeholder provider", async () => {
    mocks.db.streamingProviderConfig.findFirst.mockResolvedValue({
      id: "provider-1",
      provider: StreamingProviderKey.VIXSRC,
      label: "vixsrc",
      isEnabled: true,
      isActive: true,
    });

    await expect(getActiveStreamingProviderConfig()).resolves.toBeNull();
  });

  it("returns unavailable playback while the provider stays scaffold-only", async () => {
    await expect(
      resolvePlaybackSource({
        provider: StreamingProviderKey.VIXSRC,
        tmdbId: 27205,
        watchSessionId: "session-1",
      }),
    ).resolves.toMatchObject({
      kind: "unavailable",
      message: expect.stringContaining("placeholder"),
    });
  });
});
