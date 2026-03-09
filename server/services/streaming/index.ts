import { StreamingProviderKey } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { vixsrcProvider } from "@/server/services/streaming/providers/vixsrc";

const providers = {
  [StreamingProviderKey.VIXSRC]: vixsrcProvider,
};

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
        "In futuro sara possibile aggiungere ulteriori provider di streaming configurabili.",
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
    activeConfig: configs.find((config) => config.isActive),
    providers: Object.values(providers),
  };
}

export async function updateStreamingProviderConfig(input: {
  provider: StreamingProviderKey;
  isEnabled: boolean;
  isActive: boolean;
}) {
  await ensureStreamingProviderConfigSeeded();

  await db.$transaction(async (tx) => {
    if (input.isActive) {
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
        isActive: input.isEnabled ? input.isActive : false,
      },
    });
  });
}

export async function getActiveStreamingProviderConfig() {
  await ensureStreamingProviderConfigSeeded();

  return db.streamingProviderConfig.findFirst({
    where: {
      isEnabled: true,
      isActive: true,
    },
  });
}

export async function resolvePlaybackSource(input: {
  provider: StreamingProviderKey;
  tmdbId: number;
  watchSessionId: string;
}) {
  return providers[input.provider].getPlaybackSource(input);
}
