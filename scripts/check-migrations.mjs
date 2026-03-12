import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!databaseUrl || !shadowDatabaseUrl) {
  console.error("DATABASE_URL and SHADOW_DATABASE_URL are required for db:check-migrations.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code",
  ],
  {
    env: process.env,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
