import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Users, Mic, MessageCircle, Search, Check, X, Eye, Edit3,
  Download, Share2, Upload, FileSpreadsheet, Trash2, ChevronDown, ChevronUp,
  RefreshCw, ExternalLink, Phone, Mail, MapPin, Clock, Video, Radio, Globe, Save,
  Code, Copy, CheckCheck, Zap, Link as LinkIcon, Building2, Plus, LogOut, Sparkles, Handshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import ApiReferenceSection from "@/components/admin/ApiReferenceSection";
import { copyEventToClipboard, downloadEventAsText } from "@/lib/studyDayShare";
import LessonDetailModal from "@/components/LessonDetailModal";
import FullAccessRequestsTab from "@/components/admin/FullAccessRequestsTab";
import MatchingTab from "@/components/admin/MatchingTab";
import { exportLessonsToExcel, validateLessonForExport } from "@/lib/lessonExcelExport";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [teacherLeads, setTeacherLeads] = useState<any[]>([]);
  const [seekerLeads, setSeekerLeads] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [rabbiPortals, setRabbiPortals] = useState<any[]>([]);
  const [orgPortals, setOrgPortals] = useState<any[]>([]);
  const [synagoguePortals, setSynagoguePortals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newRabbiName, setNewRabbiName] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nedarimSubmissions, setNedarimSubmissions] = useState<any[]>([]);
  const [studyDayEvents, setStudyDayEvents] = useState<any[]>([]);
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState<string | null>(null);
  const [viewingNedarim, setViewingNedarim] = useState<any | null>(null);
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);
  const [pendingFullAccessCount, setPendingFullAccessCount] = useState(0);
  const [nedarimTypeFilter, setNedarimTypeFilter] = useState<"all" | "lesson" | "seeker" | "teacher">("all");
  const editPanelRef = useRef<HTMLDivElement>(null);
  const editCloseButtonRef = useRef<HTMLButtonElement>(null);
  const nedarimPanelRef = useRef<HTMLDivElement>(null);
  const nedarimCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    supabase.from("synagogue_full_access_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
      .then(({ count }) => setPendingFullAccessCount(count ?? 0));
  }, []);

  useEffect(() => {
    if (!editingLesson && !viewingNedarim) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const closeBtn = editingLesson ? editCloseButtonRef.current : nedarimCloseButtonRef.current;
    closeBtn?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingLesson) setEditingLesson(null);
        if (viewingNedarim) setViewingNedarim(null);
        return;
      }
      if (e.key === "Tab") {
        const panel = editingLesson ? editPanelRef.current : nedarimPanelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [editingLesson, viewingNedarim]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [lessonsRes, teachersRes, seekersRes, contactsRes, rabbiPortalsRes, orgPortalsRes, nedarimRes, studyDaysRes, synagoguesRes, shulPortalsRes] = await Promise.all([
      supabase.from("lessons").select("*").order("created_at", { ascending: false }),
      supabase.from("teacher_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("seeker_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("rabbi_portals").select("*").order("created_at", { ascending: false }),
      supabase.from("org_portals").select("*").order("created_at", { ascending: false }),
      supabase.from("nedarim_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("study_day_events").select("*").order("created_at", { ascending: false }),
      supabase.from("synagogues").select("*").order("created_at", { ascending: false }),
      supabase.from("synagogue_portals").select("*").order("created_at", { ascending: false }),
    ]);
    if (lessonsRes.data) setLessons(lessonsRes.data);
    if (teachersRes.data) setTeacherLeads(teachersRes.data);
    if (seekersRes.data) setSeekerLeads(seekersRes.data);
    if (contactsRes.data) setContactMessages(contactsRes.data);
    if (rabbiPortalsRes.data) setRabbiPortals(rabbiPortalsRes.data);
    if (orgPortalsRes.data) setOrgPortals(orgPortalsRes.data);
    if (nedarimRes.data) setNedarimSubmissions(nedarimRes.data);
    if (studyDaysRes.data) setStudyDayEvents(studyDaysRes.data);
    if (synagoguesRes.data) setSynagogues(synagoguesRes.data);
    if (shulPortalsRes.data) setSynagoguePortals(shulPortalsRes.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת בהצלחה");
    navigate("/");
  };

  const approveLesson = async (id: string) => {
    if (busyId) return;
    setBusyId(`lesson:${id}`);
    const { error } = await supabase.from("lessons").update({ is_approved: true, status: "approved" }).eq("id", id);
    setBusyId(null);
    if (!error) {
      toast.success("השיעור אושר לפרסום!");
      setLessons(prev => prev.map(l => l.id === id ? { ...l, is_approved: true, status: "approved" } : l));
    }
  };

  const rejectLesson = async (id: string) => {
    if (busyId) return;
    setBusyId(`lesson:${id}`);
    const { error } = await supabase.from("lessons").update({ is_approved: false, status: "rejected" }).eq("id", id);
    setBusyId(null);
    if (!error) {
      toast.info("השיעור נדחה");
      setLessons(prev => prev.map(l => l.id === id ? { ...l, is_approved: false, status: "rejected" } : l));
    }
  };

  const softDeleteLesson = async (id: string) => {
    if (busyId || !confirm("למחוק לצמיתות מהמאגר? השיעור יוסתר מכל הצופים.")) return;
    setBusyId(`lesson:${id}`);
    // Try hard delete first; if RLS blocks → fall back to soft delete (status=deleted)
    const { error: delErr } = await supabase.from("lessons").delete().eq("id", id);
    if (!delErr) {
      setBusyId(null);
      toast.success("השיעור נמחק");
      setLessons(prev => prev.filter(l => l.id !== id));
      return;
    }
    const { error } = await supabase.from("lessons").update({ is_approved: false, status: "deleted" }).eq("id", id);
    setBusyId(null);
    if (!error) {
      toast.success("השיעור הוסר מהמאגר");
      setLessons(prev => prev.filter(l => l.id !== id));
    } else {
      toast.error("שגיאה במחיקה: " + error.message);
    }
  };

  const deleteStudyDay = async (id: string) => {
    if (busyId || !confirm("למחוק יום עיון זה לצמיתות?")) return;
    setBusyId(`study-day:${id}`);
    const { error } = await supabase.from("study_day_events").delete().eq("id", id);
    if (!error) {
      setBusyId(null);
      toast.success("יום העיון נמחק");
      setStudyDayEvents(prev => prev.filter(e => e.id !== id));
    } else {
      await supabase.from("study_day_events").update({ status: "deleted", is_approved: false }).eq("id", id);
      setBusyId(null);
      setStudyDayEvents(prev => prev.filter(e => e.id !== id));
      toast.success("יום העיון הוסר");
    }
  };

  const approveStudyDay = async (id: string) => {
    if (busyId) return;
    setBusyId(`study-day:${id}`);
    const { error } = await supabase.from("study_day_events").update({ is_approved: true, status: "approved" }).eq("id", id);
    setBusyId(null);
    if (error) toast.error("שגיאה: " + error.message);
    else { toast.success("אושר"); fetchAll(); }
  };

  const rejectStudyDay = async (id: string) => {
    if (busyId) return;
    setBusyId(`study-day:${id}`);
    const { error } = await supabase.from("study_day_events").update({ is_approved: false, status: "rejected" }).eq("id", id);
    setBusyId(null);
    if (error) toast.error("שגיאה: " + error.message);
    else { toast.info("בוטל"); fetchAll(); }
  };

  const startEditing = (lesson: any) => {
    setEditingLesson(lesson.id);
    setEditData({ ...lesson });
  };

  const saveEdit = async () => {
    if (!editingLesson || busyId) return;
    setBusyId(`lesson:${editingLesson}`);
    const { id, created_at, updated_at, ...updateFields } = editData;
    const { error } = await supabase.from("lessons").update(updateFields).eq("id", editingLesson);
    setBusyId(null);
    if (!error) {
      toast.success("השיעור עודכן בהצלחה!");
      setLessons(prev => prev.map(l => l.id === editingLesson ? { ...l, ...updateFields } : l));
      setEditingLesson(null);
    } else {
      toast.error("שגיאה בעדכון");
    }
  };

  const downloadLessonTxt = (lesson: any) => {
    const lines = [
      "═══════════════════════════════════",
      "       איגוד השיעורים",
      "   הארגון העולמי של שיעורי התורה",
      "═══════════════════════════════════",
      "",
      `📖 נושא: ${lesson.subject}`,
      `👨‍🏫 מגיד השיעור: ${lesson.rabbi_name}`,
      lesson.rabbi_role ? `   תפקיד: ${lesson.rabbi_role}` : "",
      lesson.lesson_style ? `   סגנון: ${lesson.lesson_style}` : "",
      "",
      `🏙️ עיר: ${lesson.city}`,
      lesson.neighborhood ? `📍 שכונה: ${lesson.neighborhood}` : "",
      lesson.street ? `🛣️ רחוב: ${lesson.street} ${lesson.street_number || ""}` : "",
      lesson.synagogue_name ? `🏛️ בית כנסת: ${lesson.synagogue_name}` : "",
      "",
      lesson.is_recurring && lesson.schedule_days?.length
        ? (lesson.schedule_days as any[]).map((d: any) => `🕐 ${d.day} — ${d.time}`).join("\n")
        : "",
      lesson.specific_date ? `📅 תאריך: ${lesson.specific_date}` : "",
      "",
      `🌍 שפה: ${lesson.language}`,
      lesson.target_audience?.length ? `👥 קהל: ${lesson.target_audience.join(", ")}` : "",
      lesson.audience_type?.length ? `🎯 סוג: ${lesson.audience_type.join(", ")}` : "",
      lesson.is_recorded ? "🎥 מוקלט" : "",
      lesson.is_live_stream ? "📡 שידור חי" : "",
      "",
      lesson.contact_name ? `👤 ${lesson.contact_name}` : "",
      lesson.contact_phone ? `📞 ${lesson.contact_phone}` : "",
      lesson.contact_email ? `📧 ${lesson.contact_email}` : "",
      "",
      "═══════════════════════════════════",
      "   איגוד השיעורים • 023-133-0600",
      "═══════════════════════════════════",
    ].filter(Boolean).join("\n");
    const blob = new Blob(["\uFEFF" + lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `שיעור_${lesson.rabbi_name}_${lesson.subject}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("הקובץ הורד!");
  };

  const shareLesson = async (lesson: any) => {
    const text = `📖 ${lesson.subject}\n👨‍🏫 ${lesson.rabbi_name}\n📍 ${[lesson.city, lesson.neighborhood, lesson.synagogue_name].filter(Boolean).join(", ")}\n\nבאדיבות: איגוד השיעורים`;
    if (navigator.share) {
      try { await navigator.share({ title: `שיעור: ${lesson.subject}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק! 📋");
    }
  };

  const downloadSampleExcel = () => {
    const headers = ["שם הרב", "נושא", "עיר", "שכונה", "רחוב", "בית כנסת", "שפה", "קהל יעד", "סגנון", "טלפון"];
    const sampleRows = [
      ["הרב ישראל ישראלי", "גמרא", "ירושלים", "גאולה", "מאה שערים 12", "בית כנסת אור חדש", "עברית", "גברים", "עיון מעמיק", "050-1234567"],
      ["הרב משה כהן", "הלכה", "בני ברק", "פרדס כץ", "רבי עקיבא 5", "בית מדרש המרכזי", "עברית", "בעלי בתים", "הלכה למעשה", "052-9876543"],
    ];
    const csv = "\uFEFF" + [headers.join(","), ...sampleRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "דוגמא_ייבוא_שיעורים.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("קובץ דוגמא הורד!");
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("הקובץ ריק"); setImporting(false); return; }

      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        return {
          rabbi_name: cols[0] || "",
          subject: cols[1] || "",
          city: cols[2] || "",
          neighborhood: cols[3] || "",
          street: cols[4] || "",
          synagogue_name: cols[5] || "",
          language: cols[6] || "עברית",
          target_audience: cols[7] ? cols[7].split(";").map(s => s.trim()) : [],
          lesson_style: cols[8] || "",
          rabbi_phone: cols[9] || "",
          status: "pending",
          is_approved: false,
        };
      }).filter(r => r.rabbi_name && r.subject && r.city);

      if (rows.length === 0) { toast.error("לא נמצאו שורות תקינות"); setImporting(false); return; }

      const { error } = await supabase.from("lessons").insert(rows);
      if (error) {
        toast.error("שגיאה בייבוא: " + error.message);
      } else {
        toast.success(`${rows.length} שיעורים יובאו בהצלחה! 🎉`);
        fetchAll();
      }
    } catch {
      toast.error("שגיאה בקריאת הקובץ");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [sourceFilter, setSourceFilter] = useState<"all" | "pending" | "portal" | "synagogue" | "org" | "private" | "nedarim">("all");

  const rabbiPortalNames = new Set(rabbiPortals.map((p) => p.rabbi_name));
  const orgPortalNames = new Set(orgPortals.map((p) => p.org_name));
  const synagoguePortalIds = new Set(synagoguePortals.map((p) => p.id));
  const isFromShulPortal = (l: any) => !!l.synagogue_portal_id && synagoguePortalIds.has(l.synagogue_portal_id);
  const isFromPortal = (l: any) =>
    rabbiPortalNames.has(l.rabbi_name) ||
    (l.org_name && orgPortalNames.has(l.org_name)) ||
    isFromShulPortal(l);
  const isFromNedarim = (l: any) =>
    (l.submitter_notes || "").includes("נדרים");
  const pendingFromNedarim = lessons.filter(
    (l) => l.status === "pending" && isFromNedarim(l)
  ).length;

  // ─── Bulk approve all lessons of a portal ───
  const approveAllForRabbi = async (rabbiName: string) => {
    if (busyId) return;
    setBusyId(`rabbi:${rabbiName}`);
    const { error, count } = await supabase
      .from("lessons")
      .update({ is_approved: true, status: "approved" }, { count: "exact" })
      .eq("rabbi_name", rabbiName)
      .neq("is_approved", true);
    setBusyId(null);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`${count ?? 0} שיעורים אושרו`);
    fetchAll();
  };
  const approveAllForOrg = async (orgName: string) => {
    if (busyId) return;
    setBusyId(`org:${orgName}`);
    const { error, count } = await supabase
      .from("lessons")
      .update({ is_approved: true, status: "approved" }, { count: "exact" })
      .eq("org_name", orgName)
      .neq("is_approved", true);
    setBusyId(null);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`${count ?? 0} שיעורים אושרו`);
    fetchAll();
  };
  const approveAllForShulPortal = async (portalId: string) => {
    if (busyId) return;
    setBusyId(`shul:${portalId}`);
    const { error: e1, count: c1 } = await supabase
      .from("lessons")
      .update({ is_approved: true, status: "approved" }, { count: "exact" })
      .eq("synagogue_portal_id", portalId)
      .neq("is_approved", true);
    const { error: e2, count: c2 } = await supabase
      .from("study_day_events")
      .update({ is_approved: true, status: "approved" }, { count: "exact" })
      .eq("session_id", portalId)
      .neq("is_approved", true);
    setBusyId(null);
    if (e1 || e2) { toast.error("שגיאה באישור"); return; }
    toast.success(`${(c1 ?? 0) + (c2 ?? 0)} פריטים אושרו`);
    fetchAll();
  };

  // ─── Generic action handlers ───
  const genericApprove = async (table: any, id: string) => {
    if (busyId) return;
    setBusyId(`${table}:${id}`);
    const { error } = await supabase.from(table).update({ status: "approved" }).eq("id", id);
    setBusyId(null);
    if (error) toast.error("שגיאה: " + error.message);
    else { toast.success("אושר"); fetchAll(); }
  };
  const genericReject = async (table: any, id: string) => {
    if (busyId) return;
    setBusyId(`${table}:${id}`);
    const { error } = await supabase.from(table).update({ status: "rejected" }).eq("id", id);
    setBusyId(null);
    if (error) toast.error("שגיאה: " + error.message);
    else { toast.info("נדחה"); fetchAll(); }
  };
  const genericDelete = async (table: any, id: string, label: string) => {
    if (busyId || !confirm(`למחוק את ${label}?`)) return;
    setBusyId(`${table}:${id}`);
    const { error } = await supabase.from(table).delete().eq("id", id);
    setBusyId(null);
    if (error) toast.error("שגיאה במחיקה: " + error.message);
    else { toast.success("נמחק"); fetchAll(); }
  };
  const downloadJsonAsTxt = (obj: any, filename: string) => {
    const text = Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename + ".txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("הורד");
  };
  const shareText = async (text: string) => {
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await navigator.clipboard.writeText(text); toast.success("הועתק"); }
  };

  // Approve nedarim submission → create lesson
  const approveNedarim = async (sub: any) => {
    if (busyId) return;
    setBusyId(`nedarim_submissions:${sub.id}`);
    const r = sub.raw_data || {};
    const lessonData = {
      rabbi_name: sub.name || "ממתין",
      subject: sub.subject || "ממתין",
      city: sub.city || "ממתין",
      language: "עברית",
      rabbi_phone: sub.phone || "",
      contact_name: sub.name || "",
      contact_phone: sub.phone || "",
      submitter_notes: `אושר מנדרים פלוס • ${sub.notes || ""}`,
      status: "approved",
      is_approved: true,
    };
    const { error } = await supabase.from("lessons").insert(lessonData);
    if (error) { setBusyId(null); toast.error("שגיאה ביצירת השיעור"); return; }
    await supabase.from("nedarim_submissions").update({ status: "published" }).eq("id", sub.id);
    setBusyId(null);
    toast.success("השיעור נוצר ופורסם!");
    fetchAll();
  };

  const filteredLessons = lessons.filter(l => {
    if (l.status === "deleted") return false;
    if (sourceFilter === "pending" && l.is_approved) return false;
    if (sourceFilter === "nedarim" && !isFromNedarim(l)) return false;
    if (sourceFilter === "portal" && !isFromPortal(l)) return false;
    if (sourceFilter === "synagogue" && !l.synagogue_name) return false;
    if (sourceFilter === "org" && !l.org_name) return false;
    if (sourceFilter === "private" && (l.synagogue_name || l.org_name)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.subject?.toLowerCase().includes(q) || l.rabbi_name?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
  });

  const stats = [
    { icon: BookOpen, label: "שיעורים במאגר", value: lessons.length, gradient: "bg-gradient-teal", glow: "glow-teal" },
    { icon: Check, label: "שיעורים מאושרים", value: lessons.filter(l => l.is_approved).length, gradient: "bg-gradient-teal", glow: "" },
    { icon: Zap, label: "ממתינים מנדרים", value: pendingFromNedarim, gradient: "bg-gradient-gold", glow: "glow-gold" },
    { icon: Mic, label: "מגידי שיעור", value: teacherLeads.length, gradient: "bg-gradient-gold", glow: "" },
    { icon: Users, label: "מחפשי שיעור", value: seekerLeads.length, gradient: "bg-gradient-magenta", glow: "glow-magenta" },
    { icon: MessageCircle, label: "הודעות", value: contactMessages.length, gradient: "bg-gradient-brand", glow: "" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="relative mb-10 p-8 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal/15 rounded-full blur-[100px] animate-glow-pulse" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-magenta/10 rounded-full blur-[80px]" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h1 className="font-display text-4xl font-black text-primary-foreground mb-2">
                  לוח <span className="text-gradient-brand">ניהול</span>
                </h1>
                <p className="font-body text-primary-foreground/60">ניהול מלא: שיעורים, פניות, ייבוא וייצוא</p>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <LogOut className="w-4 h-4 ml-1" />
                התנתק
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-2xl border border-border p-5 shadow-elegant hover:shadow-lg transition-all ${stat.glow}`}
              >
                <div className={`w-10 h-10 rounded-xl ${stat.gradient} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="font-display text-3xl font-black text-card-foreground">{stat.value}</p>
                <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Pending alert */}
          {lessons.filter(l => l.status === "pending").length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-l from-gold/10 to-gold/5 border-2 border-gold/30 rounded-2xl p-5 mb-8 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse-glow flex-shrink-0">
                <Clock className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-lg font-black text-gold">
                  {lessons.filter(l => l.status === "pending").length} שיעורים ממתינים לאישור
                </h3>
                <p className="font-body text-sm text-muted-foreground">לחצו על "שיעורים" למטה לניהול</p>
              </div>
            </motion.div>
          )}

          {/* Import/Export bar */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-8 flex flex-wrap items-center gap-3">
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleExcelImport} className="hidden" />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-gradient-teal text-primary-foreground font-body font-bold gap-2 hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              {importing ? "מייבא..." : "ייבוא שיעורים מקובץ"}
            </Button>
            <Button variant="outline" onClick={downloadSampleExcel} className="font-body gap-2 border-gold/30 text-gold hover:bg-gold/10">
              <FileSpreadsheet className="w-4 h-4" />
              הורדת קובץ דוגמא
            </Button>
            <Button variant="outline" onClick={() => {
              const approved = lessons.filter(l => l.is_approved);
              if (approved.length === 0) { toast.error("אין שיעורים מאושרים לייצוא"); return; }
              const valid: any[] = [];
              const invalid: { name: string; missing: string[] }[] = [];
              for (const l of approved) {
                const res = validateLessonForExport(l);
                if (res.valid) valid.push(l);
                else invalid.push({ name: l.rabbi_name || "ללא שם", missing: res.missing });
              }
              if (valid.length === 0) {
                toast.error(`אין שיעורים מלאים לייצוא. ${invalid.length} שיעורים חסרים שדות חובה.`, {
                  description: invalid.slice(0, 5).map(i => `${i.name}: חסר ${i.missing.join(", ")}`).join(" • "),
                  duration: 8000,
                });
                return;
              }
              exportLessonsToExcel(valid);
              if (invalid.length > 0) {
                toast.warning(`יוצאו ${valid.length} שיעורים. ${invalid.length} דולגו בגלל חוסר במידע`, {
                  description: invalid.slice(0, 4).map(i => `${i.name}: חסר ${i.missing.join(", ")}`).join(" • "),
                  duration: 10000,
                });
              } else {
                toast.success(`${valid.length} שיעורים יוצאו לנדרים פלוס בהצלחה!`);
              }
            }} className="font-body gap-2 border-gold/30 text-gold hover:bg-gold/10">
              <FileSpreadsheet className="w-4 h-4" />
              ייצוא לנדרים פלוס
            </Button>
            <Button asChild variant="outline" className="font-body gap-2 border-teal/30 text-teal hover:bg-teal/10">
              <a href="https://aypsqqvfohekxxuqsmrw.supabase.co/storage/v1/object/public/portal-assets/exports%2Fall_data_export.zip" download>
                <FileSpreadsheet className="w-4 h-4" />
                הורדת גיבוי מלא (ZIP)
              </a>
            </Button>
            <Button variant="outline" onClick={fetchAll} className="font-body gap-2 mr-auto">
              <RefreshCw className="w-4 h-4" />
              רענון
            </Button>
          </div>

          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList className="bg-navy/5 border border-border p-1 rounded-xl flex-wrap h-auto">
              <TabsTrigger value="lessons" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg">
                שיעורים ({lessons.length})
              </TabsTrigger>
              <TabsTrigger value="nedarim" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg">
                <Zap className="w-4 h-4 ml-1" /> נדרים ({nedarimSubmissions.filter(s => s.status === "new").length})
              </TabsTrigger>
              <TabsTrigger value="teachers" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg">
                מגידי שיעור ({teacherLeads.length})
              </TabsTrigger>
              <TabsTrigger value="seekers" className="font-body font-bold data-[state=active]:bg-gradient-magenta data-[state=active]:text-primary-foreground rounded-lg">
                מחפשי שיעור ({seekerLeads.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" className="font-body font-bold data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground rounded-lg">
                הודעות ({contactMessages.length})
              </TabsTrigger>
              <TabsTrigger value="synagogues" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg">
                <Building2 className="w-4 h-4 ml-1" /> בתי כנסת ({synagogues.length})
              </TabsTrigger>
              <TabsTrigger value="portals" className="font-body font-bold data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground rounded-lg">
                <LinkIcon className="w-4 h-4 ml-1" /> פורטלים
              </TabsTrigger>
              <TabsTrigger value="study-days" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg">
                <BookOpen className="w-4 h-4 ml-1" /> ימי עיון ({studyDayEvents.length})
              </TabsTrigger>
              <TabsTrigger value="api" className="font-body font-bold data-[state=active]:bg-navy data-[state=active]:text-primary-foreground rounded-lg">
                <Code className="w-4 h-4 ml-1" /> API
              </TabsTrigger>
              <TabsTrigger value="integrations" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg">
                <Zap className="w-4 h-4 ml-1" /> אינטגרציות
              </TabsTrigger>
              <TabsTrigger value="full-access" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg relative">
                <Sparkles className="w-4 h-4 ml-1" /> בקשות להרחבה
                {pendingFullAccessCount > 0 && (
                  <Badge className="mr-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 animate-pulse">{pendingFullAccessCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="matching" className="font-body font-bold data-[state=active]:bg-gradient-magenta data-[state=active]:text-primary-foreground rounded-lg">
                <Handshake className="w-4 h-4 ml-1" /> התאמת שיעורים
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם, נושא, עיר..."
                className="pr-12 py-6 text-lg rounded-xl border-2 focus:border-primary/40"
              />
            </div>

            {/* Lessons Tab */}
            <TabsContent value="lessons">
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/30 rounded-xl">
                <span className="text-xs font-bold text-muted-foreground ml-1">סינון לפי מקור:</span>
                {[
                  { v: "all", label: "הכל" },
                  { v: "pending", label: "⏳ ממתינים" },
                  { v: "nedarim", label: "⚡ מנדרים" },
                  { v: "portal", label: "🔗 מפורטלים" },
                  { v: "synagogue", label: "🏛️ בתי כנסת" },
                  { v: "org", label: "🏢 ארגונים" },
                  { v: "private", label: "👤 פרטי" },
                ].map((f) => (
                  <button
                    key={f.v}
                    onClick={() => setSourceFilter(f.v as any)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      sourceFilter === f.v
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background text-muted-foreground hover:bg-background/80 border border-border"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <span className="mr-auto text-xs text-muted-foreground">{filteredLessons.length} שיעורים</span>
              </div>
              <div className="space-y-3">
                {filteredLessons.map((lesson) => (
                  <motion.div
                    key={lesson.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border-2 border-border hover:border-primary/20 transition-all overflow-hidden"
                  >
                    {/* Lesson Header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-display text-lg font-black text-card-foreground">{lesson.subject}</h3>
                            <Badge className={`font-body font-bold ${
                              lesson.status === "approved" ? "bg-gradient-teal text-primary-foreground" :
                              lesson.status === "rejected" ? "bg-destructive/15 text-destructive" :
                              "bg-gradient-gold text-primary-foreground animate-pulse"
                            }`}>
                              {lesson.status === "approved" ? "✓ מאושר" : lesson.status === "rejected" ? "✗ נדחה" : "⏳ ממתין"}
                            </Badge>
                            {lesson.is_live_stream && (
                              <Badge className="bg-destructive/15 text-destructive font-body animate-pulse">
                                <Radio className="w-3 h-3 ml-1" /> LIVE
                              </Badge>
                            )}
                            {lesson.is_recorded && (
                              <Badge className="bg-gold/15 text-gold font-body">
                                <Video className="w-3 h-3 ml-1" /> מוקלט
                              </Badge>
                            )}
                            {isFromPortal(lesson) && (
                              <Badge className="bg-primary/15 text-primary font-body">
                                <LinkIcon className="w-3 h-3 ml-1" />
                                {isFromShulPortal(lesson)
                                  ? "🏛️ פורטל בית כנסת"
                                  : lesson.org_name && orgPortalNames.has(lesson.org_name)
                                  ? "פורטל ארגון"
                                  : "פורטל רב"}
                              </Badge>
                            )}
                            {isFromNedarim(lesson) && (
                              <Badge className="bg-gold/15 text-gold font-body">
                                <Zap className="w-3 h-3 ml-1" /> מנדרים
                              </Badge>
                            )}
                          </div>
                          <p className="font-body text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{lesson.rabbi_name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lesson.city} {lesson.neighborhood && `/ ${lesson.neighborhood}`}</span>
                            {lesson.synagogue_name && <><span>•</span><span>🏛️ {lesson.synagogue_name}</span></>}
                          </p>
                          {lesson.is_recurring && lesson.schedule_days?.length > 0 && (
                            <p className="font-body text-xs text-primary mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(lesson.schedule_days as any[]).map((d: any) => `${d.day} ${d.time}`).join(" | ")}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {lesson.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => approveLesson(lesson.id)} disabled={busyId === `lesson:${lesson.id}`} className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold shadow-sm">
                                <Check className="w-3 h-3" /> אשר
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectLesson(lesson.id)} disabled={busyId === `lesson:${lesson.id}`} className="text-destructive gap-1 font-body border-destructive/30">
                                <X className="w-3 h-3" /> דחה
                              </Button>
                            </>
                          )}
                          {lesson.status === "approved" && (
                            <Button size="sm" variant="outline" onClick={() => rejectLesson(lesson.id)} disabled={busyId === `lesson:${lesson.id}`} className="text-destructive gap-1 font-body border-destructive/30">
                              <X className="w-3 h-3" /> בטל
                            </Button>
                          )}
                          {lesson.status === "rejected" && (
                            <Button size="sm" onClick={() => approveLesson(lesson.id)} disabled={busyId === `lesson:${lesson.id}`} className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold">
                              <Check className="w-3 h-3" /> אשר
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setPreviewLesson(lesson)} className="gap-1 font-body border-primary/30 text-primary">
                            <Eye className="w-3 h-3" /> צפייה מלאה
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEditing(lesson)} className="gap-1 font-body border-primary/30 text-primary">
                            <Edit3 className="w-3 h-3" /> ערוך
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadLessonTxt(lesson)} className="gap-1 font-body border-gold/30 text-gold">
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => shareLesson(lesson)} className="gap-1 font-body">
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => softDeleteLesson(lesson.id)} disabled={busyId === `lesson:${lesson.id}`} className="gap-1 font-body border-destructive/30 text-destructive hover:bg-destructive/10" title="מחק לצמיתות">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                            className="font-body"
                          >
                            {expandedLesson === lesson.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedLesson === lesson.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="p-5 bg-muted/20 space-y-4">
                            {/* בדיקת שלמות לנדרים פלוס */}
                            {(() => {
                              const validation = validateLessonForExport(lesson);
                              return (
                                <div className={`flex items-center gap-2 p-3 rounded-xl border ${validation.valid ? "bg-teal/10 border-teal/30" : "bg-destructive/10 border-destructive/30"}`}>
                                  {validation.valid ? (
                                    <>
                                      <CheckCheck className="w-4 h-4 text-teal" />
                                      <span className="font-body font-bold text-sm text-teal">מוכן לייצוא לנדרים פלוס ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-4 h-4 text-destructive" />
                                      <span className="font-body font-bold text-sm text-destructive">חסרים שדות חובה: {validation.missing.join(", ")}</span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}

                            {/* תצוגה לפי סדר העמודות של נדרים פלוס */}
                            <div>
                              <p className="font-body text-xs text-muted-foreground mb-2">📋 לפי סדר העמודות בטופס נדרים פלוס:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm font-body">
                                {(() => {
                                  const audience = (lesson.target_audience || []).join(", ");
                                  const gender = (lesson.audience_type || []).join(", ");
                                  const days = Array.isArray(lesson.schedule_days) ? lesson.schedule_days : [];
                                  const dateText = lesson.specific_date
                                    ? lesson.specific_date
                                    : days.length > 0 ? "בכל יום " + days.map((d: any) => d.day).filter(Boolean).join(", ") : "";
                                  const timeText = days.length > 0 ? days.map((d: any) => d.time).filter(Boolean).join(", ") : (lesson.schedule_notes || "");
                                  const streetLine = [lesson.street, lesson.street_number].filter(Boolean).join(" ");

                                  const rabbiCell = (
                                    <div>
                                      <div className="font-bold">{lesson.rabbi_name || <span className="text-destructive">⚠ חסר</span>}</div>
                                      {lesson.rabbi_role && <div className="text-xs text-muted-foreground">{lesson.rabbi_role}</div>}
                                    </div>
                                  );
                                  const addressCell = (
                                    <div>
                                      <div>{streetLine || "—"}</div>
                                      {lesson.neighborhood && <div className="text-xs text-muted-foreground">{lesson.neighborhood}</div>}
                                    </div>
                                  );

                                  const fields: { label: string; value: any; required?: boolean }[] = [
                                    { label: "1. שם הרב", value: rabbiCell, required: true },
                                    { label: "2. נושא השיעור", value: lesson.subject, required: true },
                                    { label: "3. קהל יעד", value: audience, required: true },
                                    { label: "4. עיר", value: lesson.city, required: true },
                                    { label: "5. תאריך / יום", value: dateText, required: true },
                                    { label: "6. שעה", value: timeText, required: true },
                                    { label: "7. כתובת - מיקום", value: addressCell },
                                    { label: "8. שם בית הכנסת", value: lesson.synagogue_name },
                                    { label: "9. שפה", value: lesson.language, required: true },
                                    { label: "10. סגנון", value: lesson.lesson_style },
                                    { label: "11. מגדר", value: gender },
                                    { label: "12. הערות", value: lesson.submitter_notes },
                                    { label: "13. שם הארגון", value: lesson.org_name },
                                  ];

                                  return fields.map((f, idx) => {
                                    const isEmpty = typeof f.value === "string" ? !f.value?.trim() : !f.value;
                                    return (
                                      <div key={idx} className={`p-2 rounded-lg border ${isEmpty && f.required ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
                                        <div className="text-xs text-muted-foreground mb-1">{f.label}{f.required && <span className="text-destructive mr-1">*</span>}</div>
                                        <div className="font-medium text-card-foreground">
                                          {isEmpty ? (
                                            <span className={f.required ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                                              {f.required ? "⚠ חסר - לא ניתן לייצא" : "—"}
                                            </span>
                                          ) : f.value}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* פרטי קשר נוספים (לא נשלחים לנדרים) */}
                            <div className="pt-3 border-t border-border">
                              <p className="font-body text-xs text-muted-foreground mb-2">📞 פרטי קשר נוספים (לא נשלחים לנדרים פלוס):</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-body">
                                <div><span className="text-muted-foreground">טלפון הרב:</span> <span className="font-medium">{lesson.rabbi_phone || "—"}</span></div>
                                <div><span className="text-muted-foreground">איש קשר:</span> <span className="font-medium">{lesson.contact_name || "—"}</span></div>
                                <div><span className="text-muted-foreground">טלפון:</span> <span className="font-medium">{lesson.contact_phone || "—"}</span></div>
                                <div><span className="text-muted-foreground">מייל:</span> <span className="font-medium">{lesson.contact_email || "—"}</span></div>
                                {lesson.donation_link && <div><span className="text-muted-foreground">תרומה:</span> <span className="font-medium truncate">{lesson.donation_link}</span></div>}
                                {lesson.recording_location && <div><span className="text-muted-foreground">הקלטה:</span> <span className="font-medium">{lesson.recording_location}</span></div>}
                              </div>
                            </div>

                            {/* Show matching raw data from nedarim_submissions */}
                            {(() => {
                              const matchingSubmission = nedarimSubmissions.find(
                                (s) => {
                                  const created = new Date(lesson.created_at).getTime();
                                  const subCreated = new Date(s.created_at).getTime();
                                  return Math.abs(created - subCreated) < 60000; // within 1 minute
                                }
                              );
                              if (!matchingSubmission) return null;
                              return (
                                <div className="mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowRawData(showRawData === lesson.id ? null : lesson.id)}
                                    className="gap-1 font-body text-xs"
                                  >
                                    <Code className="w-3 h-3" />
                                    {showRawData === lesson.id ? "הסתר נתונים גולמיים" : "הצג נתונים גולמיים מנדרים"}
                                  </Button>
                                  {showRawData === lesson.id && (
                                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-60 text-foreground" dir="ltr">
                                      {JSON.stringify(matchingSubmission.raw_data, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
                {filteredLessons.length === 0 && (
                  <p className="text-center font-body text-muted-foreground py-16">
                    {searchQuery ? "לא נמצאו תוצאות" : "אין שיעורים עדיין"}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Teacher Leads Tab */}
            <TabsContent value="teachers">
              <div className="space-y-3">
                {teacherLeads.map((t) => (
                  <div key={t.id} className="bg-card rounded-2xl border border-border p-5 hover:border-gold/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-base font-bold text-card-foreground">{t.full_name}</h3>
                          <Badge className={`font-body ${t.status === "new" ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {t.status === "new" ? "✨ חדש" : t.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                          {t.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {t.phone}</span>}
                          {t.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {t.email}</span>}
                          {t.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.city}</span>}
                        </div>
                        {t.subjects?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.subjects.map((s: string) => (
                              <span key={s} className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-body">{s}</span>
                            ))}
                          </div>
                        )}
                        {t.notes && <p className="font-body text-xs text-muted-foreground mt-2">💬 {t.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {teacherLeads.length === 0 && <p className="text-center font-body text-muted-foreground py-16">אין פניות עדיין</p>}
              </div>
            </TabsContent>

            {/* Seeker Leads Tab */}
            <TabsContent value="seekers">
              <div className="space-y-3">
                {seekerLeads.map((s) => (
                  <div key={s.id} className="bg-card rounded-2xl border border-border p-5 hover:border-magenta/30 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base font-bold text-card-foreground">{s.contact_name}</h3>
                      <Badge className="bg-gradient-magenta text-primary-foreground font-body">
                        {s.status === "new" ? "✨ חדש" : s.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</span>}
                      {s.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.city}</span>}
                      {s.lesson_type && <span>סוג: {s.lesson_type}</span>}
                      {s.subject && <span>נושא: {s.subject}</span>}
                    </div>
                    {s.notes && <p className="font-body text-xs text-muted-foreground mt-2">💬 {s.notes}</p>}
                  </div>
                ))}
                {seekerLeads.length === 0 && <p className="text-center font-body text-muted-foreground py-16">אין פניות עדיין</p>}
              </div>
            </TabsContent>

            {/* Contact Messages Tab */}
            <TabsContent value="contacts">
              <div className="space-y-3">
                {contactMessages.map((msg) => (
                  <div key={msg.id} className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-body font-bold text-card-foreground">{msg.name}</h3>
                      {msg.role && <Badge variant="outline" className="font-body border-teal/30 text-primary">{msg.role}</Badge>}
                      {msg.subject && <Badge variant="outline" className="font-body border-gold/30 text-gold">{msg.subject}</Badge>}
                    </div>
                    <p className="font-body text-sm text-muted-foreground mb-2">{msg.message}</p>
                    <div className="flex gap-3 text-xs font-body text-muted-foreground">
                      {msg.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {msg.phone}</span>}
                      {msg.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {msg.email}</span>}
                    </div>
                  </div>
                ))}
                {contactMessages.length === 0 && <p className="text-center font-body text-muted-foreground py-16">אין הודעות עדיין</p>}
              </div>
            </TabsContent>

            {/* API Reference Tab */}
            <TabsContent value="api">
              <ApiReferenceSection />
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/admin/nedarim">
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="bg-card rounded-2xl border-2 border-gold/20 hover:border-gold/40 p-8 transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-card-foreground mb-2">נדרים פלוס</h3>
                    <p className="font-body text-sm text-muted-foreground mb-4">קבלת נתונים אוטומטית מנדרים פלוס דרך Webhook, ניהול ופרסום לפי נושא.</p>
                    <span className="font-body text-sm text-gold font-bold">כניסה לניהול ←</span>
                  </motion.div>
                </Link>
                <Link to="/admin/ivr">
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="bg-card rounded-2xl border-2 border-teal/20 hover:border-teal/40 p-8 transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl bg-gradient-teal flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Phone className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-card-foreground mb-2">ימות המשיח</h3>
                    <p className="font-body text-sm text-muted-foreground mb-4">מערכת קולית אוטומטית: תיעוד API, תפריט IVR, חיפוש שיעורים וסוכן חכם.</p>
                    <span className="font-body text-sm text-primary font-bold">כניסה לניהול ←</span>
                  </motion.div>
                </Link>
              </div>
            </TabsContent>

            {/* Portals Tab */}
            <TabsContent value="portals">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Rabbi Portals */}
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-black text-card-foreground flex items-center gap-2">
                    <Mic className="w-5 h-5 text-gold" /> קישורים לרבנים
                  </h3>
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex gap-3 mb-4">
                      <Input
                        value={newRabbiName}
                        onChange={(e) => setNewRabbiName(e.target.value)}
                        placeholder="שם הרב..."
                        className="flex-1 border-gold/20 focus:border-gold/50"
                      />
                      <Button
                        onClick={async () => {
                          if (busyId || !newRabbiName.trim()) return;
                          setBusyId("create-rabbi-portal");
                          const { data, error } = await supabase.from("rabbi_portals").insert({ rabbi_name: newRabbiName.trim() }).select().single();
                          setBusyId(null);
                          if (error || !data) { toast.error("שגיאה ביצירת קישור: " + (error?.message || "")); return; }
                          setRabbiPortals(prev => [data, ...prev]);
                          setNewRabbiName("");
                          toast.success("קישור לרב נוצר!");
                        }}
                        disabled={busyId === "create-rabbi-portal"}
                        className="bg-gradient-gold text-navy font-body font-bold gap-2"
                      >
                        <Plus className="w-4 h-4" /> צור קישור
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {rabbiPortals.map(p => {
                        const portalUrl = `${window.location.origin}/portal/rabbi/${p.access_token}`;
                        const publicUrl = p.public_token ? `${window.location.origin}/view/rabbi/${p.public_token}` : "";
                        const fe = (p.features_enabled as any) || { settings: false, lessons: true };
                        return (
                          <div key={p.id} className="bg-background rounded-xl border border-gold/10 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-display font-bold text-card-foreground">{p.rabbi_name}</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(portalUrl);
                                    setCopiedToken(p.id);
                                    setTimeout(() => setCopiedToken(null), 2000);
                                    toast.success("קישור ניהול הועתק!");
                                  }}
                                  className="gap-1 border-gold/30 text-gold hover:bg-gold/10 font-body text-xs"
                                >
                                  {copiedToken === p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  ניהול
                                </Button>
                                {publicUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(publicUrl);
                                      setCopiedToken("pub-" + p.id);
                                      setTimeout(() => setCopiedToken(null), 2000);
                                      toast.success("קישור הפצה הועתק!");
                                    }}
                                    className="gap-1 border-teal/30 text-primary hover:bg-teal/10 font-body text-xs"
                                  >
                                    {copiedToken === "pub-" + p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    הפצה
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pt-1">
                              <Button
                                size="sm"
                                onClick={() => approveAllForRabbi(p.rabbi_name)}
                                disabled={busyId === `rabbi:${p.rabbi_name}`}
                                className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold text-xs"
                              >
                                <Check className="w-3 h-3" /> אשר את כל השיעורים
                              </Button>
                              <label className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                                <Switch
                                  checked={fe.settings === true}
                                  disabled={busyId === `rabbi_portals:${p.id}`}
                                  onCheckedChange={async (v) => {
                                    if (busyId) return;
                                    setBusyId(`rabbi_portals:${p.id}`);
                                    const newFe = { ...fe, settings: v };
                                    const { error } = await supabase.from("rabbi_portals").update({ features_enabled: newFe }).eq("id", p.id);
                                    setBusyId(null);
                                    if (error) { toast.error("שגיאה: " + error.message); return; }
                                    setRabbiPortals(prev => prev.map(x => x.id === p.id ? { ...x, features_enabled: newFe } : x));
                                    toast.success(v ? "הגדרות מתקדמות הופעלו" : "הגדרות מתקדמות כובו");
                                  }}
                                />
                                הגדרות מתקדמות
                              </label>
                              <span className="font-body text-xs text-muted-foreground">
                                {lessons.filter(l => l.rabbi_name === p.rabbi_name).length} שיעורים
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {rabbiPortals.length === 0 && (
                        <p className="text-center font-body text-muted-foreground py-8">טרם נוצרו קישורים לרבנים</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Org Portals */}
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-black text-card-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal" /> קישורים לארגונים
                  </h3>
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex gap-3 mb-4">
                      <Input
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="שם הארגון..."
                        className="flex-1 border-teal/20 focus:border-teal/50"
                      />
                      <Button
                        onClick={async () => {
                          if (busyId || !newOrgName.trim()) return;
                          setBusyId("create-org-portal");
                          const { data, error } = await supabase.from("org_portals").insert({ org_name: newOrgName.trim() }).select().single();
                          setBusyId(null);
                          if (error || !data) { toast.error("שגיאה ביצירת קישור: " + (error?.message || "")); return; }
                          setOrgPortals(prev => [data, ...prev]);
                          setNewOrgName("");
                          toast.success("קישור לארגון נוצר!");
                        }}
                        disabled={busyId === "create-org-portal"}
                        className="bg-gradient-teal text-primary-foreground font-body font-bold gap-2"
                      >
                        <Plus className="w-4 h-4" /> צור קישור
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {orgPortals.map(p => {
                        const portalUrl = `${window.location.origin}/portal/org/${p.access_token}`;
                        const publicUrl = p.public_token ? `${window.location.origin}/view/org/${p.public_token}` : "";
                        const fe = (p.features_enabled as any) || { settings: false, lessons: true };
                        return (
                          <div key={p.id} className="bg-background rounded-xl border border-teal/10 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-display font-bold text-card-foreground">{p.org_name}</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(portalUrl);
                                    setCopiedToken(p.id);
                                    setTimeout(() => setCopiedToken(null), 2000);
                                    toast.success("קישור ניהול הועתק!");
                                  }}
                                  className="gap-1 border-teal/30 text-primary hover:bg-teal/10 font-body text-xs"
                                >
                                  {copiedToken === p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  ניהול
                                </Button>
                                {publicUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(publicUrl);
                                      setCopiedToken("pub-" + p.id);
                                      setTimeout(() => setCopiedToken(null), 2000);
                                      toast.success("קישור הפצה הועתק!");
                                    }}
                                    className="gap-1 border-gold/30 text-gold hover:bg-gold/10 font-body text-xs"
                                  >
                                    {copiedToken === "pub-" + p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    הפצה
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pt-1 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => approveAllForOrg(p.org_name)}
                                disabled={busyId === `org:${p.org_name}`}
                                className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold text-xs"
                              >
                                <Check className="w-3 h-3" /> אשר את כל השיעורים
                              </Button>
                              <label className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                                <Switch
                                  checked={fe.settings === true}
                                  disabled={busyId === `org_portals:${p.id}`}
                                  onCheckedChange={async (v) => {
                                    if (busyId) return;
                                    setBusyId(`org_portals:${p.id}`);
                                    const newFe = { ...fe, settings: v };
                                    const { error } = await supabase.from("org_portals").update({ features_enabled: newFe }).eq("id", p.id);
                                    setBusyId(null);
                                    if (error) { toast.error("שגיאה: " + error.message); return; }
                                    setOrgPortals(prev => prev.map(x => x.id === p.id ? { ...x, features_enabled: newFe } : x));
                                    toast.success(v ? "הגדרות מתקדמות הופעלו" : "הגדרות מתקדמות כובו");
                                  }}
                                />
                                הגדרות מתקדמות
                              </label>
                              <label className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                                <Switch
                                  checked={fe.prayer_times === true}
                                  disabled={busyId === `org_portals:${p.id}`}
                                  onCheckedChange={async (v) => {
                                    if (busyId) return;
                                    setBusyId(`org_portals:${p.id}`);
                                    const newFe = { ...fe, prayer_times: v };
                                    const { error } = await supabase.from("org_portals").update({ features_enabled: newFe }).eq("id", p.id);
                                    setBusyId(null);
                                    if (error) { toast.error("שגיאה: " + error.message); return; }
                                    setOrgPortals(prev => prev.map(x => x.id === p.id ? { ...x, features_enabled: newFe } : x));
                                    toast.success(v ? "זמני תפילות הופעלו" : "זמני תפילות כובו");
                                  }}
                                />
                                זמני תפילות
                              </label>
                            </div>
                          </div>
                        );
                      })}
                      {orgPortals.length === 0 && (
                        <p className="text-center font-body text-muted-foreground py-8">טרם נוצרו קישורים לארגונים</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Synagogue Portals */}
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-black text-card-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gold" /> פורטלי בתי כנסת
                  </h3>
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <p className="text-xs text-muted-foreground mb-4">
                      פורטלים נוצרים אוטומטית כשגבאי בית כנסת ממלא את הטופס בקישור{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">/study-days/main</code>
                    </p>
                    <div className="space-y-3">
                      {synagoguePortals.map((p) => {
                        const portalUrl = `${window.location.origin}/shul/${p.access_token}`;
                        const publicUrl = p.public_token ? `${window.location.origin}/view/shul/${p.public_token}` : "";
                        const lessonCount = studyDayEvents.filter((e) => e.session_id === p.id).reduce((s, e) => {
                          const blocks = (e.lessons as any)?.blocks ?? [];
                          return s + blocks.reduce((a: number, b: any) => a + ((b.items ?? []).length), 0);
                        }, 0);
                        return (
                          <div key={p.id} className="bg-background rounded-xl border border-gold/10 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p.logo_url ? (
                                  <img src={p.logo_url} alt="" className="w-8 h-8 rounded-md object-cover" />
                                ) : (
                                  <Building2 className="w-5 h-5 text-gold shrink-0" />
                                )}
                                <h4 className="font-display font-bold text-card-foreground truncate">{p.synagogue_name}</h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => genericDelete("synagogue_portals", p.id, p.synagogue_name)}
                                disabled={busyId === `synagogue_portals:${p.id}`}
                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.city}{p.neighborhood ? ` • ${p.neighborhood}` : ""}
                              {" • "}{lessonCount} שיעורים
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => approveAllForShulPortal(p.id)}
                                disabled={busyId === `shul:${p.id}`}
                                className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold text-xs"
                              >
                                <Check className="w-3 h-3" /> אשר את כל השיעורים
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(portalUrl);
                                  setCopiedToken(p.id);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                  toast.success("קישור ניהול הועתק!");
                                }}
                                className="gap-1 border-gold/30 text-gold hover:bg-gold/10 font-body text-xs"
                              >
                                {copiedToken === p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                ניהול
                              </Button>
                              {publicUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(publicUrl);
                                    setCopiedToken("pub-" + p.id);
                                    setTimeout(() => setCopiedToken(null), 2000);
                                    toast.success("קישור הפצה הועתק!");
                                  }}
                                  className="gap-1 border-teal/30 text-primary hover:bg-teal/10 font-body text-xs"
                                >
                                  {copiedToken === "pub-" + p.id ? <CheckCheck className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                  הפצה
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {synagoguePortals.length === 0 && (
                        <p className="text-center font-body text-muted-foreground py-8 text-sm">
                          טרם נוצרו פורטלי בתי כנסת
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Study Days Tab */}
            <TabsContent value="study-days">
              <div className="space-y-3">
                {studyDayEvents.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
                    אין ימי עיון להצגה כרגע
                  </div>
                ) : (
                  studyDayEvents.map((ev) => {
                    const today = new Date().toISOString().split("T")[0];
                    const isPast = ev.schedule_type === "specific_date" && ev.event_date && ev.event_date < today;
                    const lessonsArr = Array.isArray(ev.lessons) ? ev.lessons : [];
                    const days = Array.isArray(ev.schedule_days) ? ev.schedule_days : [];
                    return (
                      <div key={ev.id} className="bg-card rounded-2xl border-2 border-border hover:border-teal/30 transition-all p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-display text-lg font-black text-card-foreground">
                                🏛️ {ev.synagogue_name}
                              </h3>
                              <Badge className={`font-body font-bold ${
                                ev.is_approved ? "bg-gradient-teal text-primary-foreground" :
                                ev.status === "pending" ? "bg-gradient-gold text-primary-foreground animate-pulse" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {ev.is_approved ? "✓ מאושר" : ev.status === "pending" ? "⏳ ממתין" : "טיוטה"}
                              </Badge>
                              {isPast && (
                                <Badge className="bg-destructive/15 text-destructive font-body font-bold">
                                  עבר התאריך
                                </Badge>
                              )}
                            </div>
                            <p className="font-body text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.city} {ev.street && `, ${ev.street} ${ev.street_number || ""}`}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {ev.schedule_type === "specific_date" ? ev.event_date : days.join(", ")}
                              </span>
                              {ev.target_audience?.length > 0 && (
                                <><span>•</span><span>👥 {ev.target_audience.join(", ")}</span></>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Button size="sm" variant="outline" onClick={async () => {
                              await copyEventToClipboard(ev);
                              toast.success("טקסט הפצה הועתק");
                            }} className="gap-1 font-body" title="העתק טקסט להפצה">
                              <Copy className="w-3 h-3" /> הפץ
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadEventAsText(ev)} className="gap-1 font-body" title="הורד כקובץ טקסט">
                              <Download className="w-3 h-3" />
                            </Button>
                            {!ev.is_approved && (
                              <Button size="sm" onClick={() => approveStudyDay(ev.id)} disabled={busyId === `study-day:${ev.id}`} className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold">
                                <Check className="w-3 h-3" /> אשר
                              </Button>
                            )}
                            {ev.is_approved && (
                              <Button size="sm" variant="outline" onClick={() => rejectStudyDay(ev.id)} disabled={busyId === `study-day:${ev.id}`} className="text-destructive gap-1 font-body border-destructive/30">
                                <X className="w-3 h-3" /> בטל
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => deleteStudyDay(ev.id)} disabled={busyId === `study-day:${ev.id}`} className="gap-1 font-body border-destructive/30 text-destructive hover:bg-destructive/10" title="מחק לצמיתות">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {lessonsArr.length > 0 && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-2 font-bold">📖 שיעורים ({lessonsArr.length}):</div>
                            <ul className="space-y-1 text-sm">
                              {lessonsArr.map((l: any, i: number) => (
                                <li key={i}>
                                  <span className="font-medium">{l.rabbi_name}</span> — {l.subject}
                                  {l.time && <span className="text-muted-foreground"> ({l.time})</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(ev.contact_name || ev.contact_phone || ev.donation_link) && (
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {ev.contact_name && <span>👤 {ev.contact_name}</span>}
                            {ev.contact_phone && <span dir="ltr">📞 {ev.contact_phone}</span>}
                            {ev.donation_link && <a href={ev.donation_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">💝 קישור לתרומה</a>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Nedarim Tab */}
            <TabsContent value="nedarim">
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/30 rounded-xl">
                <span className="text-xs font-bold text-muted-foreground ml-1">סינון לפי סוג:</span>
                {[
                  { v: "all", label: "הכל" },
                  { v: "lesson", label: "📖 עדכון שיעור" },
                  { v: "seeker", label: "🔍 חיפוש שיעור" },
                  { v: "teacher", label: "🎤 מגיד שיעור" },
                ].map((f) => (
                  <button
                    key={f.v}
                    onClick={() => setNedarimTypeFilter(f.v as any)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      nedarimTypeFilter === f.v
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background text-muted-foreground hover:bg-background/80 border border-border"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {nedarimSubmissions.filter(s => nedarimTypeFilter === "all" || (s.submission_type || "").toLowerCase().includes(nedarimTypeFilter)).length === 0 && (
                  <p className="text-center font-body text-muted-foreground py-16">אין פניות עדיין מנדרים פלוס</p>
                )}
                {nedarimSubmissions.filter(s => nedarimTypeFilter === "all" || (s.submission_type || "").toLowerCase().includes(nedarimTypeFilter)).map((sub) => (
                  <div key={sub.id} className="bg-card rounded-2xl border-2 border-border hover:border-gold/30 transition-all p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-display text-lg font-black text-card-foreground">{sub.name || "ללא שם"}</h3>
                          <Badge className={`font-body font-bold ${
                            sub.status === "published" ? "bg-gradient-teal text-primary-foreground" :
                            sub.status === "rejected" ? "bg-destructive/15 text-destructive" :
                            "bg-gradient-gold text-navy animate-pulse"
                          }`}>
                            {sub.status === "published" ? "✓ פורסם" : sub.status === "rejected" ? "✗ נדחה" : "⏳ חדש"}
                          </Badge>
                          {sub.submission_type && (
                            <Badge variant="outline" className="font-body border-gold/30 text-gold">{sub.submission_type}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                          {sub.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {sub.phone}</span>}
                          {sub.subject && <span>📖 {sub.subject}</span>}
                          {sub.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sub.city}</span>}
                        </div>
                        {sub.notes && <p className="font-body text-xs text-muted-foreground mt-2">💬 {sub.notes}</p>}
                        <p className="font-body text-xs text-muted-foreground/60 mt-1">{new Date(sub.created_at).toLocaleString("he-IL")}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.status === "new" && (
                          <>
                            <Button size="sm" onClick={() => approveNedarim(sub)} disabled={busyId === `nedarim_submissions:${sub.id}`} className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold">
                              <Check className="w-3 h-3" /> אשר ופרסם
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => genericReject("nedarim_submissions", sub.id)} disabled={busyId === `nedarim_submissions:${sub.id}`} className="text-destructive gap-1 font-body border-destructive/30">
                              <X className="w-3 h-3" /> דחה
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setViewingNedarim(sub)} className="gap-1 font-body border-primary/30 text-primary">
                          <Eye className="w-3 h-3" /> פרטים
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadJsonAsTxt(sub.raw_data || sub, `nedarim_${sub.id}`)} className="gap-1 font-body border-gold/30 text-gold">
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => shareText(`${sub.name} - ${sub.phone} - ${sub.subject || ""}`)} className="gap-1 font-body">
                          <Share2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => genericDelete("nedarim_submissions", sub.id, "פנייה זו")} disabled={busyId === `nedarim_submissions:${sub.id}`} className="gap-1 font-body border-destructive/30 text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Synagogues Tab */}
            <TabsContent value="synagogues">
              <div className="space-y-3">
                {synagogues.length === 0 && (
                  <p className="text-center font-body text-muted-foreground py-16">אין בתי כנסת רשומים</p>
                )}
                {synagogues.map((s) => {
                  const org = orgPortals.find((o) => o.id === s.org_id);
                  return (
                    <div key={s.id} className="bg-card rounded-2xl border border-border p-5 hover:border-teal/30 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-display text-base font-bold text-card-foreground mb-1">🏛️ {s.name}</h3>
                          <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                            {s.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.city}</span>}
                            {s.neighborhood && <span>{s.neighborhood}</span>}
                            {s.address && <span>{s.address}</span>}
                            {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</span>}
                            {org && <Badge variant="outline" className="font-body border-teal/30 text-primary">{org.org_name}</Badge>}
                          </div>
                          {s.notes && <p className="font-body text-xs text-muted-foreground mt-2">💬 {s.notes}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => downloadJsonAsTxt(s, `synagogue_${s.name}`)} className="gap-1 font-body border-gold/30 text-gold">
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => shareText(`🏛️ ${s.name} • ${s.city || ""} ${s.address || ""}`)} className="gap-1 font-body">
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => genericDelete("synagogues", s.id, s.name)} disabled={busyId === `synagogues:${s.id}`} className="gap-1 font-body border-destructive/30 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="full-access">
              <FullAccessRequestsTab />
            </TabsContent>

            <TabsContent value="matching">
              <MatchingTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-xl p-4"
            onClick={(e) => e.target === e.currentTarget && setEditingLesson(null)}
          >
            <motion.div
              ref={editPanelRef}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              aria-label="עריכת שיעור"
              className="bg-card rounded-3xl border border-border shadow-elegant max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-black text-foreground">
                    עריכת <span className="text-gradient-teal">שיעור</span>
                  </h2>
                  <button ref={editCloseButtonRef} onClick={() => setEditingLesson(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שם הרב *</label>
                      <Input value={editData.rabbi_name || ""} onChange={(e) => setEditData({...editData, rabbi_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">נושא *</label>
                      <Input value={editData.subject || ""} onChange={(e) => setEditData({...editData, subject: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">עיר *</label>
                      <Input value={editData.city || ""} onChange={(e) => setEditData({...editData, city: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שכונה</label>
                      <Input value={editData.neighborhood || ""} onChange={(e) => setEditData({...editData, neighborhood: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">בית כנסת</label>
                      <Input value={editData.synagogue_name || ""} onChange={(e) => setEditData({...editData, synagogue_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">רחוב</label>
                      <Input value={editData.street || ""} onChange={(e) => setEditData({...editData, street: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">סגנון</label>
                      <Input value={editData.lesson_style || ""} onChange={(e) => setEditData({...editData, lesson_style: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שפה</label>
                      <Input value={editData.language || ""} onChange={(e) => setEditData({...editData, language: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">תפקיד הרב</label>
                      <Input value={editData.rabbi_role || ""} onChange={(e) => setEditData({...editData, rabbi_role: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">טלפון הרב</label>
                      <Input value={editData.rabbi_phone || ""} onChange={(e) => setEditData({...editData, rabbi_phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">איש קשר</label>
                      <Input value={editData.contact_name || ""} onChange={(e) => setEditData({...editData, contact_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">טלפון קשר</label>
                      <Input value={editData.contact_phone || ""} onChange={(e) => setEditData({...editData, contact_phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">מייל</label>
                      <Input value={editData.contact_email || ""} onChange={(e) => setEditData({...editData, contact_email: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">קישור לתרומה</label>
                    <Input value={editData.donation_link || ""} onChange={(e) => setEditData({...editData, donation_link: e.target.value})} />
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 font-body text-sm">
                      <Switch checked={editData.is_recorded || false} onCheckedChange={(v) => setEditData({...editData, is_recorded: v})} />
                      מוקלט
                    </label>
                    <label className="flex items-center gap-2 font-body text-sm">
                      <Switch checked={editData.is_live_stream || false} onCheckedChange={(v) => setEditData({...editData, is_live_stream: v})} />
                      שידור חי
                    </label>
                    <label className="flex items-center gap-2 font-body text-sm">
                      <Switch checked={editData.is_recurring || false} onCheckedChange={(v) => setEditData({...editData, is_recurring: v})} />
                      קבוע
                    </label>
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">הערות</label>
                    <Textarea value={editData.submitter_notes || ""} onChange={(e) => setEditData({...editData, submitter_notes: e.target.value})} rows={2} />
                  </div>

                  <Button onClick={saveEdit} disabled={busyId === `lesson:${editingLesson}`} className="w-full bg-gradient-brand text-primary-foreground font-body font-bold py-6 hover:opacity-90 gap-2">
                    <Save className="w-5 h-5" />
                    שמור שינויים
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nedarim raw data modal */}
      <AnimatePresence>
        {viewingNedarim && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-xl p-4"
            onClick={(e) => e.target === e.currentTarget && setViewingNedarim(null)}
          >
            <motion.div
              ref={nedarimPanelRef}
              initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              aria-label="פרטי פנייה מנדרים"
              className="bg-card rounded-3xl border border-border shadow-elegant max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-black text-foreground">
                    פרטי <span className="text-gradient-gold">פנייה מנדרים</span>
                  </h2>
                  <button ref={nedarimCloseButtonRef} onClick={() => setViewingNedarim(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm font-body">
                    <div><span className="text-muted-foreground">שם:</span> <span className="font-medium">{viewingNedarim.name || "—"}</span></div>
                    <div><span className="text-muted-foreground">טלפון:</span> <span className="font-medium" dir="ltr">{viewingNedarim.phone || "—"}</span></div>
                    <div><span className="text-muted-foreground">עיר:</span> <span className="font-medium">{viewingNedarim.city || "—"}</span></div>
                    <div><span className="text-muted-foreground">נושא:</span> <span className="font-medium">{viewingNedarim.subject || "—"}</span></div>
                    <div><span className="text-muted-foreground">סוג:</span> <span className="font-medium">{viewingNedarim.submission_type || "—"}</span></div>
                    <div><span className="text-muted-foreground">סטטוס:</span> <span className="font-medium">{viewingNedarim.status}</span></div>
                    {viewingNedarim.notes && <div className="col-span-2"><span className="text-muted-foreground">הערות:</span> <span className="font-medium">{viewingNedarim.notes}</span></div>}
                  </div>

                  {/* Parsed labels view */}
                  {viewingNedarim.raw_data && (
                    <div>
                      <h3 className="font-display text-lg font-bold mb-2 text-card-foreground">כל השדות שהתקבלו</h3>
                      <div className="bg-muted/30 rounded-xl p-4 space-y-1.5 max-h-[300px] overflow-y-auto">
                        {Object.entries(viewingNedarim.raw_data)
                          .filter(([k]) => k.startsWith("Field") && k.endsWith("_Name"))
                          .map(([labelKey, label]) => {
                            const valueKey = labelKey.replace("_Name", "");
                            const value = (viewingNedarim.raw_data as any)[valueKey];
                            if (!value) return null;
                            return (
                              <div key={labelKey} className="flex gap-2 text-sm font-body border-b border-border/30 pb-1">
                                <span className="font-bold text-primary min-w-[140px]">{String(label)}:</span>
                                <span className="text-foreground">{String(value)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <details>
                    <summary className="cursor-pointer text-sm font-bold text-muted-foreground">JSON גולמי</summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-60 text-foreground" dir="ltr">
                      {JSON.stringify(viewingNedarim.raw_data, null, 2)}
                    </pre>
                  </details>

                  <div className="flex gap-2 flex-wrap pt-2">
                    {viewingNedarim.status === "new" && (
                      <Button onClick={() => { approveNedarim(viewingNedarim); setViewingNedarim(null); }} disabled={busyId === `nedarim_submissions:${viewingNedarim.id}`} className="bg-gradient-teal text-primary-foreground gap-1 font-body font-bold">
                        <Check className="w-4 h-4" /> אשר ופרסם כשיעור
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => downloadJsonAsTxt(viewingNedarim.raw_data || viewingNedarim, `nedarim_${viewingNedarim.id}`)} className="gap-1 font-body border-gold/30 text-gold">
                      <Download className="w-4 h-4" /> הורד
                    </Button>
                    <Button variant="outline" onClick={() => genericDelete("nedarim_submissions", viewingNedarim.id, "פנייה זו").then(() => setViewingNedarim(null))} disabled={busyId === `nedarim_submissions:${viewingNedarim.id}`} className="gap-1 font-body border-destructive/30 text-destructive">
                      <Trash2 className="w-4 h-4" /> מחק
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {previewLesson && (
        <LessonDetailModal lesson={previewLesson} onClose={() => setPreviewLesson(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
