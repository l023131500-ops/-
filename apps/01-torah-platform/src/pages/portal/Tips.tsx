import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// `tips` (id, body, category, created_at, is_active) has no tenant_id column and
// is managed centrally: its RLS write policies (tips_write_ins/upd/del) all
// require is_super_admin(auth.uid()) with no tenant_admin/moderator/member
// fallback, unlike every tenant-scoped table this portal otherwise writes to.
// A portal teacher hitting Create/Insert got a hard 42501 error; Update/Delete
// (USING-clause-only policies) silently filtered to 0 rows affected while the
// page still toasted "עודכן"/"נמחק" — every action on this screen either broke
// visibly or lied about succeeding, for every non-super-admin viewer. The real
// CRUD console for this table is admin/Tips.tsx, gated behind is_super_admin
// via AdminLayout. This portal screen is read-only, matching what RLS actually
// grants a teacher: the live, active tips content only (tips_read: is_active
// OR is_super_admin).

const CATEGORIES: Record<string, string> = {
  halacha: "הלכה",
  mussar: "מוסר",
  parsha: "פרשת השבוע",
  general: "כללי",
};

type Tip = {
  id: string;
  body: string;
  category: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function Tips() {
  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["portal-tips"],
    queryFn: async () => {
      // RLS (tips_read) only ever returns is_active rows to a non-super-admin
      // caller, so this list is already effectively "published tips only" —
      // no client-side filter needed.
      const { data, error } = await supabase
        .from("tips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Tip[];
    },
  });

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">טיפים יומיים</h1>
      </div>

      {/* Tips list — read-only; management happens in the super-admin console */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">רשימת טיפים ({tips.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : tips.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין טיפים עדיין</div>
          ) : (
            <div className="divide-y">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                <span>תוכן</span>
                <span>קטגוריה</span>
                <span>תאריך</span>
              </div>
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-3 items-center hover:bg-muted/30"
                >
                  <p className="text-sm line-clamp-2">{tip.body}</p>
                  <span>
                    <Badge variant="outline">
                      {CATEGORIES[tip.category || ""] || tip.category || "כללי"}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(tip.created_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
