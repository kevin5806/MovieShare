import { StreamingProviderKey } from "@/generated/prisma/client";

// Tipi di maturità e compliance (già ok)
export type StreamingProviderMaturity = "placeholder" | "deployment-specific";

export type StreamingProviderCompliance = "do-not-enable" | "deployment-review";

// Tipo di ritorno di getPlaybackSource (già ok)
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

// Tipo per l'input di getPlaybackSource (era mancante)
export type getPlaybackSourceParams = {
  tmdbId: number;
  watchSessionId: string;
};

// Tipo per il provider vero e proprio (era mancante, lo chiamiamo StreamingProvider)
export interface StreamingProvider {
  id: StreamingProviderKey;           // o key: StreamingProviderKey se preferisci coerenza
  name: string;
  description: string;
  isReady: boolean;
  maturity: StreamingProviderMaturity;
  compliance: StreamingProviderCompliance;
  readinessNote?: string;
  complianceNote?: string;

  // Metodo principale
  getPlaybackSource(params: getPlaybackSourceParams): Promise<PlaybackSource>;
}

// Opzionale: se usi StreamingProviderAdapter altrove, puoi tenerlo o rimuoverlo
// (nel tuo codice attuale sembra ridondante rispetto a StreamingProvider)
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