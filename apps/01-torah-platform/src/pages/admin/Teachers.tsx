import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, UserX, Search, Plus, Copy, KeyRound, Building2, Users as UsersIcon, BookOpen, ExternalLink, Settings, Share2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PORTAL_TYPES } from "@/types/questionnaire";
import { buildInviteUrl, buildRabbiUrl, sanitizePublicUrls } from "@/lib/site";
import TeacherFeaturesDialog from "./TeacherFeaturesDialog";

const portalTypeLabel = (v: string) => PORTAL_TYPES.find(p => p.value === v)?.label || v;
const portalTypeIcon = (v: string) => v === "synagogue" ? Building2 : v === "organization" ? UsersIcon : BookOpen;

const generatePassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const AdminTeachers = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    portal_type: "rabbi", organization_name: "",
    initial_password: generatePassword(),
  });
  const { toast } = useToast();
  const [featuresFor, setFeaturesFor] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // "Teacher"/portal invites run on the real tenant_invites + tenants tables
  // (the same ones activate-invite and MatchingGuru.tsx use) -- there is no
  // teacher_invites table and profiles has no is_approved/email/public_token
  // columns live, so every prior version of this page silently no-op'd on
  // every action (core.issues #258).
  const fetchAll = async () => {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("profiles").select("*, tenant:tenants(id, status, type, name, display_name)").order("created_at", { ascending: false }),
      supabase.from("tenant_invites").select("*, tenants(id, name, display_name, type)").order("created_at", { ascending: false }),
    ]);
    setProfiles(p || []);
    setInvites(i || []);
  };

  useEffect(() => { fetchAll(); }, []);

  // "Approval" is expressed by the profile's tenant going active/pending --
  // same concept admin/MatchingGuru.tsx already relies on for its "מאושר" badge.
  const toggleApproval = async (p: any) => {
    if (!p.tenant?.id) {
      toast({ title: "לפרופיל זה אין פורטל (טננט) מקושר לאשר", variant: "destructive" });
      return;
    }
    if (busyId) return;
    setBusyId(p.id);
    const next = p.tenant.status === "active" ? "pending" : "active";
    try {
      const { error } = await supabase.from("tenants").update({ status: next }).eq("id", p.tenant.id);
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      } else {
        toast({ title: next === "active" ? "המגיד אושר בהצלחה" : "המגיד הוסר מהאישור" });
        fetchAll();
      }
    } finally {
      setBusyId(null);
    }
  };

  const createInvite = async () => {
    if (!form.full_name || !form.email || !form.initial_password) {
      toast({ title: "שגיאה", description: "שם, מייל וסיסמה הם שדות חובה", variant: "destructive" });
      return;
    }
    const slug = `${form.portal_type}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: tenant, error: tErr } = await supabase.from("tenants").insert({
      name: form.organization_name || form.full_name,
      display_name: form.organization_name || form.full_name,
      slug,
      type: form.portal_type,
      status: "pending",
    }).select().single();
    if (tErr) {
      toast({ title: "שגיאה ביצירת הפורטל", description: tErr.message, variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.from("tenant_invites").insert({
      tenant_id: tenant.id,
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name,
      phone: form.phone || null,
      initial_password: form.initial_password,
      role: "tenant_admin",
    }).select().single();

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    setCreatedInvite({ ...data, portal_type: form.portal_type });
    setShowCreate(false);
    setForm({ full_name: "", email: "", phone: "", portal_type: "rabbi", organization_name: "", initial_password: generatePassword() });
    fetchAll();
  };

  const copyInviteDetails = (inv: any) => {
    const url = buildInviteUrl(inv.invite_code, inv.email);
    const raw = `🎓 פורטל ${portalTypeLabel(inv.portal_type || inv.tenants?.type)} – איגוד מגידי השיעורים\n\nשלום ${inv.full_name},\nנפתח עבורך פורטל אישי במערכת.\n\n🔗 לחץ להפעלה (הקוד והמייל ימולאו אוטומטית):\n${url}\n\n📧 מייל: ${inv.email}\n🔑 קוד הזמנה: ${inv.invite_code}\n🔒 סיסמה ראשונית: ${inv.initial_password}\n\nניתן לשנות את הסיסמה לאחר הכניסה.`;
    navigator.clipboard.writeText(sanitizePublicUrls(raw));
    toast({ title: "פרטי ההזמנה הועתקו! ניתן לשלוח בוואטסאפ או במייל" });
  };

  const copyLoginForProfile = (p: any) => {
    const inv = invites.find((i) => i.tenant_id === p.preferred_tenant_id);
    if (!inv) {
      toast({ title: "לא נמצאה הזמנה עבור פרופיל זה. צור הזמנה חדשה.", variant: "destructive" });
      return;
    }
    const url = sanitizePublicUrls(buildInviteUrl(inv.invite_code, inv.email));
    navigator.clipboard.writeText(url);
    toast({ title: "קישור הפעלה / כניסה הועתק", description: url });
  };

  const emailByTenant = Object.fromEntries(invites.map((i) => [i.tenant_id, i.email]));

  const filtered = profiles.filter(p => {
    const email = emailByTenant[p.preferred_tenant_id] || "";
    return p.full_name?.includes(search) || email.includes(search) || p.city?.includes(search);
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">ניהול מגידים, ארגונים ובתי כנסת</h1>
            <p className="text-muted-foreground">אישור והנפקת פורטלים חדשים עם סיסמה ראשונית</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-secondary-foreground hover:bg-gold-dark gap-2">
                <Plus className="w-4 h-4" />פתח פורטל חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-2 border-secondary/40 bg-gradient-to-br from-card via-card to-secondary/5 shadow-[0_20px_60px_-15px_hsl(var(--secondary)/0.4)]" dir="rtl">
              <DialogHeader className="border-b border-secondary/20 pb-3">
                <DialogTitle className="font-heading text-2xl text-foreground flex items-center gap-2">
                  <KeyRound className="w-6 h-6 text-secondary" />
                  פתיחת פורטל חדש
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">הנפק חשבון ניהול עבור מגיד שיעור, ארגון או בית כנסת</p>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">סוג הפורטל *</label>
                  <Select value={form.portal_type} onValueChange={(v) => setForm(f => ({ ...f, portal_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PORTAL_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">שם מלא *</label>
                  <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="הרב ישראל ישראלי" />
                </div>
                {form.portal_type !== "rabbi" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">שם הארגון / בית הכנסת</label>
                    <Input value={form.organization_name} onChange={(e) => setForm(f => ({ ...f, organization_name: e.target.value }))} placeholder="בית כנסת אהל יעקב" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">מייל *</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">טלפון</label>
                    <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 flex items-center justify-between text-foreground">
                    <span>סיסמה ראשונית *</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, initial_password: generatePassword() }))}
                      className="text-xs text-secondary hover:text-gold-dark font-medium hover:underline">צור סיסמה חדשה</button>
                  </label>
                  <Input value={form.initial_password} onChange={(e) => setForm(f => ({ ...f, initial_password: e.target.value }))} dir="ltr" className="font-mono tracking-wider" />
                </div>
              </div>
              <DialogFooter className="mt-4 pt-3 border-t border-secondary/20">
                <Button variant="outline" onClick={() => setShowCreate(false)}>ביטול</Button>
                <Button onClick={createInvite} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground hover:opacity-90 shadow-md">
                  <KeyRound className="w-4 h-4 ml-1" />צור הזמנה
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Created invite confirmation dialog */}
        <Dialog open={!!createdInvite} onOpenChange={(o) => !o && setCreatedInvite(null)}>
          <DialogContent dir="rtl" className="border-2 border-secondary/40 bg-gradient-to-br from-card via-card to-secondary/5 shadow-[0_20px_60px_-15px_hsl(var(--secondary)/0.4)]">
            <DialogHeader className="border-b border-secondary/20 pb-3">
              <DialogTitle className="font-heading text-2xl flex items-center gap-2 text-foreground">
                <KeyRound className="w-6 h-6 text-secondary" />ההזמנה נוצרה בהצלחה
              </DialogTitle>
            </DialogHeader>
            {createdInvite && (
              <div className="space-y-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div><span className="text-muted-foreground">סוג פורטל: </span><strong>{portalTypeLabel(createdInvite.portal_type)}</strong></div>
                  <div><span className="text-muted-foreground">מייל: </span><span dir="ltr">{createdInvite.email}</span></div>
                  <div><span className="text-muted-foreground">קוד הזמנה: </span><code className="bg-card px-2 py-0.5 rounded">{createdInvite.invite_code}</code></div>
                  <div><span className="text-muted-foreground">סיסמה: </span><code className="bg-card px-2 py-0.5 rounded">{createdInvite.initial_password}</code></div>
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    שלח למגיד השיעור את הקוד והסיסמה. הוא יפעיל בכתובת: <code dir="ltr">/invite</code>
                  </div>
                </div>
                <Button onClick={() => copyInviteDetails(createdInvite)} className="w-full gap-2">
                  <Copy className="w-4 h-4" />העתק הודעה מוכנה לשליחה
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pending invites */}
        {invites.filter(i => !i.used_at).length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-heading font-bold mb-3">הזמנות פתוחות ({invites.filter(i => !i.used_at).length})</h2>
            <div className="space-y-2">
              {invites.filter(i => !i.used_at).map(inv => {
                const Icon = portalTypeIcon(inv.tenants?.type);
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-secondary" />
                      <div>
                        <p className="font-medium">{inv.full_name} <Badge variant="outline" className="mr-1">{portalTypeLabel(inv.tenants?.type)}</Badge></p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{inv.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyInviteDetails(inv)} className="gap-1">
                      <Copy className="w-3 h-3" />העתק
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם, אימייל או עיר..." className="pr-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right p-4 font-medium text-muted-foreground">שם</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">סוג</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">אימייל</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">עיר</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">סטטוס</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-4 font-medium text-foreground">{p.full_name || "—"}</td>
                    <td className="p-4"><Badge variant="outline">{portalTypeLabel(p.tenant?.type || p.portal_type || "rabbi")}</Badge></td>
                    <td className="p-4 text-muted-foreground">{emailByTenant[p.preferred_tenant_id] || "—"}</td>
                    <td className="p-4 text-muted-foreground">{p.city || "—"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.tenant?.status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.tenant?.status === "active" ? "מאושר" : "ממתין"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant={p.tenant?.status === "active" ? "outline" : "default"} disabled={busyId === p.id} onClick={() => toggleApproval(p)}>
                        {p.tenant?.status === "active" ? <><UserX className="w-4 h-4 ml-1" />בטל</> : <><UserCheck className="w-4 h-4 ml-1" />אשר</>}
                      </Button>
                      <Button size="sm" variant="outline" className="mr-1 gap-1" onClick={() => setFeaturesFor(p)}>
                        <Settings className="w-3 h-3" />הרשאות
                      </Button>
                      {p.tenant?.id && (
                        <Button size="sm" variant="outline" className="mr-1 gap-1" onClick={() => {
                          navigator.clipboard.writeText(buildRabbiUrl(p.id));
                          toast({ title: "קישור הפרופיל הציבורי הועתק" });
                        }}>
                          <Share2 className="w-3 h-3" />קישור הפצה
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="mr-1 gap-1" onClick={() => copyLoginForProfile(p)}>
                        <LogIn className="w-3 h-3" />קישור כניסה
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">לא נמצאו מגידים</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {featuresFor && (
          <TeacherFeaturesDialog
            teacher={featuresFor}
            open={!!featuresFor}
            onOpenChange={(o) => !o && setFeaturesFor(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTeachers;