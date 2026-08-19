import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async (session: any) => {
      if (!session?.user) {
        if (active) { setAuthorized(false); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!active) return;
      setAuthorized(!error && data === true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      // defer supabase call to avoid deadlock inside auth callback
      setTimeout(() => check(session), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => check(session));

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-teal/30 border-t-teal animate-spin" />
      </div>
    );
  }

  if (!authorized) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
