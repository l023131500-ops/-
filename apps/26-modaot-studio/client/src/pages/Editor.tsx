// עמוד העורך — הלב של המערכת. קנבאס חי במרכז, פאנל שדות+שכבות מימין, סרגל עליון.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type Konva from "konva";
import {
  Crown,
  Download,
  FileImage,
  FileText,
  Save,
  Sparkles,
  Wand2,
  Upload,
  ArrowRight,
  Layers as LayersIcon,
  Type as TypeIcon,
  Image as ImageIcon,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Lightbulb,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Search,
  Blocks,
  Figma,
  Palette,
  ClipboardCheck,
  MessageSquare,
  RefreshCw,
  CheckCheck,
  Mic,
  Video,
  SquareStack,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

import CanvasStage from "@/components/CanvasStage";
import ColorPicker from "@/components/ColorPicker";
import FontControl from "@/components/FontControl";
import { useTemplateContext } from "@/lib/templateContext";
import { getCategoryCopy, getCategoryFields, setFieldText } from "@/lib/copyEngine";
import { getCategory } from "@shared/knowledge";
import { getStyle } from "@shared/styles";
import { FORMATS, getFormat } from "@shared/formats";
import { downloadPNG, downloadPDF, downloadSVG } from "@/lib/exporter";
import { exportPromoVideo, downloadBlob } from "@/lib/videoExport";
import { downloadIDML } from "@/lib/idmlExporter";
import { apiRequest, hasAuthSession, queryClient } from "@/lib/queryClient";
import { nextId } from "@shared/layers";
import type { TemplateDoc, TextLayer, ImageLayer, ShapeLayer, AnyLayer, TemplateBackground } from "@shared/layers";
import { fitText } from "@/lib/autofit";

// שורת מותג כפי שהשרת מחזיר מ-/api/brands (ר' shared/schema.ts) — קריאה בלבד כאן
interface BrandRow {
  id: number;
  brandName: string;
  logoPng: string | null;
  kitJson: string | null;
  updatedAt: number;
}

// שורת רקע שמור כפי שהשרת מחזיר מ-/api/backgrounds (ר' shared/schema.ts) — קריאה בלבד כאן
interface BackgroundRow {
  id: number;
  prompt: string;
  engine: string;
  dataUrl: string;
  createdAt: number;
}

// פריסות "קטע" — היכן על הקנבס תמוקם תמונת-רקע נוספת שאינה הרקע הכללי (פריט 54,
// "הוספת רקעים נוספים לקטעים בעמוד"). כל פריסה היא פונקציה טהורה של מידות הקנבס.
type SectionKey = "top" | "bottom" | "right" | "left";
const SECTION_PRESETS: { key: SectionKey; label: string; rect: (w: number, h: number) => { x: number; y: number; width: number; height: number } }[] = [
  { key: "top", label: "רצועה עליונה", rect: (w, h) => ({ x: 0, y: 0, width: w, height: Math.round(h * 0.35) }) },
  { key: "bottom", label: "רצועה תחתונה", rect: (w, h) => ({ x: 0, y: Math.round(h * 0.65), width: w, height: Math.round(h * 0.35) }) },
  { key: "right", label: "מחצית ימין", rect: (w, h) => ({ x: Math.round(w * 0.5), y: 0, width: Math.round(w * 0.5), height: h }) },
  { key: "left", label: "מחצית שמאל", rect: (w, h) => ({ x: 0, y: 0, width: Math.round(w * 0.5), height: h }) },
];

// כפתור+תפריט קטן (משמש בספריית הרקעים, בוריאנטים של AI, ובתצוגה המוגדלת) להוספת
// תמונת רקע כשכבה על קטע מהעמוד, לצד האפשרות הקיימת להחיל אותה כרקע הכללי כולו.
function SectionBgMenu({
  dataUrl,
  onAdd,
  className,
  testId,
}: {
  dataUrl: string;
  onAdd: (dataUrl: string, section: SectionKey) => void;
  className: string;
  testId?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={className}
          title="הוסף כרקע לקטע בעמוד (לא מחליף את הרקע הכללי)"
          onClick={(e) => e.stopPropagation()}
          data-testid={testId}
        >
          <SquareStack className="h-3 w-3 text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl" className="border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]">
        <DropdownMenuLabel className="text-[#F5EEDD]/70">הוסף כרקע לקטע</DropdownMenuLabel>
        {SECTION_PRESETS.map((p) => (
          <DropdownMenuItem
            key={p.key}
            onClick={() => onAdd(dataUrl, p.key)}
            className="cursor-pointer text-[#F5EEDD] focus:bg-[#C9A227]/20 focus:text-[#F5EEDD]"
            data-testid={`menuitem-section-${p.key}`}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// שולף עד 4 צבעי פלטה (ראשי+משני) מ-kitJson לתצוגת נקודות-צבע קטנה בכרטיס
function brandSwatches(kitJson: string | null): string[] {
  if (!kitJson) return [];
  try {
    const kit = JSON.parse(kitJson);
    const hexes = [...(kit?.colors?.primary ?? []), ...(kit?.colors?.secondary ?? [])]
      .map((c: any) => c?.hex)
      .filter((h: unknown): h is string => typeof h === "string");
    return hexes.slice(0, 4);
  } catch {
    return [];
  }
}

export default function Editor() {
  const [, navigate] = useLocation();
  const { selected, setSelected } = useTemplateContext();
  const { toast } = useToast();
  const stageRef = useRef<Konva.Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [doc, setDoc] = useState<TemplateDoc | null>(selected?.doc ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // עריכת טקסט "in-place" על הקנבס עצמו (דאבל-קליק על שכבת טקסט) — לא רק דרך הפאנל הצדדי
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  // מנוע רקע ה-AI: gemini (ברירת מחדל, קיים) או recraft (חדש — פוטוריאליסטי, פריט 6)
  const [aiEngine, setAiEngine] = useState<"gemini" | "recraft">("gemini");
  // כשלא ברור איזה סגנון מתאים — 2 אפשרויות (Gemini + Recraft במקביל) לבחירה, במקום שהמערכת תחליט לבד (פריט 15)
  const [aiVariants, setAiVariants] = useState<{ engine: "gemini" | "recraft"; label: string; dataUrl: string }[]>([]);
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // קופי חכם (Claude)
  const [aiCopyOpen, setAiCopyOpen] = useState(false);
  const [aiCopyMsg, setAiCopyMsg] = useState("");
  const [aiCopyLoading, setAiCopyLoading] = useState(false);
  type CopyVariant = { title?: string; subtitle?: string; body?: string; cta?: string };
  const [aiCopyVariants, setAiCopyVariants] = useState<CopyVariant[]>([]);

  // ספריית אייקונים (Iconify, חינם) — שכבת דקורציה חדשה מעל הקיימות
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("crown");
  const [iconResults, setIconResults] = useState<string[]>([]);
  const [iconLoading, setIconLoading] = useState(false);

  // מתאמים (Figma/Canva/InDesign) — שלב 3 בצ'קליסט, פאנל תצוגת-מצב בלבד כרגע
  const [adaptersDialogOpen, setAdaptersDialogOpen] = useState(false);

  // ביקורת AI (מבקר QA) — שלב "הביקורת" בלולאת טיוטה→ביקורת→ליטוש (צ'קליסט #13)
  const [critiqueDialogOpen, setCritiqueDialogOpen] = useState(false);
  const [critiquing, setCritiquing] = useState(false);
  type CritiqueFix = { layerId: string; field: string; value: number | string };
  type Critique = {
    score: number;
    strengths: string[];
    issues: { severity: "low" | "medium" | "high"; area: string; note: string; fix?: CritiqueFix }[];
    suggestions: string[];
  };
  const [critiqueResult, setCritiqueResult] = useState<Critique | null>(null);
  // תיקונים שהוחלו בפועל בסבב הביקורת הנוכחי — מתאפס בכל ביקורת AI חדשה
  const [appliedCritiqueFixes, setAppliedCritiqueFixes] = useState<Set<number>>(new Set());

  // הערות לקוח (צ'קליסט #14, שלב השמירה) — נשמר לצד הטיוטה בתוך layersJson;
  // ליישום התיקון האוטומטי לפי ההערות בסבב הבא, זהו רק שלב שמירת ההערה עצמה.
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState(selected?.clientNotes ?? "");

  // קריינות עברית (וידאו קידום — שלב 5 בצ'קליסט) — נשמר לצד הטיוטה בתוך
  // layersJson, אותו דפוס בדיוק כמו clientNotes (פריט 14): לא חלק מ-TemplateDoc,
  // לא משפיע על הרינדור/ייצוא הקיימים.
  const [narrationDialogOpen, setNarrationDialogOpen] = useState(false);
  const [narrationScript, setNarrationScript] = useState(selected?.narrationScript ?? "");
  const [narrationAudioUrl, setNarrationAudioUrl] = useState(selected?.narrationAudioUrl ?? "");
  const [narrationLoading, setNarrationLoading] = useState(false);

  // וידאו קידום (Ken Burns + סנכרון קריינות, lib/videoExport.ts) — הבנייה בפועל
  // שתועדה כ"נשאר לסבב הבא" בפריט 16 של הצ'קליסט. לא נוגע בקנבס/בשמירה הקיימים —
  // רק קורא ל-stageRef ברזולוציה מלאה, בדיוק כמו handleDownloadPNG/PDF.
  const [videoExporting, setVideoExporting] = useState(false);
  // כתוביות עבריות בשכבת הוידאו עצמו (המשך ל-videoExport.ts) — ברירת מחדל דלוקה,
  // כי רוב הצפייה במדיה חברתית ללא קול. ניתן לכבות לפני הייצוא.
  const [showCaptions, setShowCaptions] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // וקטוריזציה של שכבת תמונה קיימת ל-SVG אמיתי (Recraft — מנוע קיים בכלי המותג)
  const [vectorizing, setVectorizing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  // "המותגים שלי" — פאנל תצוגה בלבד, מוצג רק למי שמחובר (auth-button.js, נוסף 19/08).
  // בלי כניסה: אין שינוי ויזואלי כלל לעורך (אנונימי כמו היום) — הפאנל לא נטען ולא מוצג.
  const loggedIn = hasAuthSession();
  const { data: myBrands } = useQuery<BrandRow[]>({
    queryKey: ["/api/brands"],
    enabled: loggedIn,
  });
  function openBrandInNewTab(id: number) {
    const url = `${window.location.origin}${window.location.pathname}#/branding/${id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ספריית רקעים — כל רקע AI שנוצר (בעורך הזה או קודם) נשמר אוטומטית בשרת ומוצג כאן
  // לבחירה חוזרת, בלי תלות בסשן/מותג. staleTime הוא Infinity ברמת ה-queryClient
  // (ר' lib/queryClient.ts) ולכן הרשימה מתעדכנת ידנית ע"י invalidateQueries בהמשך.
  const { data: savedBackgrounds } = useQuery<BackgroundRow[]>({
    queryKey: ["/api/backgrounds"],
  });
  const [libraryPreview, setLibraryPreview] = useState<BackgroundRow | null>(null);
  const [deletingBackgroundId, setDeletingBackgroundId] = useState<number | null>(null);
  function applySavedBackground(bg: BackgroundRow) {
    updateDoc({ ...doc!, background: { type: "image", src: bg.dataUrl } });
    toast({ title: "הרקע מהספרייה הוחל" });
    setAiDialogOpen(false);
  }
  // מחיקת רקע מהספרייה — ה-endpoint (DELETE /api/backgrounds/:id) קיים בשרת מאז
  // שנוספה השמירה האוטומטית, אך עד כה לא היה לו כפתור בממשק; הספרייה יכלה רק לגדול.
  async function handleDeleteSavedBackground(bg: BackgroundRow) {
    setDeletingBackgroundId(bg.id);
    try {
      await apiRequest("DELETE", `/api/backgrounds/${bg.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/backgrounds"] });
      if (libraryPreview?.id === bg.id) setLibraryPreview(null);
      toast({ title: "הרקע נמחק מהספרייה" });
    } catch (err: any) {
      toast({
        title: "מחיקת הרקע נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setDeletingBackgroundId(null);
    }
  }

  // אם נכנסים ישירות ל-/editor בלי בחירה (רענון) — חזרה לבית
  useEffect(() => {
    if (!selected) {
      navigate("/");
    }
  }, [selected, navigate]);

  if (!selected || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1220] text-[#F5EEDD]">
        <p>לא נבחרה תבנית — מעביר לעמוד הבית...</p>
      </div>
    );
  }

  const category = getCategory(selected.category);
  const style = getStyle(selected.style);
  const fields = getCategoryFields(selected.category);
  const copyExamples = getCategoryCopy(selected.category);
  const format = getFormat(selected.format);

  const selectedLayer = useMemo(
    () => doc.layers.find((l) => l.id === selectedId) ?? null,
    [doc, selectedId],
  );

  // עריכת inline על הקנבס — אותו maxDisplayWidth שמועבר ל-CanvasStage, כדי שה-textarea
  // תמוקם בדיוק על גבי מיקום השכבה בקנבס המוקטן לתצוגה.
  const CANVAS_MAX_WIDTH = 560;
  const canvasScale = Math.min(1, CANVAS_MAX_WIDTH / doc.width);
  const editingLayer = useMemo(
    () =>
      editingTextId
        ? ((doc.layers.find((l) => l.id === editingTextId && l.type === "text") as TextLayer | undefined) ?? null)
        : null,
    [doc, editingTextId],
  );
  // אותו fitText שמקטין את הפונט ב-CanvasStage כדי שה-textarea תתאים ויזואלית לטקסט שמתחתיה
  const editingFit = useMemo(() => {
    if (!editingLayer) return { fontSize: 0, lines: [] as string[], totalHeight: 0 };
    const bold = (editingLayer.fontWeight ?? 400) >= 700;
    if (editingLayer.autoFit === false) return { fontSize: editingLayer.fontSize, lines: [], totalHeight: 0 };
    return fitText({
      text: editingLayer.text || " ",
      fontFamily: editingLayer.fontFamily,
      bold,
      maxWidth: editingLayer.width,
      maxHeight: editingLayer.height,
      startFontSize: editingLayer.maxFontSize ?? editingLayer.fontSize,
      minFontSize: editingLayer.minFontSize ?? Math.max(12, Math.round(editingLayer.fontSize * 0.4)),
      lineHeight: editingLayer.lineHeight ?? 1.15,
      letterSpacing: editingLayer.letterSpacing ?? 0,
    });
  }, [editingLayer]);

  function updateDoc(next: TemplateDoc) {
    setDoc(next);
    setSelected({ ...selected!, doc: next });
  }

  function handleFieldChange(fieldName: string, value: string) {
    updateDoc(setFieldText(doc!, fieldName, value));
  }

  function handleChangeLayer(id: string, patch: Partial<AnyLayer>) {
    updateDoc({
      ...doc!,
      layers: doc!.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as AnyLayer) : l)),
    });
  }

  function handleChangeBackground(patch: Partial<TemplateBackground>) {
    updateDoc({ ...doc!, background: { ...doc!.background, ...patch } });
  }

  // ---- ניהול שכבות: הוספה / מחיקה / שכפול / נראות / נעילה / סדר ----
  const maxZ = () => doc!.layers.reduce((m, l) => Math.max(m, l.z ?? 0), 0);
  const minZ = () => doc!.layers.reduce((m, l) => Math.min(m, l.z ?? 0), 0);

  // הוספת שכבת טקסט חופשית מעל המודעה (ניתנת לגרירה/עריכה/מחיקה)
  function handleAddTextLayer() {
    const id = nextId("txt");
    const layer: TextLayer = {
      id,
      type: "text",
      text: "טקסט חדש",
      x: Math.round(doc!.width * 0.18),
      y: Math.round(doc!.height * 0.42),
      width: Math.round(doc!.width * 0.64),
      height: Math.round(doc!.height * 0.16),
      fontFamily: "Heebo",
      fontSize: Math.round(doc!.width * 0.07),
      fontWeight: 700,
      fill: style.palette.accent ?? "#C9A227",
      align: "center",
      verticalAlign: "middle",
      autoFit: true,
      role: "body",
      editable: true,
      label: "שכבת טקסט חופשית",
      z: maxZ() + 1,
    };
    updateDoc({ ...doc!, layers: [...doc!.layers, layer] });
    setSelectedId(id);
    toast({ title: "נוספה שכבת טקסט — גררו, ערכו או מחקו לפני הייצוא" });
  }

  // חיפוש אייקונים חופשיים ב-Iconify (ציבורי, בלי מפתח) לפי מילת חיפוש
  async function handleSearchIcons() {
    setIconLoading(true);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(iconQuery || "star")}&limit=48`,
      );
      const data = await res.json();
      setIconResults(Array.isArray(data?.icons) ? data.icons : []);
    } catch {
      toast({ title: "חיפוש האייקונים נכשל — נסו שוב", variant: "destructive" });
      setIconResults([]);
    } finally {
      setIconLoading(false);
    }
  }

  // הוספת אייקון שנבחר כשכבת תמונה חדשה (ניתנת לגרירה/מחיקה כמו כל תמונה)
  function handleAddIconLayer(iconId: string) {
    const id = nextId("icon");
    const size = Math.round(doc!.width * 0.14);
    const color = style.palette.accent ?? "#C9A227";
    const layer: ImageLayer = {
      id,
      type: "image",
      src: `https://api.iconify.design/${iconId.replace(":", "/")}.svg?color=${encodeURIComponent(color)}`,
      x: Math.round(doc!.width * 0.5 - size / 2),
      y: Math.round(doc!.height * 0.5 - size / 2),
      width: size,
      height: size,
      fit: "contain",
      label: `אייקון: ${iconId}`,
      z: maxZ() + 1,
    };
    updateDoc({ ...doc!, layers: [...doc!.layers, layer] });
    setSelectedId(id);
    setIconDialogOpen(false);
    toast({ title: "האייקון נוסף — גררו למיקום הרצוי" });
  }

  // המרת שכבת תמונה נבחרת (תמונה שהועלתה/אייקון) לוקטור SVG אמיתי דרך
  // /api/branding/vectorize הקיים (Recraft) — אותו endpoint ששימש עד כה רק ללוגו במותג
  async function handleVectorizeImage() {
    if (!selectedLayer || selectedLayer.type !== "image") return;
    const layer = selectedLayer as ImageLayer;
    if (!layer.src) {
      toast({ title: "אין תמונה בשכבה הזו להמרה", variant: "destructive" });
      return;
    }
    setVectorizing(true);
    try {
      const imgRes = await fetch(layer.src);
      const blob = await imgRes.blob();
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const mimeType = blob.type || "image/png";
      const res = await apiRequest("POST", "/api/branding/vectorize", { base64, mimeType });
      const data = await res.json();
      if (!data.ok || !data.svg) {
        toast({ title: "המרה לוקטור נכשלה", description: data.error, variant: "destructive" });
        return;
      }
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.svg)))}`;
      handleChangeLayer(layer.id, { src: svgDataUrl });
      toast({ title: "התמונה הומרה לוקטור SVG" });
    } catch (err: any) {
      toast({
        title: "המרה לוקטור נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setVectorizing(false);
    }
  }

  // הסרת רקע משכבת תמונה נבחרת דרך /api/branding/remove-background החדש
  // (Recraft Remove Background) — אותו דפוס בדיוק כמו handleVectorizeImage למעלה
  async function handleRemoveBackground() {
    if (!selectedLayer || selectedLayer.type !== "image") return;
    const layer = selectedLayer as ImageLayer;
    if (!layer.src) {
      toast({ title: "אין תמונה בשכבה הזו להסרת רקע", variant: "destructive" });
      return;
    }
    setRemovingBg(true);
    try {
      const imgRes = await fetch(layer.src);
      const blob = await imgRes.blob();
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const mimeType = blob.type || "image/png";
      const res = await apiRequest("POST", "/api/branding/remove-background", { base64, mimeType });
      const data = await res.json();
      if (!data.ok || !data.dataUrl) {
        toast({ title: "הסרת רקע נכשלה", description: data.error, variant: "destructive" });
        return;
      }
      handleChangeLayer(layer.id, { src: data.dataUrl });
      toast({ title: "הרקע הוסר מהתמונה" });
    } catch (err: any) {
      toast({
        title: "הסרת רקע נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setRemovingBg(false);
    }
  }

  function handleDeleteLayer(id: string) {
    const l = doc!.layers.find((x) => x.id === id);
    if (l?.locked) {
      toast({ title: "השכבה נעולה — בטלו נעילה כדי למחוק", variant: "destructive" });
      return;
    }
    updateDoc({ ...doc!, layers: doc!.layers.filter((x) => x.id !== id) });
    if (selectedId === id) setSelectedId(null);
    toast({ title: "השכבה נמחקה" });
  }

  function handleDuplicateLayer(id: string) {
    const src = doc!.layers.find((x) => x.id === id);
    if (!src) return;
    const copy = {
      ...src,
      id: nextId("cp"),
      x: src.x + 24,
      y: src.y + 24,
      z: maxZ() + 1,
      locked: false,
    } as AnyLayer;
    updateDoc({ ...doc!, layers: [...doc!.layers, copy] });
    setSelectedId(copy.id);
    toast({ title: "השכבה שוכפלה" });
  }

  function handleToggleVisible(id: string) {
    const l = doc!.layers.find((x) => x.id === id);
    handleChangeLayer(id, { visible: l?.visible === false ? true : false });
  }

  function handleToggleLock(id: string) {
    const l = doc!.layers.find((x) => x.id === id);
    handleChangeLayer(id, { locked: !l?.locked });
  }

  // הזזת שכבה קדימה/אחורה בסדר ה-z
  function handleMoveZ(id: string, dir: 1 | -1) {
    const sorted = [...doc!.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const idx = sorted.findIndex((l) => l.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    const az = a.z ?? idx, bz = b.z ?? swapIdx;
    updateDoc({
      ...doc!,
      layers: doc!.layers.map((l) =>
        l.id === a.id ? { ...l, z: bz } : l.id === b.id ? { ...l, z: az } : l,
      ),
    });
  }

  function applyCopyExample(text: string) {
    // ממלא את שדה הכותרת (title) אם קיים, אחרת body/subtitle הראשון
    const titleField = fields.find((f) => f.role === "title") ?? fields[0];
    if (titleField) {
      handleFieldChange(titleField.name, text);
    }
    setCopyDialogOpen(false);
  }

  // מייצר קופי חכם עם Claude ומציג וריאציות
  async function handleGenerateAiCopy() {
    setAiCopyLoading(true);
    setAiCopyVariants([]);
    try {
      // שדות קיימים (כדי ש-Claude ישלים/ישפר ולא ימחק מידע קיים)
      const existing: Record<string, string> = {};
      doc!.layers.forEach((l) => {
        if (l.type === "text" && (l as TextLayer).fieldName) {
          const t = (l as TextLayer).text?.trim();
          if (t) existing[(l as TextLayer).fieldName!] = t;
        }
      });
      const res = await apiRequest("POST", "/api/ai/copy", {
        category: selected!.category,
        message: aiCopyMsg,
        mood: [style.label],
        fields: existing,
        variants: 3,
      });
      const data = await res.json();
      const variants: CopyVariant[] = Array.isArray(data?.variants) ? data.variants : [];
      if (!variants.length) {
        toast({ title: "לא התקבלו הצעות קופי — נסה לנסח מחדש", variant: "destructive" });
      }
      setAiCopyVariants(variants);
    } catch (err: any) {
      toast({
        title: "מנוע הקופי דורש הפעלת חיוב או אינו זמין כרגע",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setAiCopyLoading(false);
    }
  }

  // מחיל וריאציית קופי על שדות המודעה לפי תפקיד (title/subtitle/body)
  function applyAiVariant(v: CopyVariant) {
    let next = doc!;
    const byRole = (role: string) => fields.find((f) => f.role === role);
    const titleField = byRole("title");
    const subtitleField = byRole("subtitle");
    const bodyField = byRole("body");
    if (v.title && titleField) next = setFieldText(next, titleField.name, v.title);
    if (v.subtitle && subtitleField) next = setFieldText(next, subtitleField.name, v.subtitle);
    // גוף: אם יש שדה body ניצור טקסט משולב (body + cta), אחרת נשתמש בכותרת המשנה
    const bodyText = [v.body, v.cta].filter(Boolean).join("\n");
    if (bodyText && bodyField) next = setFieldText(next, bodyField.name, bodyText);
    else if (v.body && subtitleField && !v.subtitle) next = setFieldText(next, subtitleField.name, v.body);
    updateDoc(next);
    setAiCopyOpen(false);
    toast({ title: "הקופי הוחל על המודעה" });
  }

  function handleFormatChange(formatKey: string) {
    const fmt = getFormat(formatKey);
    updateDoc({ ...doc!, width: fmt.width, height: fmt.height });
    setSelected({ ...selected!, format: formatKey });
  }

  function handleRabbiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // מחפש שכבת תמונה placeholder (בד"כ rabbiPhoto)
      const imgLayer = doc!.layers.find((l) => l.type === "image") as ImageLayer | undefined;
      if (imgLayer) {
        handleChangeLayer(imgLayer.id, { src: dataUrl, placeholder: false });
        toast({ title: "תמונת הרב הועלתה בהצלחה" });
      } else {
        toast({ title: "לא נמצאה שכבת תמונה בתבנית זו", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleAiBackground() {
    setAiLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/background", {
        prompt: aiPrompt,
        aspectRatio: format.width >= format.height ? "16:9" : "4:5",
        enhance: true,
        engine: aiEngine,
      });
      const data = await res.json();
      if (data.fallback) {
        toast({
          title: "מנוע ה-AI דורש הפעלת חיוב — נעשה שימוש ברקע המובנה",
          description: data.error,
        });
      } else if (data.dataUrl) {
        updateDoc({ ...doc!, background: { type: "image", src: data.dataUrl } });
        toast({ title: "רקע AI הוחל בהצלחה" });
        setAiDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/backgrounds"] });
      }
    } catch (err: any) {
      toast({
        title: "מנוע ה-AI דורש הפעלת חיוב — נעשה שימוש ברקע המובנה",
        description: String(err?.message ?? err).slice(0, 150),
      });
    } finally {
      setAiLoading(false);
    }
  }

  // כשהסגנון המתאים לא ברור — מייצר 2 אפשרויות במקביל (Gemini + Recraft) ומציג לבחירה,
  // במקום להחיל רקע אחד באופן אוטומטי כמו handleAiBackground (פריט 15, אינו מחליף אותה)
  async function handleAiBackgroundVariants() {
    setAiVariantsLoading(true);
    setAiVariants([]);
    try {
      const aspectRatio = format.width >= format.height ? "16:9" : "4:5";
      const engines: { engine: "gemini" | "recraft"; label: string }[] = [
        { engine: "gemini", label: "אפשרות א׳ — Gemini" },
        { engine: "recraft", label: "אפשרות ב׳ — Recraft V4" },
      ];
      const results = await Promise.allSettled(
        engines.map(({ engine }) =>
          apiRequest("POST", "/api/ai/background", {
            prompt: aiPrompt,
            aspectRatio,
            enhance: true,
            engine,
          }).then((r) => r.json()),
        ),
      );
      const variants: { engine: "gemini" | "recraft"; label: string; dataUrl: string }[] = [];
      results.forEach((res, i) => {
        if (res.status === "fulfilled" && res.value?.dataUrl && !res.value?.fallback) {
          variants.push({ engine: engines[i].engine, label: engines[i].label, dataUrl: res.value.dataUrl });
        }
      });
      if (!variants.length) {
        toast({ title: "לא התקבלו אפשרויות רקע — נסה תיאור אחר", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/backgrounds"] });
      }
      setAiVariants(variants);
    } catch (err: any) {
      toast({
        title: "יצירת האפשרויות נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setAiVariantsLoading(false);
    }
  }

  function applyAiBackgroundVariant(v: { dataUrl: string }) {
    updateDoc({ ...doc!, background: { type: "image", src: v.dataUrl } });
    toast({ title: "הרקע הנבחר הוחל" });
    setAiVariants([]);
    setAiDialogOpen(false);
  }

  // הוספת תמונת-רקע (מהספרייה / AI / וריאנט) כשכבת-תמונה על קטע מהעמוד בלבד —
  // לא מחליפה את הרקע הכללי (background), אלא מוסיפה שכבת image נוספת בפריסה
  // מוגדרת-מראש (SECTION_PRESETS), ממוקמת מתחת לכל שאר השכבות (z נמוך מהמינימום
  // הקיים) כדי שהיא תשב מעל הרקע הראשי אך מתחת לטקסט/עיטורים — ניתנת לגרירה/מחיקה
  // ככל שכבת תמונה רגילה, ר' פריט 54 ב-build_tasks.
  function addSectionBackground(dataUrl: string, sectionKey: SectionKey) {
    const preset = SECTION_PRESETS.find((s) => s.key === sectionKey) ?? SECTION_PRESETS[0];
    const rect = preset.rect(doc!.width, doc!.height);
    const id = nextId("secbg");
    const layer: ImageLayer = {
      id,
      type: "image",
      src: dataUrl,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fit: "cover",
      label: `רקע לקטע: ${preset.label}`,
      z: minZ() - 1,
    };
    updateDoc({ ...doc!, layers: [...doc!.layers, layer] });
    setSelectedId(id);
    toast({ title: `הרקע נוסף כ${preset.label} — ניתן לגרור/למחוק כמו כל שכבה` });
  }

  async function handleSaveProject() {
    setSaving(true);
    try {
      const payload = {
        name: selected!.name,
        category: selected!.category,
        style: selected!.style,
        format: selected!.format,
        width: doc!.width,
        height: doc!.height,
        layersJson: JSON.stringify({
          background: doc!.background,
          layers: doc!.layers,
          clientNotes,
          narrationScript: narrationScript || undefined,
          narrationAudioUrl: narrationAudioUrl || undefined,
        }),
        thumbnail: null as string | null,
      };
      // עבודה שנפתחה מ-/projects נושאת מזהה, ולכן היא מתעדכנת במקום.
      // בלי זה כל לחיצה על "שמור" הייתה יוצרת עותק נוסף של אותה מודעה.
      if (selected!.projectId) {
        await apiRequest("PATCH", `/api/projects/${selected!.projectId}`, payload);
        toast({ title: "העבודה עודכנה" });
      } else {
        const saved = await apiRequest("POST", "/api/projects", payload).then((r) => r.json());
        if (saved?.id) setSelected({ ...selected!, projectId: saved.id });
        toast({ title: "הפרויקט נשמר בהצלחה" });
      }
    } catch (err: any) {
      toast({ title: "שגיאה בשמירת הפרויקט", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadPNG() {
    if (!stageRef.current) return;
    downloadPNG(stageRef.current, doc!.width, `${selected!.name}.png`);
  }

  function handleDownloadPDF() {
    if (!stageRef.current) return;
    downloadPDF(stageRef.current, doc!.width, doc!.height, `${selected!.name}.pdf`);
  }

  function handleExportFigmaSVG() {
    if (!doc) return;
    downloadSVG(doc, `${selected?.name ?? "modaa"}.svg`);
  }

  function handleExportIDML() {
    if (!doc) return;
    downloadIDML(doc, `${selected?.name ?? "modaa"}.idml`);
  }

  // קריינות עברית (ElevenLabs, שלב 5 בצ'קליסט — הבסיס לווידאו קידום) — שולח
  // את הטקסט החופשי שהמשתמש כתב, מקבל data URL של mp3. שום שכבה/רינדור/ייצוא
  // קיים לא משתנה; זו שכבת קול נפרדת שתאכיל את הרכבת הווידאו בסבב הבא.
  async function handleGenerateNarration() {
    if (!narrationScript.trim()) return;
    setNarrationLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/narration", { script: narrationScript });
      const data = await res.json();
      if (!data?.ok || !data?.dataUrl) {
        toast({ title: "יצירת קריינות נכשלה", description: data?.error, variant: "destructive" });
        return;
      }
      setNarrationAudioUrl(data.dataUrl);
      toast({ title: "הקריינות מוכנה" });
    } catch (err: any) {
      toast({
        title: "יצירת קריינות נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setNarrationLoading(false);
    }
  }

  // וידאו קידום — מרכיב Ken Burns + פס הקריינות (lib/videoExport.ts) מתוך אותו
  // stage ברזולוציה מלאה ש-handleDownloadPNG/PDF כבר משתמשים בו, מוריד webm.
  // דורש שקריינות תיווצר קודם (הכפתור נעול בלעדיה) כדי שהוידאו לא יהיה שקט-סתמי.
  async function handleExportVideo() {
    if (!stageRef.current || !doc) return;
    setVideoExporting(true);
    setVideoProgress(0);
    try {
      const blob = await exportPromoVideo(stageRef.current, doc.width, doc.height, {
        narrationAudioUrl: narrationAudioUrl || undefined,
        narrationScript: narrationScript || undefined,
        showCaptions,
        onProgress: (fraction) => setVideoProgress(Math.round(fraction * 100)),
      });
      downloadBlob(blob, `${selected?.name ?? "modaa"}.webm`);
      toast({ title: "הוידאו מוכן להורדה" });
    } catch (err: any) {
      toast({
        title: "ייצוא הוידאו נכשל",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setVideoExporting(false);
      setVideoProgress(0);
    }
  }

  // תקציר שכבה לביקורת AI — בלי base64/data URL של תמונות (מיותר לקריטריוני
  // עיצוב, ומנפח את הפרומפט/העלות); רק מיקום/גודל/סגנון, כמו שמבקר אנושי רואה.
  function summarizeLayerForCritique(l: AnyLayer): Record<string, unknown> {
    const base = {
      id: l.id, type: l.type, x: l.x, y: l.y, width: l.width, height: l.height,
      opacity: l.opacity, blend: l.blend, visible: l.visible, z: l.z,
    };
    if (l.type === "text") {
      const t = l as TextLayer;
      return {
        ...base, role: t.role, text: t.text, fontFamily: t.fontFamily, fontSize: t.fontSize,
        fontWeight: t.fontWeight, fill: t.fill, align: t.align, verticalAlign: t.verticalAlign,
        lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, stroke: t.stroke,
      };
    }
    if (l.type === "image") {
      const im = l as ImageLayer;
      return { ...base, label: im.label, hasImage: !!im.src, fit: im.fit, circle: im.circle, cornerRadius: im.cornerRadius };
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      return { ...base, shape: s.shape, fill: s.fill, stroke: s.stroke, cornerRadius: s.cornerRadius };
    }
    return { ...base, kind: (l as any).kind, fill: (l as any).fill };
  }

  // ביקורת AI — שולח תקציר של הטיוטה הנוכחית (בלי לגעת בשכבות/רינדור/ייצוא
  // הקיימים) ומציג משוב מובנה לקריאה; הלקוח/המעצב מחליטים אם ליישם.
  async function handleAiCritique() {
    if (!doc) return;
    setCritiquing(true);
    try {
      const res = await apiRequest("POST", "/api/ai/critique", {
        category: selected?.category,
        style: selected?.style,
        width: doc.width,
        height: doc.height,
        background: doc.background,
        layers: doc.layers.map(summarizeLayerForCritique),
        clientNotes: clientNotes.trim() || undefined,
      });
      const data = await res.json();
      if (!data || typeof data.score !== "number") {
        toast({ title: "ביקורת AI נכשלה", description: data?.error, variant: "destructive" });
        return;
      }
      setCritiqueResult(data);
      setAppliedCritiqueFixes(new Set());
      setCritiqueDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "ביקורת AI נכשלה",
        description: String(err?.message ?? err).slice(0, 150),
        variant: "destructive",
      });
    } finally {
      setCritiquing(false);
    }
  }

  // תיקון-בקליק לפי הצעת ביקורת ה-AI (המשך צ'קליסט #13) — שכבה יחידה,
  // שדה מתוך רשימת-הרשאה סגורה (אותם שדות שכבר חשופים כבקרות ידניות בפאנל),
  // ערך תמיד עובר clamp/בדיקה לפני החלה. שום שכבה לא משתנה בלי לחיצה מפורשת.
  const CRITIQUE_FIX_RANGES: Record<string, [number, number]> = {
    opacity: [0, 1],
    letterSpacing: [-5, 30],
    lineHeight: [0.8, 2.5],
    cornerRadius: [0, 100],
    fontSize: [8, 300],
  };
  const CRITIQUE_FIX_COLOR_FIELDS = new Set(["fill", "stroke"]);

  function resolveCritiqueFix(fix: CritiqueFix | undefined): CritiqueFix | null {
    if (!fix || !doc) return null;
    const layer = doc.layers.find((l) => l.id === fix.layerId);
    if (!layer) return null;
    if (fix.field === "x" || fix.field === "y") {
      const raw = Number(fix.value);
      if (!Number.isFinite(raw)) return null;
      const max = fix.field === "x" ? doc.width : doc.height;
      return { layerId: fix.layerId, field: fix.field, value: Math.max(0, Math.min(max, raw)) };
    }
    if (fix.field in CRITIQUE_FIX_RANGES) {
      const raw = Number(fix.value);
      if (!Number.isFinite(raw)) return null;
      const [min, max] = CRITIQUE_FIX_RANGES[fix.field];
      return { layerId: fix.layerId, field: fix.field, value: Math.max(min, Math.min(max, raw)) };
    }
    if (CRITIQUE_FIX_COLOR_FIELDS.has(fix.field)) {
      const raw = String(fix.value ?? "");
      if (!/^#[0-9a-fA-F]{3,8}$/.test(raw)) return null;
      return { layerId: fix.layerId, field: fix.field, value: raw };
    }
    return null;
  }

  function handleApplyCritiqueFix(index: number, fix: CritiqueFix | undefined) {
    const resolved = resolveCritiqueFix(fix);
    if (!resolved) return;
    handleChangeLayer(resolved.layerId, { [resolved.field]: resolved.value } as Partial<AnyLayer>);
    setSelectedId(resolved.layerId);
    setAppliedCritiqueFixes((prev) => new Set(prev).add(index));
    toast({ title: "התיקון הוחל", description: `השכבה עודכנה (${resolved.field})` });
  }

  // מחיל בבת אחת את כל התיקונים הממתינים, ניתנים-לפתרון — עדיין לחיצה יזומה
  // אחת של אדם על "החל את כל התיקונים", לא לולאה אוטומטית: כל fix עובר קודם
  // אותו resolveCritiqueFix (אימות שכבה קיימת + clamp טווח) כמו החלה בודדת.
  function handleApplyAllCritiqueFixes() {
    if (!critiqueResult) return;
    const pending = critiqueResult.issues
      .map((issue, index) => ({ index, resolved: resolveCritiqueFix(issue.fix) }))
      .filter((p): p is { index: number; resolved: CritiqueFix } => !!p.resolved && !appliedCritiqueFixes.has(p.index));
    if (pending.length === 0) return;
    pending.forEach(({ resolved }) => {
      handleChangeLayer(resolved.layerId, { [resolved.field]: resolved.value } as Partial<AnyLayer>);
    });
    setSelectedId(pending[pending.length - 1].resolved.layerId);
    setAppliedCritiqueFixes((prev) => {
      const next = new Set(prev);
      pending.forEach(({ index }) => next.add(index));
      return next;
    });
    toast({ title: "כל התיקונים הוחלו", description: `${pending.length} שכבות עודכנו` });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      {/* סרגל עליון */}
      <header className="flex items-center justify-between border-b border-[#C9A227]/20 bg-[#0B1220]/95 px-5 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="חזרה לעמוד הבית">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Crown className="h-5 w-5 text-[#C9A227]" />
          <div>
            <h1 className="text-sm font-bold leading-tight">{selected.name}</h1>
            <p className="text-[11px] text-[#F5EEDD]/50">{style.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selected.format} onValueChange={handleFormatChange}>
            <SelectTrigger className="w-44 border-[#C9A227]/30 bg-[#101B32] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-1.5 border-[#C9A227]/40 text-[#C9A227]" onClick={handleDownloadPNG}>
            <FileImage className="h-4 w-4" /> הורד PNG
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-[#C9A227]/40 text-[#C9A227]" onClick={handleDownloadPDF}>
            <FileText className="h-4 w-4" /> הורד PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[#C9A227]/40 text-[#C9A227]"
            onClick={() => setAdaptersDialogOpen(true)}
            data-testid="button-open-adapters"
          >
            <Blocks className="h-4 w-4" /> מתאמים
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[#C9A227]/40 text-[#C9A227]"
            onClick={handleAiCritique}
            disabled={critiquing}
            data-testid="button-ai-critique"
          >
            <ClipboardCheck className="h-4 w-4" /> {critiquing ? "בודק..." : "ביקורת AI"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={"gap-1.5 border-[#C9A227]/40 text-[#C9A227]" + (clientNotes.trim() ? " bg-[#C9A227]/10" : "")}
            onClick={() => setNotesDialogOpen(true)}
            data-testid="button-client-notes"
          >
            <MessageSquare className="h-4 w-4" /> הערות לקוח
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={"gap-1.5 border-[#C9A227]/40 text-[#C9A227]" + (narrationAudioUrl ? " bg-[#C9A227]/10" : "")}
            onClick={() => setNarrationDialogOpen(true)}
            data-testid="button-narration"
          >
            <Mic className="h-4 w-4" /> קריינות
          </Button>
          <Button size="sm" className="gap-1.5 bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90" onClick={handleSaveProject} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "שומר..." : "שמור פרויקט"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* קנבאס מרכזי */}
        <main className="flex flex-1 items-center justify-center overflow-auto bg-[#070C17] p-8">
          <div className="relative">
            <CanvasStage
              doc={doc}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChangeLayer={handleChangeLayer}
              onChangeBackground={handleChangeBackground}
              editingId={editingTextId}
              onEditText={(id) => {
                setSelectedId(id);
                setEditingTextId(id);
              }}
              maxDisplayWidth={CANVAS_MAX_WIDTH}
              stageRef={stageRef}
              interactive={true}
            />
            {editingLayer && (
              <textarea
                key={editingLayer.id}
                autoFocus
                dir="auto"
                data-testid="input-inline-text-editor"
                value={editingLayer.text}
                onChange={(e) => handleChangeLayer(editingLayer.id, { text: e.target.value })}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingTextId(null);
                  }
                  // Enter מוסיף שורה חדשה (כמו בפאנל הצדדי) — עזיבת התיבה סוגרת את העריכה
                }}
                style={{
                  position: "absolute",
                  left: editingLayer.x * canvasScale,
                  top: editingLayer.y * canvasScale,
                  width: editingLayer.width * canvasScale,
                  height: (editingLayer.height ?? editingLayer.width) * canvasScale,
                  fontSize: editingFit.fontSize * canvasScale,
                  lineHeight: editingLayer.lineHeight ?? 1.15,
                  letterSpacing: (editingLayer.letterSpacing ?? 0) * canvasScale,
                  fontFamily: editingLayer.fontFamily,
                  fontWeight: (editingLayer.fontWeight ?? 400) >= 700 ? 700 : 400,
                  color: editingLayer.fill,
                  textAlign: editingLayer.align ?? "center",
                  background: "rgba(255,255,255,0.94)",
                  border: "2px dashed #3b82f6",
                  borderRadius: 4,
                  padding: 0,
                  resize: "none",
                  outline: "none",
                  overflow: "hidden",
                  transform: `rotate(${editingLayer.rotation ?? 0}deg)`,
                  transformOrigin: "top left",
                }}
              />
            )}
          </div>
        </main>

        {/* פאנל צד ימין */}
        <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-[#C9A227]/20 bg-[#0E1830] p-4">
          <div className="mb-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 border-[#C9A227]/40 text-[#C9A227]"
              onClick={() => setCopyDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" /> קופי מוכן
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 border-[#C9A227]/40 text-[#C9A227]"
              onClick={() => {
                setAiPrompt(`רקע יודאיקה ${style.label} עם עיטורי זהב, ללא טקסט`);
                setAiDialogOpen(true);
              }}
            >
              <Wand2 className="h-4 w-4" /> רקע AI
            </Button>
          </div>
          <Button
            size="sm"
            className="mb-4 w-full gap-1.5 bg-gradient-to-l from-[#C9A227] to-[#E4C55A] text-[#0B1220] hover:opacity-90"
            onClick={() => {
              setAiCopyVariants([]);
              setAiCopyOpen(true);
            }}
            data-testid="button-ai-copy"
          >
            <Sparkles className="h-4 w-4" /> כתיבת קופי חכם (Claude)
          </Button>

          {/* שדות חכמים */}
          <Card className="mb-4 border-[#C9A227]/15 bg-[#101B32]">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#F5EEDD]">
                <TypeIcon className="h-4 w-4 text-[#C9A227]" /> שדות המודעה
              </h2>
              <div className="space-y-3">
                {fields.map((f) => {
                  const layer = doc.layers.find(
                    (l) => l.type === "text" && (l as TextLayer).fieldName === f.name,
                  ) as TextLayer | undefined;
                  const value = layer?.text ?? "";
                  return (
                    <div key={f.name}>
                      <Label className="mb-1 block text-xs text-[#F5EEDD]/70">{f.label}</Label>
                      {f.multiline ? (
                        <Textarea
                          value={value}
                          placeholder={f.placeholder}
                          onChange={(e) => handleFieldChange(f.name, e.target.value)}
                          className="border-[#C9A227]/20 bg-[#0B1220] text-sm text-[#F5EEDD]"
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={value}
                          placeholder={f.placeholder}
                          onChange={(e) => handleFieldChange(f.name, e.target.value)}
                          className="border-[#C9A227]/20 bg-[#0B1220] text-sm text-[#F5EEDD]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-1.5 border-[#C9A227]/40 text-[#C9A227]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> העלה תמונת הרב
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleRabbiUpload}
              />
            </CardContent>
          </Card>

          {/* פאנל שכבות */}
          <Card className="mb-4 border-[#C9A227]/15 bg-[#101B32]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#F5EEDD]">
                  <LayersIcon className="h-4 w-4 text-[#C9A227]" /> שכבות
                </h2>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 border-[#C9A227]/40 px-2 text-[11px] text-[#C9A227]"
                    onClick={handleAddTextLayer}
                    data-testid="button-add-text-layer"
                  >
                    <Plus className="h-3.5 w-3.5" /> הוסף טקסט
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 border-[#C9A227]/40 px-2 text-[11px] text-[#C9A227]"
                    onClick={() => {
                      setIconDialogOpen(true);
                      if (iconResults.length === 0) handleSearchIcons();
                    }}
                    data-testid="button-add-icon-layer"
                  >
                    <Plus className="h-3.5 w-3.5" /> הוסף אייקון
                  </Button>
                </div>
              </div>
              <div className="mb-3 max-h-52 space-y-1 overflow-y-auto">
                {[...doc.layers]
                  .filter((l) => l.type === "text" || l.type === "image")
                  .sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
                  .map((l) => {
                    const isSel = selectedId === l.id;
                    const hidden = l.visible === false;
                    return (
                      <div
                        key={l.id}
                        className={`group flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                          isSel ? "bg-[#C9A227]/20" : "hover:bg-[#C9A227]/10"
                        }`}
                        data-testid={`row-layer-${l.id}`}
                      >
                        <button
                          onClick={() => setSelectedId(l.id)}
                          className={`flex min-w-0 flex-1 items-center gap-2 text-right ${
                            isSel ? "text-[#C9A227]" : "text-[#F5EEDD]/70"
                          } ${hidden ? "opacity-40" : ""}`}
                        >
                          {l.type === "text" ? (
                            <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate">
                            {l.type === "text"
                              ? (l as TextLayer).text?.slice(0, 20) || (l as TextLayer).label || l.id
                              : (l as ImageLayer).label || l.id}
                          </span>
                          {l.locked && <Lock className="h-3 w-3 shrink-0 text-[#C9A227]/60" />}
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button title="הזז קדימה" onClick={() => handleMoveZ(l.id, 1)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-[#C9A227]/20 hover:text-[#C9A227]">
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button title="הזז אחורה" onClick={() => handleMoveZ(l.id, -1)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-[#C9A227]/20 hover:text-[#C9A227]">
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button title={hidden ? "הצג" : "הסתר"} onClick={() => handleToggleVisible(l.id)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-[#C9A227]/20 hover:text-[#C9A227]">
                            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button title={l.locked ? "בטל נעילה" : "נעל"} onClick={() => handleToggleLock(l.id)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-[#C9A227]/20 hover:text-[#C9A227]">
                            {l.locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          </button>
                          <button title="שכפל" onClick={() => handleDuplicateLayer(l.id)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-[#C9A227]/20 hover:text-[#C9A227]">
                            <Copy className="h-3 w-3" />
                          </button>
                          <button title="מחק" onClick={() => handleDeleteLayer(l.id)} className="rounded p-1 text-[#F5EEDD]/50 hover:bg-red-500/20 hover:text-red-400" data-testid={`button-delete-layer-${l.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {selectedLayer && selectedLayer.type === "text" && (
                <>
                  {/* עריכת טקסט ישירה — חשוב בעיקר לשכבות חופשיות ללא שדה מובנה */}
                  <div className="mb-3">
                    <Label className="mb-1 block text-xs text-[#F5EEDD]/70">תוכן הטקסט</Label>
                    <Textarea
                      value={(selectedLayer as TextLayer).text}
                      onChange={(e) => handleChangeLayer(selectedLayer.id, { text: e.target.value })}
                      className="border-[#C9A227]/20 bg-[#0B1220] text-sm text-[#F5EEDD]"
                      rows={2}
                      data-testid="input-layer-text"
                    />
                  </div>
                  <TextLayerControls
                    layer={selectedLayer as TextLayer}
                    stylePalette={style.palette}
                    onChange={(patch) => handleChangeLayer(selectedLayer.id, patch)}
                  />
                </>
              )}

              {selectedLayer && selectedLayer.type === "image" && (
                <div className="mb-3 space-y-2">
                  <Label className="block text-xs text-[#F5EEDD]/70">שכבת תמונה</Label>
                  <p className="truncate text-xs text-[#F5EEDD]/50">
                    {(selectedLayer as ImageLayer).label || selectedLayer.id}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full gap-1 border-[#C9A227]/40 text-[11px] text-[#C9A227]"
                    onClick={handleVectorizeImage}
                    disabled={vectorizing}
                    data-testid="button-vectorize-image-layer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {vectorizing ? "ממיר לוקטור..." : "המר לוקטור SVG (Recraft)"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full gap-1 border-[#C9A227]/40 text-[11px] text-[#C9A227]"
                    onClick={handleRemoveBackground}
                    disabled={removingBg}
                    data-testid="button-remove-background-image-layer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {removingBg ? "מסיר רקע..." : "הסר רקע (Recraft)"}
                  </Button>
                </div>
              )}

              {selectedLayer && (
                <div className="mb-3">
                  <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
                    שקיפות <code className="font-mono text-[10px] text-[#C9A227]/70">opacity</code>: {selectedLayer.opacity ?? 1}
                  </Label>
                  <Slider
                    value={[selectedLayer.opacity ?? 1]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([v]) => handleChangeLayer(selectedLayer.id, { opacity: v })}
                    data-testid="slider-layer-opacity"
                  />
                </div>
              )}

              {selectedLayer && (
                <div className="mb-3">
                  <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
                    מיזוג <code className="font-mono text-[10px] text-[#C9A227]/70">blend</code>
                  </Label>
                  <Select
                    value={selectedLayer.blend ?? "source-over"}
                    onValueChange={(v) => handleChangeLayer(selectedLayer.id, { blend: v === "source-over" ? undefined : v })}
                  >
                    <SelectTrigger className="h-8 border-[#C9A227]/30 bg-[#0B1526] text-xs" data-testid="select-layer-blend">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source-over">רגיל</SelectItem>
                      <SelectItem value="multiply">הכפלה (multiply)</SelectItem>
                      <SelectItem value="screen">מסך (screen)</SelectItem>
                      <SelectItem value="overlay">שכבת-על (overlay)</SelectItem>
                      <SelectItem value="darken">הכהיה (darken)</SelectItem>
                      <SelectItem value="lighten">הבהרה (lighten)</SelectItem>
                      <SelectItem value="color-dodge">הבהקה (color-dodge)</SelectItem>
                      <SelectItem value="color-burn">צריבה (color-burn)</SelectItem>
                      <SelectItem value="hard-light">אור חד (hard-light)</SelectItem>
                      <SelectItem value="soft-light">אור רך (soft-light)</SelectItem>
                      <SelectItem value="difference">הבדל (difference)</SelectItem>
                      <SelectItem value="exclusion">החרגה (exclusion)</SelectItem>
                      <SelectItem value="hue">גוון (hue)</SelectItem>
                      <SelectItem value="saturation">רוויה (saturation)</SelectItem>
                      <SelectItem value="color">צבע (color)</SelectItem>
                      <SelectItem value="luminosity">בהירות (luminosity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedLayer && (selectedLayer.type === "image" || selectedLayer.type === "shape") && (
                <div className="mb-3">
                  <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
                    רדיוס פינות <code className="font-mono text-[10px] text-[#C9A227]/70">cornerRadius</code>:{" "}
                    {(selectedLayer as ImageLayer | ShapeLayer).cornerRadius ?? 0}
                  </Label>
                  <Slider
                    value={[(selectedLayer as ImageLayer | ShapeLayer).cornerRadius ?? 0]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => handleChangeLayer(selectedLayer.id, { cornerRadius: v })}
                    data-testid="slider-layer-corner-radius"
                  />
                </div>
              )}

              {!selectedLayer && (
                <p className="text-xs text-[#F5EEDD]/40">בחר שכבה מהרשימה או מהקנבאס לעריכה, או הוסף שכבת טקסט חדשה</p>
              )}
            </CardContent>
          </Card>

          {/* פאנל רקע — צבע מלא / גרדיאנט / תמונת AI */}
          <Card className="mb-4 border-[#C9A227]/15 bg-[#101B32]">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#F5EEDD]">
                <Wand2 className="h-4 w-4 text-[#C9A227]" /> רקע
              </h2>
              <BackgroundControls
                background={doc.background}
                onChange={(bg) => updateDoc({ ...doc, background: bg })}
              />
            </CardContent>
          </Card>

          {/* המותגים שלי — רק למחוברים (auth-button.js); תצוגה בלבד, פתיחה בכרטיסייה חדשה */}
          {loggedIn && myBrands && myBrands.length > 0 && (
            <Card className="mb-4 border-[#C9A227]/15 bg-[#101B32]">
              <CardContent className="p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#F5EEDD]">
                  <Palette className="h-4 w-4 text-[#C9A227]" /> המותגים שלי
                </h2>
                <div className="space-y-2">
                  {myBrands.map((b) => {
                    const swatches = brandSwatches(b.kitJson);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => openBrandInNewTab(b.id)}
                        className="flex w-full items-center gap-2 rounded-lg border border-[#C9A227]/15 bg-[#0B1220] p-2 text-right transition hover:border-[#C9A227]/50"
                        title="פתיחה במחלקת המיתוג (כרטיסייה חדשה)"
                        data-testid={`button-open-brand-${b.id}`}
                      >
                        {b.logoPng ? (
                          <img src={b.logoPng} alt={b.brandName} className="h-8 w-8 shrink-0 rounded bg-white/95 object-contain p-0.5" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#C9A227]/10">
                            <Palette className="h-3.5 w-3.5 text-[#C9A227]/60" />
                          </div>
                        )}
                        <span className="min-w-0 flex-1 truncate text-xs text-[#F5EEDD]/80">{b.brandName}</span>
                        {swatches.length > 0 && (
                          <div className="flex shrink-0 gap-0.5">
                            {swatches.map((hex, i) => (
                              <span key={i} className="h-3 w-3 rounded-full border border-white/10" style={{ background: hex }} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* טיפים מהקטגוריה */}
          {category && (
            <Card className="border-[#C9A227]/15 bg-[#101B32]">
              <CardContent className="p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#F5EEDD]">
                  <Lightbulb className="h-4 w-4 text-[#C9A227]" /> טיפים לקטגוריה
                </h2>
                {category.honorifics.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-[11px] text-[#F5EEDD]/50">כינויי כבוד:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.honorifics.map((h) => (
                        <Badge key={h} variant="outline" className="border-[#C9A227]/30 text-[10px] text-[#C9A227]">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {category.symbols.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] text-[#F5EEDD]/50">סמלים מתאימים:</p>
                    <div className="flex flex-wrap gap-1">
                      {category.symbols.map((s) => (
                        <Badge key={s} variant="outline" className="border-[#F5EEDD]/20 text-[10px] text-[#F5EEDD]/70">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* דיאלוג הצע קופי */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">הצע קופי — {category?.label}</DialogTitle>
            <DialogDescription>לחיצה על דוגמה תמלא אותה בשדה הכותרת</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {copyExamples.length === 0 && (
              <p className="text-sm text-[#F5EEDD]/60">אין דוגמאות קופי לקטגוריה זו כרגע</p>
            )}
            {copyExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => applyCopyExample(ex.text)}
                className="block w-full rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-3 text-right text-sm leading-relaxed transition hover:border-[#C9A227]/60"
              >
                {ex.text}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* דיאלוג קופי חכם (Claude) */}
      <Dialog open={aiCopyOpen} onOpenChange={setAiCopyOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">כתיבת קופי חכם — {category?.label}</DialogTitle>
            <DialogDescription>
              תארו במשפט את הרעיון/המסר, ו-Claude יציע ניסוחי קופי מכובדים בעברית תורנית
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiCopyMsg}
            onChange={(e) => setAiCopyMsg(e.target.value)}
            placeholder="לדוגמה: שיעור דף היומי חדש בשכונה, בהשתתפות הרב, מדי ערב אחרי מעריב"
            className="border-[#C9A227]/20 bg-[#101B32] text-sm text-[#F5EEDD]"
            rows={3}
            data-testid="input-ai-copy-message"
          />
          <Button
            className="w-full gap-1.5 bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
            onClick={handleGenerateAiCopy}
            disabled={aiCopyLoading}
            data-testid="button-generate-ai-copy"
          >
            <Sparkles className="h-4 w-4" /> {aiCopyLoading ? "Claude כותב..." : "הצע ניסוחים"}
          </Button>

          {aiCopyVariants.length > 0 && (
            <div className="mt-2 max-h-[42vh] space-y-2 overflow-y-auto">
              {aiCopyVariants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => applyAiVariant(v)}
                  className="block w-full rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-3 text-right transition hover:border-[#C9A227]/60"
                  data-testid={`card-copy-variant-${i}`}
                >
                  {v.title && <p className="text-sm font-bold text-[#F5EEDD]">{v.title}</p>}
                  {v.subtitle && <p className="mt-0.5 text-xs text-[#C9A227]">{v.subtitle}</p>}
                  {v.body && (
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#F5EEDD]/75">
                      {v.body}
                    </p>
                  )}
                  {v.cta && <p className="mt-1 text-xs font-semibold text-[#E4C55A]">{v.cta}</p>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* דיאלוג רקע AI */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">רקע AI</DialogTitle>
            <DialogDescription>תיאור הרקע הרצוי (ללא טקסט, דקורטיבי בלבד)</DialogDescription>
          </DialogHeader>
          {/* בורר מנוע: Gemini (קיים) / Recraft V4 (חדש — פוטוריאליסטי, פריט 6) */}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={aiEngine === "gemini" ? "default" : "outline"}
              className={aiEngine === "gemini" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30 text-[#F5EEDD]/70"}
              onClick={() => setAiEngine("gemini")}
              data-testid="button-ai-engine-gemini"
            >
              Gemini
            </Button>
            <Button
              size="sm"
              variant={aiEngine === "recraft" ? "default" : "outline"}
              className={aiEngine === "recraft" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30 text-[#F5EEDD]/70"}
              onClick={() => setAiEngine("recraft")}
              data-testid="button-ai-engine-recraft"
            >
              Recraft V4 (פוטוריאליסטי)
            </Button>
          </div>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="border-[#C9A227]/20 bg-[#101B32] text-sm text-[#F5EEDD]"
            rows={3}
          />
          <Button
            className="w-full gap-1.5 bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
            onClick={handleAiBackground}
            disabled={aiLoading || aiVariantsLoading}
          >
            <Wand2 className="h-4 w-4" /> {aiLoading ? "יוצר רקע..." : "צור רקע"}
          </Button>
          {/* לא בטוחים באיזה סגנון? — 2 אפשרויות (Gemini + Recraft) לבחירה, במקום שהמערכת תחליט לבד */}
          <Button
            variant="outline"
            className="w-full gap-1.5 border-[#C9A227]/30 text-[#F5EEDD]/80"
            onClick={handleAiBackgroundVariants}
            disabled={aiLoading || aiVariantsLoading}
            data-testid="button-ai-background-variants"
          >
            <Wand2 className="h-4 w-4" />
            {aiVariantsLoading ? "יוצר 2 אפשרויות..." : "לא בטוחים? הצע 2 אפשרויות לבחירה"}
          </Button>
          {aiVariants.length > 0 && (
            <div className="grid grid-cols-2 gap-2" data-testid="grid-ai-background-variants">
              {aiVariants.map((v) => (
                <div key={v.engine} className="group relative overflow-hidden rounded-md border border-[#C9A227]/30 hover:border-[#C9A227]">
                  <button
                    type="button"
                    onClick={() => applyAiBackgroundVariant(v)}
                    className="block w-full text-right"
                    data-testid={`button-ai-variant-${v.engine}`}
                  >
                    <img src={v.dataUrl} alt={v.label} className="h-24 w-full object-cover" />
                    <span className="block px-2 py-1 text-xs text-[#F5EEDD]/80">{v.label}</span>
                  </button>
                  <SectionBgMenu
                    dataUrl={v.dataUrl}
                    onAdd={addSectionBackground}
                    className="absolute left-1 top-1 rounded bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    testId={`button-ai-variant-section-${v.engine}`}
                  />
                </div>
              ))}
            </div>
          )}
          {/* ספריית רקעים — כל רקע AI שנוצר אי-פעם (בעורך זה או אחר) נשמר אוטומטית בשרת;
              כאן ניתן לבחור שוב רקע קודם או להציג אותו בגודל מלא, בלי ליצור מחדש */}
          {!!savedBackgrounds?.length && (
            <div className="border-t border-[#C9A227]/20 pt-3">
              <p className="mb-2 text-xs font-semibold text-[#F5EEDD]/70">
                ספריית רקעים שנשמרו ({savedBackgrounds.length})
              </p>
              <div
                className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto"
                data-testid="grid-background-library"
              >
                {savedBackgrounds.map((bg) => (
                  <div
                    key={bg.id}
                    className="group relative overflow-hidden rounded-md border border-[#C9A227]/20 hover:border-[#C9A227]"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedBackground(bg)}
                      className="block h-16 w-full"
                      title={bg.prompt}
                      data-testid={`button-library-bg-${bg.id}`}
                    >
                      <img src={bg.dataUrl} alt={bg.prompt} className="h-16 w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLibraryPreview(bg); }}
                      className="absolute left-1 top-1 rounded bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                      title="הצג בגודל מלא"
                      data-testid={`button-library-bg-preview-${bg.id}`}
                    >
                      <Eye className="h-3 w-3 text-white" />
                    </button>
                    <SectionBgMenu
                      dataUrl={bg.dataUrl}
                      onAdd={addSectionBackground}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                      testId={`button-library-bg-section-${bg.id}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSavedBackground(bg); }}
                      disabled={deletingBackgroundId === bg.id}
                      className="absolute bottom-1 left-1 rounded bg-black/60 p-1 opacity-0 transition-opacity hover:bg-red-500/70 group-hover:opacity-100 disabled:opacity-50"
                      title="מחק מהספרייה"
                      data-testid={`button-library-bg-delete-${bg.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* דיאלוג תצוגה מוגדלת לרקע מהספרייה */}
      <Dialog open={!!libraryPreview} onOpenChange={(o) => !o && setLibraryPreview(null)}>
        <DialogContent className="max-w-2xl border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">רקע מהספרייה</DialogTitle>
            {libraryPreview?.prompt && <DialogDescription>{libraryPreview.prompt}</DialogDescription>}
          </DialogHeader>
          {libraryPreview && (
            <img
              src={libraryPreview.dataUrl}
              alt={libraryPreview.prompt}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              className="bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
              onClick={() => {
                if (libraryPreview) applySavedBackground(libraryPreview);
                setLibraryPreview(null);
              }}
              data-testid="button-library-preview-apply"
            >
              החל כרקע כללי
            </Button>
            {libraryPreview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-1.5 border-[#C9A227]/40 text-[#F5EEDD]"
                    data-testid="button-library-preview-section"
                  >
                    <SquareStack className="h-4 w-4" /> הוסף כרקע לקטע
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" dir="rtl" className="border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]">
                  <DropdownMenuLabel className="text-[#F5EEDD]/70">בחר מיקום בעמוד</DropdownMenuLabel>
                  {SECTION_PRESETS.map((p) => (
                    <DropdownMenuItem
                      key={p.key}
                      onClick={() => {
                        addSectionBackground(libraryPreview.dataUrl, p.key);
                        setLibraryPreview(null);
                      }}
                      className="cursor-pointer text-[#F5EEDD] focus:bg-[#C9A227]/20 focus:text-[#F5EEDD]"
                      data-testid={`menuitem-library-preview-section-${p.key}`}
                    >
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {libraryPreview && (
              <Button
                variant="outline"
                className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => handleDeleteSavedBackground(libraryPreview)}
                disabled={deletingBackgroundId === libraryPreview.id}
                data-testid="button-library-preview-delete"
              >
                <Trash2 className="h-4 w-4" /> מחק מהספרייה
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג ספריית אייקונים (Iconify, חינם) */}
      <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
        <DialogContent className="max-w-2xl border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">ספריית אייקונים</DialogTitle>
            <DialogDescription>
              חיפוש חופשי מתוך ספריית Iconify (חינם) — לצד עיטורי היודאיקה המובנים
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchIcons()}
              placeholder="לדוגמה: crown, star, book, candle"
              className="border-[#C9A227]/20 bg-[#101B32] text-sm text-[#F5EEDD]"
              data-testid="input-icon-search"
            />
            <Button
              size="sm"
              className="gap-1.5 bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
              onClick={handleSearchIcons}
              disabled={iconLoading}
              data-testid="button-icon-search"
            >
              <Search className="h-4 w-4" /> {iconLoading ? "מחפש..." : "חפש"}
            </Button>
          </div>
          <div className="grid max-h-[50vh] grid-cols-6 gap-2 overflow-y-auto">
            {iconResults.length === 0 && !iconLoading && (
              <p className="col-span-6 text-sm text-[#F5EEDD]/50">אין תוצאות — נסו מילת חיפוש אחרת (באנגלית)</p>
            )}
            {iconResults.map((iconId) => (
              <button
                key={iconId}
                title={iconId}
                onClick={() => handleAddIconLayer(iconId)}
                className="flex aspect-square items-center justify-center rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-2 transition hover:border-[#C9A227]/60"
                data-testid={`button-icon-${iconId}`}
              >
                <img
                  src={`https://api.iconify.design/${iconId.replace(":", "/")}.svg?color=%23F5EEDD`}
                  alt={iconId}
                  className="h-full w-full"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adaptersDialogOpen} onOpenChange={setAdaptersDialogOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">ייצוא למתאמים (Adapters)</DialogTitle>
            <DialogDescription>
              ציור פרוגרמטי של התבנית ליעדי עריכה חיצוניים — לצד ייצוא PNG/PDF הרגיל שלא משתנה.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-3">
              <div className="flex items-center gap-2">
                <Figma className="h-4 w-4 shrink-0 text-[#C9A227]" />
                <div>
                  <p className="text-sm font-medium">Figma</p>
                  <p className="text-[11px] text-[#F5EEDD]/50">
                    ייצוא SVG פרוגרמטי (שכבות נפרדות) — גרירה ישירה ל-Figma להמשך עריכה
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-[#C9A227]/40 text-[11px] text-[#F5EEDD]"
                data-testid="button-export-figma-svg"
                onClick={handleExportFigmaSVG}
              >
                הורד SVG
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 shrink-0 text-[#C9A227]" />
                <div>
                  <p className="text-sm font-medium">Canva Autofill</p>
                  <p className="text-[11px] text-[#F5EEDD]/50">מילוי אוטומטי של תבנית Canva (דורש חשבון Enterprise)</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-red-400/40 text-[11px] text-red-300"
                data-testid="badge-canva-blocked"
              >
                חסום — מפתח חסר
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-[#C9A227]" />
                <div>
                  <p className="text-sm font-medium">Adobe InDesign (IDML)</p>
                  <p className="text-[11px] text-[#F5EEDD]/50">
                    דפוס-כמות — עלוני A3/עיתונות. טקסט = שכבות אמיתיות בנות-עריכה
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-[#C9A227]/40 text-[11px] text-[#F5EEDD]"
                data-testid="button-export-idml"
                onClick={handleExportIDML}
              >
                הורד IDML
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={critiqueDialogOpen} onOpenChange={setCritiqueDialogOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]" data-testid="text-critique-score">
              ביקורת AI — ציון {critiqueResult?.score ?? "—"}/100
            </DialogTitle>
            <DialogDescription>
              משוב מבקר QA על הטיוטה הנוכחית — לקריאה בלבד, שום שכבה לא משתנה אוטומטית.
              {clientNotes.trim() && " הביקורת הביאה בחשבון את הערת הלקוח השמורה."}
              {" "}הערה עם כפתור "החל תיקון" משנה, בלחיצה מפורשת בלבד, רק את השכבה שצוינה בה.
              {" "}"החל את כל התיקונים" מריץ את אותה פעולה על כל ההערות הממתינות בבת אחת — עדיין לחיצה יזומה אחת, לא לולאה אוטומטית.
            </DialogDescription>
          </DialogHeader>
          {critiqueResult && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {critiqueResult.strengths.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[#C9A227]">חוזקות</p>
                  <ul className="space-y-1 text-sm">
                    {critiqueResult.strengths.map((s, i) => (
                      <li key={i} className="rounded-md border border-[#C9A227]/20 bg-[#101B32] p-2 text-[#F5EEDD]/90">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {critiqueResult.issues.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#C9A227]">הערות</p>
                    {(() => {
                      const pendingCount = critiqueResult.issues.filter(
                        (issue, i) => !appliedCritiqueFixes.has(i) && resolveCritiqueFix(issue.fix)
                      ).length;
                      if (pendingCount === 0) return null;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 border-[#C9A227]/40 px-2 text-[10px] text-[#C9A227]"
                          onClick={handleApplyAllCritiqueFixes}
                          data-testid="button-apply-all-critique-fixes"
                        >
                          <CheckCheck className="h-3 w-3" />
                          {`החל את כל התיקונים (${pendingCount})`}
                        </Button>
                      );
                    })()}
                  </div>
                  <ul className="space-y-1.5 text-sm" data-testid="list-critique-issues">
                    {critiqueResult.issues.map((issue, i) => (
                      <li key={i} className="rounded-md border border-[#C9A227]/20 bg-[#101B32] p-2">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              "shrink-0 text-[10px] " +
                              (issue.severity === "high"
                                ? "border-red-400/40 text-red-300"
                                : issue.severity === "medium"
                                  ? "border-amber-400/40 text-amber-300"
                                  : "border-[#C9A227]/40 text-[#C9A227]")
                            }
                          >
                            {issue.severity === "high" ? "גבוה" : issue.severity === "medium" ? "בינוני" : "נמוך"}
                          </Badge>
                          <span className="text-[11px] text-[#F5EEDD]/60">{issue.area}</span>
                        </div>
                        <p className="text-[#F5EEDD]/90">{issue.note}</p>
                        {(() => {
                          const resolved = resolveCritiqueFix(issue.fix);
                          if (!resolved) return null;
                          const applied = appliedCritiqueFixes.has(i);
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1.5 h-6 gap-1 border-[#C9A227]/40 px-2 text-[10px] text-[#C9A227] disabled:opacity-60"
                              disabled={applied}
                              onClick={() => handleApplyCritiqueFix(i, issue.fix)}
                              data-testid={`button-apply-critique-fix-${i}`}
                            >
                              {applied ? "הוחל ✓" : `החל תיקון (${resolved.field})`}
                            </Button>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {critiqueResult.suggestions.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[#C9A227]">הצעות שיפור</p>
                  <ul className="space-y-1 text-sm">
                    {critiqueResult.suggestions.map((s, i) => (
                      <li key={i} className="rounded-md border border-[#C9A227]/20 bg-[#101B32] p-2 text-[#F5EEDD]/90">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {critiqueResult.issues.length === 0 && critiqueResult.suggestions.length === 0 && (
                <p className="text-sm text-[#F5EEDD]/70">הטיוטה נראית מוצקה — אין הערות מהותיות.</p>
              )}
            </div>
          )}
          {appliedCritiqueFixes.size > 0 && (
            <DialogFooter className="sm:justify-start">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-[#C9A227]/40 text-[#C9A227] disabled:opacity-60"
                disabled={critiquing}
                onClick={handleAiCritique}
                data-testid="button-critique-recheck"
              >
                <RefreshCw className={"h-3.5 w-3.5" + (critiquing ? " animate-spin" : "")} />
                {critiquing ? "בודק שוב..." : "בדוק שוב אחרי התיקונים"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">הערות לקוח</DialogTitle>
            <DialogDescription>
              נשמר עם הפרויקט — לקריאה על ידי המעצב, שום שכבה לא משתנה אוטומטית לפי הכתוב כאן.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder="למשל: להגדיל את הכותרת, להחליף את הרקע לגוון חם יותר…"
            className="min-h-[140px] border-[#C9A227]/30 bg-[#101B32] text-[#F5EEDD]"
            data-testid="textarea-client-notes"
          />
          <Button
            size="sm"
            className="gap-1.5 self-start bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
            onClick={async () => {
              await handleSaveProject();
              setNotesDialogOpen(false);
            }}
            disabled={saving}
            data-testid="button-save-client-notes"
          >
            <Save className="h-4 w-4" /> {saving ? "שומר..." : "שמור הערה ופרויקט"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={narrationDialogOpen} onOpenChange={setNarrationDialogOpen}>
        <DialogContent className="max-w-lg border-[#C9A227]/30 bg-[#0E1830] text-[#F5EEDD]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#F5EEDD]">קריינות עברית</DialogTitle>
            <DialogDescription>
              טקסט חופשי → קריינות אמיתית (ElevenLabs) לשימוש בווידאו קידום. נשמר עם הפרויקט; שום שכבה בקנבס לא משתנה.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={narrationScript}
            onChange={(e) => setNarrationScript(e.target.value)}
            placeholder="למשל: הצטרפו אלינו לשיעור השבועי, יום שלישי בשעה 20:00…"
            className="min-h-[120px] border-[#C9A227]/30 bg-[#101B32] text-[#F5EEDD]"
            data-testid="textarea-narration-script"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start border-[#C9A227]/40 text-[#C9A227]"
            onClick={handleGenerateNarration}
            disabled={narrationLoading || !narrationScript.trim()}
            data-testid="button-generate-narration"
          >
            <Mic className="h-4 w-4" /> {narrationLoading ? "יוצר קריינות..." : "צור קריינות"}
          </Button>
          {narrationAudioUrl && (
            <audio controls src={narrationAudioUrl} className="w-full" data-testid="audio-narration-preview" />
          )}
          {narrationAudioUrl && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#F5EEDD]/70">
                  כתוביות עבריות בגוף הסרטון (לצפייה בלי קול)
                </Label>
                <Switch
                  checked={showCaptions}
                  onCheckedChange={setShowCaptions}
                  data-testid="switch-video-captions"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 self-start border-[#C9A227]/40 text-[#C9A227]"
                onClick={handleExportVideo}
                disabled={videoExporting}
                data-testid="button-export-video"
              >
                <Video className="h-4 w-4" /> {videoExporting ? `מרכיב וידאו... ${videoProgress}%` : "ייצוא וידאו קידום (webm)"}
              </Button>
              {videoExporting && <Progress value={videoProgress} className="h-2" />}
            </div>
          )}
          <Button
            size="sm"
            className="gap-1.5 self-start bg-[#C9A227] text-[#0B1220] hover:bg-[#C9A227]/90"
            onClick={async () => {
              await handleSaveProject();
              setNarrationDialogOpen(false);
            }}
            disabled={saving}
            data-testid="button-save-narration"
          >
            <Save className="h-4 w-4" /> {saving ? "שומר..." : "שמור קריינות ופרויקט"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TextLayerControls({
  layer,
  stylePalette,
  onChange,
}: {
  layer: TextLayer;
  stylePalette: { primary: string; secondary: string; accent: string; text: string; textLight: string; cream: string };
  onChange: (patch: Partial<TextLayer>) => void;
}) {
  const paletteColors = Array.from(new Set(Object.values(stylePalette)));
  return (
    <div className="space-y-3 border-t border-[#C9A227]/10 pt-3">
      {/* פונט + עובי חופשי */}
      <FontControl
        fontFamily={layer.fontFamily}
        fontWeight={layer.fontWeight ?? 400}
        onChange={(patch) => onChange(patch)}
      />

      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">גודל: {layer.fontSize}</Label>
        <Slider
          value={[layer.fontSize]}
          min={12}
          max={220}
          step={1}
          onValueChange={([v]) => onChange({ fontSize: v, maxFontSize: v })}
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
          מרווח אותיות <code className="font-mono text-[10px] text-[#C9A227]/70">letterSpacing</code>: {layer.letterSpacing ?? 0}
        </Label>
        <Slider
          value={[layer.letterSpacing ?? 0]}
          min={-5}
          max={30}
          step={0.5}
          onValueChange={([v]) => onChange({ letterSpacing: v })}
          data-testid="slider-layer-tracking"
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
          מרווח שורות <code className="font-mono text-[10px] text-[#C9A227]/70">lineHeight</code>: {layer.lineHeight ?? 1.15}
        </Label>
        <Slider
          value={[layer.lineHeight ?? 1.15]}
          min={0.8}
          max={2.5}
          step={0.05}
          onValueChange={([v]) => onChange({ lineHeight: v })}
          data-testid="slider-layer-leading"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-[#F5EEDD]/70">
          זיווג אותיות <code className="font-mono text-[10px] text-[#C9A227]/70">kerning</code>
        </Label>
        <Switch
          checked={layer.kerning !== false}
          onCheckedChange={(v) => onChange({ kerning: v })}
          data-testid="switch-layer-kerning"
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">יישור</Label>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={layer.align === "right" ? "default" : "outline"}
            className={layer.align === "right" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30"}
            onClick={() => onChange({ align: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={layer.align === "center" ? "default" : "outline"}
            className={layer.align === "center" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30"}
            onClick={() => onChange({ align: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={layer.align === "left" ? "default" : "outline"}
            className={layer.align === "left" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30"}
            onClick={() => onChange({ align: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* צבע טקסט — בורר מלא עם מפת צבעים */}
      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
          צבע טקסט <code className="font-mono text-[10px] text-[#C9A227]/70">fill</code>
        </Label>
        <ColorPicker
          value={layer.fill}
          onChange={(c) => onChange({ fill: c })}
          presets={paletteColors}
          label="צבע הטקסט"
        />
      </div>

      {/* מתאר (קו מתאר) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
            צבע מתאר <code className="font-mono text-[10px] text-[#C9A227]/70">stroke</code>
          </Label>
          <ColorPicker
            value={layer.stroke ?? "#000000"}
            onChange={(c) => onChange({ stroke: c })}
            presets={paletteColors}
            compact
            label="צבע מתאר"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
            עובי מתאר <code className="font-mono text-[10px] text-[#C9A227]/70">stroke</code>: {layer.strokeWidth ?? 0}
          </Label>
          <Slider
            value={[layer.strokeWidth ?? 0]}
            min={0}
            max={12}
            step={0.5}
            onValueChange={([v]) => onChange({ strokeWidth: v })}
          />
        </div>
      </div>

      {/* צל טקסט */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
            צבע צל <code className="font-mono text-[10px] text-[#C9A227]/70">shadow</code>
          </Label>
          <ColorPicker
            value={layer.shadowColor ?? "rgba(0, 0, 0, 0.5)"}
            onChange={(c) => onChange({ shadowColor: c })}
            compact
            label="צבע הצל"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
            טשטוש צל <code className="font-mono text-[10px] text-[#C9A227]/70">blur</code>: {layer.shadowBlur ?? 0}
          </Label>
          <Slider
            value={[layer.shadowBlur ?? 0]}
            min={0}
            max={40}
            step={1}
            onValueChange={([v]) => onChange({ shadowBlur: v })}
          />
        </div>
      </div>
    </div>
  );
}

// ---- פאנל רקע: צבע מלא / גרדיאנט (from/to/angle) / תמונת AI ----
function BackgroundControls({
  background,
  onChange,
}: {
  background: TemplateBackground;
  onChange: (bg: TemplateBackground) => void;
}) {
  const type = background.type;
  const grad = background.gradient ?? { from: "#0B1220", to: "#1A2A4A", angle: 135 };
  const bgPresets = ["#0B1220", "#101B32", "#1A2A4A", "#C9A227", "#E4C55A", "#F5EEDD", "#FFFFFF", "#000000", "#2E1A0B", "#4A1010"];

  return (
    <div className="space-y-3">
      {/* בורר סוג רקע */}
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={type === "solid" ? "default" : "outline"}
          className={type === "solid" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30 text-[#F5EEDD]/70"}
          onClick={() => onChange({ type: "solid", color: background.color ?? "#0B1220" })}
          data-testid="button-bg-solid"
        >
          צבע מלא
        </Button>
        <Button
          size="sm"
          variant={type === "gradient" ? "default" : "outline"}
          className={type === "gradient" ? "flex-1 bg-[#C9A227] text-[#0B1220]" : "flex-1 border-[#C9A227]/30 text-[#F5EEDD]/70"}
          onClick={() => onChange({ type: "gradient", gradient: grad })}
          data-testid="button-bg-gradient"
        >
          גרדיאנט
        </Button>
      </div>

      {/* צבע מלא */}
      {type === "solid" && (
        <div>
          <Label className="mb-1 block text-xs text-[#F5EEDD]/70">
            צבע הרקע <code className="font-mono text-[10px] text-[#C9A227]/70">fill</code>
          </Label>
          <ColorPicker
            value={background.color ?? "#0B1220"}
            onChange={(c) => onChange({ type: "solid", color: c })}
            presets={bgPresets}
            label="צבע הרקע"
          />
        </div>
      )}

      {/* גרדיאנט: from / to / זווית */}
      {type === "gradient" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-xs text-[#F5EEDD]/70">צבע עליון</Label>
              <ColorPicker
                value={grad.from}
                onChange={(c) => onChange({ type: "gradient", gradient: { ...grad, from: c } })}
                presets={bgPresets}
                compact
                label="צבע עליון"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-[#F5EEDD]/70">צבע תחתון</Label>
              <ColorPicker
                value={grad.to}
                onChange={(c) => onChange({ type: "gradient", gradient: { ...grad, to: c } })}
                presets={bgPresets}
                compact
                label="צבע תחתון"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-[#F5EEDD]/70">זווית: {grad.angle ?? 135}°</Label>
            <Slider
              value={[grad.angle ?? 135]}
              min={0}
              max={360}
              step={5}
              onValueChange={([v]) => onChange({ type: "gradient", gradient: { ...grad, angle: v } })}
            />
          </div>
        </div>
      )}

      {type === "image" && (
        <p className="text-[11px] text-[#F5EEDD]/50">רקע תמונה פעיל. לחיצה על “צבע מלא” או “גרדיאנט” תחליף אותו.</p>
      )}
    </div>
  );
}
