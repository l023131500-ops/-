import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleBlock, Lesson } from "@/lib/studyDayLessons";

type TemplateMode = "shul" | "rabbi" | "org";

interface Props {
  mode: TemplateMode;
  /** For shul mode: synagogue_portals.id inserted as session_id on study_day_events */
  sessionId?: string;
  /** For rabbi/org mode: identifier written on lessons rows */
  rabbiName?: string;
  orgName?: string;
  logoUrl?: string;
  /** Optional defaults for inserted shul rows */
  synagogueName?: string;
  city?: string;
  onImported: () => void;
}

const LABELS = {
  shul: {
    headers: ["שם הרב", "נושא", "שעה", "תאריך (YYYY-MM-DD)", "יום קבוע (ראשון/שני/...)"],
    sample: [
      ["הרב ישראל ישראלי", "דף יומי", "20:30", "2025-05-15", ""],
      ["הרב משה כהן", "גמרא בעיון", "21:00", "", "ראשון, שלישי, חמישי"],
    ],
    fileName: "תבנית-שיעורי-בית-כנסת.xlsx",
  },
  rabbi: {
    headers: ["נושא", "עיר", "שכונה", "בית כנסת", "יום", "שעה", "שפה", "קהל יעד"],
    sample: [
      ["דף יומי", "ירושלים", "גאולה", "היכל יעקב", "ראשון, שלישי", "20:30", "עברית", "אברכים"],
      ["הלכה", "בני ברק", "", "בית המדרש המרכזי", "שני", "21:00", "עברית", "בעלי בתים"],
    ],
    fileName: "תבנית-שיעורי-הרב.xlsx",
  },
  org: {
    headers: ["שם הרב", "נושא", "עיר", "שכונה", "בית כנסת", "יום", "שעה", "שפה", "קהל יעד"],
    sample: [
      ["הרב ישראל ישראלי", "דף יומי", "ירושלים", "גאולה", "היכל יעקב", "ראשון, שלישי", "20:30", "עברית", "אברכים"],
    ],
    fileName: "תבנית-שיעורי-ארגון.xlsx",
  },
};

function makeTemplate(mode: TemplateMode) {
  const spec = LABELS[mode];
  const ws = XLSX.utils.aoa_to_sheet([spec.headers, ...spec.sample]);
  ws["!cols"] = spec.headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "שיעורים");
  XLSX.writeFile(wb, spec.fileName);
}

function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        resolve(
          rows.map((r) => {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(r)) out[k.trim()] = String(v ?? "").trim();
            return out;
          }),
        );
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const DAY_RE = /^(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)$/;

export default function SynagogueExcelImportExport({
  mode, sessionId, rabbiName, orgName, logoUrl, synagogueName, city, onImported,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseFile(file);
      if (!rows.length) { toast.error("לא נמצאו שורות. ודא שמילאת לפי התבנית."); return; }

      if (mode === "shul") {
        if (!sessionId) { toast.error("חסר מזהה פורטל"); return; }
        // Group rows into blocks: same date → date-block, same days-list → days-block
        const dateMap = new Map<string, Lesson[]>();
        const daysMap = new Map<string, { days: string[]; items: Lesson[] }>();

        for (const r of rows) {
          const rabbi = r["שם הרב"] || "";
          const subject = r["נושא"] || "";
          if (!rabbi && !subject) continue;
          const time = r["שעה"] || "";
          const date = r["תאריך (YYYY-MM-DD)"] || "";
          const daysStr = r["יום קבוע (ראשון/שני/...)"] || "";

          const lesson: Lesson = { rabbi_name: rabbi, subject, time };
          if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            if (!dateMap.has(date)) dateMap.set(date, []);
            dateMap.get(date)!.push(lesson);
          } else if (daysStr) {
            const days = daysStr.split(/[,،、]/).map(s => s.trim()).filter(d => DAY_RE.test(d));
            if (!days.length) continue;
            const key = days.slice().sort().join("|");
            if (!daysMap.has(key)) daysMap.set(key, { days, items: [] });
            daysMap.get(key)!.items.push(lesson);
          }
        }

        const blocks: ScheduleBlock[] = [];
        let idx = 0;
        for (const [date, items] of dateMap) blocks.push({ id: `b-imp-${idx++}`, kind: "date", date, items });
        for (const { days, items } of daysMap.values()) blocks.push({ id: `b-imp-${idx++}`, kind: "days", days, items });
        if (!blocks.length) { toast.error("לא זוהו שיעורים תקינים"); return; }

        const totalLessons = blocks.reduce((s, b) => s + b.items.length, 0);
        const firstDate = blocks.find(b => b.kind === "date")?.date ?? null;
        const { error } = await supabase.from("study_day_events").insert({
          session_id: sessionId,
          synagogue_name: synagogueName || "",
          city: city || "",
          logo_url: logoUrl || "",
          schedule_type: firstDate ? "specific_date" : "weekly_days",
          event_date: firstDate,
          lessons: { blocks } as any,
          is_approved: false,
          status: "draft",
        });
        if (error) throw error;
        toast.success(`יובאו ${totalLessons} שיעורים ב-${blocks.length} מקבצים`);
      } else {
        // rabbi / org → insert into lessons
        const inserts = rows.map((r) => {
          const daysStr = r["יום"] || "";
          const time = r["שעה"] || "";
          const days = daysStr.split(/[,،、]/).map((s) => s.trim()).filter((d) => DAY_RE.test(d));
          const schedule_days = days.length ? days.map((day) => ({ day, time })) : [];
          return {
            rabbi_name: mode === "rabbi" ? (rabbiName || "") : (r["שם הרב"] || ""),
            subject: r["נושא"] || "",
            city: r["עיר"] || "",
            neighborhood: r["שכונה"] || "",
            synagogue_name: r["בית כנסת"] || "",
            language: r["שפה"] || "עברית",
            audience_type: r["קהל יעד"] ? r["קהל יעד"].split(",").map(s => s.trim()).filter(Boolean) : [],
            target_audience: [],
            schedule_days: schedule_days as any,
            is_recurring: schedule_days.length > 0,
            org_name: mode === "org" ? (orgName || "") : "",
            logo_url: logoUrl || "",
            status: "pending",
            is_approved: false,
          };
        }).filter(r => r.rabbi_name && r.subject);

        if (!inserts.length) { toast.error("לא נמצאו שורות תקינות (נדרש שם הרב ונושא)"); return; }
        const { error } = await supabase.from("lessons").insert(inserts);
        if (error) throw error;
        toast.success(`יובאו ${inserts.length} שיעורים. ממתינים לאישור.`);
      }

      onImported();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בייבוא הקובץ");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <button
        onClick={() => makeTemplate(mode)}
        className="bg-muted hover:bg-muted/70 border border-border rounded-xl p-4 text-right flex items-center gap-3 transition-colors"
      >
        <div className="bg-primary/10 rounded-lg p-2.5"><Download className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <div className="font-display font-bold text-sm">הורדת קובץ דוגמה</div>
          <div className="text-xs text-muted-foreground">תבנית Excel למילוי</div>
        </div>
      </button>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-xl p-4 text-right flex items-center gap-3 transition-colors disabled:opacity-60"
      >
        <div className="bg-white/15 rounded-lg p-2.5">
          {importing ? <FileSpreadsheet className="w-5 h-5 animate-pulse" /> : <Upload className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-sm">העלאת רשימת שיעורים</div>
          <div className="text-xs opacity-90">{importing ? "מייבא..." : "בחר קובץ XLSX לייבוא"}</div>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
