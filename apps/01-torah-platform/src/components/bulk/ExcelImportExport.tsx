import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadExcelTemplate, parseExcelFile } from "@/lib/lessonExcel";

interface Props {
  sessionId: string;
  onImported: () => void;
}

export default function ExcelImportExport({ sessionId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        toast.error("לא נמצאו שיעורים בקובץ. ודא שמילאת לפי התבנית.");
        return;
      }

      const inserts = rows.map((r) => ({
        bulk_session_id: sessionId,
        is_sent: false,
        is_approved: false,
        status: "draft",
        rabbi_name: r.rabbi_name || "",
        subject: r.subject || "",
        language: r.language || "עברית",
        audience_type: r.audience_type ? [r.audience_type] : [],
        target_audience: r.target_audience
          ? r.target_audience.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        city: r.city || "",
        neighborhood: r.neighborhood || "",
        street: r.street || "",
        street_number: r.street_number || "",
        synagogue_name: r.synagogue_name || "",
        specific_date: r.specific_date || null,
        schedule_days:
          r.schedule_days || r.schedule_time
            ? [{ day: r.schedule_days || "", time: r.schedule_time || "" }]
            : [],
        schedule_notes: r.schedule_notes || "",
        rabbi_phone: r.rabbi_phone || "",
        contact_phone: r.contact_phone || "",
        submitter_notes: r.notes || "",
      }));

      const { error } = await supabase.from("lessons").insert(inserts);
      if (error) throw error;
      toast.success(`יובאו ${inserts.length} שיעורים`);
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
        onClick={downloadExcelTemplate}
        className="group bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-xl p-5 text-right flex items-center gap-4 transition-colors"
      >
        <div className="bg-white/15 rounded-lg p-3">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">הורדת קובץ דוגמה</div>
          <div className="text-sm opacity-90">תבנית Excel עם שדות לשיעורים</div>
        </div>
      </button>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="group bg-primary/90 hover:bg-primary text-primary-foreground rounded-xl p-5 text-right flex items-center gap-4 transition-colors disabled:opacity-60"
      >
        <div className="bg-white/15 rounded-lg p-3">
          {importing ? <FileSpreadsheet className="w-6 h-6 animate-pulse" /> : <Upload className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">העלאת רשימת שיעורים מאקסל</div>
          <div className="text-sm opacity-90">{importing ? "מייבא..." : "בחר קובץ XLSX לייבוא"}</div>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
