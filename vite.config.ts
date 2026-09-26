import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// In dev the dashboard runs on :5173 and the Worker (`wrangler dev`) on :8787.
// Proxying keeps every request same-origin, exactly like production where the
// Worker serves this build via Workers Static Assets.
const WORKER = process.env.WORKER_URL ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": WORKER,
      "/x": WORKER,
      "/catalog": WORKER,
    },
  },
  build: {
    outDir: "dist",
  },
});
