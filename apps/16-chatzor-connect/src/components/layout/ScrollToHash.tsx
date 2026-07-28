import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to a #hash target on navigation, or to the top on a plain route change. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        // let the page render first
        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
