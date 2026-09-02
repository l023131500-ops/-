import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Mirrors PortalSidebar.tsx's FEATURE_KEY_BY_PATH: a teacher_features row with
// enabled=false must also block the route itself, not just hide the nav link
// -- nav-hide alone still left the page fully reachable/usable by typing or
// bookmarking its URL directly.
export const useFeatureGate = (featureKey: string) => {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data: profile }) => {
        if (!profile) { setChecked(true); return; }
        supabase.from("teacher_features").select("enabled").eq("teacher_id", profile.id)
          .eq("feature_key", featureKey).maybeSingle()
          .then(({ data }) => {
            setLocked(data?.enabled === false);
            setChecked(true);
          });
      });
  }, [user, featureKey]);

  return { locked, checked };
};
