import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile } from "node:fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "@supabase/supabase-js",
  "@supabase/auth-js",
  "@supabase/functions-js",
  "@supabase/postgrest-js",
  "@supabase/realtime-js",
  "@supabase/storage-js",
  "@supabase/node-fetch",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

async function copyData() {
  await mkdir("dist/data", { recursive: true });
  await copyFile("server/data/bklot.xlsx", "dist/data/bklot.xlsx");
  console.log("copied bklot.xlsx to dist/data/");

  // Health-fund Supabase schema migrations — read at runtime by
  // hf-supabase-bootstrap.ts to auto-create the hf_* tables in Postgres.
  await mkdir("dist/deliverables", { recursive: true });
  const hfSql = [
    "supabase_migration_health_funds.sql",
    "supabase_migration_health_funds_podcast.sql",
    "supabase_rls_health_funds.sql",
  ];
  for (const f of hfSql) {
    await copyFile(`deliverables/${f}`, `dist/deliverables/${f}`);
  }
  console.log(`copied ${hfSql.length} hf_* migration files to dist/deliverables/`);
}

buildAll()
  .then(() => copyData())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
