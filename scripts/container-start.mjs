import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import pg from "pg";

const { Client } = pg;
const MIGRATIONS_DIR = "prisma/migrations";
const PRISMA_SCHEMA_ARG = "--schema=prisma/schema.prisma";
const BASELINE_MIGRATION_NAME = "202603120001_initial_schema";
const LEGACY_CORE_TABLES = [
  "Account",
  "Movie",
  "MovieList",
  "MovieListItem",
  "Session",
  "StreamingProviderConfig",
  "SystemConfig",
  "User",
  "Verification",
];

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

function runPrismaCommand(args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args, PRISMA_SCHEMA_ARG],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function runPrismaMigrateDeploy() {
  runPrismaCommand(["migrate", "deploy"]);
}

function markBaselineMigrationApplied() {
  runPrismaCommand(["migrate", "resolve", "--applied", BASELINE_MIGRATION_NAME]);
}

function markMigrationApplied(migrationName) {
  runPrismaCommand(["migrate", "resolve", "--applied", migrationName]);
}

function getMigrationNames() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function applyLegacyPendingMigrations() {
  const migrationNames = getMigrationNames().filter(
    (migrationName) => migrationName !== BASELINE_MIGRATION_NAME,
  );

  if (migrationNames.length === 0) {
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    for (const migrationName of migrationNames) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationName, "migration.sql");

      if (!existsSync(migrationPath)) {
        throw new Error(`Missing migration file: ${migrationPath}`);
      }

      console.log(`Applying legacy migration ${migrationName} directly from SQL.`);
      await client.query(readFileSync(migrationPath, "utf8"));
      markMigrationApplied(migrationName);
    }
  } finally {
    await client.end();
  }
}

async function inspectDatabaseState() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const {
      rows: [stateRow],
    } = await client.query(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = '_prisma_migrations'
          ) AS "hasMigrationTable",
          COUNT(*)::int AS "appTableCount"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name <> '_prisma_migrations'
      `,
    );

    const { rows } = await client.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = ANY($1::text[])
      `,
      [LEGACY_CORE_TABLES],
    );

    const foundCoreTables = new Set(rows.map((row) => row.table_name));
    const missingLegacyTables = LEGACY_CORE_TABLES.filter((tableName) => !foundCoreTables.has(tableName));

    return {
      hasMigrationTable: stateRow.hasMigrationTable,
      hasAppTables: stateRow.appTableCount > 0,
      missingLegacyTables,
    };
  } finally {
    await client.end();
  }
}

async function prepareDatabaseMigrations() {
  const state = await inspectDatabaseState();

  if (state.hasMigrationTable || !state.hasAppTables) {
    return false;
  }

  if (state.missingLegacyTables.length > 0) {
    throw new Error(
      `Existing tables were detected without Prisma migration history, but the schema does not match the known legacy db-push layout. Missing core tables: ${state.missingLegacyTables.join(", ")}.`,
    );
  }

  // Older installs were advanced with `prisma db push`, so bridge them into migration history once.
  console.log(
    `Existing legacy schema detected without Prisma migration history. Marking ${BASELINE_MIGRATION_NAME} as already applied before running migrations.`,
  );
  markBaselineMigrationApplied();
  await applyLegacyPendingMigrations();
  return true;
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
  await prepareDatabaseMigrations();
  runPrismaMigrateDeploy();
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
