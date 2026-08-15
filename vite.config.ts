import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Katch Studio — Vite configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  build: {
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
});
