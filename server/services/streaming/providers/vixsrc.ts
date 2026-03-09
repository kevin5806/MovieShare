import { StreamingProviderKey } from "@/generated/prisma/client";
import type { StreamingProviderAdapter } from "@/server/services/streaming/types";

export const vixsrcProvider: StreamingProviderAdapter = {
  key: StreamingProviderKey.VIXSRC,
  label: "vixsrc",
  supportsGroupSessions: true,
  supportsRealtimeSync: false,
  async getPlaybackSource() {
    return {
      kind: "unavailable",
      message:
        "The vixsrc provider slot is scaffolded, but playback remains disabled until a compliant provider adapter is configured for deployment.",
    };
  },
};
