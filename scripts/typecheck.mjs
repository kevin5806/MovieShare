import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureNextTypeStubs() {
  mkdirSync(".next/types", { recursive: true });
  writeFileSync(".next/types/cache-life.d.ts", "", "utf8");
  writeFileSync(".next/types/routes.js", "", "utf8");
}

run("next", ["typegen"]);
ensureNextTypeStubs();
run("tsc", ["--noEmit", "--incremental", "false", "-p", "tsconfig.typecheck.json"]);
