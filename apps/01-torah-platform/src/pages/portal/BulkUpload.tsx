import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// lessons table columns used: title, rabbi_name, time_hhmm, description, address, tenant_id, is_active

const DAY_MAP: Record<string, number> = {
  ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
};

interface ParsedRow {
  title: string;
  rabbi_name: string;
  time_hhmm: string;
  day_of_week: number | null;
  description: string;
  address: string;
  _rowNum: number;
  _errors: string[];
}

const FIELD_ALIASES: Record<string, string> = {
  // Hebrew
  "כותרת": "title", "שם שיעור": "title",
  "רב": "rabbi_name", "מרצה": "rabbi_name", "שם הרב": "rabbi_name",
  "שעה": "time_hhmm", "זמן": "time_hhmm",
  "יום": "day_of_week",
  "מיקום": "address", "כתובת": "address",
  "תיאור": "description",
  // English
  title: "title", teacher: "rabbi_name", rabbi: "rabbi_name", rabbi_name: "rabbi_name",
  time: "time_hhmm", time_hhmm: "time_hhmm",
  day: "day_of_week", day_of_week: "day_of_week",
  location: "address", address: "address",
  description: "description",
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const headers = rawHeaders.map((h) => FIELD_ALIASES[h] || h);

  return lines.slice(1).filter((l) => l.trim()).map((line, i) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || ""; });

    const errors: string[] = [];
    if (!obj.title) errors.push("חסרה כותרת");
    if (!obj.rabbi_name) errors.push("חסר שם הרב");

    const rawDay = obj.day_of_week?.toLowerCase().trim();
    const dayNum = rawDay ? (DAY_MAP[rawDay] ?? null) : null;

    return {
      title: obj.title || "",
      rabbi_name: obj.rabbi_name || "",
      time_hhmm: obj.time_hhmm || "",
      day_of_week: dayNum,
      description: obj.description || "",
      address: obj.address || "",
      _rowNum: i + 2,
      _errors: errors,
    };
  });
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function BulkUpload() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidRows = rows.filter((r) => r._errors.length > 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploadResult(null);

    const isCsv = file.name.endsWith(".csv") || file.type.includes("csv");
    if (!isCsv) {
      toast.error("כרגע נתמך רק קובץ CSV. המר את קובץ ה-Excel לפורמט CSV ונסה שנית.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      if (parsed.length === 0) toast.error("הקובץ ריק או אינו בפורמט תקין");
      else toast.success(`נטענו ${parsed.length} שורות`);
    };
    reader.readAsText(file, "UTF-8");
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (validRows.length === 0) throw new Error("אין שורות תקינות להעלאה");

      const inserts = validRows.map((r) => ({
        tenant_id: tenant.id,
        title: r.title,
        rabbi_name: r.rabbi_name || null,
        time_hhmm: r.time_hhmm || null,
        day_of_week: r.day_of_week,
        description: r.description || null,
        address: r.address || null,
        is_active: true,
        meta: {},
      }));

      let success = 0, failed = 0;
      for (let i = 0; i < inserts.length; i += 50) {
        const batch = inserts.slice(i, i + 50);
        const { error } = await supabase.from("lessons").insert(batch);
        if (error) failed += batch.length;
        else success += batch.length;
      }
      return { success, failed };
    },
    onSuccess: (result) => {
      setUploadResult(result);
      toast.success(`הועלו ${result.success} שיעורים${result.failed > 0 ? `, ${result.failed} נכשלו` : ""}`);
      qc.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAll = () => {
    setRows([]);
    setFileName("");
    setUploadResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">העלאה מרובה – שיעורים</h1>
      </div>

      {/* Instructions */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium mb-1">פורמט CSV נדרש – כותרות עמודות:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            title, rabbi_name, time_hhmm, day_of_week, address, description
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            * שדות חובה: title, rabbi_name. עמודות בעברית נתמכות: כותרת, מרצה, שעה, יום, מיקום.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            יום: ראשון/שני/...שבת או 0–6 (ראשון=0, שבת=6)
          </p>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">{fileName || "לחץ לבחירת קובץ CSV"}</p>
            <p className="text-sm text-muted-foreground mt-1">גרור קובץ לכאן או לחץ לעיון</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </CardContent>
      </Card>

      {/* Result banner */}
      {uploadResult && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-200 mb-6 dark:bg-green-950/30">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              הועלו בהצלחה: {uploadResult.success} שיעורים
            </p>
            {uploadResult.failed > 0 && (
              <p className="text-sm text-red-600">{uploadResult.failed} שורות נכשלו</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="mr-auto" onClick={clearAll}>נקה</Button>
        </div>
      )}

      {/* Stats + Upload button */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Badge variant="outline" className="text-sm py-1">סה"כ: {rows.length}</Badge>
            <Badge className="text-sm py-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3 ml-1" />
              תקינות: {validRows.length}
            </Badge>
            {invalidRows.length > 0 && (
              <Badge variant="destructive" className="text-sm py-1">
                <XCircle className="h-3 w-3 ml-1" />
                שגיאות: {invalidRows.length}
              </Badge>
            )}
            <div className="mr-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4 ml-1" />
                נקה
              </Button>
              <Button
                size="sm"
                onClick={() => upload.mutate()}
                disabled={upload.isPending || validRows.length === 0}
              >
                {upload.isPending ? "מעלה..." : `העלה ${validRows.length} שיעורים`}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">תצוגה מקדימה</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_1fr_100px_80px_1fr_100px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  <span>#</span>
                  <span>כותרת</span>
                  <span>שם הרב</span>
                  <span>שעה</span>
                  <span>יום</span>
                  <span>מיקום</span>
                  <span>סטטוס</span>
                </div>
                <div className="divide-y">
                  {rows.map((row) => (
                    <div
                      key={row._rowNum}
                      className={`grid grid-cols-[40px_1fr_1fr_100px_80px_1fr_100px] gap-2 px-4 py-2.5 items-center text-sm ${
                        row._errors.length > 0 ? "bg-red-50/50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <span className="text-muted-foreground text-xs">{row._rowNum}</span>
                      <span>{row.title || <span className="text-red-500 text-xs">חסר</span>}</span>
                      <span>{row.rabbi_name || <span className="text-red-500 text-xs">חסר</span>}</span>
                      <span className="text-muted-foreground">{row.time_hhmm || "—"}</span>
                      <span className="text-muted-foreground">
                        {row.day_of_week != null ? DAY_NAMES[row.day_of_week] : "—"}
                      </span>
                      <span className="text-muted-foreground truncate">{row.address || "—"}</span>
                      <span>
                        {row._errors.length === 0 ? (
                          <Badge className="text-xs bg-green-600">תקין</Badge>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {row._errors[0]}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
