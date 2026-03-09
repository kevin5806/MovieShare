import { readFile } from "node:fs/promises";
import path from "node:path";

import packageJson from "@/package.json";

function normalizeBuildCounter(buildId: string) {
  if (buildId.startsWith("movieshare-")) {
    return buildId.replace("movieshare-", "");
  }

  return buildId.slice(0, 14);
}

export async function getApplicationVersion() {
  let buildId = "dev";

  try {
    buildId = (await readFile(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8")).trim();
  } catch {
    buildId = "dev";
  }

  const buildCounter = normalizeBuildCounter(buildId);

  return {
    version: packageJson.version,
    buildId,
    buildCounter,
    label: `v${packageJson.version} | build ${buildCounter}`,
  };
}
