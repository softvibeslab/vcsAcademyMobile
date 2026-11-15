import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.VCSA_PILOT_API_URL || "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        pilot: resolve(root, "pilot.html"),
      },
    },
  },
});
