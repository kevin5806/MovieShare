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
  resolvePlaybackSource,
} from "@/server/services/streaming";
import vixsrcProvider from "@/server/services/streaming/providers/vixsrc";

describe("streaming service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.streamingProviderConfig.upsert.mockResolvedValue({});
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
    vi.unstubAllEnvs();
  });

  describe("VIXSRC Provider (deployment-specific)", () => {
    it("è marked as ready dopo integrazione", () => {
      expect(vixsrcProvider.isReady).toBe(true);
      expect(vixsrcProvider.maturity).toBe("deployment-specific");
      expect(vixsrcProvider.compliance).toBe("deployment-review");
    });

    it("permette di diventare active se isReady", async () => {
      mocks.db.streamingProviderConfig.findMany.mockResolvedValue([
        {
          id: "vixsrc-1",
          provider: StreamingProviderKey.VIXSRC,
          label: "VixSrc",
          isEnabled: true,
          isActive: true,
        },
      ]);

      const state = await getStreamingAdminState();

      expect(state.activeConfig).not.toBeNull();
      expect(state.activeConfig?.provider).toBe(StreamingProviderKey.VIXSRC);
      expect(state.providers).toContainEqual(
        expect.objectContaining({
          id: "VIXSRC",
          isReady: true,
        }),
      );
    });

    it("resolvePlaybackSource ritorna embed quando env VIXSRC_BASE_URL è settata", async () => {
      vi.stubEnv("VIXSRC_BASE_URL", "https://vixsrc.to");

      const result = await resolvePlaybackSource({
        provider: StreamingProviderKey.VIXSRC,
        tmdbId: 27205,
        watchSessionId: "test-session",
      });

      expect(result.kind).toBe("embed");

      // Type narrowing: dopo questo check TS sa che result è { kind: "embed"; url: string; ... }
      if (result.kind !== "embed") {
        throw new Error("Test fallito: kind non è embed");
      }

      expect(result.url).toMatch(/https:\/\/vixsrc\.to\/movie\/27205/);
      expect(result.url).toContain("?lang=");
      expect(result.message).toContain("Embed pronto");
    });

    it("resolvePlaybackSource ritorna unavailable quando manca VIXSRC_BASE_URL", async () => {
      vi.stubEnv("VIXSRC_BASE_URL", undefined);

      const result = await resolvePlaybackSource({
        provider: StreamingProviderKey.VIXSRC,
        tmdbId: 27205,
        watchSessionId: "test-session",
      });

      expect(result.kind).toBe("unavailable");

      // Type narrowing opzionale qui (non strettamente necessario perché non accediamo a .url)
      if (result.kind !== "unavailable") {
        throw new Error("Test fallito: kind non è unavailable");
      }

      expect(result.message).toContain("Configurazione mancante");
      expect(result.message).toContain("VIXSRC_BASE_URL");
    });

    it("updateStreamingProviderConfig permette active solo se isReady", async () => {
      await updateStreamingProviderConfig({
        provider: StreamingProviderKey.VIXSRC,
        isEnabled: true,
        isActive: true,
      });

      expect(mocks.tx.streamingProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isEnabled: true,
            isActive: true,
          },
        }),
      );
    });
  });
});