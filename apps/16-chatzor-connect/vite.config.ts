import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// ⚠️ The default is the mount this site is actually served from, not "/".
// It used to default to "/", so a plain build emitted root-relative asset
// paths that 404 the moment they are served under /chatzor/ — the same trap
// that took kupot down and forced zchuyot and egod to be rebuilt by hand with
// a --base flag. BASE_PATH still overrides it for local preview.
const base = process.env.BASE_PATH ?? "/chatzor/";

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
