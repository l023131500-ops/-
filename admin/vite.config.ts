import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The control centre is served from the /admin sub-path, so `base` must say so.
 *
 * It used to be "./" with a comment claiming that worked both at a subdomain
 * root and mounted under /admin. It does not work under /admin: the canonical
 * URL is more30.com/admin with **no trailing slash**, and a relative asset URL
 * resolves against that document's directory — the site root — so `./assets/x`
 * becomes /assets/x and 404s. This is the same trailing-slash trap already
 * fixed across twelve apps/ configs; admin was missed because the mount audit
 * only walks apps/.
 *
 * The value is measured, not guessed: production at more30.com/admin serves
 * `<script src="/admin/assets/index-<hash>.js">`, so the deployed artifact was
 * built with this prefix. A plain `vite build` now reproduces it instead of
 * emitting something that only works when someone remembers --base.
 */
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
});
