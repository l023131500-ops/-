import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Users, Search, Download, DollarSign, TrendingUp, TrendingDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface UserProfile {
  id: string;
  name: string;
  family_status: string | null;
  city: string | null;
  tier: string | null;
  monthly_income: number | null;
  onboarding_complete: boolean | null;
  profile_complete: boolean | null;
  created_at: string | null;
  business_enabled: boolean | null;
  id_number: string | null;
  ivr_pin: string | null;
}

interface BudgetSummary {
  fixed_income: number;
  fixed_expenses: number;
  one_time_income: number;
  one_time_expenses: number;
  total_items: number;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetSummary>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, family_status, city, tier, monthly_income, onboarding_complete, profile_complete, created_at, business_enabled, id_number, ivr_pin")
      .order("created_at", { ascending: false });
    setUsers((profiles as UserProfile[]) ?? []);

    const { data: allItems } = await supabase.from("budget_items").select("user_id, type, category, amount");
    const grouped: Record<string, BudgetSummary> = {};
    (allItems ?? []).forEach((item: any) => {
      if (!grouped[item.user_id]) grouped[item.user_id] = { fixed_income: 0, fixed_expenses: 0, one_time_income: 0, one_time_expenses: 0, total_items: 0 };
      const s = grouped[item.user_id];
      s.total_items++;
      if (item.type === "income") {
        if (item.category === "fixed_monthly") s.fixed_income += Number(item.amount);
        else s.one_time_income += Number(item.amount);
      } else {
        if (item.category === "fixed_monthly") s.fixed_expenses += Number(item.amount);
        else s.one_time_expenses += Number(item.amount);
      }
    });
    setBudgets(grouped);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = users.filter((u) =>
    !search || u.name?.includes(search) || u.city?.includes(search) || u.id.includes(search)
  );

  function exportUsersCSV() {
    if (!users.length) return;
    const headers = ["שם", "עיר", "מצב משפחתי", "הכנסה חודשית", "תוכנית", "עסקי", "הכנסה קבועה", "הוצאות קבועות", "יתרה", "תאריך הצטרפות"];
    const rows = users.map((u) => {
      const b = budgets[u.id];
      const balance = (b?.fixed_income || 0) - (b?.fixed_expenses || 0);
      return [
        u.name, u.city || "", u.family_status || "", u.monthly_income || 0,
        u.tier || "standard", u.business_enabled ? "כן" : "לא",
        b?.fixed_income || 0, b?.fixed_expenses || 0, balance,
        u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "",
      ];
    });
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> ניהול משתמשים
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} משתמשים רשומים</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-56" />
          </div>
          <Button size="sm" variant="outline" onClick={exportUsersCSV} disabled={!users.length}>
            <Download className="w-4 h-4 me-2" /> ייצוא CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">טוען...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user, i) => {
            const b = budgets[user.id];
            const balance = (b?.fixed_income || 0) - (b?.fixed_expenses || 0);
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }} className="bento-card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-lg font-bold text-accent">
                      {user.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{user.name || "ללא שם"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span>{user.city || "—"}</span>
                        <span>•</span>
                        <span>{user.family_status || "—"}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.tier === "premium" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                        }`}>
                          {user.tier === "premium" ? "⭐ פרימיום" : "סטנדרט"}
                        </span>
                        {user.business_enabled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">עסקי</span>
                        )}
                        {user.id_number && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                            <Phone className="w-3 h-3" /> IVR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-xs text-muted-foreground space-y-1">
                    <p>הכנסה פרופיל: ₪{(user.monthly_income || 0).toLocaleString()}</p>
                    <p>הצטרף: {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: he }) : "—"}</p>
                  </div>
                </div>

                {/* Budget Summary */}
                <div className="mt-4 pt-4 border-t border-border/20">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">סיכום תקציב (budget_items)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> הכנסה קבועה</p>
                      <p className="text-sm font-bold text-foreground">₪{(b?.fixed_income || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> הוצאות קבועות</p>
                      <p className="text-sm font-bold text-foreground">₪{(b?.fixed_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground">הכנסה חד פעמית</p>
                      <p className="text-sm font-bold text-foreground">₪{(b?.one_time_income || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground">הוצאות חד פעמיות</p>
                      <p className="text-sm font-bold text-foreground">₪{(b?.one_time_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 text-center ${balance >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="w-3 h-3" /> יתרה חודשית</p>
                      <p className={`text-sm font-bold ${balance >= 0 ? "text-emerald-500" : "text-destructive"}`}>₪{balance.toLocaleString()}</p>
                    </div>
                  </div>
                  {(!b || b.total_items === 0) && (
                    <p className="text-[10px] text-muted-foreground mt-2 italic">הלקוח טרם הזין נתוני תקציב</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
