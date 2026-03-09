import { StreamingProvider, getPlaybackSourceParams, PlaybackSource } from '../types';

const VIXSRC_PROVIDER: StreamingProvider = {
  id: 'VIXSRC',
  key: 'VIXSRC',
  name: 'VixSrc (Deployment-Specific)',
  label: 'VixSrc',
  description: 'Provider di streaming embed-based, configurabile via deployment. Usa TMDB ID per generare URL di playback. Supporta customizzazioni come colori e autoplay via query params.',
  isReady: true,
  maturity: 'deployment-specific',
  compliance: 'deployment-review',
  readinessNote: 'Pronto per uso se configurato con un base URL valido e conforme. Richiede review legale per il deployment.',
  complianceNote: 'Assicurati che la sorgente sia licensed e compliant con le leggi locali. Non usare per fonti non autorizzate.',
  supportsGroupSessions: true,
  supportsRealtimeSync: false,

  async getPlaybackSource(params: getPlaybackSourceParams): Promise<PlaybackSource> {
    const { tmdbId } = params; // watchSessionId non usato qui, ma disponibile se serve fetchare session data

    const baseUrl = process.env.VIXSRC_BASE_URL;
    if (!baseUrl) {
      return {
        kind: 'unavailable',
        message: 'Configurazione mancante: imposta VIXSRC_BASE_URL nelle env vars.',
      };
    }

    const playbackUrl = buildPlaybackUrl(tmdbId, baseUrl);
    if (!playbackUrl) {
      return {
        kind: 'unavailable',
        message: 'Impossibile generare URL di playback valido.',
      };
    }

    return {
      kind: 'embed',
      url: playbackUrl,
      message: 'Embed pronto; customizza via query params se necessario (es. ?lang=it).',
    };
  },
};

function buildPlaybackUrl(tmdbId: number, baseUrl: string): string | null {
  try {
    // Assumi movie per default; per TV, estendi con season/episode da session se necessario
    const path = `/movie/${tmdbId}`;
    const url = new URL(path, baseUrl);

    // Aggiungi customizzazioni opzionali (es. da env o config)
    const lang = process.env.VIXSRC_LANG || 'it';
    url.searchParams.append('lang', lang);

    // Esempi di altri params: uncomment se serve
    // url.searchParams.append('primaryColor', 'B20710');
    // url.searchParams.append('autoplay', 'false');

    return url.toString();
  } catch (error) {
    console.error('Errore in buildPlaybackUrl:', error);
    return null;
  }
}

export default VIXSRC_PROVIDER;
