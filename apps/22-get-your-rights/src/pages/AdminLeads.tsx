import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Search, Filter, RefreshCw, Users, LogOut, Settings, FileText, Key, Copy, ChevronDown, ChevronUp, Download, Save, BookOpen, Trash2, CheckCircle, Clock, XCircle, AlertCircle, Pencil, Send, Loader2, MessageCircle, Mail, Phone, Printer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Lead = {
  id: string;
  created_at: string;
  source: string;
  service_type: string | null;
  name: string | null;
  phone: string | null;
  gender: string | null;
  marital_status: string | null;
  children: string | null;
  health_status: string | null;
  economic_status: string | null;
  description: string | null;
  category: string | null;
  selected_right: string | null;
  details: string | null;
  document_urls: string[] | null;
  id_number: string | null;
  date_of_birth: string | null;
  age_exact: string | null;
  spouse_name: string | null;
  spouse_id_number: string | null;
  spouse_health: string | null;
  spouse_employment: string | null;
  children_count: number | null;
  children_ages: string | null;
  children_health_details: string | null;
  employment_status: string | null;
  disability_percentage: string | null;
  housing_status: string | null;
  eligibility_score: string | null;
  admin_notes: string | null;
  status: string;
  handled_description: string | null;
  closed_at: string | null;
};

const sourceLabels: Record<string, string> = {
  "bot-family": "🤖 בוט - מצב משפחתי",
  "bot-copyright": "🤖 בוט - זכויות יוצרים",
  "bot-comprehensive": "🤖 בוט - בדיקה מקיפה",
  "bot-topics": "🤖 בוט - לפי נושאים",
  "bot-community": "🤖 בוט - קהילה",
  category: "📋 קטגוריות",
};

const serviceLabels: Record<string, string> = {
  free: "📩 מידע חינם",
  paid: "⭐ שירות מלא",
};

