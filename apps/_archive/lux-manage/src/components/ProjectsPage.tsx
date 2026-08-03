import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProjectDetailPage from "./ProjectDetailPage";

interface Project {
  id: string;
  name: string;
  template: string;
  total_budget: number;
  spent: number;
  status: string;
  created_at: string;
}

type TemplateKey = "custom" | "wedding" | "bar_mitzvah" | "bat_mitzvah" | "brit" | "apartment" | "renovation" | "pesach" | "sukkot" | "vacation";

interface TemplateOption {
  key: TemplateKey;
  label: string;
  emoji: string;
  categories: { name: string; parent_group: string; budget: number; sort_order: number }[];
}

const TEMPLATES: TemplateOption[] = [
  { key: "custom", label: "ריק — מותאם אישית", emoji: "📋", categories: [] },
  {
    key: "wedding", label: "חתונה", emoji: "💍",
    categories: [
      { name: "אולם", parent_group: "יום האירוע", budget: 0, sort_order: 1 },
      { name: "קייטרינג", parent_group: "יום האירוע", budget: 0, sort_order: 2 },
      { name: "תזמורת / זמר", parent_group: "יום האירוע", budget: 0, sort_order: 3 },
      { name: "צלם + וידאו", parent_group: "יום האירוע", budget: 0, sort_order: 4 },
      { name: "בר / DJ", parent_group: "יום האירוע", budget: 0, sort_order: 5 },
      { name: "פרחים ועיצוב", parent_group: "יום האירוע", budget: 0, sort_order: 6 },
      { name: "הזמנות", parent_group: "הכנות מוקדמות", budget: 0, sort_order: 7 },
      { name: "שמלה / חליפה", parent_group: "הכנות מוקדמות", budget: 0, sort_order: 8 },
      { name: "שיער ואיפור", parent_group: "הכנות מוקדמות", budget: 0, sort_order: 9 },
      { name: "רכב", parent_group: "הכנות מוקדמות", budget: 0, sort_order: 10 },
      { name: "טבעות", parent_group: "הכנות מוקדמות", budget: 0, sort_order: 11 },
      { name: "שכירות דירה", parent_group: "התחייבויות עתידיות", budget: 0, sort_order: 12 },
      { name: "ריהוט", parent_group: "התחייבויות עתידיות", budget: 0, sort_order: 13 },
      { name: "מוצרי חשמל", parent_group: "התחייבויות עתידיות", budget: 0, sort_order: 14 },
    ],
  },
  {
    key: "bar_mitzvah", label: "בר מצווה", emoji: "🎉",
    categories: [
      { name: "אולם / מתחם", parent_group: "האירוע", budget: 0, sort_order: 1 },
      { name: "קייטרינג", parent_group: "האירוע", budget: 0, sort_order: 2 },
      { name: "DJ / תזמורת", parent_group: "האירוע", budget: 0, sort_order: 3 },
      { name: "צלם ווידאו", parent_group: "האירוע", budget: 0, sort_order: 4 },
      { name: "עיצוב ופרחים", parent_group: "האירוע", budget: 0, sort_order: 5 },
      { name: "הזמנות", parent_group: "הכנות", budget: 0, sort_order: 6 },
      { name: "ביגוד", parent_group: "הכנות", budget: 0, sort_order: 7 },
      { name: "מורה לקריאת התורה", parent_group: "הכנות", budget: 0, sort_order: 8 },
      { name: "מתנות לאורחים", parent_group: "הכנות", budget: 0, sort_order: 9 },
    ],
  },
  {
    key: "bat_mitzvah", label: "בת מצווה", emoji: "🎀",
    categories: [
      { name: "אולם / מתחם", parent_group: "האירוע", budget: 0, sort_order: 1 },
      { name: "קייטרינג", parent_group: "האירוע", budget: 0, sort_order: 2 },
      { name: "DJ / תזמורת", parent_group: "האירוע", budget: 0, sort_order: 3 },
      { name: "צלם ווידאו", parent_group: "האירוע", budget: 0, sort_order: 4 },
      { name: "עיצוב ופרחים", parent_group: "האירוע", budget: 0, sort_order: 5 },
      { name: "הזמנות", parent_group: "הכנות", budget: 0, sort_order: 6 },
      { name: "שמלה ועיצוב אישי", parent_group: "הכנות", budget: 0, sort_order: 7 },
      { name: "מתנות לאורחים", parent_group: "הכנות", budget: 0, sort_order: 8 },
    ],
  },
  {
    key: "brit", label: "ברית / הכנסת שם", emoji: "👶",
    categories: [
      { name: "אולם / בית", parent_group: "האירוע", budget: 0, sort_order: 1 },
      { name: "קייטרינג / כיבוד", parent_group: "האירוע", budget: 0, sort_order: 2 },
      { name: "מוהל", parent_group: "האירוע", budget: 0, sort_order: 3 },
      { name: "צילום", parent_group: "האירוע", budget: 0, sort_order: 4 },
      { name: "עיצוב", parent_group: "האירוע", budget: 0, sort_order: 5 },
    ],
  },
  {
    key: "apartment", label: "רכישת דירה", emoji: "🏠",
    categories: [
      { name: "מקדמה", parent_group: "רכישה", budget: 0, sort_order: 1 },
      { name: "עורך דין", parent_group: "רכישה", budget: 0, sort_order: 2 },
      { name: "מתווך", parent_group: "רכישה", budget: 0, sort_order: 3 },
      { name: "שמאי", parent_group: "רכישה", budget: 0, sort_order: 4 },
      { name: "משכנתא — עלויות", parent_group: "רכישה", budget: 0, sort_order: 5 },
      { name: "ריהוט", parent_group: "ציוד והתאמה", budget: 0, sort_order: 6 },
      { name: "מוצרי חשמל", parent_group: "ציוד והתאמה", budget: 0, sort_order: 7 },
      { name: "שיפוצים קלים", parent_group: "ציוד והתאמה", budget: 0, sort_order: 8 },
      { name: "הובלה", parent_group: "ציוד והתאמה", budget: 0, sort_order: 9 },
    ],
  },
  {
    key: "renovation", label: "שיפוץ", emoji: "🔨",
    categories: [
      { name: "קבלן ראשי", parent_group: "עבודות", budget: 0, sort_order: 1 },
      { name: "אינסטלציה", parent_group: "עבודות", budget: 0, sort_order: 2 },
      { name: "חשמל", parent_group: "עבודות", budget: 0, sort_order: 3 },
      { name: "ריצוף", parent_group: "עבודות", budget: 0, sort_order: 4 },
      { name: "צבע", parent_group: "עבודות", budget: 0, sort_order: 5 },
      { name: "מטבח", parent_group: "פריטים", budget: 0, sort_order: 6 },
      { name: "חדרי אמבטיה", parent_group: "פריטים", budget: 0, sort_order: 7 },
      { name: "דלתות וחלונות", parent_group: "פריטים", budget: 0, sort_order: 8 },
      { name: "אדריכל / מעצב", parent_group: "ייעוץ", budget: 0, sort_order: 9 },
    ],
  },
  {
    key: "pesach", label: "פסח", emoji: "🍷",
    categories: [
      { name: "מזון וקניות", parent_group: "הכנות", budget: 0, sort_order: 1 },
      { name: "צעצועים ופעילויות", parent_group: "ילדים", budget: 0, sort_order: 2 },
      { name: "ביגוד חג", parent_group: "הכנות", budget: 0, sort_order: 3 },
      { name: "חופשה / טיולים", parent_group: "חופש", budget: 0, sort_order: 4 },
      { name: "מתנות", parent_group: "הכנות", budget: 0, sort_order: 5 },
    ],
  },
  {
    key: "sukkot", label: "סוכות", emoji: "🌿",
    categories: [
      { name: "סוכה וקישוטים", parent_group: "הכנות", budget: 0, sort_order: 1 },
      { name: "ארבעת המינים", parent_group: "הכנות", budget: 0, sort_order: 2 },
      { name: "מזון ואירוח", parent_group: "הכנות", budget: 0, sort_order: 3 },
      { name: "טיולים וחופשה", parent_group: "חופש", budget: 0, sort_order: 4 },
    ],
  },
  {
    key: "vacation", label: "חופשה / טיול", emoji: "✈️",
    categories: [
      { name: "טיסות", parent_group: "תחבורה", budget: 0, sort_order: 1 },
      { name: "לינה", parent_group: "מגורים", budget: 0, sort_order: 2 },
      { name: "אוכל", parent_group: "הוצאות יומיות", budget: 0, sort_order: 3 },
      { name: "אטרקציות", parent_group: "הוצאות יומיות", budget: 0, sort_order: 4 },
      { name: "ביטוח נסיעות", parent_group: "אחר", budget: 0, sort_order: 5 },
    ],
  },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("custom");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setProjects(data as any);
  };

  useEffect(() => { load(); }, [user]);

  const createProject = async () => {
    if (!user || !newName.trim()) return;
    const budget = Number(newBudget) || 0;
    const template = TEMPLATES.find(t => t.key === selectedTemplate)!;

    const { data, error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: newName.trim(),
      template: selectedTemplate,
      total_budget: budget,
    } as any).select().single();

    if (error || !data) {
      toast({ title: "שגיאה", description: "לא ניתן ליצור פרויקט", variant: "destructive" });
      return;
    }

    if (template.categories.length > 0) {
      const cats = template.categories.map(c => ({ ...c, project_id: (data as any).id }));
      await supabase.from("project_categories").insert(cats as any);
    }

    setNewName("");
    setNewBudget("");
    setSelectedTemplate("custom");
    setDialogOpen(false);
    toast({ title: "פרויקט נוצר!", description: newName });
    load();
  };

  if (selectedProject) {
    return <ProjectDetailPage projectId={selectedProject} onBack={() => { setSelectedProject(null); load(); }} />;
  }

  const templateLabel = (key: string) => {
    const t = TEMPLATES.find(t => t.key === key);
    return t ? `${t.emoji} ${t.label}` : key;
  };

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">פרויקטים ואירועים</h1>
          <p className="text-sm text-muted-foreground">יש לך אירוע או פרויקט שתרצה לתכנן בנפרד? הוסף אותו כאן</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="btn-clay-gold px-5 py-2.5 rounded-2xl text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> פרויקט חדש
            </button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>פרויקט חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input placeholder="שם הפרויקט" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="תקציב כולל (₪)" type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
              
              <div>
                <p className="text-xs font-bold text-foreground mb-2">בחר תבנית:</p>
                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
                  {TEMPLATES.map(t => (
                    <button key={t.key}
                      onClick={() => setSelectedTemplate(t.key)}
                      className={`p-3 rounded-xl border text-start transition-all text-sm ${
                        selectedTemplate === t.key
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border/30 bg-secondary/40 text-foreground hover:border-accent/30"
                      }`}>
                      <span className="text-lg me-2">{t.emoji}</span>
                      {t.label}
                      {t.categories.length > 0 && (
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{t.categories.length} קטגוריות מוכנות</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={createProject} className="btn-clay-gold w-full py-3 rounded-2xl text-sm">צור פרויקט</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">עדיין אין פרויקטים. צור את הראשון!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map(p => {
            const pct = p.total_budget > 0 ? (p.spent / p.total_budget) * 100 : 0;
            const overBudget = pct > 100;
            return (
              <motion.button key={p.id} onClick={() => setSelectedProject(p.id)}
                className="bento-card p-5 text-start hover:border-accent/30 transition-all"
                whileHover={{ scale: 1.02 }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground">{p.name}</h3>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent font-bold">
                    {templateLabel(p.template)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>הוצא: ₪{p.spent.toLocaleString()}</span>
                    <span>תקציב: ₪{p.total_budget.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${overBudget ? "bg-destructive" : "bg-accent"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  {overBudget && (
                    <p className="text-[11px] font-bold text-destructive">⚠️ חריגה מהתקציב!</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
