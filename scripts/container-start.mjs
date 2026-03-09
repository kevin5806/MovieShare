import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import pg from "pg";

const { Client } = pg;

const STREAMING_NOTES =
  "Provider slot scaffolded for future work. Playback integration remains intentionally disabled until a compliant provider adapter is configured.";

async function waitForDatabase(maxAttempts = 30, delayMs = 2_000) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      console.log(`Database ready after ${attempt} attempt${attempt === 1 ? "" : "s"}.`);
      return;
    } catch (error) {
      await client.end().catch(() => undefined);

      if (attempt === maxAttempts) {
        throw error;
      }

      console.log(
        `Database not reachable yet (${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`,
      );
      await delay(delayMs);
    }
  }
}

function runPrismaDbPush() {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--schema=prisma/schema.prisma"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`prisma db push failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query(
      `
        INSERT INTO "StreamingProviderConfig"
          ("id", "provider", "label", "isEnabled", "isActive", "notes", "createdAt", "updatedAt")
        VALUES
          ($1, $2::"StreamingProviderKey", $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT ("provider")
        DO UPDATE SET
          "label" = EXCLUDED."label",
          "notes" = EXCLUDED."notes",
          "updatedAt" = NOW()
      `,
      [
        "seed-streaming-provider-vixsrc",
        "VIXSRC",
        "vixsrc",
        false,
        false,
        STREAMING_NOTES,
      ],
    );

    await client.query(
      `
        INSERT INTO "SystemConfig"
          ("id", "scope", "tmdbLanguage", "smtpPort", "smtpSecure", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("scope")
        DO NOTHING
      `,
      ["seed-system-config-default", "default", "en-US", 587, false],
    );

    if (process.env.SEED_ADMIN_EMAIL) {
      await client.query(
        `
          UPDATE "User"
          SET "role" = $1::"UserRole"
          WHERE "email" = $2
        `,
        ["ADMIN", process.env.SEED_ADMIN_EMAIL],
      );
    }

    console.log("Seed completed.");
  } finally {
    await client.end();
  }
}

async function main() {
  await waitForDatabase();
  runPrismaDbPush();
  await seedDatabase();

  const appProcess = spawn(process.execPath, ["server.js"], {
    env: process.env,
    stdio: "inherit",
  });

  const forwardSignal = (signal) => {
    if (!appProcess.killed) {
      appProcess.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  appProcess.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  appProcess.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
