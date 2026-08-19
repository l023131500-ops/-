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
import { ArrowRight, Search, BookOpen, Plus, ChevronDown, ChevronUp, FileSpreadsheet, Pencil, Trash2, Download, Upload, Music, Video, Image, MessageCircle, Mail, Mic, FileDown, FileText, Send, Copy, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { ClientMessageEditor } from "@/components/admin/ClientMessageEditor";

type DocItem = { label: string; required?: boolean };
type Question = { id: string; question: string; type: "yes_no" | "text" | "number"; qualifying_answer?: string; enabled?: boolean };

type RightsRef = {
  id: string;
  topic_number: number;
  topic_name: string;
  category: string;
  target_audience: string | null;
  what_you_get: string | null;
  eligibility_criteria: string | null;
  exact_parameters: string | null;
  details_to_prepare: string | null;
  required_documents: string | null;
  gold_tip: string | null;
  handling_body: string | null;
  service_link: string | null;
  physical_form_url: string | null;
  questionnaire: any | null;
  voice_message_text: string | null;
  podcast_text: string | null;
  media_url: string | null;
  media_type: string | null;
  client_message_template: string | null;
  required_docs_list: DocItem[] | null;
  qualification_questions: Question[] | null;
  // Internal extended fields (admin-only, not exposed publicly)
  plain_description: string | null;
  economic_necessity: number | null;
  financial_potential: string | null;
  accompanying_benefit: string | null;
  bureaucratic_pitfalls: string | null;
  how_to_apply: string | null;
  video_url: string | null;
  service_cost: string | null;
};

// Internal-only extended fields (managed in admin like podcast - not in public exports/bot)
const INTERNAL_FIELDS: { key: keyof RightsRef; label: string; rows?: number }[] = [
  { key: "plain_description", label: "תיאור בשפה פשוטה (פנימי)", rows: 3 },
  { key: "financial_potential", label: "פוטנציאל כספי (פנימי)", rows: 2 },
  { key: "accompanying_benefit", label: "הטבה נלווית (פנימי)", rows: 2 },
  { key: "bureaucratic_pitfalls", label: "מכשולים בירוקרטיים (פנימי)", rows: 3 },
  { key: "how_to_apply", label: "איך להגיש (פנימי)", rows: 3 },
];

const DEFAULT_TEMPLATE = `לכבוד {client_name},
שלום וברכה,

בהמשך לשיחתנו לקבלת השירות בנושא "{topic_name}", לצורך הדיוק והשלמת הפרטים לקבלת הנתונים באופן מדויק.

לתשומת ליבך - הזכות ניתנת במקרים הבאים:
{eligibility}

יש להגיש את המסמכים הבאים:
{documents}

ניתן לשלוח את כל הפרטים בטופס הבא בקלות ובמהירות:
{intake_link}

בברכה,
צוות בקלות
📞 02-3131500`;

// 13 textual fields (sequence per spec). Category + topic_name handled separately.
// Field 13 (questionnaire) handled as JSON. Field 15 (podcast) is internal-only.
const DATA_FIELDS: { key: keyof RightsRef; label: string; num: number }[] = [
  { num: 3, key: "target_audience", label: "למי הוא מיועד" },
  { num: 4, key: "what_you_get", label: "מה ניתן לקבל" },
  { num: 5, key: "eligibility_criteria", label: "תנאי סף לזכאות" },
  { num: 6, key: "exact_parameters", label: "פרמטרים מדויקים לקבלת ההטבה" },
  { num: 7, key: "details_to_prepare", label: "פרטים שצריך להכין (הזדהות, אשראי וכו')" },
  { num: 8, key: "required_documents", label: "מסמכים שיש לצרף" },
  { num: 9, key: "gold_tip", label: "טיפ זהב של בקלות ⭐" },
  { num: 10, key: "handling_body", label: "היכן מגישים" },
  { num: 11, key: "service_link", label: "קישור ישיר לשירות" },
  { num: 12, key: "physical_form_url", label: "מסמך פיזי למילוי (קישור)" },
  { num: 14, key: "voice_message_text", label: "נוסח להודעה קולית ללקוח (פחות מדקה)" },
  { num: 19, key: "service_cost", label: "עלות התשלום של השירות" },
];

// Public download labels (no podcast)
const PUBLIC_FIELDS = DATA_FIELDS;
// Template includes podcast at the end (internal admin use)
const TEMPLATE_ROW_LABELS = [
  "1. קטגוריה",
  "2. שם הנושא",
  ...DATA_FIELDS.map(f => `${f.num}. ${f.label}`),
  "13. שאלות לבדיקת זכאות (JSON)",
  "15. נוסח לפודקאסט (פנימי)",
];

const SITE_CATEGORIES = mainCategories.map(c => c.label);

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
  const [sendTarget, setSendTarget] = useState<RightsRef | null>(null);
  const [sendName, setSendName] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);

  const [selectedRight, setSelectedRight] = useState<RightsRef | null>(null);
  const [editRight, setEditRight] = useState<RightsRef | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRight, setNewRight] = useState<Record<string, string>>({
    topic_name: "", category: "",
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [importCategory, setImportCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [pendingImportData, setPendingImportData] = useState<Record<string, any>[] | null>(null);

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
    if (data) setRights(data as any as RightsRef[]);
    setLoading(false);
  };

  const dbCategories = [...new Set(rights.map(r => r.category))].sort();
  const categories = [...new Set([...SITE_CATEGORIES, ...dbCategories])].sort();
  const podcastCount = rights.filter((r) => r.podcast_text?.trim() || (r.media_url && r.media_type === "audio")).length;

  // ── Detect if a topic has podcast (text OR audio file) ──
  const hasPodcast = (r: RightsRef) => !!(r.podcast_text?.trim() || (r.media_url && r.media_type === "audio"));
  const hasClientMessage = (r: RightsRef) => !!(r.client_message_template?.trim());
  const clientMsgCount = rights.filter(hasClientMessage).length;

  const renderClientMessage = (r: RightsRef, name: string): { body: string; link: string } => {
    const link = `${window.location.origin}/intake/${r.id}${name || sendEmail ? `?email=${encodeURIComponent(sendEmail)}` : ""}`;
    const docs = (r.required_docs_list || []).map((d: any) => `• ${d.label}${d.required ? " (חובה)" : ""}`).join("\n") || (r.required_documents || "");
    const body = (r.client_message_template?.trim() || DEFAULT_TEMPLATE)
      .split("{client_name}").join(name?.trim() || "שלום וברכה")
      .split("{topic_name}").join(r.topic_name)
      .split("{eligibility}").join(r.eligibility_criteria || "-")
      .split("{documents}").join(docs)
      .split("{intake_link}").join(link);
    return { body, link };
  };

  const handleSendToClient = async () => {
    if (!sendTarget || !sendEmail.trim()) {
      toast({ title: "חסר מייל", description: "נא להזין מייל הלקוח", variant: "destructive" });
      return;
    }
    const { body, link } = renderClientMessage(sendTarget, sendName);
    // Pre-create a placeholder submission so the data is linked when client opens the link
    await supabase.from("client_intake_submissions").upsert({
      right_id: sendTarget.id,
      right_topic_name: sendTarget.topic_name,
      client_email: sendEmail.trim(),
      client_name: sendName.trim() || null,
      client_phone: sendPhone.trim() || null,
      status: "sent",
    } as any, { onConflict: "client_email,right_id" });
    // Copy text+link to clipboard so admin can paste into mail/whatsapp
    const fullText = `${body}\n\n${link}`;
    try { await navigator.clipboard.writeText(fullText); } catch {}
    // Open mailto
    const subject = `בקלות - ${sendTarget.topic_name}`;
    window.open(`mailto:${sendEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullText)}`);
    toast({ title: "הנוסח הועתק ונפתח במייל", description: "אפשר גם להדביק בוואטסאפ או SMS" });
    setSendTarget(null); setSendName(""); setSendEmail(""); setSendPhone("");
  };


  // ── Excel import (auto-detects single vs multi format) ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) {
        toast({ title: "שגיאה", description: "הקובץ ריק או חסרות שורות", variant: "destructive" });
        return;
      }

      const topics = parseExcelRows(rows);
      if (topics.length === 0) {
        toast({ title: "שגיאה", description: "לא נמצאו נושאים בקובץ. ודא שהקובץ תואם לתבנית.", variant: "destructive" });
        return;
      }

      // Check if all topics already have a category embedded — skip picker
      const allHaveCategory = topics.every(t => t.category);
      if (allHaveCategory) {
        await directImport(topics);
      } else {
        setPendingImportData(topics);
        setImportCategory("");
        setCustomCategory("");
        setShowCategoryPicker(true);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "שגיאה", description: "שגיאה בקריאת הקובץ", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Parse Excel: supports multi-topic (column-per-topic) format
  // Row 0 (col A=label, B+=topic names). Row 1+ = data rows matching TEMPLATE_ROW_LABELS order.
  const parseExcelRows = (rows: any[][]): Record<string, any>[] => {
    const startCol = 1;
    const maxCols = Math.max(...rows.map(r => r?.length || 0));
    if (maxCols <= startCol) return [];
    const topics: Record<string, any>[] = [];

    // Row indices in the template (0-based):
    // 0: header row (col A label, col B+ = topic name)
    // 1: category
    // 2-12: DATA_FIELDS in order
    // 13: questionnaire JSON
    // 14: podcast text

    for (let col = startCol; col < maxCols; col++) {
      const topicName = String(rows[0]?.[col] || "").trim();
      if (!topicName) continue;
      const record: Record<string, any> = { topic_name: topicName };

      const cat = String(rows[1]?.[col] || "").trim();
      if (cat) record.category = cat;

      DATA_FIELDS.forEach((field, i) => {
        const val = rows[2 + i]?.[col];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          record[field.key] = String(val).trim();
        }
      });

      // Questionnaire (JSON) - row index 2 + DATA_FIELDS.length
      const qRaw = rows[2 + DATA_FIELDS.length]?.[col];
      if (qRaw !== undefined && qRaw !== null && String(qRaw).trim() !== "") {
        try { record.questionnaire = JSON.parse(String(qRaw)); } catch {}
      }

      // Podcast text - row 3 + DATA_FIELDS.length
      const podRaw = rows[3 + DATA_FIELDS.length]?.[col];
      if (podRaw !== undefined && podRaw !== null && String(podRaw).trim() !== "") {
        record.podcast_text = String(podRaw).trim();
      }

      // Personal email template - row 4 + DATA_FIELDS.length
      const tmplRaw = rows[4 + DATA_FIELDS.length]?.[col];
      if (tmplRaw !== undefined && tmplRaw !== null && String(tmplRaw).trim() !== "") {
        record.client_message_template = String(tmplRaw).trim();
      }

      // Qualification questions JSON - row 5 + DATA_FIELDS.length
      const qqRaw = rows[5 + DATA_FIELDS.length]?.[col];
      if (qqRaw !== undefined && qqRaw !== null && String(qqRaw).trim() !== "") {
        try { record.qualification_questions = JSON.parse(String(qqRaw)); } catch {}
      }

      // Required docs list JSON - row 6 + DATA_FIELDS.length
      const docsRaw = rows[6 + DATA_FIELDS.length]?.[col];
      if (docsRaw !== undefined && docsRaw !== null && String(docsRaw).trim() !== "") {
        try { record.required_docs_list = JSON.parse(String(docsRaw)); } catch {}
      }

      topics.push(record);
    }
    return topics;
  };

  const directImport = async (topics: Record<string, any>[]) => {
    setImporting(true);
    const maxNum = rights.length > 0 ? Math.max(...rights.map(r => r.topic_number)) : 0;
    let imported = 0, skipped = 0;
    for (let i = 0; i < topics.length; i++) {
      const record = { ...topics[i], topic_number: maxNum + i + 1 };
      const { error } = await supabase.from("rights_reference").insert(record as any);
      if (error) { console.error(error); skipped++; } else imported++;
    }
    toast({ title: "ייבוא הושלם", description: `${imported} נושאים יובאו${skipped > 0 ? `, ${skipped} נדלגו` : ""}` });
    setImporting(false);
    loadRights();
  };

  const confirmImport = async () => {
    if (!pendingImportData) return;
    const category = customCategory.trim() || importCategory;
    if (!category) { toast({ title: "שגיאה", description: "נא לבחור או להזין קטגוריה", variant: "destructive" }); return; }
    setImporting(true);
    const maxNum = rights.length > 0 ? Math.max(...rights.map(r => r.topic_number)) : 0;
    let imported = 0, skipped = 0;
    for (let i = 0; i < pendingImportData.length; i++) {
      const record = { ...pendingImportData[i], category: pendingImportData[i].category || category, topic_number: maxNum + i + 1 };
      const { error } = await supabase.from("rights_reference").insert(record as any);
      if (error) skipped++; else imported++;
    }
    toast({ title: "ייבוא הושלם", description: `${imported} נושאים יובאו${skipped > 0 ? `, ${skipped} נדלגו` : ""}` });
    setShowCategoryPicker(false);
    setPendingImportData(null);
    setImporting(false);
    loadRights();
  };

  // ── Excel export: full public list (NO podcast/internal media) — adds personal-email block ──
  const exportPublicList = () => {
    if (rights.length === 0) {
      toast({ title: "אין נתונים", description: "המאגר ריק", variant: "destructive" });
      return;
    }
    const labels = [
      "1. קטגוריה", "2. שם הנושא",
      ...DATA_FIELDS.map(f => `${f.num}. ${f.label}`),
      "13. שאלות לבדיקת זכאות (JSON)",
      "15. נוסח לפודקאסט (פנימי)",
      "16. נוסח אישי לשליחה ללקוח",
      "17. שאלון פרטני (JSON)",
      "18. מסמכים נדרשים בטופס (JSON)",
    ];
    const aoa: any[][] = [[""]];
    labels.forEach(l => aoa.push([l]));

    rights.forEach(r => {
      aoa[0].push(r.topic_name);
      aoa[1].push(r.category || "");
      aoa[2].push(r.topic_name);
      DATA_FIELDS.forEach((f, i) => aoa[3 + i].push((r as any)[f.key] || ""));
      aoa[3 + DATA_FIELDS.length].push(r.questionnaire ? JSON.stringify(r.questionnaire) : "");
      aoa[4 + DATA_FIELDS.length].push(r.podcast_text || "");
      aoa[5 + DATA_FIELDS.length].push(r.client_message_template || "");
      aoa[6 + DATA_FIELDS.length].push(r.qualification_questions ? JSON.stringify(r.qualification_questions) : "");
      aoa[7 + DATA_FIELDS.length].push(r.required_docs_list ? JSON.stringify(r.required_docs_list) : "");
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 36 }, ...rights.map(() => ({ wch: 35 }))];
    XLSX.utils.book_append_sheet(wb, ws, "מאגר זכויות");
    XLSX.writeFile(wb, `bklot-rights-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "הקובץ הורד", description: `${rights.length} נושאים (כולל נוסח אישי, שאלון ומסמכים)` });
  };

  // ── Excel export: empty template ──
  const exportTemplate = () => {
    const examples: Record<string, [string, string]> = {
      target_audience: ["שכירים שהפרישו לקרן השתלמות", "הורים לילדים עד גיל 18"],
      what_you_get: ["החזר של עד 6,000 ש\"ח", "150-460 ש\"ח לחודש לכל ילד"],
      eligibility_criteria: ["עבודה כשכיר ב-6 שנים אחרונות", "תושבות ישראלית + ילדים בארץ"],
      exact_parameters: ["הכנסה שנתית, מצב משפחתי, מספר ילדים", "מספר ילדים, גיל, סטטוס"],
      details_to_prepare: ["ת.ז, ספח, אישור הפקדות", "ת.ז, פרטי בנק"],
      required_documents: ["טופס 106, 161, אישורי הפקדה", "תעודות לידה"],
      gold_tip: ["הגישו דרך פקיד שומה - מהיר יותר!", "הקצבה אוטומטית מלידה ראשונה"],
      handling_body: ["אתר רשות המסים / פקיד שומה", "סניפי ביטוח לאומי / אונליין"],
      service_link: ["https://www.gov.il/...", "https://www.btl.gov.il/..."],
      physical_form_url: ["https://...form.pdf", ""],
      voice_message_text: ["שלום, מ-בקלות. מגיע לך החזר מס.", "שלום, מ-בקלות. מגיעה קצבת ילדים."],
      service_cost: ["350 ש\"ח", "ללא עלות"],
    };
    const aoa: any[][] = [
      ["", "דוגמה: נושא ראשון", "דוגמה: נושא שני"],
      ["1. קטגוריה", "מס הכנסה", "ביטוח לאומי"],
      ...DATA_FIELDS.map(f => [
        `${f.num}. ${f.label}`,
        examples[f.key as string]?.[0] || "",
        examples[f.key as string]?.[1] || "",
      ]),
      ["13. שאלות לבדיקת זכאות (JSON)", '[{"q":"האם עבדת ב-6 שנים אחרונות?","type":"yesno"}]', ""],
      ["15. נוסח לפודקאסט (פנימי)", "טקסט מלא לקריינות בפודקאסט - פנימי בלבד.", ""],
      ["16. נוסח אישי לשליחה ללקוח",
        "לכבוד {client_name},\nבדקנו עבורך את הזכות {topic_name}. תנאים: {eligibility}. מסמכים: {documents}. למילוי הטופס: {intake_link}",
        ""],
      ["17. שאלון פרטני (JSON)",
        '[{"id":"q1","question":"האם עבדת ב-6 השנים האחרונות?","type":"yes_no","qualifying_answer":"כן","enabled":true}]',
        ""],
      ["18. מסמכים נדרשים בטופס (JSON)",
        '[{"label":"טופס 106","required":true},{"label":"אישור הפקדות","required":false}]',
        ""],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 38 }, { wch: 55 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, ws, "תבנית נושא");

    const instructions: any[][] = [
      ["📘 הוראות מילוי - תבנית מאגר זכויות בקלות"],
      [""],
      ["• עמודה A מכילה את שמות השדות (לא לשנות סדר)"],
      ["• כל עמודה מ-B והלאה = נושא חדש"],
      ["• שדות חובה: שם הנושא + קטגוריה"],
      [""],
      ["שורות 16-18 הן החדשות:"],
      ["16. נוסח אישי - תווי תגיות זמינים: {client_name}, {topic_name}, {eligibility}, {documents}, {intake_link}"],
      ['17. שאלון פרטני - JSON: [{"id":"...","question":"...","type":"yes_no|text|number","qualifying_answer":"כן","enabled":true}]'],
      ['18. מסמכים נדרשים - JSON: [{"label":"שם המסמך","required":true}]'],
      [""],
      ["שורה 13 (שאלות) - JSON תקין או ריק"],
      ["שורה 15 (פודקאסט) - שדה פנימי בלבד"],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "הוראות");

    XLSX.writeFile(wb, "bklot-rights-template.xlsx");
    toast({ title: "התבנית הורדה", description: "כולל נוסח אישי, שאלון ומסמכים" });
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
    await supabase.from("rights_reference").update({ media_url: publicUrl, media_type: mediaType } as any).eq("id", rightId);
    toast({ title: "הועלה", description: `${mediaType === "video" ? "סרטון" : "פודקאסט"} הועלה בהצלחה` });
    setUploadingMedia(false);
    setMediaTarget(null);
    loadRights();
  };

  const handleRemoveMedia = async (rightId: string) => {
    await supabase.from("rights_reference").update({ media_url: null, media_type: null } as any).eq("id", rightId);
    toast({ title: "הוסר", description: "המדיה הוסרה" });
    loadRights();
  };

  // ── Add single topic ──
  const handleAddRight = async () => {
    const catValue = (customCategory.trim() || newRight.category || "").trim();
    if (!newRight.topic_name?.trim() || !catValue) {
      toast({ title: "שגיאה", description: "נא למלא שם נושא וקטגוריה", variant: "destructive" });
      return;
    }
    const nextNum = rights.length > 0 ? Math.max(...rights.map(r => r.topic_number)) + 1 : 1;
    const payload: any = { topic_number: nextNum, topic_name: newRight.topic_name, category: catValue };
    DATA_FIELDS.forEach(f => { if (newRight[f.key]) payload[f.key] = newRight[f.key]; });
    if (newRight.podcast_text) payload.podcast_text = newRight.podcast_text;

    const { error } = await supabase.from("rights_reference").insert(payload);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "נוסף", description: "הנושא נוסף בהצלחה" });
    setNewRight({ topic_name: "", category: "" });
    setCustomCategory(""); setShowAddForm(false); loadRights();
  };

  const handleSaveEdit = async () => {
    if (!editRight) return;
    const { id, ...rest } = editRight;
    await supabase.from("rights_reference").update(rest as any).eq("id", id);
    toast({ title: "עודכן", description: "הנושא עודכן בהצלחה" });
    setEditRight(null); loadRights();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("rights_reference").delete().eq("id", id);
    toast({ title: "נמחק", description: "הנושא נמחק" });
    setSelectedRight(null); loadRights();
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>;

  const filtered = rights.filter(r => {
    const matchesSearch = !searchTerm || r.topic_name.includes(searchTerm) || r.category.includes(searchTerm) || r.what_you_get?.includes(searchTerm);
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
              <p className="text-sm text-muted-foreground">{rights.length} נושאים ב-{categories.length} קטגוריות · {podcastCount} עם פודקאסט</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-2" onClick={exportPublicList}>
              <FileDown className="w-4 h-4" />
              הורדת רשימת כל הזכויות
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={exportTemplate}>
              <FileText className="w-4 h-4" />
              תבנית למילוי נושא חדש
            </Button>
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
            <Link to="/admin/videos"><Button variant="ghost" size="sm" className="gap-2"><Video className="w-4 h-4" />סרטונים</Button></Link>
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" />חזרה ללידים</Button></Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-4">
        {/* Big podcast banner */}
        <div className="rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
              <Mic className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">ניהול פודקאסטים &amp; נוסחי שליחה</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">{podcastCount}</span> מתוך <span className="font-bold">{rights.length}</span> נושאים מכילים פודקאסט (טקסט או קובץ אודיו)
              </p>
            </div>
          </div>
          <Link to="/admin/podcasts">
            <Button size="lg" className="gap-2 shadow-md">
              <Mic className="w-5 h-5" />
              פתיחת מסך הפודקאסטים
            </Button>
          </Link>
        </div>

        {/* Big client-message banner (twin of podcast banner) */}
        <div className="rounded-2xl bg-gradient-to-l from-blue-500/10 via-blue-500/5 to-transparent border-2 border-blue-500/30 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-inner">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">נוסחי מייל פרטניים &amp; שאלוני זכאות</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-blue-600">{clientMsgCount}</span> מתוך <span className="font-bold">{rights.length}</span> נושאים עם נוסח מייל מותאם, רשימת מסמכים ושאלון
              </p>
            </div>
          </div>
          <Link to="/admin/messages">
            <Button size="lg" variant="outline" className="gap-2 shadow-md border-blue-500/40 text-blue-700 hover:bg-blue-50">
              <Mail className="w-5 h-5" />
              פתיחת מסך נוסחי המייל
            </Button>
          </Link>
        </div>

        {/* Excel format guide */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-medium text-foreground mb-2">📊 מבנה אקסל - 15 שדות מקצועיים לכל נושא:</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded text-[10px] bg-primary/20 text-primary font-bold">1. קטגוריה</span>
            <span className="px-2 py-1 rounded text-[10px] bg-primary/20 text-primary font-bold">2. שם הנושא</span>
            {DATA_FIELDS.map(f => (
              <span key={f.key} className="px-2 py-1 rounded text-[10px] bg-muted text-muted-foreground">{f.num}. {f.label}</span>
            ))}
            <span className="px-2 py-1 rounded text-[10px] bg-muted text-muted-foreground">13. שאלות זכאות</span>
            <span className="px-2 py-1 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">15. פודקאסט (פנימי)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">להורדת תבנית מוכנה למילוי - הקש "תבנית למילוי נושא חדש". להורדת המאגר המלא (ללא פודקאסט) - "הורדת רשימת כל הזכויות".</p>
        </div>

        {/* Search & filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש נושא, קטגוריה..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">כל הקטגוריות</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Categories accordion */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">טוען...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">אין נושאים במאגר. הורד את התבנית, מלא אותה והעלה.</div>
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
                  <div className="border-t border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-12">#</TableHead>
                          <TableHead className="text-right whitespace-nowrap">2. נושא</TableHead>
                          {DATA_FIELDS.map(f => (
                            <TableHead key={f.key} className="text-right whitespace-nowrap min-w-[140px]">{f.num}. {f.label}</TableHead>
                          ))}
                          <TableHead className="text-right w-24">פודקאסט</TableHead>
                          <TableHead className="text-right w-24">נוסח שליחה</TableHead>
                          <TableHead className="text-right w-20">מדיה</TableHead>
                          <TableHead className="text-right w-48 sticky left-0 bg-card">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(r => {
                          const podcastReady = hasPodcast(r);
                          return (
                            <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRight(r)}>
                              <TableCell className="text-sm font-mono text-muted-foreground">{r.topic_number}</TableCell>
                              <TableCell className="text-sm font-medium whitespace-nowrap">{r.topic_name}</TableCell>
                              {DATA_FIELDS.map(f => (
                                <TableCell key={f.key} className="text-xs text-muted-foreground max-w-[200px] truncate" title={(r as any)[f.key] || ""}>
                                  {(r as any)[f.key] || "-"}
                                </TableCell>
                              ))}
                              <TableCell>
                                <Link to="/admin/podcasts" onClick={(e) => e.stopPropagation()}>
                                  {podcastReady ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors">
                                      <Mic className="w-3 h-3" /> יש
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors border border-dashed border-border">
                                      <Mic className="w-3 h-3" /> חסר
                                    </span>
                                  )}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {hasClientMessage(r) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Mail className="w-3 h-3" /> מוגדר
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-dashed border-border">
                                    <Mail className="w-3 h-3" /> ברירת מחדל
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {r.media_url ? (
                                  <span className="text-xs text-primary flex items-center gap-1">
                                    {r.media_type === "video" ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                                    {r.media_type === "video" ? "סרטון" : "אודיו"}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="sticky left-0 bg-card">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); downloadBrandedImage(r as any); }} title="הורד תמונה ממותגת">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(r as any); }} title="שלח בוואטסאפ" className="text-green-600">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); shareViaEmail(r as any); }} title="שלח במייל">
                                    <Mail className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSendTarget(r); }} title="שליחת נוסח אישי ללקוח" className="text-blue-600">
                                    <Send className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditRight({ ...r }); }} title="עריכה">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
                  <TabsTrigger value="branded" className="flex-1 gap-1"><Image className="w-3.5 h-3.5" />כרטיס ממותג</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <div className="space-y-3 mt-2">
                    {DATA_FIELDS.map(({ key, label, num }) => {
                      const val = (selectedRight as any)[key];
                      if (!val) return null;
                      return (
                        <div key={key} className="rounded-lg border border-border p-3 bg-muted/20">
                          <p className="text-[10px] text-muted-foreground font-bold mb-1">{num}. {label}</p>
                          {key === "service_link" || key === "physical_form_url" ? (
                            <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{String(val)}</a>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{String(val)}</p>
                          )}
                        </div>
                      );
                    })}

                    {selectedRight.questionnaire && (
                      <div className="rounded-lg border border-border p-3 bg-muted/20">
                        <p className="text-[10px] text-muted-foreground font-bold mb-1">13. שאלות לבדיקת זכאות</p>
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedRight.questionnaire, null, 2)}</pre>
                      </div>
                    )}

                    {/* Media section */}
                    <div className="border-t border-border pt-3 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2">🎙️ 15. נוסח לפודקאסט (פנימי):</p>
                        {selectedRight.podcast_text?.trim() ? (
                          <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">{selectedRight.podcast_text}</pre>
                        ) : (
                          <p className="text-xs text-muted-foreground">אין נוסח פודקאסט. <Link to="/admin/podcasts" className="text-primary underline">להוספה במסך הפודקאסטים</Link></p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2">🎵 קובץ מדיה (אודיו / וידאו):</p>
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
                            <Upload className="w-3 h-3" /> {uploadingMedia ? "מעלה..." : "העלה אודיו / סרטון"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadBrandedImage(selectedRight as any)}>
                      <Download className="w-3.5 h-3.5" /> הורד תמונה
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300" onClick={() => shareViaWhatsApp(selectedRight as any)}>
                      <MessageCircle className="w-3.5 h-3.5" /> וואטסאפ
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => shareViaEmail(selectedRight as any)}>
                      <Mail className="w-3.5 h-3.5" /> מייל
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditRight({ ...selectedRight }); }}>
                      <Pencil className="w-3.5 h-3.5" /> עריכה
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(selectedRight.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> מחיקה
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="branded">
                  <div className="mt-2 overflow-x-auto">
                    <RightBrandedCard right={selectedRight as any} />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editRight} onOpenChange={(open) => !open && setEditRight(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          {editRight && (
            <>
              <DialogHeader>
                <DialogTitle>עריכת נושא</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">2. שם הנושא</label>
                  <Input value={editRight.topic_name} onChange={(e) => setEditRight({ ...editRight, topic_name: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">1. קטגוריה</label>
                  <Select value={editRight.category} onValueChange={(v) => setEditRight({ ...editRight, category: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {DATA_FIELDS.map(({ key, label, num }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{num}. {label}</label>
                    {key === "service_link" || key === "physical_form_url" ? (
                      <Input value={(editRight as any)[key] || ""} onChange={(e) => setEditRight({ ...editRight, [key]: e.target.value } as any)} className="text-sm" dir="ltr" />
                    ) : (
                      <Textarea value={String((editRight as any)[key] || "")} onChange={(e) => setEditRight({ ...editRight, [key]: e.target.value } as any)} className="text-sm" rows={2} />
                    )}
                  </div>
                ))}
                <div className="border-t border-border pt-3 mt-2 space-y-3">
                  <p className="text-xs font-bold text-primary">📋 שדות פנימיים נוספים (לא מוצגים באתר/בוט/אקסל ציבורי)</p>
                  {INTERNAL_FIELDS.map(({ key, label, rows }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <Textarea
                        value={String((editRight as any)[key] || "")}
                        onChange={(e) => setEditRight({ ...editRight, [key]: e.target.value } as any)}
                        className="text-sm mt-1"
                        rows={rows || 2}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-muted-foreground">דחיפות כלכלית (1-5, פנימי)</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={editRight.economic_necessity ?? ""}
                      onChange={(e) => setEditRight({ ...editRight, economic_necessity: e.target.value ? Number(e.target.value) : null })}
                      className="text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-primary flex items-center gap-1">🎬 קישור לסרטון (פנימי)</label>
                    <Input
                      dir="ltr"
                      value={editRight.video_url || ""}
                      onChange={(e) => setEditRight({ ...editRight, video_url: e.target.value })}
                      className="text-sm mt-1"
                      placeholder="https://... (YouTube, Vimeo או קובץ)"
                    />
                  </div>
                </div>
                <div className="border-t border-border pt-3 mt-2">
                  <label className="text-xs font-semibold text-primary flex items-center gap-1">
                    🎙️ 15. נוסח לפודקאסט (פנימי - לא מוצג באתר/בוט/אקסל ציבורי)
                  </label>
                  <Textarea
                    value={editRight.podcast_text || ""}
                    onChange={(e) => setEditRight({ ...editRight, podcast_text: e.target.value })}
                    className="text-sm mt-1"
                    rows={6}
                    placeholder="טקסט מלא לקריינות בפודקאסט. שדה פנימי בלבד."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {editRight.podcast_text ? `${editRight.podcast_text.length} תווים` : "ריק"}
                  </p>
                </div>
                <ClientMessageEditor
                  value={editRight}
                  onChange={(patch) => setEditRight({ ...editRight, ...patch })}
                />
                <Button onClick={handleSaveEdit} className="w-full">שמור שינויים</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Topic Dialog ── */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת נושא חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground">2. שם הנושא *</label>
              <Input placeholder="שם הנושא" value={newRight.topic_name || ""} onChange={(e) => setNewRight({ ...newRight, topic_name: e.target.value })} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">1. קטגוריה *</label>
              <div className="flex gap-2">
                <Select value={newRight.category || ""} onValueChange={(v) => setNewRight({ ...newRight, category: v })}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="או חדשה" className="text-sm flex-1" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
              </div>
            </div>
            {DATA_FIELDS.map(({ key, label, num }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground">{num}. {label}</label>
                {key === "service_link" || key === "physical_form_url" ? (
                  <Input value={newRight[key] || ""} onChange={(e) => setNewRight({ ...newRight, [key]: e.target.value })} className="text-sm" dir="ltr" />
                ) : (
                  <Textarea value={newRight[key] || ""} onChange={(e) => setNewRight({ ...newRight, [key]: e.target.value })} className="text-sm" rows={2} />
                )}
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-primary">🎙️ 15. נוסח לפודקאסט (פנימי, אופציונלי)</label>
              <Textarea value={newRight.podcast_text || ""} onChange={(e) => setNewRight({ ...newRight, podcast_text: e.target.value })} className="text-sm mt-1" rows={4} placeholder="טקסט לקריינות. לא נשלח ללקוחות." />
            </div>
            <Button onClick={handleAddRight} className="w-full">הוסף נושא</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Category Picker Dialog (for multi-import without category column) ── */}
      <Dialog open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר קטגוריה לנושאים החדשים</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">{pendingImportData?.length} נושאים יובאו לקטגוריה הבאה (כי שורת הקטגוריה לא הייתה בקובץ):</p>
            <Select value={importCategory} onValueChange={setImportCategory}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="בחר קטגוריה קיימת" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="או הזן קטגוריה חדשה" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="text-sm" />
            <Button onClick={confirmImport} disabled={importing} className="w-full">
              {importing ? "מייבא..." : "ייבוא"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Send to Client Dialog ── */}
      <Dialog open={!!sendTarget} onOpenChange={(o) => !o && setSendTarget(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>שליחת נוסח אישי - {sendTarget?.topic_name}</DialogTitle>
          </DialogHeader>
          {sendTarget && (
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-muted-foreground">שם הלקוח (אופציונלי)</label>
                <Input value={sendName} onChange={(e) => setSendName(e.target.value)} className="text-sm" placeholder="שלום וברכה אם ריק" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">מייל הלקוח *</label>
                <Input dir="ltr" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} className="text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">טלפון</label>
                <Input dir="ltr" value={sendPhone} onChange={(e) => setSendPhone(e.target.value)} className="text-sm" placeholder="0501234567" />
              </div>
              <div className="border border-border rounded-md p-3 bg-muted/20">
                <p className="text-[10px] text-muted-foreground mb-1">תצוגה מקדימה של הנוסח:</p>
                <pre className="text-xs whitespace-pre-wrap max-h-[200px] overflow-y-auto">{renderClientMessage(sendTarget, sendName).body}</pre>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1" onClick={async () => {
                  const { body, link } = renderClientMessage(sendTarget, sendName);
                  await navigator.clipboard.writeText(`${body}\n\n${link}`);
                  toast({ title: "הועתק!", description: "אפשר להדביק בוואטסאפ/SMS/מייל" });
                }}>
                  <Copy className="w-4 h-4" /> העתק
                </Button>
                <Button className="flex-1 gap-1" onClick={handleSendToClient}>
                  <Send className="w-4 h-4" /> שלח במייל
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRightsReference;
