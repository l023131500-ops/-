import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Receipt, Users, Activity, Shield, Calendar, CalendarDays,
  PartyPopper, MessageCircle, GraduationCap, Zap, FolderKanban, FileText, BarChart3
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { normalizeEnabledModules } from "@/lib/modules";

const ALL_MODULES = [
  { key: "dashboard", label: "לוח בקרה", icon: LayoutDashboard, locked: true },
  { key: "quick_entry", label: "הזנה מהירה", icon: Zap },
  { key: "expenses", label: "מעקב הוצאות", icon: Receipt },
  { key: "calendar", label: "לוח שנה", icon: Calendar },
  { key: "timeline", label: "ציר זמן", icon: CalendarDays },
  { key: "suppliers", label: "ספקים", icon: Users },
  { key: "financial_health", label: "בריאות פיננסית", icon: Activity },
  { key: "benefits", label: "זכויות והטבות", icon: Shield },
  { key: "family_future", label: "עתיד המשפחה", icon: PartyPopper },
  { key: "academy", label: "אקדמיה", icon: GraduationCap },
  { key: "expert_chat", label: "יעוץ מומחה", icon: MessageCircle },
  { key: "projects", label: "פרויקטים", icon: FolderKanban },
  { key: "invoices", label: "חשבוניות (עסקי)", icon: FileText },
  { key: "reports", label: "דוחות (עסקי)", icon: BarChart3 },
];

const DEFAULT_MODULES = normalizeEnabledModules(["quick_entry", "expenses"]);

export default function ModuleSettingsPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<string[]>(DEFAULT_MODULES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("enabled_modules").eq("id", user.id).single().then(({ data }) => {
      if (data && (data as any).enabled_modules) {
        setEnabled(normalizeEnabledModules((data as any).enabled_modules as string[]));
      }
    });
  }, [user]);

  const toggle = (key: string) => {
    setEnabled(prev => normalizeEnabledModules(
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    ));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const normalizedEnabled = normalizeEnabledModules(enabled);
    const { error } = await supabase.from("profiles").update({ enabled_modules: normalizedEnabled } as any).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "שגיאה", description: "לא ניתן לשמור", variant: "destructive" });
    } else {
      setEnabled(normalizedEnabled);
      toast({ title: "נשמר!", description: "ההגדרות עודכנו בהצלחה" });
    }
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">הגדרות מודולים</h1>
        <p className="text-sm text-muted-foreground mt-1">בחר אילו מודולים יופיעו בסיידבר ובדשבורד</p>
      </div>

      <div className="space-y-3">
        {ALL_MODULES.map((mod) => (
          <motion.div
            key={mod.key}
            className="bento-card p-4 flex items-center justify-between"
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <mod.icon className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm font-bold text-foreground">{mod.label}</span>
            </div>
            <Switch
              checked={enabled.includes(mod.key)}
              onCheckedChange={() => !mod.locked && toggle(mod.key)}
              disabled={mod.locked}
            />
          </motion.div>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="btn-clay-gold px-8 py-3 rounded-2xl text-sm">
        {saving ? "שומר..." : "שמור שינויים"}
      </button>
    </div>
  );
}
