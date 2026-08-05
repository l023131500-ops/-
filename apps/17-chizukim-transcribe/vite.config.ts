import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // ⚠️ The default is the real mount, not "./".
  //
  // The note that used to sit here had the diagnosis exactly right: served
  // under /chizukim with no trailing slash, relative asset URLs resolve against
  // the site root and 404. It then left the fix to whoever remembered to set
  // VITE_BASE — and a build that is only correct when someone remembers a
  // variable is the same defect that took kupot down and forced zchuyot and
  // egod to be rebuilt by hand today.
  //
  // The portal rewrites /chizukim/ to chizukim2-more30, so that is the default.
  // VITE_BASE still overrides it for preview at another path.
  base: process.env.VITE_BASE || "/chizukim/",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
