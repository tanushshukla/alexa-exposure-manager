import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    allowedHosts: ["dev-staging.tail5de98.ts.net"],
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/alexa-exposure-manager-panel.ts"),
      formats: ["es"],
      fileName: () => "entrypoint.js",
    },
    outDir: "custom_components/alexa_exposure_manager/frontend",
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
  },
});
