import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root")!;

/**
 * Plain client render, even when scripts/prerender-spa.mjs has baked markup into
 * the root. `hydrateRoot` was tried twice here and reverted twice; the numbers
 * are recorded so the attempt is not repeated a third time.
 *
 * Hydration is the theoretically right call. A real-browser trace shows the
 * baked <h1> painting at 850ms and LCP then jumping to 2350ms, because
 * `createRoot` on a non-empty container replaces the DOM rather than adopting
 * it — the element that already painted is discarded. Hydration would keep it.
 *
 * Attempt 1, bake the live page: React #418 then #423. The capture holds data
 * the client's first render does not, the trees differ, React discards the root.
 *
 * Attempt 2, bake with per-page queries blocked so both sides show placeholders:
 * still #418/#423. An aborted request does not leave react-query *pending*, it
 * settles to *error* — so the capture renders the empty branch and the client
 * renders the pending one. Measured worse than doing nothing: performance
 * 66 -> 58, TBT 360ms -> 700ms, because the page pays for a failed hydration on
 * top of the render it was always going to do.
 *
 * Making this hydrate needs every query on the route serialised, not just the
 * tenant. That is real SSR across 70 routes and the auth flow — see QA/torah.md.
 *
 * What did survive from the attempt, and is worth keeping: the tenant is seeded
 * into the HTML and read synchronously, and PublicLayout no longer hides the
 * whole site behind a spinner. Those remove a network round trip from the
 * critical path for every visitor, prerendered or not.
 */
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
