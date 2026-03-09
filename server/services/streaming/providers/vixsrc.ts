import { StreamingProviderKey } from "@/generated/prisma/client";
import type { StreamingProviderAdapter } from "@/server/services/streaming/types";

export const vixsrcProvider: StreamingProviderAdapter = {
  key: StreamingProviderKey.VIXSRC,
  label: "vixsrc",
  isReady: false,
  readinessNote:
    "Placeholder slot only. Keep it disabled in production until a compliant adapter is implemented.",
  supportsGroupSessions: true,
  supportsRealtimeSync: false,
  async getPlaybackSource() {
    return {
      kind: "unavailable",
      message:
        "The vixsrc slot is only a placeholder in this build. movieshare can still track watch sessions and checkpoints, but it does not embed playback from this provider.",
    };
  },
};
