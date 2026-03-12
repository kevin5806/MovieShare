import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

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
  const commandArgs = ["node_modules/prisma/build/index.js", ...args, PRISMA_SCHEMA_ARG];
  const result = spawnSync(
    process.execPath,
    commandArgs,
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function runPrismaCommandWithResult(args, options = {}) {
  const { allowNonZeroExitCode = false, captureOutput = false, includeSchemaArg = false, input } = options;
  const commandArgs = [
    "node_modules/prisma/build/index.js",
    ...args,
    ...(includeSchemaArg ? [PRISMA_SCHEMA_ARG] : []),
  ];
  const result = spawnSync(process.execPath, commandArgs, {
    env: process.env,
    encoding: "utf8",
    input,
    stdio: captureOutput ? ["pipe", "pipe", "inherit"] : input !== undefined ? ["pipe", "inherit", "inherit"] : "inherit",
  });

  if (!allowNonZeroExitCode && result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }

  return result;
}

function runPrismaMigrateDeploy() {
  runPrismaCommand(["migrate", "deploy"]);
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

    const { rows: migrationRows } = stateRow.hasMigrationTable
      ? await client.query(`SELECT "migration_name" FROM "_prisma_migrations"`)
      : { rows: [] };

    const foundCoreTables = new Set(rows.map((row) => row.table_name));
    const missingLegacyTables = LEGACY_CORE_TABLES.filter((tableName) => !foundCoreTables.has(tableName));

    return {
      hasMigrationTable: stateRow.hasMigrationTable,
      hasAppTables: stateRow.appTableCount > 0,
      missingLegacyTables,
      appliedMigrationNames: new Set(migrationRows.map((row) => row.migration_name)),
    };
  } finally {
    await client.end();
  }
}

async function dedupeVerificationIdentifiers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const { rows } = await client.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Verification'
      `,
    );

    if (rows.length === 0) {
      return false;
    }

    const columnNames = new Set(rows.map((row) => row.column_name));

    if (!columnNames.has("identifier") || !columnNames.has("id")) {
      throw new Error(
        'The legacy "Verification" table exists but is missing the "identifier" or "id" columns needed for duplicate cleanup.',
      );
    }

    const orderByParts = [];

    if (columnNames.has("updatedAt")) {
      orderByParts.push('"updatedAt" DESC');
    }

    if (columnNames.has("createdAt")) {
      orderByParts.push('"createdAt" DESC');
    }

    orderByParts.push('"id" DESC');

    await client.query(
      `
        WITH ranked_verifications AS (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "identifier"
              ORDER BY ${orderByParts.join(", ")}
            ) AS row_number
          FROM "Verification"
        )
        DELETE FROM "Verification"
        WHERE "id" IN (
          SELECT "id"
          FROM ranked_verifications
          WHERE row_number > 1
        )
      `,
    );

    return true;
  } finally {
    await client.end();
  }
}

function hasSchemaDrift() {
  const result = runPrismaCommandWithResult(
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
    { allowNonZeroExitCode: true, captureOutput: true },
  );

  if (result.status === 0) {
    return false;
  }

  if (result.status === 2) {
    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }
    return true;
  }

  throw new Error(`prisma migrate diff failed with exit code ${result.status ?? "unknown"}.`);
}

function getSchemaRepairSql() {
  const result = runPrismaCommandWithResult(
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
    { captureOutput: true },
  );

  return result.stdout.trim();
}

function applySchemaRepairSql(sql, reason) {
  if (!sql.trim()) {
    return false;
  }

  console.log(`Applying schema repair SQL (${reason}).`);
  runPrismaCommandWithResult(["db", "execute", "--stdin"], { input: sql });
  return true;
}

async function repairSchemaDrift(reason) {
  if (!hasSchemaDrift()) {
    return false;
  }

  console.log(`Schema drift detected (${reason}).`);
  await dedupeVerificationIdentifiers();

  const sql = getSchemaRepairSql();
  const applied = applySchemaRepairSql(sql, reason);

  if (applied && hasSchemaDrift()) {
    throw new Error(`Schema drift still exists after repair (${reason}).`);
  }

  return applied;
}

function markAllMigrationsApplied() {
  for (const migrationName of getMigrationNames()) {
    markMigrationApplied(migrationName);
  }
}

async function prepareDatabaseMigrations() {
  const state = await inspectDatabaseState();

  if (!state.hasAppTables) {
    return false;
  }

  if (!state.hasMigrationTable) {
    if (state.missingLegacyTables.length > 0) {
      throw new Error(
        `Existing tables were detected without Prisma migration history, but the schema does not match the known legacy db-push layout. Missing core tables: ${state.missingLegacyTables.join(", ")}.`,
      );
    }

    console.log(
      `Existing legacy schema detected without Prisma migration history. Repairing schema drift and marking migrations through ${BASELINE_MIGRATION_NAME}.`,
    );
    await repairSchemaDrift("legacy install without _prisma_migrations");
    markAllMigrationsApplied();
    return true;
  }

  const localMigrationNames = getMigrationNames();
  const hasRecordedAllLocalMigrations = localMigrationNames.every((migrationName) =>
    state.appliedMigrationNames.has(migrationName),
  );

  if (hasRecordedAllLocalMigrations) {
    await repairSchemaDrift("existing install with migration history");
  }

  return false;
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

export async function main(options = {}) {
  const { skipServer = process.env.MOVIESHARE_BOOTSTRAP_ONLY === "true" } = options;

  await waitForDatabase();
  await prepareDatabaseMigrations();
  runPrismaMigrateDeploy();
  await repairSchemaDrift("post-migrate verification");
  await seedDatabase();

  if (skipServer) {
    console.log("Bootstrap-only mode completed.");
    return;
  }

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

const isDirectExecution =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
