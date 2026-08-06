// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Serve the whole app under the /gesher base path (parallel Vercel project
  // gesher-more30, later reverse-proxied from more30.com/gesher).
  vite: { base: "/gesher/" },
  // Force nitro Vercel preset for self-deploy (outside Lovable sandbox) — emits
  // .vercel/output (Build Output API v3).
  //
  // ⚠️ Deploy with plain `vercel deploy --prod`, NOT `--prebuilt`.
  //
  // `base: "/gesher/"` makes the HTML ask for /gesher/assets/..., but the build
  // writes those files to static/assets/... . The gap is closed by the rewrite
  // in this app's vercel.json — and `--prebuilt` ignores vercel.json entirely,
  // routing only by .vercel/output/config.json, which has no such rule. Deploy
  // that way and every stylesheet and script 404s: the site still answers 200
  // with server-rendered HTML, so it looks alive while being unstyled and
  // completely inert. Done by accident on 2026-08-06 and caught by an asset
  // probe, not by the page loading.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
