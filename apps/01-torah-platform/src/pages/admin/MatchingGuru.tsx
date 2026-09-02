import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Phone, MapPin, BookOpen, Users, ArrowLeftRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AdminMatching = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const load = async () => {
    const [{ data: l }, { data: m }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      // profiles has no available_for_matching column — a maggid is really a
      // tenant_admin membership on a type="maggid" tenant (same source the
      // ai-match-teacher edge function scores against). memberships.user_id
      // points at auth.users, not public.profiles, so profiles can't be
      // embedded in this select (no FK path) — fetched separately below.
      supabase
        .from("memberships")
        .select("user_id, tenant_id, tenants(name, city, region, type, status)")
        .eq("role", "tenant_admin"),
    ]);
    // Lesson-request leads on the left
    setLeads((l || []).filter((x: any) => (x.kind || "lesson_request") === "lesson_request"));
    // Teachers on the right = maggid-tenant admins + teacher_offer leads (people from JoinTeacher form)
    const maggidMemberships = (m || []).filter((row: any) => row.tenants?.type === "maggid");
    const userIds = maggidMemberships.map((row: any) => row.user_id);
    const { data: p } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, phone, city, neighborhood, bio, meta").in("id", userIds)
      : { data: [] as any[] };
    const profileById = new Map((p || []).map((row: any) => [row.id, row]));
    const maggidim = maggidMemberships.map((row: any) => {
      const profile = profileById.get(row.user_id);
      // architecture.md §5.2 מגיד: "Switch פנוי למסירת שיעורים נוספים". Stored
      // in profiles.meta (same pattern as every other PortalSettings.tsx
      // field) — missing key means available (existing maggidim keep showing).
      const meta = (profile?.meta as Record<string, unknown>) || {};
      return {
        id: row.user_id,
        full_name: profile?.full_name || row.tenants?.name,
        city: profile?.city || row.tenants?.city,
        neighborhood: profile?.neighborhood,
        organization_name: row.tenants?.name,
        is_approved: row.tenants?.status === "active",
        is_available: meta.available_for_matching !== false,
        _phone: profile?.phone,
      };
    });
    const offerLeads = (l || [])
      .filter((x: any) => x.kind === "teacher_offer")
      .map((x: any) => ({
        id: `lead:${x.id}`,
        full_name: x.full_name,
        city: x.area,
        subjects: x.preferred_subject ? x.preferred_subject.split(",").map((s: string) => s.trim()) : [],
        organization_name: "מועמד מהאתר",
        is_approved: false,
        is_available: true,
        _isLead: true,
        _phone: x.phone,
      }));
    setTeachers([...maggidim, ...offerLeads]);
  };
  useEffect(() => { load(); }, []);

  const matches = (s: string, ...fields: any[]) =>
    !s || fields.filter(Boolean).join(" ").toLowerCase().includes(s.toLowerCase());

  const filteredLeads = useMemo(() => leads.filter(l =>
    matches(search, l.full_name, l.area, l.preferred_subject, l.message)
  ), [leads, search]);

  const filteredTeachers = useMemo(() => teachers.filter(t =>
    (showUnavailable || t.is_available) &&
    matches(search, t.full_name, t.city, t.neighborhood, (t.subjects || []).join(" "), t.organization_name)
  ), [teachers, search, showUnavailable]);

  const assign = async (leadId: string, teacherId: string) => {
    if (teacherId.startsWith("lead:")) {
      toast.error("מועמד זה הגיע מטופס ההצטרפות ועדיין לא נפתח לו פורטל. יש ליצור עבורו פורטל קודם.");
      return;
    }
    if (assigning === leadId) return;
    setAssigning(leadId);
    try {
      const { error } = await supabase.from("leads").update({ assigned_teacher_user_id: teacherId, status: "assigned" }).eq("id", leadId);
      if (error) return toast.error(error.message);
      toast.success("הליד שויך למגיד שיעור");
      load();
      setSelectedLead(null);
    } finally {
      setAssigning(null);
    }
  };

  const aiMatch = async () => {
    if (!selectedLead) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-teacher", {
        body: { lead_id: selectedLead.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const matches = data?.matches || [];
      if (!matches.length) toast.info("לא נמצאו התאמות");
      const lines = matches.map((m: any) => {
        const t = teachers.find((x: any) => x.id === m.user_id);
        const name = t?.full_name || m.user_id;
        return `${name}${m.score != null ? ` (${m.score}%)` : ""} — ${m.reason || ""}`;
      });
      setAiSuggestions(lines);
    } catch (e: any) {
      toast.error("שגיאה ב‑AI: " + (e.message || String(e)));
    } finally {
      setAiLoading(false);
    }
  };

  return (
      <div className="max-w-7xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-secondary" />התאמת שיעורים
          </h1>
          <p className="text-muted-foreground">צד אחד: מבקשי שיעור. צד שני: מגידי שיעור. סנן לפי עיר/נושא ושייך</p>
        </motion.div>

        <div className="bg-gradient-to-l from-secondary/10 via-card to-card border-2 border-secondary/20 rounded-2xl p-4 flex gap-3 items-center">
          <Search className="w-5 h-5 text-secondary shrink-0" />
          <Input placeholder="חיפוש משותף: עיר, נושא, שם, ארגון... (סינון בו זמנית בשני הטורים)"
            value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-secondary/30" />
          {selectedLead && (
            <Button onClick={aiMatch} disabled={aiLoading} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground gap-2 shrink-0">
              <Sparkles className="w-4 h-4" />{aiLoading ? "מחפש..." : "התאם ב‑AI לליד הנבחר"}
            </Button>
          )}
        </div>

        {aiSuggestions.length > 0 && (
          <div className="bg-secondary/5 border border-secondary/30 rounded-xl p-4">
            <h4 className="font-bold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-secondary" />הצעות AI</h4>
            <ul className="space-y-1 text-sm">
              {aiSuggestions.map((s, i) => <li key={i} className="text-foreground">{s}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Leads column */}
          <div className="bg-card rounded-2xl border-2 border-border overflow-hidden">
            <div className="bg-gradient-to-l from-blue-500/10 to-card p-4 border-b border-border">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />מבקשי שיעור ({filteredLeads.length})</h2>
            </div>
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {filteredLeads.map(l => (
                <div key={l.id} className={`p-4 cursor-pointer transition-colors ${selectedLead?.id === l.id ? "bg-secondary/10" : "hover:bg-muted/30"}`}
                  onClick={() => setSelectedLead(l)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{l.full_name}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        {l.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.area}</span>}
                        {l.preferred_subject && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{l.preferred_subject}</span>}
                        <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" />{l.phone}</span>
                      </div>
                    </div>
                    <Badge variant={l.status === "new" ? "default" : "outline"}>{l.status}</Badge>
                  </div>
                  {selectedLead?.id === l.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
                      {l.message && <p><strong>הודעה:</strong> {l.message}</p>}
                      {selectedTeacher && (
                        <Button size="sm" className="w-full mt-2 bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground gap-1"
                          disabled={assigning === l.id}
                          onClick={(e) => { e.stopPropagation(); assign(l.id, selectedTeacher.id); }}>
                          <ArrowLeftRight className="w-3 h-3" />{assigning === l.id ? "משייך..." : `שייך ל‑${selectedTeacher.full_name}`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredLeads.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">אין מבקשי שיעור התואמים לחיפוש</p>}
            </div>
          </div>

          {/* Teachers column */}
          <div className="bg-card rounded-2xl border-2 border-border overflow-hidden">
            <div className="bg-gradient-to-r from-secondary/10 to-card p-4 border-b border-border space-y-2">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-secondary" />איגוד מגידי השיעורים – פנויים ({filteredTeachers.length})</h2>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
                <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} className="accent-secondary" />
                הצג גם מגידים שסימנו עצמם "לא פנוי כרגע"
              </label>
            </div>
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {filteredTeachers.map(t => (
                <div key={t.id} className={`p-4 cursor-pointer transition-colors ${selectedTeacher?.id === t.id ? "bg-secondary/10" : "hover:bg-muted/30"}`}
                  onClick={() => setSelectedTeacher(t)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{t.full_name} {t.organization_name && <span className="text-muted-foreground text-xs">| {t.organization_name}</span>}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        {t.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.city}{t.neighborhood ? `, ${t.neighborhood}` : ""}</span>}
                        {(t.subjects || []).slice(0, 3).map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={t.is_approved ? "default" : "outline"}>{t.is_approved ? "מאושר" : "ממתין"}</Badge>
                      {!t.is_available && <Badge variant="destructive" className="text-xs">לא פנוי כרגע</Badge>}
                    </div>
                  </div>
                  {selectedTeacher?.id === t.id && selectedLead && (
                    <Button size="sm" className="w-full mt-2 bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground gap-1"
                      disabled={assigning === selectedLead.id}
                      onClick={(e) => { e.stopPropagation(); assign(selectedLead.id, t.id); }}>
                      <ArrowLeftRight className="w-3 h-3" />{assigning === selectedLead.id ? "משייך..." : `שייך את ${selectedLead.full_name} →`}
                    </Button>
                  )}
                </div>
              ))}
              {filteredTeachers.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">אין מגידי שיעור התואמים</p>}
            </div>
          </div>
        </div>

        {(selectedLead || selectedTeacher) && (
          <Button variant="outline" className="gap-2" onClick={() => { setSelectedLead(null); setSelectedTeacher(null); setAiSuggestions([]); }}>
            <X className="w-4 h-4" />נקה בחירה
          </Button>
        )}
      </div>
  );
};

export default AdminMatching;