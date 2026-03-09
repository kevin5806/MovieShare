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
  updateStreamingProviderConfig,
} from "@/server/services/streaming";

describe("streaming service", () => {
  beforeEach(() => {
    mocks.db.streamingProviderConfig.upsert.mockResolvedValue({});
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
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
          key: StreamingProviderKey.VIXSRC,
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
});
