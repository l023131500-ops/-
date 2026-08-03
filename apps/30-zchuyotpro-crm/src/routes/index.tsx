import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // No `typeof window === "undefined"` early return here, and that is the
    // whole fix. This route renders nothing by design — it exists only to send
    // you to /dashboard or /auth. With the guard in place beforeLoad ran during
    // SSR, returned without redirecting, and TanStack serialised that as a
    // resolved route; the client then hydrated the resolved state without
    // re-running beforeLoad, so the redirect fired nowhere. Measured: /crm/ and
    // /gesher/ both sat at their own URL with an empty body and no console
    // error — a blank page that looked like missing content but was a redirect
    // that never happened.
    //
    // Running on the server is also the better behaviour: getSession() finds no
    // session there and the visitor gets a real redirect in the first response
    // instead of a blank frame followed by a client-side jump.
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
