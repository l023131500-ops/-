import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root")!;

/**
 * Hydrate the markup baked at build time by scripts/prerender-spa.mjs; render
 * from scratch otherwise (dev, and any route that was not baked).
 *
 * The distinction is what makes prerendering worth anything here. `createRoot`
 * on a non-empty container *replaces* the DOM instead of adopting it, so the
 * browser throws away the heading that already painted and re-records LCP when
 * React rebuilds it — the baked HTML buys a fast first paint that is
 * immediately discarded. `hydrateRoot` keeps those nodes.
 *
 * It only works when both sides render the same thing on the first pass, which
 * is why the capture runs with --block-data: this landing page is static above
 * the fold, so with per-page queries unresolved the baked markup matches what
 * the client renders before any data arrives. torah could not do this — it
 * gates its entire render on a tenant fetch, so a data-free capture came back
 * empty. Measured on each, not assumed.
 */
if (container.dataset.prerendered === "1") {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
