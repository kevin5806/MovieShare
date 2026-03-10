import { StreamingProviderKey } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import plexProvider from "@/server/services/streaming/providers/plex";
import vixsrcProvider from "@/server/services/streaming/providers/vixsrc";

const providers = {
  [StreamingProviderKey.VIXSRC]: vixsrcProvider,
  [StreamingProviderKey.PLEX]: plexProvider,
};

function getProviderAdapter(provider: StreamingProviderKey) {
  return providers[provider];
}

function isPristineConfig(config: { createdAt?: Date; updatedAt?: Date }) {
  if (!config.createdAt || !config.updatedAt) {
    return true;
  }

  return config.createdAt.getTime() === config.updatedAt.getTime();
}

function getProviderSeedDefaults() {
  return {
    [StreamingProviderKey.VIXSRC]: {
      label: "VixSrc",
      isEnabled: env.STREAMING_VIXSRC_ENABLED,
      isActive:
        env.STREAMING_VIXSRC_ENABLED &&
        env.STREAMING_ACTIVE_PROVIDER === StreamingProviderKey.VIXSRC,
      notes:
        "Deployment-specific embed adapter. Configure its runtime variables before enabling it in production.",
    },
    [StreamingProviderKey.PLEX]: {
      label: "Plex",
      isEnabled: env.STREAMING_PLEX_ENABLED,
      isActive:
        env.STREAMING_PLEX_ENABLED &&
        env.STREAMING_ACTIVE_PROVIDER === StreamingProviderKey.PLEX,
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
}

function getProviderEnvironmentDefaults() {
  return {
    [StreamingProviderKey.VIXSRC]: {
      isEnabled: env.STREAMING_VIXSRC_ENABLED,
      isActive:
        env.STREAMING_VIXSRC_ENABLED &&
        env.STREAMING_ACTIVE_PROVIDER === StreamingProviderKey.VIXSRC,
    },
    [StreamingProviderKey.PLEX]: {
      isEnabled: env.STREAMING_PLEX_ENABLED,
      isActive:
        env.STREAMING_PLEX_ENABLED &&
        env.STREAMING_ACTIVE_PROVIDER === StreamingProviderKey.PLEX,
    },
  } satisfies Record<
    StreamingProviderKey,
    {
      isEnabled: boolean;
      isActive: boolean;
    }
  >;
}

function getEffectiveProviderConfig<T extends {
  provider: StreamingProviderKey;
  isEnabled: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}>(config: T) {
  const envDefaults = getProviderEnvironmentDefaults()[config.provider];

  if (
    isPristineConfig(config) &&
    (envDefaults.isEnabled || envDefaults.isActive)
  ) {
    return {
      ...config,
      isEnabled: envDefaults.isEnabled,
      isActive: envDefaults.isEnabled && envDefaults.isActive,
      source: "environment" as const,
    };
  }

  return {
    ...config,
    source: "database" as const,
  };
}

export async function ensureStreamingProviderConfigSeeded() {
  const providerSeedDefaults = getProviderSeedDefaults();
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
  const effectiveConfigs = configs.map((config) => getEffectiveProviderConfig(config));

  return {
    configs: effectiveConfigs,
    activeConfig:
      effectiveConfigs.find(
        (config) => config.isActive && config.isEnabled && getProviderAdapter(config.provider)?.isReady,
      ) ??
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

  const configs = await db.streamingProviderConfig.findMany();
  const config = configs
    .map((candidate) => getEffectiveProviderConfig(candidate))
    .find((candidate) => candidate.isEnabled && candidate.isActive);

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
