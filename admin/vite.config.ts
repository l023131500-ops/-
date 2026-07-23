import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base ("./") so the build works both on a dedicated subdomain
// (admin.more30.com root) and mounted under /admin. Assets load relatively.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
