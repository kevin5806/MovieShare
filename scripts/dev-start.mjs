import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function ensureDependencies(rootDir) {
  const packageLockPath = path.join(rootDir, "package-lock.json");
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const stateDir = path.join(nodeModulesDir, ".movieshare-dev");
  const lockHashPath = path.join(stateDir, "package-lock.hash");
  const lockHash = await hashFile(packageLockPath);
  const hasNodeModules = await fileExists(nodeModulesDir);
  const savedHash = (await fileExists(lockHashPath)) ? await readFile(lockHashPath, "utf8") : "";

  if (!hasNodeModules || savedHash.trim() !== lockHash) {
    console.log("Installing dependencies for the dev container...");
    run("npm", ["ci"]);
    await mkdir(stateDir, { recursive: true });
    await writeFile(lockHashPath, lockHash, "utf8");
    return true;
  }

  console.log("Dependencies already up to date.");
  return false;
}

async function ensurePrismaClient(rootDir, dependenciesChanged) {
  const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
  const generatedClientPath = path.join(rootDir, "generated", "prisma", "client.ts");
  const stateDir = path.join(rootDir, "generated", "prisma", ".movieshare-dev");
  const schemaHashPath = path.join(stateDir, "schema.hash");
  const schemaHash = await hashFile(schemaPath);
  const hasClient = await fileExists(generatedClientPath);
  const savedHash = (await fileExists(schemaHashPath)) ? await readFile(schemaHashPath, "utf8") : "";

  if (dependenciesChanged && hasClient) {
    await mkdir(stateDir, { recursive: true });
    await writeFile(schemaHashPath, schemaHash, "utf8");
    console.log("Prisma client already generated during npm ci.");
    return;
  }

  if (!hasClient || savedHash.trim() !== schemaHash) {
    console.log("Generating Prisma client for the dev container...");
    run("npm", ["run", "db:generate"]);
    await mkdir(stateDir, { recursive: true });
    await writeFile(schemaHashPath, schemaHash, "utf8");
    return;
  }

  console.log("Prisma client already up to date.");
}

function syncDatabaseIfRequested() {
  if (process.env.DEV_AUTO_DB_PUSH === "0") {
    console.log("Skipping prisma db push because DEV_AUTO_DB_PUSH=0.");
    return;
  }

  console.log("Syncing the database schema for development...");
  run("npm", ["run", "db:push"]);
}

async function main() {
  const rootDir = process.cwd();

  const dependenciesChanged = await ensureDependencies(rootDir);
  await ensurePrismaClient(rootDir, dependenciesChanged);
  syncDatabaseIfRequested();

  const devProcess = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "0.0.0.0", "--port", process.env.PORT || "3000"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  const forwardSignal = (signal) => {
    if (!devProcess.killed) {
      devProcess.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  devProcess.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  devProcess.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
