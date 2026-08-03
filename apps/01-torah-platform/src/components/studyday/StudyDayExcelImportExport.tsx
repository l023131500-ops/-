import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadStudyDayTemplate, parseStudyDayFile, parseLessonsString } from "@/lib/studyDayExcel";

interface Props {
  sessionId: string;
  onImported: () => void;
}

export default function StudyDayExcelImportExport({ sessionId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseStudyDayFile(file);
      if (!rows.length) { toast.error("לא נמצאו נתונים. ודא שמילאת לפי התבנית."); return; }

      const inserts = rows.map((r) => {
        const isSpecific = (r.schedule_type || "").includes("תאריך");
        return {
          session_id: sessionId,
          synagogue_name: r.synagogue_name || "",
          city: r.city || "",
          street: r.street || "",
          street_number: r.street_number || "",
          donation_link: r.donation_link || "",
          contact_name: r.contact_name || "",
          contact_phone: r.contact_phone || "",
          contact_email: r.contact_email || "",
          schedule_type: isSpecific ? "specific_date" : "weekly_days",
          event_date: isSpecific && r.event_date ? r.event_date : null,
          schedule_days: !isSpecific && r.schedule_days
            ? r.schedule_days.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          target_audience: r.target_audience
            ? r.target_audience.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          lessons: parseLessonsString(r.lessons || ""),
          notes: r.notes || "",
          is_sent: false,
          is_approved: false,
          status: "draft",
        };
      });

      const { error } = await supabase.from("study_day_events").insert(inserts);
      if (error) throw error;
      toast.success(`יובאו ${inserts.length} ימי עיון`);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={downloadStudyDayTemplate}
        className="bg-[hsl(180_45%_30%)]/90 hover:bg-[hsl(180_45%_30%)] text-white rounded-xl p-5 text-right flex items-center gap-4 transition-colors"
      >
        <div className="bg-white/15 rounded-lg p-3">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">הורדת קובץ דוגמה</div>
          <div className="text-sm opacity-90">תבנית Excel לימי עיון</div>
        </div>
      </button>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="bg-[hsl(180_45%_45%)]/90 hover:bg-[hsl(180_45%_45%)] text-white rounded-xl p-5 text-right flex items-center gap-4 transition-colors disabled:opacity-60"
      >
        <div className="bg-white/15 rounded-lg p-3">
          {importing ? <FileSpreadsheet className="w-6 h-6 animate-pulse" /> : <Upload className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">העלאת רשימת ימי עיון מאקסל</div>
          <div className="text-sm opacity-90">{importing ? "מייבא..." : "בחר קובץ XLSX לייבוא"}</div>
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
