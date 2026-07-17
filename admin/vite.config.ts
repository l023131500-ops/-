import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Admin is served under /admin (basePath from packages/config convention).
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
});
