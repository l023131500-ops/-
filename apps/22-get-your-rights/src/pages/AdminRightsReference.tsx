import { useState, useEffect, useRef } from "react";
import RightBrandedCard, { downloadBrandedImage, shareViaWhatsApp, shareViaEmail } from "@/components/RightBrandedCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mainCategories } from "@/data/rightsData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Search, BookOpen, Plus, ChevronDown, ChevronUp, FileSpreadsheet, Pencil, Trash2, Download, Upload, Music, Video, FileText, Image, MessageCircle, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

type RightsRef = {
  id: string;
  topic_number: number;
  topic_name: string;
  category: string;
  handling_body: string | null;
  target_audience: string | null;
  eligibility_criteria: string | null;
  required_documents: string | null;
  service_link: string | null;
  podcast_text: string | null;
  plain_description: string | null;
  economic_necessity: number | null;
  financial_potential: string | null;
  accompanying_benefit: string | null;
  bureaucratic_pitfalls: string | null;
  how_to_apply: string | null;
  media_url: string | null;
  media_type: string | null;
};

// The 9 data fields (rows 2-10). Row 1 = topic name.
const DATA_FIELDS: { key: keyof RightsRef; label: string }[] = [
  { key: "plain_description", label: "מה זה אומר? (עממי)" },
  { key: "economic_necessity", label: "נחיצות כלכלית (1-10)" },
  { key: "financial_potential", label: "פוטנציאל כספי" },
  { key: "eligibility_criteria", label: "תנאי סף לזכאות" },
  { key: "accompanying_benefit", label: "הטבות נוספות" },
  { key: "bureaucratic_pitfalls", label: "מוקשים ביורוקרטיים" },
  { key: "required_documents", label: "מה להכין? (מסמכים)" },
  { key: "how_to_apply", label: "איך מבצעים?" },
  { key: "service_link", label: "קישור ישיר" },
];

const DISPLAY_FIELDS = DATA_FIELDS;
const SITE_CATEGORIES = mainCategories.map(c => c.label);

// PDF field colors for branding
const PDF_COLORS: [number, number, number][] = [
  [26, 115, 78],   // green
  [37, 99, 171],   // blue
  [168, 85, 30],   // orange
  [128, 40, 130],  // purple
  [180, 50, 50],   // red
  [30, 130, 130],  // teal
  [100, 100, 30],  // olive
  [60, 60, 150],   // indigo
  [150, 80, 80],   // rose
];

