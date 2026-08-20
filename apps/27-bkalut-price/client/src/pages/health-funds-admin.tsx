import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import {
  Trash2, Plus, Save, RefreshCw, Search, Copy, ExternalLink, Globe,
  ChevronDown, ChevronUp, PlusCircle, Inbox, Mic, Send, Wand2, Loader2,
} from "lucide-react";

// Admin console for the health-fund comparison database. Every parameter is
// editable (basic + full internal fields), tiers (per-fund/program values) can
// be added/edited/removed, and new topics can be created — numbered 500+
// automatically. Mirrors the rights / price-comparison admin pattern; uses
// apiRequest so the admin session cookie is carried. Renders inside the
// authenticated dashboard shell.

interface HfTier { id: number; topicId: number; col: number; fund: string; fundKey: string; tier: string; prog: string; value: string }
interface HfTopic {
  id: number; catalogNo: number; kind: string; category: string; subCategory: string;
  topic: string; audience: string; benefitSummary: string; rangeText: string;
  rangeMin: number | null; rangeMax: number | null; bestFund: string; publicSiteText: string;
  treatingBody: string; fullBenefit: string; conditions: string; qualifyingCases: string;
  preparation: string; documents: string; howToApply: string; officialLinks: string;
  notes: string; aiSearch: string; sortOrder: number; active: boolean; tiers?: HfTier[];
  podcastScript?: string; podcastAudioUrl?: string; podcastStatus?: string; podcastUpdatedAt?: string | null;
}
interface HfRequest {
  id: number; topicId: number | null; catalogNo: number | null; topic: string;
  requestType: string; fullName: string; phone: string; email: string; note: string;
  channel: string; webhookStatus: string | null; webhookMessage: string | null; createdAt: string;
}
interface HfSwitchLead {
  id: number; topicId: number | null; catalogNo: number | null; topic: string;
  fullName: string; phone: string; email: string; idNumber: string; city: string;
  currentFund: string; currentSupplemental: string; targetFund: string; peopleCount: string;
  note: string; status: string; handlingNote: string; channel: string;
  webhookStatus: string | null; webhookMessage: string | null; createdAt: string; updatedAt: string;
}

// Switch-fund lead handling statuses — mirror server HF_SWITCH_STATUSES.
const SWITCH_STATUS_LABELS: Record<string, string> = {
  new: "חדש", in_progress: "בטיפול", done: "טופל", irrelevant: "לא רלוונטי",
};
const SWITCH_STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
  irrelevant: "bg-muted text-muted-foreground",
};

const FUNDS = [
  { key: "clalit", name: "כללית", color: "#00A0AF" },
  { key: "maccabi", name: "מכבי", color: "#005BAB" },
  { key: "meuhedet", name: "מאוחדת", color: "#5BA829" },
  { key: "leumit", name: "לאומית", color: "#F57F20" },
];

const REQUEST_LABELS: Record<string, string> = {
  info: "קבלת מידע",
  reminder: "קבלת מידע ותזכורת",
  treatment: 'ביצוע ע"י צוות בקלות',
};

const emptyNew = {
  kind: "fund", category: "", subCategory: "", topic: "", audience: "",
  benefitSummary: "", rangeText: "", rangeMin: "", rangeMax: "", bestFund: "",
  publicSiteText: "", treatingBody: "", fullBenefit: "", conditions: "",
  qualifyingCases: "", preparation: "", documents: "", howToApply: "",
  officialLinks: "", notes: "", aiSearch: "",
};

// Editable fields shown in the per-topic editor, grouped public vs internal.
const PUBLIC_FIELDS: Array<{ k: keyof HfTopic; label: string; area?: boolean }> = [
  { k: "topic", label: "שם הנושא" },
  { k: "category", label: "קטגוריה" },
  { k: "subCategory", label: "תת-קטגוריה" },
  { k: "audience", label: "למי מיועד" },
  { k: "benefitSummary", label: "תקציר ההטבה (מוצג בכרטיס)", area: true },
  { k: "rangeText", label: 'טווח שניתן לקבל (למשל "החזר סל לידה בין 1,000 ל-5,000")' },
  { k: "bestFund", label: "הקופה המיטיבה" },
  { k: "publicSiteText", label: "טקסט ציבורי נוסף", area: true },
];
const INTERNAL_FIELDS: Array<{ k: keyof HfTopic; label: string; area?: boolean }> = [
  { k: "treatingBody", label: "גוף מטפל" },
  { k: "fullBenefit", label: "פירוט ההטבה המלא", area: true },
  { k: "conditions", label: "תנאי זכאות (ממוספרים)", area: true },
  { k: "qualifyingCases", label: "מקרים מזכים", area: true },
  { k: "preparation", label: "הכנה מקדימה", area: true },
  { k: "documents", label: "מסמכים נדרשים", area: true },
  { k: "howToApply", label: "אופן הבקשה", area: true },
  { k: "officialLinks", label: "קישורים רשמיים", area: true },
  { k: "notes", label: "הערות פנימיות", area: true },
  { k: "aiSearch", label: "מילות חיפוש (לחיפוש החכם)", area: true },
];