const eligibilityLabels: Record<string, { label: string; color: string; icon: string }> = {
  high: { label: "סיכוי גבוה", color: "text-primary", icon: "🟢" },
  medium: { label: "ייתכן", color: "text-yellow-600", icon: "🟡" },
  low: { label: "סיכוי נמוך", color: "text-destructive", icon: "🔴" },
  unknown: { label: "לא נבדק", color: "text-muted-foreground", icon: "⚪" },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; border: string }> = {
  open: { label: "פתוח", icon: <Clock className="w-4 h-4" />, bg: "bg-yellow-50", border: "border-yellow-300" },
  in_progress: { label: "בטיפול", icon: <AlertCircle className="w-4 h-4" />, bg: "bg-blue-50", border: "border-blue-300" },
  handled: { label: "טופל", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-green-50", border: "border-green-300" },
  closed: { label: "סגור", icon: <XCircle className="w-4 h-4" />, bg: "bg-muted", border: "border-border" },
};

const EDITABLE_FIELDS: { key: keyof Lead; label: string; type?: "text" | "select"; options?: string[] }[] = [
  { key: "name", label: "שם" },
  { key: "phone", label: "טלפון" },
  { key: "id_number", label: "ת.ז" },
  { key: "date_of_birth", label: "תאריך לידה" },
  { key: "gender", label: "מגדר", type: "select", options: ["זכר", "נקבה", "אחר"] },
  { key: "marital_status", label: "מצב משפחתי", type: "select", options: ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"] },
  { key: "children_count", label: "מספר ילדים" },
  { key: "children_ages", label: "גילאי ילדים" },
  { key: "children_health_details", label: "בריאות ילדים" },
  { key: "spouse_name", label: "שם בן/בת זוג" },
  { key: "spouse_id_number", label: "ת.ז בן/בת זוג" },
  { key: "spouse_health", label: "בריאות בן/בת זוג" },
  { key: "spouse_employment", label: "תעסוקת בן/בת זוג" },
  { key: "health_status", label: "מצב בריאותי" },
  { key: "disability_percentage", label: "אחוזי נכות" },
  { key: "economic_status", label: "מצב כלכלי" },
  { key: "employment_status", label: "תעסוקה" },
  { key: "housing_status", label: "דיור" },
];

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [handledDesc, setHandledDesc] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingToN8n, setSendingToN8n] = useState(false);
  const [sendChannels, setSendChannels] = useState<string[]>(["whatsapp"]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setAuthChecked(true);
      fetchLeads();
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/admin/login");
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/admin/login"); };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    const { error } = await supabase.from("leads").update({ admin_notes: editNotes } as any).eq("id", selectedLead.id);
    setSavingNotes(false);
    if (error) {
      toast({ title: "שגיאה", description: "שמירת ההערות נכשלה", variant: "destructive" });
      return;
    }
    toast({ title: "נשמר", description: "ההערות עודכנו" });
    setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, admin_notes: editNotes } : l));
    setSelectedLead({ ...selectedLead, admin_notes: editNotes });
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (newStatus === "handled" && !handledDesc.trim()) {
      toast({ title: "שגיאה", description: "יש לתאר איך הליד טופל", variant: "destructive" }); return;
    }
    const updates: any = { status: newStatus };
    if (newStatus === "handled") updates.handled_description = handledDesc;
    if (newStatus === "closed") updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
    if (error) {
      toast({ title: "שגיאה", description: "עדכון הסטטוס נכשל", variant: "destructive" });
      return;
    }
    toast({ title: "עודכן", description: `סטטוס שונה ל${statusConfig[newStatus]?.label}` });
    setLeads(leads.map(l => l.id === leadId ? { ...l, ...updates } : l));
    if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, ...updates });
  };

  const handleDelete = async (leadId: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) {
      toast({ title: "שגיאה", description: "מחיקת הליד נכשלה", variant: "destructive" });
      setDeleteConfirm(null);
      return;
    }
    toast({ title: "נמחק", description: "הליד נמחק" });
    setLeads(leads.filter(l => l.id !== leadId));
    if (selectedLead?.id === leadId) setSelectedLead(null);
    setDeleteConfirm(null);
  };

  const handleSaveLeadEdit = async () => {
    if (!editingLead) return;
    setSavingEdit(true);
    const { id, created_at, ...rest } = editingLead;
    const { error } = await supabase.from("leads").update(rest as any).eq("id", id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "שגיאה", description: "עדכון פרטי הלקוח נכשל", variant: "destructive" });
      return;
    }
    toast({ title: "עודכן", description: "פרטי הלקוח עודכנו" });
    setLeads(leads.map(l => l.id === id ? editingLead : l));
    if (selectedLead?.id === id) setSelectedLead(editingLead);
    setEditingLead(null);
  };

  const exportCSV = () => {
    const headers = [
      "תאריך", "מקור", "שירות", "סטטוס", "שם", "טלפון", "ת.ז", "תאריך לידה",
      "מגדר", "מצב משפחתי", "ילדים", "גילאי ילדים", "בריאות ילדים",
      "בן/בת זוג", "תעסוקת בן זוג", "בריאות בן זוג",
      "מצב בריאותי", "נכות", "מצב כלכלי", "תעסוקה", "דיור",
      "קטגוריה", "זכות נבחרת", "סיכוי זכאות", "הערות מנהל", "תיאור טיפול", "פרטים"
    ];
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleDateString("he-IL"),
      sourceLabels[l.source] || l.source,
      serviceLabels[l.service_type || ""] || l.service_type || "",
      statusConfig[l.status]?.label || l.status,
      l.name || "", l.phone || "", l.id_number || "", l.date_of_birth || "",
      l.gender || "", l.marital_status || "", l.children_count?.toString() || l.children || "",
      l.children_ages || "", l.children_health_details || "",
      l.spouse_name || "", l.spouse_employment || "", l.spouse_health || "",
      l.health_status || "", l.disability_percentage || "", l.economic_status || "",
      l.employment_status || "", l.housing_status || "",
      l.category || "", l.selected_right || "",
      eligibilityLabels[l.eligibility_score || "unknown"]?.label || "",
      l.admin_notes || "", l.handled_description || "", (l.details || "").replace(/\n/g, " "),
    ]);
    const BOM = "\uFEFF";
    const csv = BOM + [headers.join(","), ...rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>;

  const filtered = leads.filter((lead) => {
    const matchesSearch = !searchTerm || lead.name?.includes(searchTerm) || lead.phone?.includes(searchTerm) || lead.category?.includes(searchTerm) || lead.id_number?.includes(searchTerm);
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    const matchesService = serviceFilter === "all" || lead.service_type === serviceFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesSource && matchesService && matchesStatus;
  });

  const uniqueSources = [...new Set(leads.map((l) => l.source))];
  const statusCounts = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ניהול לידים</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} פניות{leads.length !== filtered.length ? ` (מתוך ${leads.length})` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" />ייצוא CSV</Button>
            <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-2"><RefreshCw className="w-4 h-4" />רענון</Button>
            <Link to="/"><Button variant="ghost" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" />חזרה לאתר</Button></Link>
            <Link to="/admin/rights"><Button variant="ghost" size="sm" className="gap-2"><BookOpen className="w-4 h-4" />מאגר זכויות</Button></Link>
            <Link to="/admin/settings"><Button variant="ghost" size="sm" className="gap-2"><Settings className="w-4 h-4" />הגדרות</Button></Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive"><LogOut className="w-4 h-4" />יציאה</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-4">
        {/* Status summary badges */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              aria-pressed={statusFilter === key}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                statusFilter === key ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1` : "bg-card border-border hover:bg-muted/50"
              }`}>
              {cfg.icon}
              <span>{cfg.label}</span>
              <span className="text-xs text-muted-foreground">({statusCounts[key] || 0})</span>
            </button>
          ))}
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="px-3 py-2 rounded-lg text-sm text-primary hover:underline">הכל ({leads.length})</button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי שם, טלפון, ת.ז או קטגוריה..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select aria-label="סינון לפי מקור" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">כל המקורות</option>
              {uniqueSources.map((s) => (<option key={s} value={s}>{sourceLabels[s] || s}</option>))}
            </select>
            <select aria-label="סינון לפי סוג שירות" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">כל סוגי השירות</option>
              <option value="free">מידע חינם</option>
              <option value="paid">שירות מלא</option>
            </select>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">טוען נתונים...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{leads.length === 0 ? "אין פניות עדיין" : "אין תוצאות לסינון הנוכחי"}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((lead) => {
              const elig = eligibilityLabels[lead.eligibility_score || "unknown"] || eligibilityLabels.unknown;
              const st = statusConfig[lead.status] || statusConfig.open;
              return (
                <div key={lead.id} className={`rounded-xl border-2 ${st.border} ${st.bg} p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow relative`}
                  role="button" tabIndex={0} aria-label={`פרטי פנייה: ${lead.name || "ללא שם"}`}
                  onClick={() => { setSelectedLead(lead); setEditNotes(lead.admin_notes || ""); setHandledDesc(lead.handled_description || ""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLead(lead); setEditNotes(lead.admin_notes || ""); setHandledDesc(lead.handled_description || ""); } }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">{st.icon}<span className="text-xs font-bold">{st.label}</span></div>
                    <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{lead.name || "ללא שם"}</p>
                    <p className="text-sm text-muted-foreground font-mono" dir="ltr">{lead.phone || "-"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lead.id_number && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground">ת.ז: {lead.id_number}</span>}
                    {lead.gender && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground">{lead.gender}</span>}
                    {lead.marital_status && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground">{lead.marital_status}</span>}
                    {lead.children_count && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground">{lead.children_count} ילדים</span>}
                    {lead.employment_status && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground">{lead.employment_status}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      {lead.category && <span className="font-medium text-foreground">{lead.category}</span>}
                      {lead.selected_right && <span className="block text-muted-foreground">{lead.selected_right}</span>}
                    </div>
                    <span className={`text-xs font-bold ${elig.color}`}>{elig.icon} {elig.label}</span>
                  </div>
                  {lead.service_type && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${lead.service_type === "paid" ? "bg-secondary/20 text-secondary-foreground" : "bg-primary/10 text-primary"}`}>
                      {serviceLabels[lead.service_type] || lead.service_type}
                    </span>
                  )}
                  {lead.handled_description && (
                    <div className="text-xs bg-green-100 border border-green-200 rounded p-2">
                      <span className="font-bold">✅ טופל: </span>{lead.handled_description}
                    </div>
                  )}
                  {lead.document_urls && lead.document_urls.length > 0 && (
                    <div className="flex gap-1">
                      <FileText className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary">{lead.document_urls.length} מסמכים</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <ApiReferenceSection />
      </main>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead && !editingLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {selectedLead.name || "ללא שם"}
                  <span className={`mr-2 text-xs px-2 py-0.5 rounded-full ${statusConfig[selectedLead.status]?.bg} ${statusConfig[selectedLead.status]?.border} border`}>
                    {statusConfig[selectedLead.status]?.label}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedLead.eligibility_score && selectedLead.eligibility_score !== "unknown" && (
                  <div className={`p-3 rounded-lg border ${selectedLead.eligibility_score === "high" ? "border-primary bg-primary/5" : selectedLead.eligibility_score === "medium" ? "border-yellow-300 bg-yellow-50" : "border-destructive bg-destructive/5"}`}>
                    <p className="text-sm font-bold">{eligibilityLabels[selectedLead.eligibility_score]?.icon} {eligibilityLabels[selectedLead.eligibility_score]?.label}</p>
                  </div>
                )}

                {/* Edit lead button */}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingLead({ ...selectedLead })}>
                  <Pencil className="w-3.5 h-3.5" /> ערוך פרטי לקוח
                </Button>

                {/* Personal details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DetailField label="שם" value={selectedLead.name} />
                  <DetailField label="טלפון" value={selectedLead.phone} dir="ltr" />
                  <DetailField label="ת.ז" value={selectedLead.id_number} dir="ltr" />
                  <DetailField label="תאריך לידה" value={selectedLead.date_of_birth} dir="ltr" />
                  <DetailField label="גיל מדויק" value={selectedLead.age_exact} />
                  <DetailField label="מגדר" value={selectedLead.gender} />
                  <DetailField label="מצב משפחתי" value={selectedLead.marital_status} />
                  <DetailField label="ילדים" value={selectedLead.children_count?.toString() || selectedLead.children} />
                  <DetailField label="גילאי ילדים" value={selectedLead.children_ages} />
                  <DetailField label="בריאות ילדים" value={selectedLead.children_health_details} />
                  <DetailField label="מצב בריאותי" value={selectedLead.health_status} />
                  <DetailField label="אחוזי נכות" value={selectedLead.disability_percentage} />
                  <DetailField label="מצב כלכלי" value={selectedLead.economic_status} />
                  <DetailField label="תעסוקה" value={selectedLead.employment_status} />
                  <DetailField label="דיור" value={selectedLead.housing_status} />
                </div>

                {selectedLead.spouse_name && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold text-foreground mb-2">👫 פרטי בן/בת זוג:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <DetailField label="שם" value={selectedLead.spouse_name} />
                      <DetailField label="ת.ז" value={selectedLead.spouse_id_number} dir="ltr" />
                      <DetailField label="תעסוקה" value={selectedLead.spouse_employment} />
                      <DetailField label="בריאות" value={selectedLead.spouse_health} />
                    </div>
                  </div>
                )}

                {(selectedLead.category || selectedLead.selected_right) && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold text-foreground mb-2">📋 קטגוריה וזכות:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailField label="קטגוריה" value={selectedLead.category} />
                      <DetailField label="זכות נבחרת" value={selectedLead.selected_right} />
                    </div>
                  </div>
                )}

                {selectedLead.details && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold text-foreground mb-2">📝 פרטים ותשובות:</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">{selectedLead.details}</pre>
                  </div>
                )}

                {selectedLead.document_urls && selectedLead.document_urls.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold text-foreground mb-2">📎 מסמכים ({selectedLead.document_urls.length}):</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedLead.document_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> מסמך {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status management */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground mb-2">🔄 ניהול סטטוס:</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <Button key={key} size="sm" variant={selectedLead.status === key ? "default" : "outline"}
                        disabled={selectedLead.status === key || (key === "handled" && !handledDesc.trim())}
                        onClick={() => handleStatusChange(selectedLead.id, key)} className="gap-1 text-xs">
                        {cfg.icon} {cfg.label}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium">תיאור הטיפול (חובה לסימון "טופל"):</label>
                    <Textarea value={handledDesc} onChange={(e) => setHandledDesc(e.target.value)} placeholder="תאר איך הליד טופל..." aria-label="תיאור הטיפול" className="text-sm min-h-[60px]" />
                    {selectedLead.handled_description && selectedLead.status === "handled" && (
                      <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                        <span className="font-bold">✅ תיאור טיפול שמור: </span>{selectedLead.handled_description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin notes */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground mb-2">✏️ הערות מנהל:</p>
                  <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="הוסף הערות..." aria-label="הערות מנהל" className="text-sm min-h-[80px]" />
                  <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm" className="mt-2 gap-2">
                    <Save className="w-3.5 h-3.5" />{savingNotes ? "שומר..." : "שמור הערות"}
                  </Button>
                </div>

                {/* Send to n8n */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground mb-2">📤 שליחה ללקוח:</p>
                  
                  {/* Channel selection */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[
                      { id: "whatsapp", label: "וואטסאפ", icon: <MessageCircle className="w-3.5 h-3.5" /> },
                      { id: "email", label: "מייל", icon: <Mail className="w-3.5 h-3.5" /> },
                      { id: "voice", label: "הודעה קולית", icon: <Phone className="w-3.5 h-3.5" /> },
                      { id: "fax", label: "פקס", icon: <Printer className="w-3.5 h-3.5" /> },
                    ].map(ch => (
                      <Button
                        key={ch.id}
                        size="sm"
                        variant={sendChannels.includes(ch.id) ? "default" : "outline"}
                        className="gap-1.5 text-xs"
                        onClick={() => setSendChannels(prev =>
                          prev.includes(ch.id) ? prev.filter(c => c !== ch.id) : [...prev, ch.id]
                        )}
                      >
                        {ch.icon} {ch.label}
                      </Button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={sendingToN8n || sendChannels.length === 0}
                    onClick={async () => {
                      setSendingToN8n(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('n8n-notify', {
                          body: { lead_id: selectedLead.id, trigger: 'manual', channels: sendChannels },
                        });
                        if (error) throw error;
                        if (data?.success) {
                          toast({ title: "נשלח!", description: `הנתונים נשלחו בהצלחה (${sendChannels.join(", ")})` });
                        } else if (data?.error) {
                          toast({ title: "שגיאה", description: data.error, variant: "destructive" });
                        }
                      } catch (err: any) {
                        toast({ title: "שגיאה", description: err.message || "שליחה נכשלה", variant: "destructive" });
                      }
                      setSendingToN8n(false);
                    }}
                  >
                    {sendingToN8n ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {sendingToN8n ? "שולח..." : "שלח ללקוח"}
                  </Button>
                  {sendChannels.length === 0 && (
                    <p className="text-[10px] text-destructive mt-1">בחר לפחות ערוץ אחד</p>
                  )}
                </div>

                {/* Delete */}
                <div className="border-t border-border pt-3">
                  {deleteConfirm === selectedLead.id ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-destructive font-bold">בטוח למחוק?</p>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedLead.id)}>כן, מחק</Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>ביטול</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-2" onClick={() => setDeleteConfirm(selectedLead.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> מחק ליד
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          {editingLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  עריכת פרטי לקוח
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {EDITABLE_FIELDS.map(({ key, label, type, options }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground font-medium">{label}</label>
                    {type === "select" && options ? (
                      <select
                        value={String(editingLead[key] || "")}
                        onChange={(e) => setEditingLead({ ...editingLead, [key]: e.target.value || null })}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">-</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input
                        value={String(editingLead[key] ?? "")}
                        onChange={(e) => setEditingLead({ ...editingLead, [key]: key === "children_count" ? (parseInt(e.target.value) || null) : (e.target.value || null) })}
                        className="text-sm"
                        dir={["phone", "id_number", "date_of_birth", "spouse_id_number"].includes(key) ? "ltr" : undefined}
                      />
                    )}
                  </div>
                ))}
                <Button onClick={handleSaveLeadEdit} disabled={savingEdit} className="w-full gap-2">
                  <Save className="w-4 h-4" />{savingEdit ? "שומר..." : "שמור שינויים"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailField = ({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) => (
  <div className="bg-card rounded-lg border border-border p-2">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground" dir={dir}>{value || "-"}</p>
  </div>
);

const ApiReferenceSection = () => {
  const [open, setOpen] = useState(false);
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };
  const endpoints = [
    { method: "GET", path: "/leads-api", desc: "קבלת כל הלידים - כולל כל השדות", params: "limit, offset, source, service_type, eligibility_score, name, phone, id_number, category, status", auth: "x-api-key (בכותרת)", example: `curl -H "x-api-key: YOUR_KEY" "${baseUrl}/leads-api?limit=50&status=open"` },
    { method: "POST", path: "/leads-webhook", desc: "Webhook אוטומטי לכל ליד חדש", params: "אוטומטי", auth: "פנימי", example: `// Body: { event: "new_lead", lead: { id, name, phone, status, ... }}` },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3"><Key className="w-5 h-5 text-primary" /><span className="font-bold text-foreground">מדריך API</span></div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">חברו ב-API למערכות חיצוניות. מפתח API ב<Link to="/admin/settings" className="text-primary hover:underline font-medium">הגדרות</Link>.</p>
          {endpoints.map((ep, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === "GET" ? "bg-primary/10 text-primary" : "bg-secondary/20 text-secondary-foreground"}`}>{ep.method}</span>
                <code className="text-sm font-mono text-foreground">{ep.path}</code>
              </div>
              <p className="text-sm text-foreground">{ep.desc}</p>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto" dir="ltr"><code>{ep.example}</code></pre>
                <button onClick={() => copyToClipboard(ep.example)} aria-label="העתקת דוגמת קוד" className="absolute top-2 left-2 p-1 rounded bg-background border border-border hover:bg-muted transition-colors">
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
