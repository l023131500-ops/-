import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Landing } from "@/components/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "זכויות פרו | מערכת CRM לניהול לקוחות וזכויות" },
      {
        name: "description",
        content:
          "תיק לקוח דיגיטלי מלא, ניהול פיננסי אישי, שיתופי פעולה עם יועצים בהסכמה, ואוטומציה בקול, בוואטסאפ ובמייל — מערכת ה-CRM שמלווה את הלקוח שלכם מהזכאות ועד המימוש.",
      },
    ],
  }),
  beforeLoad: async () => {
    // No `typeof window === "undefined"` early return here, and that is the
    // whole fix. A signed-in visitor must not see the marketing page — they
    // go straight to /dashboard. With the guard in place beforeLoad ran during
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
    //
    // Anonymous visitors are NOT redirected to /auth anymore — they render the
    // public marketing landing page below instead, with a login CTA.
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});
