import { StreamingProviderKey } from "@/generated/prisma/client";
import { db } from "@/server/db";
import plexProvider from "@/server/services/streaming/providers/plex";
import vixsrcProvider from "@/server/services/streaming/providers/vixsrc";

const providers = {
  [StreamingProviderKey.VIXSRC]: vixsrcProvider,
  [StreamingProviderKey.PLEX]: plexProvider,
};

function getProviderAdapter(provider: StreamingProviderKey) {
  return providers[provider];
}

const providerSeedDefaults = {
  [StreamingProviderKey.VIXSRC]: {
    label: "VixSrc",
    isEnabled: false,
    isActive: false,
    notes:
      "Deployment-specific embed adapter. Configure its runtime variables before enabling it in production.",
  },
  [StreamingProviderKey.PLEX]: {
    label: "Plex",
    isEnabled: false,
    isActive: false,
    notes:
      "Deployment-specific Plex slot. Set PLEX_WATCH_URL_TEMPLATE with a {tmdbId} placeholder if you want movieshare to hand off playback URLs to Plex.",
  },
} satisfies Record<
  StreamingProviderKey,
  {
    label: string;
    isEnabled: boolean;
    isActive: boolean;
    notes: string;
  }
>;

export async function ensureStreamingProviderConfigSeeded() {
  await Promise.all(
    Object.entries(providerSeedDefaults).map(([provider, defaults]) =>
      db.streamingProviderConfig.upsert({
        where: {
          provider: provider as StreamingProviderKey,
        },
        update: {},
        create: {
          provider: provider as StreamingProviderKey,
          ...defaults,
        },
      }),
    ),
  );
}

export async function getStreamingAdminState() {
  await ensureStreamingProviderConfigSeeded();

  const configs = await db.streamingProviderConfig.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  return {
    configs,
    activeConfig:
      configs.find((config) => config.isActive && getProviderAdapter(config.provider)?.isReady) ??
      null,
    providers: Object.values(providers),
  };
}

export async function updateStreamingProviderConfig(input: {
  provider: StreamingProviderKey;
  isEnabled: boolean;
  isActive: boolean;
}) {
  await ensureStreamingProviderConfigSeeded();

  const provider = getProviderAdapter(input.provider);
  const canBeActive = input.isEnabled && input.isActive && Boolean(provider?.isReady);

  await db.$transaction(async (tx) => {
    if (canBeActive) {
      await tx.streamingProviderConfig.updateMany({
        where: {
          provider: {
            not: input.provider,
          },
        },
        data: {
          isActive: false,
        },
      });
    }

    await tx.streamingProviderConfig.update({
      where: {
        provider: input.provider,
      },
      data: {
        isEnabled: input.isEnabled,
        isActive: canBeActive,
      },
    });
  });
}

export async function getActiveStreamingProviderConfig() {
  await ensureStreamingProviderConfigSeeded();

  const config = await db.streamingProviderConfig.findFirst({
    where: {
      isEnabled: true,
      isActive: true,
    },
  });

  if (!config || !getProviderAdapter(config.provider)?.isReady) {
    return null;
  }

  return config;
}

export async function resolvePlaybackSource(input: {
  provider: StreamingProviderKey;
  tmdbId: number;
  watchSessionId: string;
}) {
  const adapter = getProviderAdapter(input.provider);

  if (!adapter) {
    throw new Error(`Provider adapter not found for ${input.provider}`);
  }

  return adapter.getPlaybackSource(input);
}
