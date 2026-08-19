import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, Save, Search, Mic, BookOpen, FileText, Settings, Users, Video } from "lucide-react";

interface Right {
  id: string;
  topic_number: number;
  topic_name: string;
  category: string;
  podcast_text: string | null;
}

const AdminPodcasts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rights, setRights] = useState<Right[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

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
    const { data, error } = await supabase
      .from("rights_reference")
      .select("id, topic_number, topic_name, category, podcast_text")
      .order("topic_number");
    if (error) { toast.error("שגיאה בטעינה"); setLoading(false); return; }
    setRights(data || []);
    setLoading(false);
  };

  const save = async (id: string) => {
    const text = editing[id] ?? "";
    setSaving(id);
    const { error } = await supabase
      .from("rights_reference")
      .update({ podcast_text: text || null })
      .eq("id", id);
    setSaving(null);
    if (error) { toast.error("שגיאה בשמירה"); return; }
    toast.success("נשמר");
    setRights(rs => rs.map(r => r.id === id ? { ...r, podcast_text: text || null } : r));
    setEditing(e => { const n = { ...e }; delete n[id]; return n; });
  };

  const filtered = rights.filter(r => {
    if (filter === "with" && !r.podcast_text) return false;
    if (filter === "without" && r.podcast_text) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return r.topic_name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s);
  });

  const withCount = rights.filter(r => r.podcast_text).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Mic className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">ניהול פודקאסטים</h1>
              <p className="text-xs text-muted-foreground">{withCount} מתוך {rights.length} נושאים עם נוסח פנימי</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><Users className="w-4 h-4" />פניות</Button></Link>
            <Link to="/admin/rights"><Button variant="ghost" size="sm" className="gap-2"><BookOpen className="w-4 h-4" />מאגר זכויות</Button></Link>
            <Link to="/admin/messages"><Button variant="ghost" size="sm" className="gap-2">✉️ נוסחי מייל</Button></Link>
            <Link to="/admin/videos"><Button variant="ghost" size="sm" className="gap-2"><Video className="w-4 h-4" />סרטונים</Button></Link>
            <Link to="/admin/documents"><Button variant="ghost" size="sm" className="gap-2"><FileText className="w-4 h-4" />מסמכים</Button></Link>
            <Link to="/admin/tips"><Button variant="ghost" size="sm" className="gap-2">💡 טיפים</Button></Link>
            <Link to="/admin/settings"><Button variant="ghost" size="sm" className="gap-2"><Settings className="w-4 h-4" />הגדרות</Button></Link>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2"><ArrowRight className="w-4 h-4" />חזרה</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900">
            ⚠️ <strong>שדה פנימי בלבד:</strong> נוסחי הפודקאסט נשמרים במאגר אבל לא נשלחים ללקוחות באתר/בבוט/ב-AI ולא נכללים בקבצי האקסל הציבוריים להורדה.
          </p>
        </Card>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי נושא או קטגוריה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>הכל ({rights.length})</Button>
          <Button variant={filter === "with" ? "default" : "outline"} size="sm" onClick={() => setFilter("with")}>עם פודקאסט ({withCount})</Button>
          <Button variant={filter === "without" ? "default" : "outline"} size="sm" onClick={() => setFilter("without")}>חסר ({rights.length - withCount})</Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">לא נמצאו נושאים</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const isEditing = r.id in editing;
              const value = isEditing ? editing[r.id] : (r.podcast_text || "");
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">#{r.topic_number}</Badge>
                      <h3 className="font-bold">{r.topic_name}</h3>
                      <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                      {r.podcast_text ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">✓ יש נוסח</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">חסר</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => save(r.id)}
                      disabled={!isEditing || saving === r.id}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving === r.id ? "שומר..." : "שמור"}
                    </Button>
                  </div>
                  <Textarea
                    value={value}
                    onChange={(e) => setEditing(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="טקסט מלא לקריינות בפודקאסט. שדה פנימי - לא נשלח לציבור."
                    rows={6}
                    className="text-sm font-mono"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground mt-2">{value.length} תווים</p>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPodcasts;
