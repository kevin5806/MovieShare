import { StreamingProviderKey } from "@/generated/prisma/client";

export type PlaybackSource =
  | {
      kind: "embed";
      url: string;
      message?: string;
    }
  | {
      kind: "unavailable";
      message: string;
    };

export interface StreamingProviderAdapter {
  key: StreamingProviderKey;
  label: string;
  supportsGroupSessions: boolean;
  supportsRealtimeSync: boolean;
  getPlaybackSource(input: {
    tmdbId: number;
    watchSessionId: string;
  }): Promise<PlaybackSource>;
}
