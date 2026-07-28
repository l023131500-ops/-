import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Base path follows the more30 monorepo convention (app #16 → /16/), but keep
// "/" in dev so local preview works without a proxy. Override with BASE_PATH.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into cacheable chunks.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          hebcal: ["@hebcal/core"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
