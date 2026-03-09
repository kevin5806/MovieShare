import { StreamingProviderKey } from "@/generated/prisma/client";

export type StreamingProviderMaturity = "placeholder" | "deployment-specific";

export type StreamingProviderCompliance = "do-not-enable" | "deployment-review";

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
  isReady: boolean;
  maturity: StreamingProviderMaturity;
  compliance: StreamingProviderCompliance;
  readinessNote?: string;
  complianceNote: string;
  supportsGroupSessions: boolean;
  supportsRealtimeSync: boolean;
  getPlaybackSource(input: {
    tmdbId: number;
    watchSessionId: string;
  }): Promise<PlaybackSource>;
}