const drawPDFHeader = (doc: jsPDF, pageW: number, margin: number) => {
  // Dark green header band
  doc.setFillColor(26, 77, 46);
  doc.rect(0, 0, pageW, 32, "F");

  // Gold accent line
  doc.setFillColor(196, 164, 75);
  doc.rect(0, 32, pageW, 2, "F");

  // Logo icon - checkmark in circle (brand mark)
  const iconX = pageW - margin - 8;
  const iconY = 11;
  const iconR = 7;
  doc.setFillColor(196, 164, 75);
  doc.circle(iconX, iconY, iconR, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  // Checkmark inside circle
  doc.line(iconX - 3, iconY, iconX - 0.5, iconY + 3);
  doc.line(iconX - 0.5, iconY + 3, iconX + 4, iconY - 3);

  // Organization name next to icon
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("בקלות", iconX - iconR - 3, 14, { align: "right" });

  // Slogan
  doc.setFontSize(10);
  doc.setTextColor(196, 164, 75);
  doc.text("הזכות שלך, האחריות שלנו", pageW - margin, 24, { align: "right" });

  // Left side decorative element
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("מיצוי זכויות מקצועי", margin, 14, { align: "left" });
  doc.text("02-3131500", margin, 20, { align: "left" });
};

const drawPDFFooter = (doc: jsPDF, pageW: number, margin: number) => {
  const footerTop = 275;
  // Footer band
  doc.setFillColor(245, 245, 240);
  doc.rect(0, footerTop, pageW, 22, "F");
  doc.setFillColor(26, 77, 46);
  doc.rect(0, footerTop, pageW, 1, "F");

  doc.setFontSize(8);
  doc.setTextColor(26, 77, 46);
  doc.text("בקלות - מיצוי זכויות מקצועי", pageW / 2, footerTop + 6, { align: "center" });

  doc.setTextColor(100, 100, 100);
  doc.text("טלפון: 02-3131500  |  מייל: L023131500@gmail.com", pageW / 2, footerTop + 12, { align: "center" });
  doc.text("כל הזכויות שמורות © בקלות", pageW / 2, footerTop + 17, { align: "center" });
};

const generateTopicPDF = (right: RightsRef) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Header
  drawPDFHeader(doc, pageW, margin);
  let y = 42;

  // Topic name with gold underline
  doc.setFontSize(18);
  doc.setTextColor(26, 77, 46);
  doc.text(right.topic_name, pageW - margin, y, { align: "right" });
  y += 3;
  doc.setFillColor(196, 164, 75);
  doc.rect(margin, y, contentW, 0.8, "F");
  y += 6;

  // Category badge
  doc.setFillColor(240, 240, 235);
  const catText = `קטגוריה: ${right.category}`;
  const catW = doc.getTextWidth(catText) + 8;
  doc.roundedRect(pageW - margin - catW, y - 3.5, catW, 7, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(catText, pageW - margin - 4, y + 1, { align: "right" });
  y += 12;

  // Fields
  DISPLAY_FIELDS.forEach((field, idx) => {
    const val = right[field.key];
    if (!val && val !== 0) return;
    const strVal = String(val);
    const color = PDF_COLORS[idx % PDF_COLORS.length];

    if (y > 255) {
      drawPDFFooter(doc, pageW, margin);
      doc.addPage();
      drawPDFHeader(doc, pageW, margin);
      y = 42;
    }

    // Colored field label with rounded corners
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, y - 4, contentW, 8, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(field.label, pageW - margin - 4, y + 1, { align: "right" });
    y += 10;

    // Field value
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(strVal, contentW - 8);
    lines.forEach((line: string) => {
      if (y > 265) {
        drawPDFFooter(doc, pageW, margin);
        doc.addPage();
        drawPDFHeader(doc, pageW, margin);
        y = 42;
      }
      doc.text(line, pageW - margin - 4, y, { align: "right" });
      y += 5.5;
    });
    y += 4;
  });

  // Footer on last page
  drawPDFFooter(doc, pageW, margin);

  doc.save(`${right.topic_name}.pdf`);
};

const AdminRightsReference = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [rights, setRights] = useState<RightsRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);

  const [selectedRight, setSelectedRight] = useState<RightsRef | null>(null);
  const [editRight, setEditRight] = useState<RightsRef | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRight, setNewRight] = useState<Record<string, string | number>>({
    topic_name: "", category: "", plain_description: "", economic_necessity: 0,
    financial_potential: "", eligibility_criteria: "", accompanying_benefit: "",
    bureaucratic_pitfalls: "", required_documents: "", how_to_apply: "", service_link: "",
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [importCategory, setImportCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [pendingImportData, setPendingImportData] = useState<Record<string, any>[] | null>(null);
  const [addingRight, setAddingRight] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setAuthChecked(true);
      loadRights();
    };
    checkAuth();
  }, [navigate]);

  const loadRights = async () => {
    setLoading(true);
    const { data } = await supabase.from("rights_reference").select("*").order("topic_number", { ascending: true });
    if (data) setRights(data as RightsRef[]);
    setLoading(false);
  };

  const dbCategories = [...new Set(rights.map(r => r.category))].sort();
  const categories = [...new Set([...SITE_CATEGORIES, ...dbCategories])].sort();

  // ── Excel import ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { toast({ title: "שגיאה", description: "הקובץ ריק או חסרות שורות", variant: "destructive" }); return; }
      const startCol = 1;
      const maxCols = Math.max(...rows.map(r => r?.length || 0));
      if (maxCols <= startCol) { toast({ title: "שגיאה", description: "לא נמצאו עמודות עם נתונים", variant: "destructive" }); return; }
      const topics: Record<string, any>[] = [];
      for (let col = startCol; col < maxCols; col++) {
        const topicName = String(rows[0]?.[col] || "").trim();
        if (!topicName) continue;
        const record: Record<string, any> = { topic_name: topicName };
        for (let row = 1; row < Math.min(10, rows.length); row++) {
          const field = DATA_FIELDS[row - 1];
          if (!field) break;
          const val = rows[row]?.[col];
          if (val !== undefined && val !== null && val !== "") {
            if (field.key === "economic_necessity") { record[field.key] = parseInt(String(val)) || null; }
            else { record[field.key] = String(val).trim(); }
          }
        }
        topics.push(record);
      }
      if (topics.length === 0) { toast({ title: "שגיאה", description: "לא נמצאו נושאים בקובץ", variant: "destructive" }); return; }
      setPendingImportData(topics);
      setImportCategory("");
      setCustomCategory("");
      setShowCategoryPicker(true);
    } catch { toast({ title: "שגיאה", description: "שגיאה בקריאת הקובץ", variant: "destructive" }); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!pendingImportData) return;
    const category = customCategory.trim() || importCategory;
    if (!category) { toast({ title: "שגיאה", description: "נא לבחור או להזין קטגוריה", variant: "destructive" }); return; }
    setImporting(true);
    const maxNum = rights.length > 0 ? Math.max(...rights.map(r => r.topic_number)) : 0;
    let imported = 0, skipped = 0;
    for (let i = 0; i < pendingImportData.length; i++) {
      const record = { ...pendingImportData[i], category, topic_number: maxNum + i + 1 };
      const { error } = await supabase.from("rights_reference").insert(record as any);
      if (error) skipped++; else imported++;
    }
    toast({ title: "ייבוא הושלם", description: `${imported} נושאים יובאו לקטגוריה "${category}"${skipped > 0 ? `, ${skipped} נדלגו` : ""}` });
    setShowCategoryPicker(false);
    setPendingImportData(null);
    setImporting(false);
    loadRights();
  };

  // ── Media upload ──
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, rightId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const isVideo = file.type.startsWith("video/");
    const mediaType = isVideo ? "video" : "audio";
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${rightId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("rights-media").upload(path, file);
    if (uploadError) {
      toast({ title: "שגיאה", description: "העלאה נכשלה", variant: "destructive" });
      setUploadingMedia(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("rights-media").getPublicUrl(path);
    const { error: saveError } = await supabase.from("rights_reference").update({ media_url: publicUrl, media_type: mediaType } as any).eq("id", rightId);
    setUploadingMedia(false);
    if (saveError) {
      toast({ title: "שגיאה", description: "שמירת המדיה נכשלה", variant: "destructive" });
      return;
    }
    toast({ title: "הועלה", description: `${mediaType === "video" ? "סרטון" : "פודקאסט"} הועלה בהצלחה` });
    setMediaTarget(null);
    loadRights();
  };

  const handleRemoveMedia = async (rightId: string) => {
    const { error } = await supabase.from("rights_reference").update({ media_url: null, media_type: null } as any).eq("id", rightId);
    if (error) {
      toast({ title: "שגיאה", description: "הסרת המדיה נכשלה", variant: "destructive" });
      return;
    }
    toast({ title: "הוסר", description: "המדיה הוסרה" });
    loadRights();
  };

  // ── Add single topic ──
  const handleAddRight = async () => {
    if (addingRight) return;
    const catValue = (customCategory.trim() || (newRight.category as string)).trim();
    if (!(newRight.topic_name as string).trim() || !catValue) { toast({ title: "שגיאה", description: "נא למלא שם נושא וקטגוריה", variant: "destructive" }); return; }
    setAddingRight(true);
    const nextNum = rights.length > 0 ? Math.max(...rights.map(r => r.topic_number)) + 1 : 1;
    const { error } = await supabase.from("rights_reference").insert({
      topic_number: nextNum, topic_name: newRight.topic_name as string, category: catValue,
      plain_description: (newRight.plain_description as string) || null, economic_necessity: (newRight.economic_necessity as number) || null,
      financial_potential: (newRight.financial_potential as string) || null, eligibility_criteria: (newRight.eligibility_criteria as string) || null,
      accompanying_benefit: (newRight.accompanying_benefit as string) || null, bureaucratic_pitfalls: (newRight.bureaucratic_pitfalls as string) || null,
      required_documents: (newRight.required_documents as string) || null, how_to_apply: (newRight.how_to_apply as string) || null,
      service_link: (newRight.service_link as string) || null,
    } as any);
    setAddingRight(false);
    if (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו להוסיף את הנושא. נסו שוב.", variant: "destructive" });
      return;
    }
    toast({ title: "נוסף", description: "הנושא נוסף בהצלחה" });
    setNewRight({ topic_name: "", category: "", plain_description: "", economic_necessity: 0, financial_potential: "", eligibility_criteria: "", accompanying_benefit: "", bureaucratic_pitfalls: "", required_documents: "", how_to_apply: "", service_link: "" });
    setCustomCategory(""); setShowAddForm(false); loadRights();
  };

  const handleSaveEdit = async () => {
    if (!editRight || savingEdit) return;
    setSavingEdit(true);
    const { id, ...rest } = editRight;
    const { error } = await supabase.from("rights_reference").update(rest as any).eq("id", id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לעדכן את הנושא. נסו שוב.", variant: "destructive" });
      return;
    }
    toast({ title: "עודכן", description: "הנושא עודכן בהצלחה" });
    setEditRight(null); loadRights();
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (!confirm("למחוק את הנושא הזה?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("rights_reference").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו למחוק את הנושא. נסו שוב.", variant: "destructive" });
      return;
    }
    toast({ title: "נמחק", description: "הנושא נמחק" });
    setSelectedRight(null); loadRights();
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>;

  const filtered = rights.filter(r => {
    const matchesSearch = !searchTerm || r.topic_name.includes(searchTerm) || r.category.includes(searchTerm) || r.plain_description?.includes(searchTerm);
    const matchesCat = categoryFilter === "all" || r.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const grouped = filtered.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, RightsRef[]>);

  const toggleCat = (cat: string) => {
    const next = new Set(expandedCats);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setExpandedCats(next);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">מאגר זכויות</h1>
              <p className="text-sm text-muted-foreground">{rights.length} נושאים ב-{categories.length} קטגוריות</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <label className="inline-flex">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="sr-only" disabled={importing} />
              <Button size="sm" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <FileSpreadsheet className="w-4 h-4" />
                {importing ? "מייבא..." : "ייבוא אקסל"}
              </Button>
            </label>
            <Button size="sm" onClick={() => { setCustomCategory(""); setShowAddForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> הוסף נושא
            </Button>
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" />חזרה ללידים</Button></Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-4">
        {/* Excel format guide */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-medium text-foreground mb-2">📊 פורמט אקסל - שורה 1 = שמות נושאים, שורות 2-10 = נתונים:</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded text-[10px] bg-primary/20 text-primary font-bold">שורה 1: שם הנושא</span>
            {DATA_FIELDS.map(f => (
              <span key={f.key} className="px-2 py-1 rounded text-[10px] bg-muted text-muted-foreground">{f.label}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">עמודה A = כותרות השדות (קבועה). כל עמודה מ-B והלאה = נושא חדש. בעת ייבוא תבחר קטגוריה.</p>
        </div>

        {/* Search & filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש נושא, קטגוריה..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="סינון לפי קטגוריה" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">כל הקטגוריות</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Categories accordion */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">טוען...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">אין נושאים במאגר. העלה קובץ אקסל או הוסף נושא ידנית.</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{cat}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  {expandedCats.has(cat) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expandedCats.has(cat) && (
                  <div className="border-t border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12">#</TableHead>
                          <TableHead className="text-right">נושא</TableHead>
                          <TableHead className="text-right">נחיצות</TableHead>
                          <TableHead className="text-right">פוטנציאל</TableHead>
                          <TableHead className="text-right">מדיה</TableHead>
                          <TableHead className="text-right w-32">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(r => (
                          <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" role="button" tabIndex={0} aria-label={`פרטי זכות: ${r.topic_name}`}
                            onClick={() => setSelectedRight(r)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedRight(r); } }}>
                            <TableCell className="text-sm font-mono text-muted-foreground">{r.topic_number}</TableCell>
                            <TableCell className="text-sm font-medium">{r.topic_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.economic_necessity ? `${r.economic_necessity}/10` : "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.financial_potential || "-"}</TableCell>
                            <TableCell>
                              {r.media_url ? (
                                <span className="text-xs text-primary flex items-center gap-1">
                                  {r.media_type === "video" ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                                  {r.media_type === "video" ? "סרטון" : "פודקאסט"}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); downloadBrandedImage(r); }} title="הורד תמונה ממותגת">
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(r); }} title="שלח בוואטסאפ" className="text-green-600">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); shareViaEmail(r); }} title="שלח במייל">
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditRight({ ...r }); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRight(r); }}>
                                  <BookOpen className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hidden media input */}
      <input ref={mediaInputRef} type="file" accept="audio/*,video/*" className="sr-only"
        onChange={(e) => { if (mediaTarget) handleMediaUpload(e, mediaTarget); }}
      />

      {/* ── View Detail Dialog ── */}
      <Dialog open={!!selectedRight && !editRight} onOpenChange={(open) => !open && setSelectedRight(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedRight && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedRight.topic_number}. {selectedRight.topic_name}</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">קטגוריה: {selectedRight.category}</p>
              
              <Tabs defaultValue="details" dir="rtl">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1 gap-1"><BookOpen className="w-3.5 h-3.5" />פרטים</TabsTrigger>
                  <TabsTrigger value="branded" className="flex-1 gap-1"><Image className="w-3.5 h-3.5" />בלאנק ממותג</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  <div className="space-y-3 mt-2">
                    {DISPLAY_FIELDS.map(({ key, label }) => {
                      const val = selectedRight[key];
                      if (!val && val !== 0) return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                          {key === "service_link" ? (
                            <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{String(val)}</a>
                          ) : key === "economic_necessity" ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(Number(val) / 10) * 100}%` }} />
                              </div>
                              <span className="text-sm font-bold">{val}/10</span>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{String(val)}</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Media section */}
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold text-foreground mb-2">🎙️ מדיה (פודקאסט / סרטון):</p>
                      {selectedRight.media_url ? (
                        <div className="space-y-2">
                          {selectedRight.media_type === "video" ? (
                            <video controls className="w-full rounded-lg" src={selectedRight.media_url} />
                          ) : (
                            <audio controls className="w-full" src={selectedRight.media_url} />
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveMedia(selectedRight.id)} className="gap-1 text-xs">
                            <Trash2 className="w-3 h-3" /> הסר מדיה
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" disabled={uploadingMedia} className="gap-1 text-xs"
                          onClick={() => { setMediaTarget(selectedRight.id); mediaInputRef.current?.click(); }}>
                          <Upload className="w-3 h-3" /> {uploadingMedia ? "מעלה..." : "העלה פודקאסט / סרטון"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadBrandedImage(selectedRight)}>
                      <Download className="w-3.5 h-3.5" /> הורד תמונה
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300" onClick={() => shareViaWhatsApp(selectedRight)}>
                      <MessageCircle className="w-3.5 h-3.5" /> וואטסאפ
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => shareViaEmail(selectedRight)}>
                      <Mail className="w-3.5 h-3.5" /> מייל
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditRight({ ...selectedRight }); }}>
                      <Pencil className="w-3.5 h-3.5" /> עריכה
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" disabled={!!deletingId} onClick={() => handleDelete(selectedRight.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> {deletingId === selectedRight.id ? "מוחק..." : "מחיקה"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="branded">
                  <div className="mt-2 overflow-x-auto">
                    <RightBrandedCard right={selectedRight} />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editRight} onOpenChange={(open) => !open && setEditRight(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          {editRight && (
            <>
              <DialogHeader>
                <DialogTitle>עריכת נושא</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label htmlFor="edit-right-topic-name" className="text-xs text-muted-foreground">שם הנושא</label>
                  <Input id="edit-right-topic-name" value={editRight.topic_name} onChange={(e) => setEditRight({ ...editRight, topic_name: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <label htmlFor="edit-right-category" className="text-xs text-muted-foreground">קטגוריה</label>
                  <div className="flex gap-2">
                    <Select value={editRight.category} onValueChange={(v) => setEditRight({ ...editRight, category: v })}>
                      <SelectTrigger id="edit-right-category" className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input aria-label="או קטגוריה חדשה" placeholder="או קטגוריה חדשה" className="text-sm flex-1" onChange={(e) => {
                      if (e.target.value.trim()) setEditRight({ ...editRight, category: e.target.value.trim() });
                    }} />
                  </div>
                </div>
                {DISPLAY_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label htmlFor={`edit-right-${key}`} className="text-xs text-muted-foreground">{label}</label>
                    {key === "economic_necessity" ? (
                      <Input id={`edit-right-${key}`} type="number" min={1} max={10} value={editRight[key] || ""} onChange={(e) => setEditRight({ ...editRight, [key]: parseInt(e.target.value) || null })} className="text-sm" />
                    ) : key === "service_link" ? (
                      <Input id={`edit-right-${key}`} value={editRight[key] || ""} onChange={(e) => setEditRight({ ...editRight, [key]: e.target.value })} className="text-sm" dir="ltr" />
                    ) : (
                      <Textarea value={String(editRight[key] || "")} onChange={(e) => setEditRight({ ...editRight, [key]: e.target.value })} aria-label={label} className="text-sm" rows={2} />
                    )}
                  </div>
                ))}
                <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">{savingEdit ? "שומר..." : "שמור שינויים"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Topic Dialog ── */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת נושא חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="שם הנושא *" value={newRight.topic_name} onChange={(e) => setNewRight({ ...newRight, topic_name: e.target.value })} className="text-sm" />
            <div>
              <label htmlFor="add-right-category" className="text-xs text-muted-foreground">קטגוריה *</label>
              <div className="flex gap-2">
                {categories.length > 0 && (
                  <Select value={newRight.category as string} onValueChange={(v) => { setNewRight({ ...newRight, category: v }); setCustomCategory(""); }}>
                    <SelectTrigger id="add-right-category" className="text-sm"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Input placeholder="או קטגוריה חדשה" aria-label="קטגוריה חדשה" value={customCategory} onChange={(e) => { setCustomCategory(e.target.value); setNewRight({ ...newRight, category: "" }); }} className="text-sm flex-1" />
              </div>
            </div>
            {DISPLAY_FIELDS.map(({ key, label }) => (
              <div key={key}>
                {key === "economic_necessity" ? (
                  <Input placeholder={label} type="number" min={1} max={10} value={newRight[key] || ""} onChange={(e) => setNewRight({ ...newRight, [key]: parseInt(e.target.value) || 0 })} className="text-sm" />
                ) : key === "service_link" ? (
                  <Input placeholder={label} value={newRight[key]} onChange={(e) => setNewRight({ ...newRight, [key]: e.target.value })} className="text-sm" dir="ltr" />
                ) : (
                  <Textarea placeholder={label} value={newRight[key]} onChange={(e) => setNewRight({ ...newRight, [key]: e.target.value })} aria-label={label} className="text-sm" rows={2} />
                )}
              </div>
            ))}
            <Button onClick={handleAddRight} disabled={addingRight} className="w-full gap-2">
              <Plus className="w-4 h-4" /> {addingRight ? "מוסיף..." : "הוסף נושא"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Category Picker for Import ── */}
      <Dialog open={showCategoryPicker} onOpenChange={(open) => { if (!open && !importing) { setShowCategoryPicker(false); setPendingImportData(null); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר קטגוריה לנושאים המיובאים</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">נמצאו {pendingImportData?.length || 0} נושאים בקובץ. בחר קטגוריה:</p>
          <div className="space-y-3 mt-2">
            {categories.length > 0 && (
              <Select value={importCategory} onValueChange={(v) => { setImportCategory(v); setCustomCategory(""); }}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="בחר קטגוריה קיימת" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="או הזן קטגוריה חדשה" value={customCategory} onChange={(e) => { setCustomCategory(e.target.value); setImportCategory(""); }} className="text-sm" />
            <Button onClick={confirmImport} disabled={importing || (!importCategory && !customCategory.trim())} className="w-full">
              {importing ? "מייבא..." : "ייבא נושאים"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRightsReference;
