import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir } from "node:fs/promises";

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

  console.log("building serverless handler...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // Ensure api/ directory exists
  await mkdir("api", { recursive: true });

  // Build serverless entry to api/handler.js
  await esbuild({
    entryPoints: ["server/serverless.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "api/handler.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // The output is ESM but bundles CJS dependencies that call require() and
    // read __dirname. Neither exists in an ES module, which crashed the Vercel
    // function on cold start ("Dynamic require of \"tty\" is not supported").
    // These shims re-create both from import.meta.url.
    banner: {
      js: [
        `import { createRequire as __createRequire } from "node:module";`,
        `import { fileURLToPath as __fileURLToPath } from "node:url";`,
        `import { dirname as __pathDirname } from "node:path";`,
        `const require = __createRequire(import.meta.url);`,
        `const __filename = __fileURLToPath(import.meta.url);`,
        `const __dirname = __pathDirname(__filename);`,
      ].join("\n"),
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("done.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
