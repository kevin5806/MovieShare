import { StreamingProviderKey } from "@/generated/prisma/client";
import type {
  PlaybackSource,
  StreamingProvider,
  getPlaybackSourceParams,
} from "@/server/services/streaming/types";

function getPlexWatchUrlTemplate() {
  return process.env.PLEX_WATCH_URL_TEMPLATE?.trim() ?? "";
}

function buildPlaybackUrl(
  params: getPlaybackSourceParams,
  template: string,
): PlaybackSource {
  if (!template) {
    return {
      kind: "unavailable",
      message:
        "Plex is configured as a provider slot, but PLEX_WATCH_URL_TEMPLATE is missing.",
    };
  }

  if (!template.includes("{tmdbId}")) {
    return {
      kind: "unavailable",
      message:
        "PLEX_WATCH_URL_TEMPLATE must include the {tmdbId} placeholder so movieshare can build a playback URL.",
    };
  }

  const url = template
    .replaceAll("{tmdbId}", String(params.tmdbId))
    .replaceAll("{watchSessionId}", params.watchSessionId);

  return {
    kind: "embed",
    url,
    message:
      "Playback URL resolved from the configured Plex watch template for this deployment.",
  };
}

const plexProvider: StreamingProvider = {
  id: StreamingProviderKey.PLEX,
  key: StreamingProviderKey.PLEX,
  name: "Plex",
  label: "Plex",
  description:
    "Configurable Plex playback slot. Supply a deployment-specific watch URL template if you want movieshare to hand off sessions to Plex.",
  get isReady() {
    const template = getPlexWatchUrlTemplate();
    return Boolean(template && template.includes("{tmdbId}"));
  },
  maturity: "deployment-specific",
  compliance: "deployment-review",
  get readinessNote() {
    return this.isReady
      ? "Ready: movieshare can build Plex playback links from the configured watch URL template."
      : "Needs runtime configuration: set PLEX_WATCH_URL_TEMPLATE with a {tmdbId} placeholder before activating Plex.";
  },
  complianceNote:
    "Review your Plex deployment, access controls, and playback path before enabling it for end users.",
  supportsGroupSessions: true,
  supportsRealtimeSync: false,
  async getPlaybackSource(params: getPlaybackSourceParams): Promise<PlaybackSource> {
    return buildPlaybackUrl(params, getPlexWatchUrlTemplate());
  },
};

export default plexProvider;
