import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isPlatformAdmin } from "@/integrations/more30/hub";

/**
 * שער אזור הניהול.
 *
 * עד כה הקומפוננטה הזו החזירה את הילדים כמו שהם, עם הערה
 * "TODO: Restore auth+role check after testing" — כלומר **כל אחד** שהקליד
 * את הכתובת נכנס לניהול המגידים, הלידים והפניות. זה נמדד חי.
 *
 * הכלל עכשיו זהה לכל המערכות: מנהל מקומי של המערכת, או סופר-אדמין גלובלי
 * של הפלטפורמה. שתי התשובות מגיעות מהשרת.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1. הפלטפורמה: סופר-אדמין גלובלי, או מנהל רשום של המערכת הזו.
      if (await isPlatformAdmin()) {
        if (alive) setAllowed(true);
        return;
      }

      // 2. מנהל מקומי לפי המסד של המערכת עצמה, למי שמחובר כאן ולא בפלטפורמה.
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { if (alive) setAllowed(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      if (alive) setAllowed(!!data);
    })();

    return () => { alive = false; };
  }, []);

  if (allowed === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground" dir="rtl">
        בודקים הרשאה…
      </div>
    );
  }

  if (!allowed) {
    const back = encodeURIComponent(window.location.href);
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center" dir="rtl">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-foreground">אזור ניהול</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            האזור הזה פתוח למנהלי המערכת ולסופר-אדמין של הפלטפורמה בלבד.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={`https://more30.com/login?from=${back}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              כניסה עם חשבון more30
            </a>
            <Link to="/" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium">
              חזרה לאתר
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
