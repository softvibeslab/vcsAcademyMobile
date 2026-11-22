import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import baseConfig from "./vite.config.js";

// A separate artifact keeps legacy V1 deployments independent from the private pilot.
export default defineConfig({
  ...baseConfig,
  build: {
    outDir: "dist-v1",
    rollupOptions: {
      input: { pilot: fileURLToPath(new URL("./v1.html", import.meta.url)) },
    },
  },
});
