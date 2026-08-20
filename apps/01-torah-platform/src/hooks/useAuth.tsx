import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (next?: string) => Promise<{ error: any }>;
  /**
   * `needsConfirmation` הוא true כשההרשמה הצליחה אבל השרת לא החזיר session,
   * כלומר הפרויקט דורש אימות מייל (mailer_autoconfirm=false). בלי הדגל הזה
   * מסך ההרשמה בירך על ההצלחה וניווט לפורטל — שמיד החזיר לכניסה.
   */
  signUp: (
    email: string,
    password: string,
    meta?: Record<string, any>,
  ) => Promise<{ error: any; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };
  /**
   * `redirectTo` חייב לכלול את ה-BASE_URL ("/torah/" בייצור) — בלעדיו
   * Google מחזיר את המשתמש ל-more30.com/portal, שהוא אפליקציית ה-portal
   * הראשית (רשימת כל המערכות) ולא /torah/portal, כלומר הכניסה "מצליחה"
   * אבל המשתמש נוחת באתר הלא-נכון לגמרי. `next` (ברירת מחדל "portal")
   * מכבד את אותו פרמטר `redirect` שכניסת אימייל/סיסמה כבר מכבדת.
   */
  const signInWithGoogle = async (next: string = "portal") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}${next.replace(/^\//, "")}`,
      },
    });
    return { error };
  };
  const signUp = async (email: string, password: string, meta?: any) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta || {} } });
    return { error, needsConfirmation: !error && !data.session };
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ session, user, loading, signIn, signInWithGoogle, signUp, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
