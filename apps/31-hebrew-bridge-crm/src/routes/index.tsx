import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // No `typeof window === "undefined"` early return here, and that is the
    // whole fix. This route renders nothing by design — it exists only to route
    // you by role. With the guard in place beforeLoad ran during SSR, returned
    // without redirecting, and TanStack serialised that as a resolved route;
    // the client then hydrated the resolved state without re-running
    // beforeLoad, so the redirect fired nowhere. Measured: /gesher/ sat at its
    // own URL with an empty body and no console error — a blank page that
    // looked like missing content but was a redirect that never happened.
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (roleSet.has("admin")) throw redirect({ to: "/admin" });
    if (roleSet.has("partner")) throw redirect({ to: "/partner" });
    throw redirect({ to: "/client" });
  },
  component: () => null,
});
