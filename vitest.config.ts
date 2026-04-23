import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sdkSourceEntry = fileURLToPath(new URL("./packages/sdk-js/src/index.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@midlyr/sdk-js": sdkSourceEntry,
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