export default function HealthFundsAdmin() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<HfTopic[]>([]);
  const [requests, setRequests] = useState<HfRequest[]>([]);
  const [switchLeads, setSwitchLeads] = useState<HfSwitchLead[]>([]);
  const [switchDraft, setSwitchDraft] = useState<Record<number, { status: string; handlingNote: string }>>({});
  const [switchBusy, setSwitchBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"" | "fund" | "gov" | "ngo">("");
  const kindFilterRef = useRef(kindFilter);
  kindFilterRef.current = kindFilter;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<HfTopic>>({});
  const [showInternal, setShowInternal] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTopic, setNewTopic] = useState({ ...emptyNew });
  const [newTier, setNewTier] = useState({ col: "", fund: "", fundKey: "", tier: "", prog: "", value: "" });
  const [podcastBusy, setPodcastBusy] = useState<"" | "script" | "save" | "audio" | "delete" | "send">("");

  const publicUrl = `${getPublicOrigin()}/#/health-funds`;
  const adminUrl = `${getPublicOrigin()}/#/health-funds-admin`;

  async function loadTopics() {
    const requestedKind = kindFilter;
    setLoading(true);
    try {
      const r = await apiRequest("GET", `/api/hf/admin/topics?withTiers=1${requestedKind ? `&kind=${requestedKind}` : ""}`);
      const data = await r.json();
      if (kindFilterRef.current !== requestedKind) return; // a newer filter click already superseded this response
      setTopics(data);
    } catch {
      toast({ title: "שגיאה בטעינה", variant: "destructive" });
    } finally {
      if (kindFilterRef.current === requestedKind) setLoading(false);
    }
  }

  async function loadRequests() {
    try {
      const r = await apiRequest("GET", "/api/hf/admin/requests");
      setRequests(await r.json());
    } catch { /* non-fatal */ }
  }

  async function loadSwitchLeads() {
    try {
      const r = await apiRequest("GET", "/api/hf/admin/switch-leads");
      const rows: HfSwitchLead[] = await r.json();
      setSwitchLeads(rows);
      setSwitchDraft(Object.fromEntries(rows.map((l) => [l.id, { status: l.status, handlingNote: l.handlingNote ?? "" }])));
    } catch { /* non-fatal */ }
  }

  async function saveSwitchLead(id: number) {
    const d = switchDraft[id];
    if (!d) return;
    setSwitchBusy(id);
    try {
      await apiRequest("PATCH", `/api/hf/admin/switch-leads/${id}`, { status: d.status, handlingNote: d.handlingNote });
      toast({ title: "נשמר" });
      await loadSwitchLeads();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setSwitchBusy(null);
    }
  }

  async function deleteSwitchLead(id: number) {
    if (!window.confirm("למחוק ליד זה?")) return;
    setSwitchBusy(id);
    try {
      await apiRequest("DELETE", `/api/hf/admin/switch-leads/${id}`);
      toast({ title: "הליד נמחק" });
      await loadSwitchLeads();
    } catch {
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    } finally {
      setSwitchBusy(null);
    }
  }

  useEffect(() => { loadTopics(); loadRequests(); loadSwitchLeads(); /* eslint-disable-next-line */ }, [kindFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return topics;
    return topics.filter((t) =>
      t.topic.toLowerCase().includes(needle) ||
      t.category.toLowerCase().includes(needle) ||
      String(t.catalogNo).includes(needle) ||
      (t.audience || "").toLowerCase().includes(needle),
    );
  }, [topics, q]);

  function openEditor(t: HfTopic) {
    if (expandedId === t.id) { setExpandedId(null); return; }
    setExpandedId(t.id);
    setDraft({ ...t });
    setShowInternal(false);
    setNewTier({ col: "", fund: "", fundKey: "", tier: "", prog: "", value: "" });
  }

  async function saveTopic(id: number) {
    try {
      const patch: any = { ...draft };
      if (patch.rangeMin === "" ) patch.rangeMin = null;
      if (patch.rangeMax === "") patch.rangeMax = null;
      delete patch.tiers;
      const r = await apiRequest("PATCH", `/api/hf/admin/topics/${id}`, patch);
      if (!r.ok) throw new Error("save failed");
      toast({ title: "נשמר", description: `נושא #${draft.catalogNo} עודכן.` });
      await loadTopics();
    } catch {
      toast({ title: "שמירה נכשלה", variant: "destructive" });
    }
  }

  async function toggleActive(t: HfTopic, active: boolean) {
    try {
      const r = await apiRequest("PATCH", `/api/hf/admin/topics/${t.id}`, { active });
      if (!r.ok) throw new Error();
      setTopics((prev) => prev.map((x) => (x.id === t.id ? { ...x, active } : x)));
    } catch {
      toast({ title: "העדכון נכשל", variant: "destructive" });
    }
  }

  const removingTopicRef = useRef<Set<number>>(new Set());
  async function removeTopic(t: HfTopic) {
    if (!window.confirm(`למחוק את הנושא "${t.topic}" (#${t.catalogNo})? פעולה זו אינה הפיכה.`)) return;
    if (removingTopicRef.current.has(t.id)) return;
    removingTopicRef.current.add(t.id);
    try {
      const r = await apiRequest("DELETE", `/api/hf/admin/topics/${t.id}`);
      if (!r.ok) throw new Error();
      toast({ title: "הנושא נמחק" });
      if (expandedId === t.id) setExpandedId(null);
      await loadTopics();
    } catch {
      toast({ title: "מחיקת הנושא נכשלה", variant: "destructive" });
    } finally {
      removingTopicRef.current.delete(t.id);
    }
  }

  async function addTier(topicId: number) {
    if (!newTier.fund.trim() || !newTier.value.trim()) {
      toast({ title: "חסרים פרטים", description: "שם הקופה והערך הם חובה.", variant: "destructive" });
      return;
    }
    try {
      const r = await apiRequest("POST", `/api/hf/admin/topics/${topicId}/tiers`, {
        col: newTier.col ? Number(newTier.col) : 0,
        fund: newTier.fund, fundKey: newTier.fundKey, tier: newTier.tier, prog: newTier.prog, value: newTier.value,
      });
      if (!r.ok) throw new Error();
      setNewTier({ col: "", fund: "", fundKey: "", tier: "", prog: "", value: "" });
      await loadTopics();
      const fresh = await apiRequest("GET", `/api/hf/admin/topics/${topicId}`).then((r) => r.json());
      setDraft((d) => ({ ...d, tiers: fresh.tiers }));
    } catch {
      toast({ title: "הוספת המדרגה נכשלה", variant: "destructive" });
    }
  }

  async function updateTierValue(tier: HfTier, value: string) {
    try {
      const r = await apiRequest("PATCH", `/api/hf/admin/tiers/${tier.id}`, { value });
      if (!r.ok) throw new Error();
      setDraft((d) => ({ ...d, tiers: (d.tiers ?? []).map((t) => (t.id === tier.id ? { ...t, value } : t)) }));
    } catch {
      toast({ title: "עדכון הערך נכשל", variant: "destructive" });
    }
  }

  const removingTierRef = useRef<Set<number>>(new Set());
  async function removeTier(tier: HfTier) {
    if (removingTierRef.current.has(tier.id)) return;
    removingTierRef.current.add(tier.id);
    try {
      const r = await apiRequest("DELETE", `/api/hf/admin/tiers/${tier.id}`);
      if (!r.ok) throw new Error();
      setDraft((d) => ({ ...d, tiers: (d.tiers ?? []).filter((t) => t.id !== tier.id) }));
      await loadTopics();
    } catch {
      toast({ title: "מחיקת המדרגה נכשלה", variant: "destructive" });
    } finally {
      removingTierRef.current.delete(tier.id);
    }
  }

  // ---- Podcast (text + audio) management ----
  async function genPodcastScript(id: number) {
    setPodcastBusy("script");
    try {
      const r = await apiRequest("POST", `/api/hf/admin/topics/${id}/podcast/script`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setDraft((d) => ({ ...d, podcastScript: data.podcastScript ?? "", podcastStatus: data.podcastStatus ?? "draft" }));
      toast({ title: "נוצר סקריפט פודקאסט", description: "ניתן לערוך את הטקסט לפני יצירת האודיו." });
    } catch {
      toast({ title: "יצירת הסקריפט נכשלה", variant: "destructive" });
    } finally { setPodcastBusy(""); }
  }

  async function savePodcastScript(id: number) {
    setPodcastBusy("save");
    try {
      const r = await apiRequest("PUT", `/api/hf/admin/topics/${id}/podcast/script`, { script: draft.podcastScript ?? "" });
      if (!r.ok) throw new Error();
      toast({ title: "הטקסט נשמר" });
    } catch {
      toast({ title: "שמירת הטקסט נכשלה", variant: "destructive" });
    } finally { setPodcastBusy(""); }
  }

  async function genPodcastAudio(id: number) {
    setPodcastBusy("audio");
    try {
      const r = await apiRequest("POST", `/api/hf/admin/topics/${id}/podcast/audio`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.podcastAudioUrl) throw new Error(data.error || "");
      setDraft((d) => ({ ...d, podcastAudioUrl: data.podcastAudioUrl, podcastStatus: data.podcastStatus ?? "ready" }));
      toast({ title: "האודיו נוצר", description: "ניתן להאזין, להוריד או לשלוח למערכת הקולית." });
      await loadTopics();
    } catch (e: any) {
      toast({ title: "יצירת האודיו נכשלה", description: e?.message || "נסו שוב מאוחר יותר.", variant: "destructive" });
    } finally { setPodcastBusy(""); }
  }

  async function delPodcastAudio(id: number) {
    if (!window.confirm("למחוק את קובץ האודיו? הטקסט יישאר ותוכלו ליצור אודיו מחדש.")) return;
    setPodcastBusy("delete");
    try {
      const r = await apiRequest("DELETE", `/api/hf/admin/topics/${id}/podcast/audio`);
      if (!r.ok) throw new Error();
      setDraft((d) => ({ ...d, podcastAudioUrl: "", podcastStatus: "draft" }));
      toast({ title: "האודיו נמחק" });
      await loadTopics();
    } catch {
      toast({ title: "מחיקת האודיו נכשלה", variant: "destructive" });
    } finally { setPodcastBusy(""); }
  }

  async function sendPodcast(id: number) {
    if (!window.confirm("לשלוח את הפודקאסט למערכת הקולית (אותו קולבק)?")) return;
    setPodcastBusy("send");
    try {
      const r = await apiRequest("POST", `/api/hf/admin/topics/${id}/podcast/send`);
      if (!r.ok) throw new Error();
      toast({ title: "נשלח למערכת הקולית", description: "הפודקאסט נשלח לאותו קולבק." });
    } catch {
      toast({ title: "השליחה נכשלה", variant: "destructive" });
    } finally { setPodcastBusy(""); }
  }

  async function createTopic() {
    if (!newTopic.topic.trim()) {
      toast({ title: "שם נושא חסר", description: "יש להזין שם נושא.", variant: "destructive" });
      return;
    }
    try {
      const payload: any = { ...newTopic };
      payload.rangeMin = newTopic.rangeMin ? Number(newTopic.rangeMin) : null;
      payload.rangeMax = newTopic.rangeMax ? Number(newTopic.rangeMax) : null;
      const r = await apiRequest("POST", "/api/hf/admin/topics", payload);
      if (!r.ok) throw new Error();
      const created = await r.json();
      toast({ title: "נוצר נושא חדש", description: `מספר קטלוגי ${created.catalogNo}.` });
      setNewTopic({ ...emptyNew });
      setShowNew(false);
      await loadTopics();
    } catch {
      toast({ title: "יצירת הנושא נכשלה", variant: "destructive" });
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "הקישור הועתק" }),
      () => toast({ title: "העתיקו ידנית", description: text }),
    );
  }

  return (
    <div className="space-y-5 pb-10" dir="rtl" data-testid="page-health-funds-admin">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ניהול השוואת קופות חולים</h1>
          <p className="text-sm text-muted-foreground">מאגר נפרד (hf_*) המשולב במערכת בקלות. עריכת כל פרמטר, ניהול מסלולי קופות והוספת נושאים.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadTopics(); loadRequests(); }} data-testid="button-hf-admin-refresh">
            <RefreshCw className="w-4 h-4 ml-1" /> רענון
          </Button>
          <Button size="sm" onClick={() => setShowNew((v) => !v)} data-testid="button-hf-admin-new">
            <Plus className="w-4 h-4 ml-1" /> נושא חדש
          </Button>
        </div>
      </div>

      {/* Public / admin links */}
      <Card className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" data-testid="hf-admin-links">
        <span className="inline-flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> קישור ציבורי:
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1" data-testid="link-hf-public">
            {publicUrl} <ExternalLink className="w-3 h-3" />
          </a>
          <Button variant="ghost" size="icon" onClick={() => copy(publicUrl)}><Copy className="w-3.5 h-3.5" /></Button>
        </span>
        <span className="text-xs text-muted-foreground">קישור חיפוש נפרד וייעודי בין הקופות — חלק ממאגר הזכויות הפנימי.</span>
      </Card>

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics" data-testid="tab-hf-topics">נושאים ({topics.length})</TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-hf-requests">פניות ({requests.length})</TabsTrigger>
          <TabsTrigger value="switch" data-testid="tab-hf-switch">מעבר קופה ({switchLeads.length})</TabsTrigger>
        </TabsList>

        {/* ---- Topics tab ---- */}
        <TabsContent value="topics" className="space-y-4 pt-4">
          {showNew && (
            <Card className="p-4 space-y-3 border-primary/30" data-testid="hf-admin-new-form">
              <h2 className="text-sm font-semibold flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" /> הוספת נושא חדש (מספור 500+ אוטומטי)</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={newTopic.kind}
                  onChange={(e) => setNewTopic({ ...newTopic, kind: e.target.value })} data-testid="select-hf-new-kind">
                  <option value="fund">הטבת קופת חולים</option>
                  <option value="gov">זכות נלווה / ממשלתית</option>
                  <option value="ngo">עמותה / סיוע משלים</option>
                </select>
                <Input placeholder="קטגוריה" value={newTopic.category} onChange={(e) => setNewTopic({ ...newTopic, category: e.target.value })} data-testid="input-hf-new-category" />
                <Input placeholder="תת-קטגוריה" value={newTopic.subCategory} onChange={(e) => setNewTopic({ ...newTopic, subCategory: e.target.value })} />
                <Input className="sm:col-span-2 lg:col-span-3" placeholder="שם הנושא *" value={newTopic.topic} onChange={(e) => setNewTopic({ ...newTopic, topic: e.target.value })} data-testid="input-hf-new-topic" />
                <Input placeholder="למי מיועד" value={newTopic.audience} onChange={(e) => setNewTopic({ ...newTopic, audience: e.target.value })} />
                <Input placeholder="הקופה המיטיבה" value={newTopic.bestFund} onChange={(e) => setNewTopic({ ...newTopic, bestFund: e.target.value })} />
                <Input placeholder='טווח (למשל "בין 1,000 ל-5,000")' value={newTopic.rangeText} onChange={(e) => setNewTopic({ ...newTopic, rangeText: e.target.value })} />
                <Textarea className="sm:col-span-2 lg:col-span-3 min-h-16" placeholder="תקציר ההטבה (מוצג בכרטיס הציבורי)" value={newTopic.benefitSummary} onChange={(e) => setNewTopic({ ...newTopic, benefitSummary: e.target.value })} aria-label="תקציר ההטבה" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createTopic} data-testid="button-hf-create"><Save className="w-4 h-4 ml-1" /> שמירה</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewTopic({ ...emptyNew }); }}>ביטול</Button>
              </div>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, קטגוריה או מספר" className="pr-9" data-testid="input-hf-admin-search" />
            </div>
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as any)} data-testid="select-hf-admin-kind">
              <option value="">הכול</option>
              <option value="fund">הטבות קופות</option>
              <option value="gov">זכויות נלוות</option>
              <option value="ngo">עמותות וסיוע משלים</option>
            </select>
          </div>

          {loading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">טוען…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">לא נמצאו נושאים.</Card>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">מציג {filtered.length} מתוך {topics.length} נושאים</div>
              {filtered.map((t) => (
                <Card key={t.id} className="p-3" data-testid={`hf-admin-topic-${t.id}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button className="text-right min-w-0 flex-1" onClick={() => openEditor(t)} data-testid={`button-hf-admin-edit-${t.id}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground tabular-nums">#{t.catalogNo}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/60 border border-border">{t.kind === "gov" ? "זכות נלווה" : t.kind === "ngo" ? "עמותה" : "קופה"}</span>
                        {t.category && <span className="text-[11px] text-muted-foreground">{t.category}</span>}
                        {!t.active && <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">לא פעיל</span>}
                      </div>
                      <div className="font-medium text-sm mt-0.5">{t.topic}</div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={t.active} onCheckedChange={(v) => toggleActive(t, v)} data-testid={`switch-hf-active-${t.id}`} />
                      <Button variant="ghost" size="icon" onClick={() => removeTopic(t)} data-testid={`button-hf-delete-${t.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditor(t)}>{expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
                    </div>
                  </div>

                  {expandedId === t.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-4" data-testid={`hf-admin-editor-${t.id}`}>
                      {/* Public fields */}
                      <div className="grid sm:grid-cols-2 gap-2">
                        {PUBLIC_FIELDS.map((f) => (
                          <label key={String(f.k)} className={`${f.area ? "sm:col-span-2" : ""} space-y-1 block`}>
                            <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                            {f.area ? (
                              <Textarea className="min-h-16" value={(draft[f.k] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} data-testid={`input-hf-edit-${String(f.k)}-${t.id}`} />
                            ) : (
                              <Input value={(draft[f.k] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} data-testid={`input-hf-edit-${String(f.k)}-${t.id}`} />
                            )}
                          </label>
                        ))}
                        <label className="space-y-1 block">
                          <span className="text-xs font-medium text-muted-foreground">סכום מינימום (למיון/טווח)</span>
                          <Input type="number" value={(draft.rangeMin as any) ?? ""} onChange={(e) => setDraft({ ...draft, rangeMin: e.target.value === "" ? null : Number(e.target.value) })} />
                        </label>
                        <label className="space-y-1 block">
                          <span className="text-xs font-medium text-muted-foreground">סכום מקסימום (למיון/טווח)</span>
                          <Input type="number" value={(draft.rangeMax as any) ?? ""} onChange={(e) => setDraft({ ...draft, rangeMax: e.target.value === "" ? null : Number(e.target.value) })} />
                        </label>
                      </div>

                      {/* Internal fields (collapsible) */}
                      <div>
                        <Button variant="outline" size="sm" onClick={() => setShowInternal((v) => !v)} data-testid={`button-hf-toggle-internal-${t.id}`}>
                          {showInternal ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />} שדות מלאים (פנימי — נשלח בטופס "קרא עוד")
                        </Button>
                        {showInternal && (
                          <div className="grid sm:grid-cols-2 gap-2 mt-3">
                            {INTERNAL_FIELDS.map((f) => (
                              <label key={String(f.k)} className={`${f.area ? "sm:col-span-2" : ""} space-y-1 block`}>
                                <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                                <Textarea className="min-h-16" value={(draft[f.k] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tiers (per-fund / program values) */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">מסלולי קופות ותוכניות (שב"ן)</h3>
                        {(draft.tiers ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">אין מסלולים מוגדרים לנושא זה.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(draft.tiers ?? []).map((tier) => (
                              <div key={tier.id} className="flex items-center gap-2 text-xs" data-testid={`hf-tier-${tier.id}`}>
                                <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border min-w-[120px]">{tier.fund}{tier.tier ? ` · ${tier.tier}` : ""}</span>
                                <Input className="flex-1 h-8" value={tier.value} onChange={(e) => setDraft((d) => ({ ...d, tiers: (d.tiers ?? []).map((x) => x.id === tier.id ? { ...x, value: e.target.value } : x) }))}
                                  onBlur={(e) => updateTierValue(tier, e.target.value)} data-testid={`input-hf-tier-value-${tier.id}`} />
                                <Button variant="ghost" size="icon" onClick={() => removeTier(tier)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-end gap-2 pt-1">
                          <select className="border border-border rounded-md px-2 h-8 text-xs bg-background" value={newTier.fundKey}
                            onChange={(e) => { const f = FUNDS.find((x) => x.key === e.target.value); setNewTier({ ...newTier, fundKey: e.target.value, fund: f?.name ?? "" }); }} data-testid={`select-hf-newtier-fund-${t.id}`}>
                            <option value="">בחרו קופה</option>
                            {FUNDS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
                          </select>
                          <Input className="h-8 w-28 text-xs" placeholder="תוכנית" value={newTier.tier} onChange={(e) => setNewTier({ ...newTier, tier: e.target.value })} />
                          <Input className="h-8 flex-1 text-xs" placeholder="ערך / החזר" value={newTier.value} onChange={(e) => setNewTier({ ...newTier, value: e.target.value })} data-testid={`input-hf-newtier-value-${t.id}`} />
                          <Button size="sm" variant="outline" onClick={() => addTier(t.id)} data-testid={`button-hf-addtier-${t.id}`}><Plus className="w-3.5 h-3.5 ml-1" /> מסלול</Button>
                        </div>
                      </div>

                      {/* Podcast (text + audio) for the voice system */}
                      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3" data-testid={`hf-podcast-panel-${t.id}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-primary" /> {'פודקאסט למערכת הקולית (טקסט ואודיו)'}
                          </h3>
                          {draft.podcastStatus === "ready" && draft.podcastAudioUrl
                            ? <span className="text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{'אודיו מוכן'}</span>
                            : (draft.podcastScript ? <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{'טיוטה טקסט'}</span> : null)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{'המערכת יכולה לקבל את הטקסט להקראה, או את קובץ האודיו המוכן — לפי הבחירה שלכם.'}</p>
                        <Textarea
                          className="min-h-32 text-sm leading-7"
                          dir="rtl"
                          placeholder={'טקסט הפודקאסט (ניתן לעריכה). לחצו ”צרו סקריפט אוטומטי“ ליצירת טיוטה לפי פרטי הנושא.'}
                          value={draft.podcastScript ?? ""}
                          onChange={(e) => setDraft({ ...draft, podcastScript: e.target.value })}
                          aria-label="טקסט הפודקאסט"
                          data-testid={`textarea-hf-podcast-${t.id}`}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={!!podcastBusy} onClick={() => genPodcastScript(t.id)} data-testid={`button-hf-podcast-genscript-${t.id}`}>
                            {podcastBusy === "script" ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 ml-1" />} {'צרו סקריפט אוטומטי'}
                          </Button>
                          <Button size="sm" variant="outline" disabled={!!podcastBusy || !(draft.podcastScript ?? "").trim()} onClick={() => savePodcastScript(t.id)} data-testid={`button-hf-podcast-savescript-${t.id}`}>
                            {podcastBusy === "save" ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Save className="w-3.5 h-3.5 ml-1" />} {'שמרו טקסט'}
                          </Button>
                          <Button size="sm" disabled={!!podcastBusy || !(draft.podcastScript ?? "").trim()} onClick={() => genPodcastAudio(t.id)} data-testid={`button-hf-podcast-genaudio-${t.id}`}>
                            {podcastBusy === "audio" ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Mic className="w-3.5 h-3.5 ml-1" />} {draft.podcastAudioUrl ? 'צרו אודיו מחדש' : 'צרו אודיו'}
                          </Button>
                        </div>
                        {draft.podcastAudioUrl && (
                          <div className="space-y-2 pt-1">
                            <audio controls src={draft.podcastAudioUrl} className="w-full" data-testid={`audio-hf-podcast-${t.id}`} />
                            <div className="flex flex-wrap gap-2">
                              <a href={draft.podcastAudioUrl} target="_blank" rel="noreferrer" download>
                                <Button size="sm" variant="outline" data-testid={`button-hf-podcast-download-${t.id}`}><ExternalLink className="w-3.5 h-3.5 ml-1" /> {'הורדה / פתיחה'}</Button>
                              </a>
                              <Button size="sm" variant="outline" disabled={!!podcastBusy} onClick={() => sendPodcast(t.id)} data-testid={`button-hf-podcast-send-${t.id}`}>
                                {podcastBusy === "send" ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Send className="w-3.5 h-3.5 ml-1" />} {'שלחו למערכת הקולית'}
                              </Button>
                              <Button size="sm" variant="ghost" disabled={!!podcastBusy} onClick={() => delPodcastAudio(t.id)} data-testid={`button-hf-podcast-delaudio-${t.id}`}>
                                {podcastBusy === "delete" ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 ml-1 text-destructive" />} {'מחקו אודיו'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button size="sm" onClick={() => saveTopic(t.id)} data-testid={`button-hf-save-${t.id}`}><Save className="w-4 h-4 ml-1" /> שמירת שינויים</Button>
                        <a href={`${publicUrl.replace("/health-funds", "")}/health-fund-service/${t.id}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="w-4 h-4 ml-1" /> תצוגת טופס "קרא עוד"</Button>
                        </a>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Requests tab ---- */}
        <TabsContent value="requests" className="space-y-3 pt-4">
          {requests.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto" />
              עדיין אין פניות מטופס "קרא עוד".
            </Card>
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="p-3 text-sm" data-testid={`hf-request-${r.id}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium">{r.fullName} · <span className="text-muted-foreground">{REQUEST_LABELS[r.requestType] ?? r.requestType}</span></div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{r.phone} · {r.email}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">נושא #{r.catalogNo}: {r.topic}</div>
                    {r.note && <div className="text-xs mt-1">{r.note}</div>}
                  </div>
                  <div className="text-left text-xs shrink-0">
                    <div className={`px-2 py-0.5 rounded ${r.webhookStatus === "sent" ? "bg-green-50 text-green-700" : r.webhookStatus === "failed" ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"}`}>
                      {r.webhookStatus === "sent" ? "נשלח לאוטומציה" : r.webhookStatus === "failed" ? "שליחה נכשלה" : "ממתין"}
                    </div>
                    <div className="text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString("he-IL")}</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ---- Switch-fund leads tab ---- */}
        <TabsContent value="switch" className="space-y-3 pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">לידים מכפתור "מתעניין/ת במעבר קופה". ניתן לעדכן סטטוס טיפול, לכתוב הערה ולמחוק.</p>
            <Button variant="ghost" size="sm" onClick={loadSwitchLeads} data-testid="button-hf-switch-refresh">
              <RefreshCw className="w-4 h-4 ml-1" /> רענון
            </Button>
          </div>
          {switchLeads.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto" />
              עדיין אין לידים למעבר קופה.
            </Card>
          ) : (
            switchLeads.map((l) => {
              const d = switchDraft[l.id] ?? { status: l.status, handlingNote: l.handlingNote ?? "" };
              const dirty = d.status !== l.status || d.handlingNote !== (l.handlingNote ?? "");
              return (
                <Card key={l.id} className="p-3 text-sm space-y-2" data-testid={`hf-switch-lead-${l.id}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-medium">{l.fullName}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{l.phone}{l.email ? ` · ${l.email}` : ""}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.idNumber && <span>ת"ז <span dir="ltr">{l.idNumber}</span> · </span>}
                        {l.city && <span>{l.city}</span>}
                        {l.peopleCount && <span> · {l.peopleCount} נפשות</span>}
                      </div>
                      <div className="text-xs mt-1">
                        {l.currentFund && <span>מקופה: <b>{l.currentFund}</b> </span>}
                        {l.targetFund && <span>← לקופה: <b>{l.targetFund}</b></span>}
                      </div>
                      {l.currentSupplemental && <div className="text-xs text-muted-foreground">ביטוח משלים נוכחי: {l.currentSupplemental}</div>}
                      {l.topic && <div className="text-xs text-muted-foreground">הגיע מהטבה{l.catalogNo ? ` #${l.catalogNo}` : ""}: {l.topic}</div>}
                      {l.note && <div className="text-xs mt-1 p-2 rounded bg-muted/50">{l.note}</div>}
                    </div>
                    <div className="text-left text-xs shrink-0 space-y-1">
                      <div className={`px-2 py-0.5 rounded inline-block ${SWITCH_STATUS_STYLE[l.status] ?? "bg-muted text-muted-foreground"}`}>
                        {SWITCH_STATUS_LABELS[l.status] ?? l.status}
                      </div>
                      <div className={`px-2 py-0.5 rounded ${l.webhookStatus === "sent" ? "bg-green-50 text-green-700" : l.webhookStatus === "failed" ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"}`}>
                        {l.webhookStatus === "sent" ? "נשלח לאוטומציה" : l.webhookStatus === "failed" ? "שליחה נכשלה" : "ממתין"}
                      </div>
                      <div className="text-muted-foreground">{new Date(l.createdAt).toLocaleString("he-IL")}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-1 border-t border-border/60">
                    <div className="sm:w-40">
                      <label htmlFor={`select-hf-switch-status-${l.id}`} className="text-xs text-muted-foreground">סטטוס טיפול</label>
                      <select
                        id={`select-hf-switch-status-${l.id}`}
                        className="w-full border border-border rounded-md px-2 py-2 text-sm bg-background mt-0.5"
                        value={d.status}
                        onChange={(e) => setSwitchDraft({ ...switchDraft, [l.id]: { ...d, status: e.target.value } })}
                        data-testid={`select-hf-switch-status-${l.id}`}
                      >
                        {Object.entries(SWITCH_STATUS_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label htmlFor={`input-hf-switch-note-${l.id}`} className="text-xs text-muted-foreground">הערת טיפול</label>
                      <Textarea
                        id={`input-hf-switch-note-${l.id}`}
                        className="min-h-10 mt-0.5"
                        value={d.handlingNote}
                        placeholder="הערה פנימית לטיפול…"
                        onChange={(e) => setSwitchDraft({ ...switchDraft, [l.id]: { ...d, handlingNote: e.target.value } })}
                        aria-label="הערת טיפול"
                        data-testid={`input-hf-switch-note-${l.id}`}
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" disabled={!dirty || switchBusy === l.id} onClick={() => saveSwitchLead(l.id)} data-testid={`button-hf-switch-save-${l.id}`}>
                        {switchBusy === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-1" /> שמירה</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={switchBusy === l.id} onClick={() => deleteSwitchLead(l.id)} data-testid={`button-hf-switch-delete-${l.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
