import { StreamingProviderKey } from "@/generated/prisma/client";
import { db } from "@/server/db";
import vixsrc from "@/server/services/streaming/providers/vixsrc";  // ← cambiato nome import per coerenza

const providers = {
  [StreamingProviderKey.VIXSRC]: vixsrc,
};

function getProviderAdapter(provider: StreamingProviderKey) {
  return providers[provider];
}

export async function ensureStreamingProviderConfigSeeded() {
  await db.streamingProviderConfig.upsert({
    where: {
      provider: StreamingProviderKey.VIXSRC,
    },
    update: {},  // non aggiorna nulla se già esiste → così puoi modificare manualmente via admin
    create: {
      provider: StreamingProviderKey.VIXSRC,
      label: "VixSrc",
      isEnabled: false,   // ← default disabilitato fino a review
      isActive: false,    // ← default non attivo
      notes:
        "Provider embed-based deployment-specific. Genera URL tipo https://vixsrc.to/movie/{tmdbId} " +
        "o /tv/{tmdbId}/{s}/{e}. Richiede env var VIXSRC_BASE_URL (es. https://vixsrc.to). " +
        "Maturity: deployment-specific | Compliance: deployment-review. " +
        "Abilita solo se hai verificato legalità e stabilità della sorgente per il tuo deployment.",
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
      // Disattiva tutti gli altri provider attivi (solo uno alla volta)
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
  const adapter = getProviderAdapter(input.provider);
  if (!adapter) {
    throw new Error(`Provider adapter non trovato per ${input.provider}`);
  }
  return adapter.getPlaybackSource(input);
}