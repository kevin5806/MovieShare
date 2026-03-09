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
      label: "vixsrc",
      notes:
        "Provider slot scaffolded for future work. Playback integration remains intentionally disabled until a compliant provider adapter is configured.",
    },
    create: {
      provider: StreamingProviderKey.VIXSRC,
      label: "vixsrc",
      isEnabled: false,
      isActive: false,
      notes:
        "Provider slot scaffolded for future work. Playback integration remains intentionally disabled until a compliant provider adapter is configured.",
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
