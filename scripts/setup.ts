import { randomBytes } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");
  const envExamplePath = path.join(rootDir, ".env.example");

  try {
    await access(envPath);
    console.log(".env already exists. Review it manually if you want to rotate secrets.");
    return;
  } catch {
    // `.env` does not exist yet. Continue with bootstrap.
  }

  const example = await readFile(envExamplePath, "utf8");
  const secret = randomBytes(32).toString("hex");
  const envFile = example.replace(
    "change-this-to-a-random-32-char-secret",
    secret,
  );

  await writeFile(envPath, envFile, "utf8");

  console.log("Created .env from .env.example.");
  console.log("BETTER_AUTH_SECRET has been generated automatically.");
  console.log("Next steps:");
  console.log("1. docker compose up -d postgres");
  console.log("2. npm run db:push");
  console.log("3. npm run db:seed");
  console.log("4. npm run dev");
}

void main().catch((error) => {
  console.error("setup failed", error);
  process.exitCode = 1;
});
