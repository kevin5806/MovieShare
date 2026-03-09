import { StreamingProviderKey } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { vixsrcProvider } from "@/server/services/streaming/providers/vixsrc";

const providers = {
  [StreamingProviderKey.VIXSRC]: vixsrcProvider,
};

function getProviderAdapter(provider: StreamingProviderKey) {
  return providers[provider];
}

export async function ensureStreamingProviderConfigSeeded() {
  await db.streamingProviderConfig.upsert({
    where: {
      provider: StreamingProviderKey.VIXSRC,
    },
    update: {},
    create: {
      provider: StreamingProviderKey.VIXSRC,
      label: "vixsrc",
      isEnabled: false,
      isActive: false,
      notes:
        "Placeholder provider slot only. This build does not generate an embedded playback URL.",
    },
  });
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
      configs.find((config) => config.isActive && getProviderAdapter(config.provider).isReady) ??
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
  const canBeActive = input.isEnabled && input.isActive && provider.isReady;

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

  if (!config || !getProviderAdapter(config.provider).isReady) {
    return null;
  }

  return config;
}

export async function resolvePlaybackSource(input: {
  provider: StreamingProviderKey;
  tmdbId: number;
  watchSessionId: string;
}) {
  return getProviderAdapter(input.provider).getPlaybackSource(input);
}
