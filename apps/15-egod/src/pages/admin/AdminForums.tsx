import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Plus, Trash2, Pin, Ban, CheckCircle, Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const AdminForums = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "MessageSquare", is_restricted: false, sort_order: 0 });
  const [composeFor, setComposeFor] = useState<any | null>(null);
  const [composeText, setComposeText] = useState("");

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("forum_categories").select("*").order("sort_order"),
      supabase.from("forum_posts").select("*, profiles:author_id(full_name), forum_categories:category_id(name)").order("created_at", { ascending: false }).limit(200),
    ]);
    setCategories(c || []);
    setPosts(p || []);
  };
  useEffect(() => { load(); }, []);

  const createCategory = async () => {
    if (!form.name) return toast.error("שם פורום חובה");
    const { error } = await supabase.from("forum_categories").insert(form);
    if (error) return toast.error(error.message);
    toast.success("הפורום נוצר");
    setShowNew(false);
    setForm({ name: "", description: "", icon: "MessageSquare", is_restricted: false, sort_order: 0 });
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("למחוק את הפורום? כל הפוסטים יישארו אך לא יוצגו.")) return;
    await supabase.from("forum_categories").delete().eq("id", id);
    toast.success("נמחק");
    load();
  };

  const togglePin = async (post: any) => {
    await supabase.from("forum_posts").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
    load();
  };
  const toggleBlock = async (post: any) => {
    await supabase.from("forum_posts").update({ is_blocked: !post.is_blocked }).eq("id", post.id);
    load();
  };
  const deletePost = async (id: string) => {
    if (!confirm("למחוק את ההודעה?")) return;
    await supabase.from("forum_posts").delete().eq("id", id);
    toast.success("נמחק");
    load();
  };

  const sendOfficial = async () => {
    if (!composeFor || !composeText.trim()) return;
    // Need an author profile id – use any admin profile (current user's profile)
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", u.user!.id).maybeSingle();
    if (!prof) return toast.error("נדרש פרופיל אדמין");
    const { error } = await supabase.from("forum_posts").insert({
      category_id: composeFor.id, author_id: prof.id, content: composeText.trim(), is_pinned: true,
    });
    if (error) return toast.error(error.message);
    toast.success("פורסם בפורום");
    setComposeText(""); setComposeFor(null); load();
  };

  const filteredPosts = posts.filter(p => !search || p.content?.includes(search) || p.profiles?.full_name?.includes(search));

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-1">ניהול פורומים</h1>
          <p className="text-muted-foreground">ניהול קטגוריות, פוסטים והרשאות לכל פורום</p>
        </motion.div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">קטגוריות פורום ({categories.length})</TabsTrigger>
            <TabsTrigger value="posts">פוסטים ותגובות ({posts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-3">
            <Button onClick={() => setShowNew(true)} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground gap-2">
              <Plus className="w-4 h-4" />צור פורום חדש
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map(c => (
                <div key={c.id} className="bg-card border-2 border-border hover:border-secondary/40 rounded-2xl p-4 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-secondary" />{c.name}
                        {c.is_restricted && <Badge variant="outline">מוגבל</Badge>}
                      </p>
                      {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => setComposeFor(c)} className="gap-1">
                        <Send className="w-3 h-3" />פרסם מטעם הניהול
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />מחק
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12 bg-card rounded-2xl border border-dashed">
                  אין פורומים. צור פורום חדש להתחיל.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-4 space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש בפוסטים..." className="pr-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-2">
              {filteredPosts.map(p => (
                <div key={p.id} className={`bg-card border rounded-xl p-4 ${p.is_blocked ? "opacity-60 border-destructive/40" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
                        <Badge variant="outline">{p.forum_categories?.name || "—"}</Badge>
                        <span className="font-medium text-foreground">{p.profiles?.full_name || "אנונימי"}</span>
                        <span>{new Date(p.created_at).toLocaleString("he-IL")}</span>
                        {p.is_pinned && <Badge className="bg-secondary/20 text-secondary"><Pin className="w-3 h-3 ml-1" />נעוץ</Badge>}
                        {p.is_blocked && <Badge variant="destructive">חסום</Badge>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => togglePin(p)}><Pin className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleBlock(p)}>
                        {p.is_blocked ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Ban className="w-3 h-3 text-destructive" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && <p className="text-center text-muted-foreground py-12">אין פוסטים</p>}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent dir="rtl" className="bg-gradient-to-br from-card to-secondary/5 border-2 border-secondary/30">
            <DialogHeader><DialogTitle className="font-heading text-2xl">פורום חדש</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-sm font-medium mb-1 block">שם הפורום *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="לדוגמא: שאלות בהלכה" />
              </div>
              <div><label className="text-sm font-medium mb-1 block">תיאור</label>
                <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">סדר תצוגה</label>
                  <Input type="number" inputMode="numeric" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))} />
                </div>
                <label className="flex items-center justify-between bg-muted/30 rounded-lg p-2 mt-6">
                  <span className="text-sm">פורום מוגבל</span>
                  <Switch checked={form.is_restricted} onCheckedChange={v => setForm(f => ({ ...f, is_restricted: v }))} />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNew(false)}>ביטול</Button>
              <Button onClick={createCategory} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground">צור פורום</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!composeFor} onOpenChange={(o) => !o && setComposeFor(null)}>
          <DialogContent dir="rtl" className="bg-gradient-to-br from-card to-secondary/5 border-2 border-secondary/30">
            <DialogHeader><DialogTitle className="font-heading text-xl">פרסום בפורום: {composeFor?.name}</DialogTitle></DialogHeader>
            <Textarea rows={6} placeholder="כתוב הודעה רשמית מטעם הניהול..." value={composeText} onChange={e => setComposeText(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setComposeFor(null)}>ביטול</Button>
              <Button onClick={sendOfficial} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground">פרסם ונעץ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminForums;