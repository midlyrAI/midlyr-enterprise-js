import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sdkSourceEntry = fileURLToPath(new URL("../sdk-js/src/index.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@midlyr/sdk-js": sdkSourceEntry,
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    passWithNoTests: false,
  },
});
