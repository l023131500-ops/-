// בונה רק את הפרונט (Vite) — עבור Vercel, ש-API נבנה כפונקציית serverless בנפרד.
import { build as viteBuild } from "vite";
import { rm } from "node:fs/promises";

async function run() {
  await rm("dist/public", { recursive: true, force: true });
  console.log("building client (Vercel)...");
  await viteBuild();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
