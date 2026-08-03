import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, Save, Search, Mail, BookOpen, FileText, Settings, Users, Mic, ChevronDown, ChevronUp, Video } from "lucide-react";
import { ClientMessageEditor } from "@/components/admin/ClientMessageEditor";

interface Right {
  id: string;
  topic_number: number;
  topic_name: string;
  category: string;
  client_message_template: string | null;
  required_docs_list: any;
  qualification_questions: any;
  eligibility_criteria: string | null;
  required_documents: string | null;
}

const AdminClientMessages = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rights, setRights] = useState<Right[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [editing, setEditing] = useState<Record<string, Partial<Right>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!roleData) { toast.error("אין הרשאת ניהול"); navigate("/admin/login"); return; }
      await load();
    };
    init();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rights_reference")
      .select("id, topic_number, topic_name, category, client_message_template, required_docs_list, qualification_questions, eligibility_criteria, required_documents")
      .order("topic_number");
    setRights((data || []) as any);
    setLoading(false);
  };

  const patch = (id: string, p: Partial<Right>) =>
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...p } }));

  const save = async (r: Right) => {
    const e = editing[r.id] || {};
    setSaving(r.id);
    const { error } = await supabase.from("rights_reference").update({
      client_message_template: e.client_message_template ?? r.client_message_template,
      required_docs_list: e.required_docs_list ?? r.required_docs_list ?? [],
      qualification_questions: e.qualification_questions ?? r.qualification_questions ?? [],
    } as any).eq("id", r.id);
    setSaving(null);
    if (error) { toast.error("שגיאה בשמירה"); return; }
    toast.success("נשמר");
    setRights(rs => rs.map(x => x.id === r.id ? { ...x, ...e } as Right : x));
    setEditing(es => { const n = { ...es }; delete n[r.id]; return n; });
  };

  const has = (r: Right) => !!(editing[r.id]?.client_message_template ?? r.client_message_template)?.toString().trim();
  const withCount = rights.filter(has).length;

  const filtered = rights.filter(r => {
    if (filter === "with" && !has(r)) return false;
    if (filter === "without" && has(r)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return r.topic_name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">נוסחי מייל פרטניים</h1>
              <p className="text-xs text-muted-foreground">{withCount} מתוך {rights.length} נושאים עם נוסח מותאם ושאלון</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><Users className="w-4 h-4" />פניות</Button></Link>
            <Link to="/admin/rights"><Button variant="ghost" size="sm" className="gap-2"><BookOpen className="w-4 h-4" />מאגר זכויות</Button></Link>
            <Link to="/admin/podcasts"><Button variant="ghost" size="sm" className="gap-2"><Mic className="w-4 h-4" />פודקאסטים</Button></Link>
            <Link to="/admin/videos"><Button variant="ghost" size="sm" className="gap-2"><Video className="w-4 h-4" />סרטונים</Button></Link>
            <Link to="/admin/documents"><Button variant="ghost" size="sm" className="gap-2"><FileText className="w-4 h-4" />מסמכים</Button></Link>
            <Link to="/admin/tips"><Button variant="ghost" size="sm" className="gap-2">💡 טיפים</Button></Link>
            <Link to="/admin/settings"><Button variant="ghost" size="sm" className="gap-2"><Settings className="w-4 h-4" />הגדרות</Button></Link>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2"><ArrowRight className="w-4 h-4" />חזרה</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            ✉️ <strong>נוסח אישי לכל לקוח:</strong> בכל נושא ניתן לערוך את נוסח המייל, רשימת מסמכים נדרשים ושאלון פרטני.
            הנוסח יישלח ללקוח עם קישור להשלמת הטופס. תשובות מזכות בירוק, לא מזכות באדום.
          </p>
        </Card>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי נושא או קטגוריה..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>הכל ({rights.length})</Button>
          <Button variant={filter === "with" ? "default" : "outline"} size="sm" onClick={() => setFilter("with")}>עם נוסח ({withCount})</Button>
          <Button variant={filter === "without" ? "default" : "outline"} size="sm" onClick={() => setFilter("without")}>חסר ({rights.length - withCount})</Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">לא נמצאו נושאים</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const isOpen = openId === r.id;
              const merged = { ...r, ...(editing[r.id] || {}) };
              const dirty = !!editing[r.id];
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <button className="flex items-center gap-2 flex-wrap flex-1 text-right" onClick={() => setOpenId(isOpen ? null : r.id)}>
                      <Badge variant="outline">#{r.topic_number}</Badge>
                      <h3 className="font-bold">{r.topic_name}</h3>
                      <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                      {has(r) ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">✉️ מוגדר</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">חסר</Badge>
                      )}
                      {isOpen ? <ChevronUp className="w-4 h-4 mr-auto text-muted-foreground" /> : <ChevronDown className="w-4 h-4 mr-auto text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <Button size="sm" onClick={() => save(r)} disabled={!dirty || saving === r.id} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving === r.id ? "שומר..." : "שמור"}
                      </Button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mt-3">
                      <ClientMessageEditor
                        value={merged as any}
                        onChange={(p) => patch(r.id, p as any)}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminClientMessages;
