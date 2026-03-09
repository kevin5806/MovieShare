import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["features/**/*.ts", "lib/**/*.ts", "server/**/*.ts"],
      exclude: ["**/*.d.ts", "generated/**", "tests/**"],
    },
  },
});
