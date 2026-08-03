// בונה את פונקציית ה-serverless של Vercel כקובץ ESM עצמאי (bundled),
// כדי לעקוף את מנגנון ה-file-tracing של @vercel/node שנכשל באיתור server/*.
import { build } from "esbuild";

await build({
  entryPoints: ["api/_handler.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "api/index.js",
  // המודול הנייטיב של SQLite לא נדרש במצב Supabase — משאירים חיצוני.
  external: ["better-sqlite3", "drizzle-orm/better-sqlite3"],
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  logLevel: "info",
});

// eslint-disable-next-line no-console
console.log("vercel function bundled -> api/index.js");
