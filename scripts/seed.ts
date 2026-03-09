import "dotenv/config";

import { StreamingProviderKey } from "../generated/prisma/client";
import { db } from "../server/db";
import { env } from "../server/env";

async function main() {
  await db.streamingProviderConfig.upsert({
    where: {
      provider: StreamingProviderKey.VIXSRC,
    },
    update: {
      label: "VixSrc",
      notes:
        "Provider embed-based deployment-specific. Genera URL embed diretti (es. https://vixsrc.to/movie/{tmdbId} o /tv/...). " +
        "Richiede env var VIXSRC_BASE_URL impostata (default: https://vixsrc.to). " +
        "Maturity: deployment-specific | Compliance: deployment-review obbligatoria. " +
        "Abilita solo dopo verifica legale/stabilità per il tuo deployment. Non usare per sorgenti non conformi.",
    },
    create: {
      provider: StreamingProviderKey.VIXSRC,
      label: "VixSrc",
      isEnabled: false,
      isActive: false,
      notes:
        "Provider embed-based deployment-specific. Genera URL embed diretti (es. https://vixsrc.to/movie/{tmdbId} o /tv/...). " +
        "Richiede env var VIXSRC_BASE_URL impostata (default: https://vixsrc.to). " +
        "Maturity: deployment-specific | Compliance: deployment-review obbligatoria. " +
        "Abilita solo dopo verifica legale/stabilità per il tuo deployment. Non usare per sorgenti non conformi.",
    },
  });

  await db.systemConfig.upsert({
    where: {
      scope: "default",
    },
    update: {},
    create: {
      scope: "default",
      tmdbLanguage: "en-US",
      smtpPort: 587,
      smtpSecure: false,
    },
  });

  if (env.SEED_ADMIN_EMAIL) {
    await db.user.updateMany({
      where: {
        email: env.SEED_ADMIN_EMAIL,
      },
      data: {
        role: "ADMIN",
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });