import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useTenant } from "@/hooks/useTenant";

export function PublicLayout() {
  const { tenant, loading, error } = useTenant();

  /**
   * No spinner gate while the tenant loads.
   *
   * This used to return a centred spinner until the tenant round trip finished,
   * which meant the heading — the LCP element — could not paint until the
   * network answered. Measured on the throttled mobile profile that alone was
   * most of the gap to Lighthouse 90, and for a real visitor it was a blank
   * screen with a spinner on every first load.
   *
   * Rendering the shell straight away is safe because Navbar, Footer and Home
   * all read the tenant through `tenant?.` with sensible fallbacks — they were
   * already written for a null tenant, the gate just meant it never happened.
   * When the tenant is seeded into the HTML (see useTenant) the real strings are
   * there from the first paint; when it is not, the fallback shows for a moment
   * and is replaced. Either is better than a spinner.
   *
   * The error state below is unchanged, but is now reached only once loading has
   * actually finished — otherwise a slow network would read as "organisation not
   * found".
   */
  if (!loading && (error || !tenant)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <div className="font-heading text-2xl mb-2">לא נמצא ארגון</div>
          <p className="text-muted-foreground">{error || "כתובת לא חוקית"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
