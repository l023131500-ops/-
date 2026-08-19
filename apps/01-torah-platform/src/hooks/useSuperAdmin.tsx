import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/* The single super-admin check of this app.
 *
 * It lived inside AdminLayout, which is why every screen mounted under /admin
 * was gated and the legacy consoles mounted beside it were not: /legacy/admin
 * rendered its full board — lessons with the rabbi's name and town, edit
 * buttons, "הורדת גיבוי מלא (ZIP)", "ייצוא לנדרים פלוס" — to an anonymous
 * visitor, measured against production on 07/08/2026 (core.issues #87). A gate
 * that is a property of one layout can only protect what that layout wraps.
 *
 * Returns what to render INSTEAD of the guarded screen: a spinner while the
 * answer is still unknown, a redirect once it is no. Returns null — and only
 * null — when the visitor is a super admin, so `gate ?? <content/>` reads as
 * "nothing stands in the way".
 *
 * The verdict comes from the is_super_admin RPC, i.e. from the database, not
 * from an email list compiled into the bundle. Anyone can read the bundle. */
export function useSuperAdminGate() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    // The answer arrives after an await; by then the visitor may have navigated
    // away and this component unmounted. Dropping a late answer avoids setting
    // state on a dead component.
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("is_super_admin", { _uid: user.id });
      if (alive) setIsAdmin(Boolean(data));
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  /* isAdmin === null is "not asked yet", which is NOT "no". Redirecting here
     would bounce the real admin out on every reload. */
  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth/sign-in?redirect=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return null;
}
