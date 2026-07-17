import { useEffect, useState } from "react";
import { resolvePath } from "@more30/config";

/**
 * Tiny dependency-free router for the portal.
 *
 * Routes follow the registry basePath convention: `/` is the home listing and
 * `/<NN>` (e.g. `/02`) is a system's own page — the foundation for "every system
 * is its own site". Path→slug resolution reuses `resolvePath` from @more30/config
 * so routing has a single source of truth.
 */
export type Route =
  | { name: "home" }
  | { name: "system"; slug: string }
  | { name: "notfound"; seg: string };

export function parseRoute(pathname: string): Route {
  const seg = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  if (!seg) return { name: "home" };
  const slug = resolvePath(pathname);
  if (slug) return { name: "system", slug };
  return { name: "notfound", seg };
}

export function useRoute(): { route: Route; navigate: (to: string) => void } {
  const [path, setPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  return { route: parseRoute(path), navigate };
}
