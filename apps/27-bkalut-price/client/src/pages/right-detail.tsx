import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RightRow } from "@shared/schema";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Bell, Copy, Download, Edit3, FileText, Save, Sparkles, Star } from "lucide-react";
import { HaredinessBadge, TypeBadge } from "@/components/badges";
import { CopyButton } from "@/components/copy-button";
import { renderWithLinks } from "@/lib/links";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toTtsSafeHebrew } from "@shared/tts-hebrew";

const PUBLIC_FIELDS: Array<[keyof RightRow, string]> = [
  ["topic", "שם הנושא"],
  ["category", "קטגוריה"],
  ["subCategory", "תת קטגוריה"],
  ["treatingBody", "גוף מטפל"],
  ["audience", "למי זה מיועד"],
  ["whatReceived", "מה ניתן לקבל בפועל"],
  ["eligibility", "תנאי זכאות ברורים"],
  ["qualifyingCases", "מקרים שמזכים / לא מזכים"],
  ["howToApply", "איך מגישים בפועל"],
  ["officialLinks", "קישורים וטפסים רשמיים"],
  ["publicSiteText", "הסבר פשוט לפרסום באתר"],
  ["faq", "שאלות נפוצות"],
  ["goldTip", "טיפ זהב של בקלות"],
  ["haredi", "התאמה לפרסום לציבור חרדי"],
  ["serviceUrl", "קישור לשירות"],
];

const OFFICE_FIELDS: Array<[keyof RightRow, string, "short" | "long"]> = [
  ["priority", "סדר עדיפות", "short"],
  ["category", "קטגוריה", "short"],
  ["subCategory", "תת קטגוריה", "short"],
  ["topic", "שם הנושא", "short"],
  ["treatingBody", "גוף מטפל", "short"],
  ["audience", "קהל יעד ברור", "long"],
  ["whatReceived", "מה ניתן לקבל בפועל וסוג התשלום", "long"],
  ["eligibility", "תנאי זכאות ברורים", "long"],
  ["qualifyingCases", "מקרים שמזכים / לא מזכים", "long"],
  ["preparation", "מה צריך להכין מראש", "long"],
  ["documents", "מסמכים שצריך לצרף", "long"],
  ["howToApply", "איך מגישים בפועל", "long"],
  ["officialLinks", "קישורים וטפסים רשמיים", "long"],
  ["bkalutCost", "עלות שירות בקלות", "long"],
  ["publicSiteText", "הסבר פשוט לפרסום באתר", "long"],
  ["faq", "שאלות נפוצות לציבור", "long"],
  ["goldTip", "טיפ זהב של בקלות ⭐", "long"],
  ["eligibilityJson", "שאלות לבדיקת זכאות (JSON)", "long"],
  ["intakeJson", "שאלון פרטני (JSON)", "long"],
  ["documentsJson", "מסמכים נדרשים בטופס (JSON)", "long"],
  ["podcastScript", "נוסח פודקאסט / מערכת קולית ארוך", "long"],
  ["voiceShort", "נוסח הודעה קולית קצרה ללקוח", "long"],
  ["emailScript", "נוסח מייל / הודעה תכלס ללקוח", "long"],
  ["aiSearch", "AI לסוכן חיפוש", "long"],
  ["aiExtra", "מידע נוסף לסוכן AI", "long"],
  ["haredi", "התאמה לפרסום לציבור חרדי", "long"],
  ["serviceUrl", "קישור לשירות", "short"],
];

function fieldValue(row: RightRow, key: keyof RightRow) {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

function buildCopyText(row: RightRow, mode: "public" | "office") {
  const fields = mode === "public" ? PUBLIC_FIELDS : OFFICE_FIELDS.map(([key, label]) => [key, label] as [keyof RightRow, string]);
  return fields
    .map(([key, label]) => {
      const value = fieldValue(row, key).trim();
      if (!value) return "";
      return `${label}:\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// ---- Sectioned copy (internal): each section is a heading + body, no
// marketing text. Used by the SectionedCopyCard component below.
type SectionDef = {
  key: string;
  label: string;
  build: (row: RightRow) => string;
};

const BKALUT_FOOTER = "המידע מוגש כסיוע ע״י ארגון בקלות.";

const REMINDER_TEMPLATE_BASE = [
  "שלום וברכה,",
  "אנחנו שמחים שנתת בנו את האמון להזכיר לך לקבל את הזכות/ההטבה שמגיעה לך.",
  "כדי לקיים את השליחות שלנו בנאמנות נשמח שתודיע לנו בקישור המצורף האם ביצעת את הפעולה.",
  "התשובה שלך עוזרת לנו להמשיך ולסייע לציבור.",
  "תודה, צוות בקלות.",
].join("\n");

function reminderTemplateFor(row: RightRow): string {
  const link = `${getPublicOrigin()}/#/r/${row.id}`;
  return [
    REMINDER_TEMPLATE_BASE,
    "",
    `נושא התזכורת: ${row.topic}`,
    `קישור לעדכון הסטטוס: ${link}`,
    "",
    BKALUT_FOOTER,
  ].join("\n");
}

function sectionHeader(label: string): string {
  // plain-text heading with clear separators for emails/whatsapp
  return `===== ${label} =====`;
}

const COPY_SECTIONS: SectionDef[] = [
  {
    key: "initial",
    label: "מידע ראשוני",
    build: (row) =>
      [
        row.category && `קטגוריה: ${row.category}${row.subCategory ? ` · ${row.subCategory}` : ""}`,
        row.topic && `נושא: ${row.topic}`,
        row.treatingBody && `גוף מטפל: ${row.treatingBody}`,
        row.audience && `קהל יעד: ${row.audience}`,
        row.whatReceived && `מה ניתן לקבל: ${row.whatReceived}`,
      ]
        .filter(Boolean)
        .join("\n"),
  },
  { key: "eligibility", label: "תנאי זכאות", build: (row) => row.eligibility || "" },
  { key: "qualifying", label: "מקרים מזכים / לא מזכים", build: (row) => row.qualifyingCases || "" },
  {
    key: "documents",
    label: "מסמכים",
    build: (row) => [row.preparation && `הכנה: ${row.preparation}`, row.documents].filter(Boolean).join("\n\n"),
  },
  { key: "how", label: "אופן הגשה", build: (row) => row.howToApply || "" },
  {
    key: "faq",
    label: "שאלות ותשובות",
    build: (row) => row.faq || "",
  },
  {
    key: "reminder",
    label: "נוסח תזכורת",
    build: (row) => reminderTemplateFor(row),
  },
  {
    key: "email",
    label: "נוסח מייל / הודעה",
    build: (row) => row.emailScript || "",
  },
];

function buildSectionedCopy(row: RightRow, selected: Set<string>): string {
  const parts: string[] = [];
  parts.push(`נושא: ${row.topic}`);
  if (row.category) parts.push(`קטגוריה: ${row.category}${row.subCategory ? ` · ${row.subCategory}` : ""}`);
  parts.push("");

  for (const section of COPY_SECTIONS) {
    if (!selected.has(section.key)) continue;
    const body = section.build(row).trim();
    if (!body) continue;
    parts.push(sectionHeader(section.label));
    parts.push(body);
    parts.push("");
  }
  parts.push("---");
  parts.push(BKALUT_FOOTER);
  return parts.join("\n").trim();
}

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section className="space-y-2" data-testid={`section-${testId}`}>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
        {title}
      </h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function LongText({ text, testId }: { text: string; testId: string }) {
  if (!text) return <p className="text-muted-foreground italic text-sm">אין מידע במאגר</p>;
  return (
    <div className="whitespace-prewrap leading-relaxed text-foreground" data-testid={`text-${testId}`}>
      {renderWithLinks(text)}
    </div>
  );
}

function JsonBlock({ raw, testId }: { raw: string; testId: string }) {
  if (!raw) return null;
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    /* leave raw */
  }
  return (
    <pre
      className="text-[12px] leading-relaxed bg-muted/60 rounded-md p-3 overflow-x-auto font-mono whitespace-pre-wrap break-all border border-border"
      dir="ltr"
      data-testid={`json-${testId}`}
    >
      {pretty}
    </pre>
  );
}

function VoiceScriptBlock({
  title,
  raw,
  testIdRaw,
  testIdSafe,
  copyTestId,
  tall = false,
}: {
  title: string;
  raw: string;
  testIdRaw: string;
  testIdSafe: string;
  copyTestId: string;
  tall?: boolean;
}) {
  const safe = useMemo(() => toTtsSafeHebrew(raw), [raw]);
  const [showRaw, setShowRaw] = useState(false);
  const heightCls = tall ? "max-h-96 overflow-y-auto" : "";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw((v) => !v)}
            data-testid={`toggle-${copyTestId}`}
          >
            {showRaw ? "הצג גרסה להקראה" : "הצג מקור מהמאגר"}
          </Button>
          <CopyButton
            text={showRaw ? raw : safe}
            label={showRaw ? "העתק מקור" : "העתק להקראה"}
            testId={copyTestId}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {showRaw
          ? "מקור מהמאגר. עשוי להכיל מספרים בספרות שמערכות הקראה בעברית עלולות לקרוא לא נכון."
          : "גרסה מותאמת להקראה אוטומטית: סכומים, אחוזים ושנים הומרו למילים בעברית. הנתונים במאגר ובכל ה-API לא משתנים."}
      </p>
      {showRaw ? (
        <div
          className={`text-sm whitespace-prewrap leading-relaxed bg-muted/40 rounded-md p-3 border border-border ${heightCls}`}
          data-testid={testIdRaw}
        >
          {raw}
        </div>
      ) : (
        <div
          className={`text-sm whitespace-prewrap leading-relaxed bg-muted/40 rounded-md p-3 border border-border ${heightCls}`}
          data-testid={testIdSafe}
        >
          {safe}
        </div>
      )}
    </div>
  );
}

function DownloadTextButton({ text, filename }: { text: string; filename: string }) {
  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={download} data-testid={`button-download-${filename}`}>
      <Download className="w-4 h-4 ml-1" />
      הורדה
    </Button>
  );
}

interface ParsedQuestion {
  id: string;
  text: string;
  help?: string;
  weight: number;
}

function normalizeQuestions(raw: string): ParsedQuestion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : Array.isArray(parsed?.items)
          ? parsed.items
          : Array.isArray(parsed?.fields)
            ? parsed.fields
            : [];
    return list
      .map((q: any, index: number) => ({
        id: String(q.id ?? q.key ?? q.name ?? `q_${index + 1}`),
        text: String(q.question ?? q.label ?? q.text ?? q["שאלה"] ?? q.title ?? "").trim(),
        help: q.help ?? q.description ?? q["הסבר"],
        weight: (() => {
          const n = Number(q.weight ?? q.score ?? 1);
          return Number.isFinite(n) ? n : 1;
        })(),
      }))
      .filter((q: ParsedQuestion) => q.text);
  } catch {
    return [];
  }
}

function EligibilityDigitalForm({ row }: { row: RightRow }) {
  const questions = useMemo(() => normalizeQuestions(row.eligibilityJson), [row.eligibilityJson]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!questions.length) {
    return (
      <Card className="p-5 bg-card border border-card-border space-y-2" data-testid="card-digital-form-empty">
        <h2 className="text-base font-semibold">טופס זכאות דיגיטלי</h2>
        <p className="text-sm text-muted-foreground">
          עדיין אין שאלות JSON מסודרות לנושא הזה. ניתן לערוך את שדה “שאלות לבדיקת זכאות (JSON)” ואז הטופס ייווצר אוטומטית.
        </p>
      </Card>
    );
  }

  const maxScore = questions.reduce((sum, q) => sum + q.weight, 0);
  const yesScore = questions.reduce((sum, q) => sum + (answers[q.id] === "yes" ? q.weight : 0), 0);
  const answered = questions.filter((q) => answers[q.id]).length;
  const ratio = maxScore > 0 ? yesScore / maxScore : 0;
  const level = answered === 0 ? "טרם מולא" : ratio >= 0.67 ? "נראה שיש כיוון חזק לבדיקה" : ratio >= 0.34 ? "יש כיוון חלקי שדורש בדיקה" : "כרגע נראה שההתאמה חלשה";

  return (
    <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-digital-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">טופס זכאות דיגיטלי לפי השאלות במאגר</h2>
          <p className="text-xs text-muted-foreground mt-1">
            זה כלי סינון ראשוני בלבד. הוא עוזר להבין אם כדאי לפתוח בדיקה, ולא מחליף בדיקת זכאות מלאה מול התנאים והמסמכים.
          </p>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-semibold">{level}</span>
          <span className="text-muted-foreground mr-2">({yesScore}/{maxScore})</span>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-3" data-testid={`question-${q.id}`}>
            <p className="text-sm font-medium">
              {index + 1}. {q.text}
            </p>
            {q.help && <p className="text-xs text-muted-foreground mt-1">{q.help}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                ["yes", "כן"],
                ["no", "לא"],
                ["unknown", "לא יודע/ת"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={answers[q.id] === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                  data-testid={`answer-${q.id}-${value}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EditRightCard({ row }: { row: RightRow }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    OFFICE_FIELDS.forEach(([key]) => {
      next[key] = fieldValue(row, key);
    });
    setValues(next);
  }, [row]);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/rights/${row.id}`, values);
      return (await response.json()) as RightRow;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/rights", String(row.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["/api/rights"] });
      toast({ title: "נשמר", description: "הנושא עודכן ונשמר בקובץ המאגר." });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: "שגיאה בשמירה", description: error instanceof Error ? error.message : "לא ניתן לשמור", variant: "destructive" });
    },
  });

  return (
    <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-edit-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">עריכת כל פרטי הנושא</h2>
          <p className="text-xs text-muted-foreground mt-1">
            העריכה נשמרת חזרה לקובץ המאגר של האתר. מומלץ לערוך בזהירות ולא למחוק מקורות או שאלוני JSON.
          </p>
        </div>
        <Button type="button" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)} data-testid="button-toggle-edit">
          <Edit3 className="w-4 h-4 ml-1" />
          {open ? "סגור עריכה" : "פתח עריכה"}
        </Button>
      </div>

      {open && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            {OFFICE_FIELDS.map(([key, label, size]) => (
              <label key={key} className={size === "long" ? "md:col-span-2 space-y-1" : "space-y-1"}>
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                {size === "short" ? (
                  <Input
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    data-testid={`input-edit-${key}`}
                  />
                ) : (
                  <Textarea
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="min-h-28 leading-relaxed"
                    data-testid={`textarea-edit-${key}`}
                  />
                )}
              </label>
            ))}
          </div>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} data-testid="button-save-right">
            <Save className="w-4 h-4 ml-1" />
            {mutation.isPending ? "שומר..." : "שמור שינויים במאגר"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function SectionedCopyCard({ row }: { row: RightRow }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(COPY_SECTIONS.map((s) => s.key)),
  );

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copySection(section: SectionDef) {
    const body = section.build(row).trim();
    const text = body
      ? `${sectionHeader(section.label)}\n${body}\n\n---\n${BKALUT_FOOTER}`
      : "";
    if (!text) {
      toast({ title: "אין תוכן בקטע הזה", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "הקטע הועתק", description: section.label });
    } catch {
      toast({ title: "לא הצלחנו להעתיק", variant: "destructive" });
    }
  }

  const combined = buildSectionedCopy(row, selected);

  return (
    <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-sectioned-copy">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">העתקה לפי קטעים — לשימוש פנימי</h2>
          <p className="text-xs text-muted-foreground mt-1">
            סמן/י את הקטעים שברצונך לכלול בהעתקה הכוללת, או הקש/י העתקה לכל קטע בנפרד. הטקסט שמועתק לא כולל טקסט שיווקי
            מהאתר הציבורי.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {COPY_SECTIONS.map((section) => {
          const hasContent = section.build(row).trim().length > 0;
          const checked = selected.has(section.key);
          return (
            <div
              key={section.key}
              className="rounded-md border border-border bg-muted/20 p-3 flex items-start justify-between gap-3"
              data-testid={`section-copy-${section.key}`}
            >
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(section.key)}
                  disabled={!hasContent}
                  data-testid={`checkbox-section-${section.key}`}
                />
                <div>
                  <div className="text-sm font-semibold text-[hsl(210_60%_30%)]">{section.label}</div>
                  {!hasContent && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">אין מידע בקטע הזה.</div>
                  )}
                </div>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!hasContent}
                onClick={() => copySection(section)}
                data-testid={`button-copy-section-${section.key}`}
              >
                <Copy className="w-3.5 h-3.5 ml-1" />
                העתק
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={combined} label="העתקת הקטעים שנבחרו" testId="copy-sectioned-combined" variant="default" />
        <span className="text-[11px] text-muted-foreground">
          ההעתקה כוללת כותרות עם מפרידים ברורים בסיום: {BKALUT_FOOTER}
        </span>
      </div>
    </Card>
  );
}

function ReminderTemplateCard({ row }: { row: RightRow }) {
  const template = useMemo(() => reminderTemplateFor(row), [row]);
  const link = `${getPublicOrigin()}/#/r/${row.id}`;
  return (
    <Card className="p-5 bg-amber-50/50 border border-amber-200 space-y-3" data-testid="card-reminder-template">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">נוסח תזכורת ללקוח</h2>
          <p className="text-xs text-muted-foreground mt-1">
            לשליחה בוואטסאפ / מייל / SMS. הקישור מפנה את הלקוח למסך עדכון סטטוס פומבי שמתעד את התשובה אצלנו.
          </p>
        </div>
      </div>
      <pre
        className="text-sm whitespace-pre-wrap leading-relaxed bg-white rounded-md p-3 border border-amber-200 font-sans"
        data-testid="text-reminder-template"
      >
        {template}
      </pre>
      <div className="flex flex-wrap gap-2 items-center">
        <CopyButton text={template} label="העתק נוסח תזכורת" testId="copy-reminder-template" variant="default" />
        <CopyButton text={link} label="העתק רק קישור התזכורת" testId="copy-reminder-link" variant="outline" />
        <Button asChild variant="ghost" size="sm" data-testid="link-reminder-preview">
          <a href={`#/r/${row.id}`} target="_blank" rel="noreferrer">
            <Sparkles className="w-4 h-4 ml-1" />
            תצוגה מקדימה
          </a>
        </Button>
      </div>
    </Card>
  );
}

export default function RightDetail() {
  const [, params] = useRoute("/rights/:id");
  const id = params?.id;
  const { data: row, isLoading } = useQuery<RightRow>({
    queryKey: ["/api/rights", id],
    enabled: !!id,
  });

  const publicCopy = row ? buildCopyText(row, "public") : "";
  const officeCopy = row ? buildCopyText(row, "office") : "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!row) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">לא נמצא במאגר</p>
        <Link href="/rights" className="text-primary text-sm mt-3 inline-block">
          חזרה לרשימת הזכויות
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-6 pb-12" data-testid="page-right-detail">
      <div>
        <Link href="/rights" data-testid="link-back-to-rights" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-3.5 h-3.5" />
          חזרה לרשימת הזכויות
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge kind="right" />
          <HaredinessBadge value={row.haredi} />
          {row.priority && (
            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground tabular-nums">
              עדיפות {row.priority}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground" data-testid="text-detail-category">
            {row.category}
            {row.subCategory ? ` · ${row.subCategory}` : ""}
          </p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-1" data-testid="text-detail-topic">
            {row.topic}
          </h1>
        </div>
      </header>

      <Card className="p-5 bg-primary/5 border border-primary/20" data-testid="card-copy-modes">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold">העתקה והורדה לפי שימוש</h2>
            <p className="text-sm text-foreground/75 mt-1">
              “העתקה לפרסום” כוללת רק שדות שמיועדים לציבור. “העתקה לשימוש משרד” כוללת גם עלות שירות, מסמכים, נוסחים, JSON, פודקאסט ומידע לסוכן AI.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <CopyButton text={publicCopy} label="העתקה לפרסום" testId="copy-public-mode" variant="default" />
              <DownloadTextButton text={publicCopy} filename={`bkalut-public-${row.id}.txt`} />
              <CopyButton text={officeCopy} label="העתקה לשימוש משרד" testId="copy-office-mode" variant="secondary" />
              <DownloadTextButton text={officeCopy} filename={`bkalut-office-${row.id}.txt`} />
              <Button asChild variant="outline" size="sm" data-testid="link-service-form">
                <Link href={`/service/${row.id}`}>
                  טופס שירות ללקוח
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <EditRightCard row={row} />

      <SectionedCopyCard row={row} />

      <ReminderTemplateCard row={row} />

      {row.goldTip && (
        <Card
          className="p-4 bg-[hsl(42_75%_94%)] border border-[hsl(42_60%_78%)]"
          data-testid="card-gold-tip"
        >
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-[hsl(42_80%_38%)] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[hsl(22_60%_28%)] uppercase tracking-wider mb-1">
                טיפ זהב של בקלות
              </p>
              <p className="text-sm leading-relaxed whitespace-prewrap">{row.goldTip}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 space-y-6 bg-card border border-card-border">
          <Section title="גוף מטפל" testId="treating-body">
            <LongText text={row.treatingBody} testId="treating-body" />
          </Section>
          <Section title="קהל יעד" testId="audience">
            <LongText text={row.audience} testId="audience" />
          </Section>
          <Section title="מה ניתן לקבל בפועל וסוג התשלום" testId="what-received">
            <LongText text={row.whatReceived} testId="what-received" />
          </Section>
          <Section title="תנאי זכאות" testId="eligibility">
            <LongText text={row.eligibility} testId="eligibility" />
          </Section>
          <Section title="מקרים שמזכים / לא מזכים" testId="qualifying-cases">
            <LongText text={row.qualifyingCases} testId="qualifying-cases" />
          </Section>
          <Section title="מה צריך להכין מראש" testId="preparation">
            <LongText text={row.preparation} testId="preparation" />
          </Section>
          <Section title="מסמכים שצריך לצרף" testId="documents">
            <LongText text={row.documents} testId="documents" />
          </Section>
          <Section title="איך מגישים בפועל" testId="how-to-apply">
            <LongText text={row.howToApply} testId="how-to-apply" />
          </Section>
          <Section title="קישורים וטפסים רשמיים" testId="links">
            <LongText text={row.officialLinks} testId="links" />
          </Section>
          {row.faq && (
            <Section title="שאלות נפוצות" testId="faq">
              <LongText text={row.faq} testId="faq" />
            </Section>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5 bg-card border border-card-border" data-testid="card-cost">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              עלות שירות בקלות
            </h3>
            <p className="text-sm whitespace-prewrap leading-relaxed" data-testid="text-cost">
              {row.bkalutCost || "—"}
            </p>
          </Card>

          {row.publicSiteText && (
            <Card className="p-5 bg-card border border-card-border" data-testid="card-public-text">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  הסבר פשוט לפרסום באתר
                </h3>
                <CopyButton text={row.publicSiteText} label="העתק" testId="copy-public-text" />
              </div>
              <p className="text-sm whitespace-prewrap leading-relaxed line-clamp-[10]">
                {row.publicSiteText}
              </p>
            </Card>
          )}

          <Card className="p-5 bg-card border border-card-border" data-testid="card-quick-copy">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              העתקות מהירות ללקוח
            </h3>
            <div className="flex flex-col gap-2">
              {row.emailScript && <CopyButton text={row.emailScript} label="העתק נוסח מייל / הודעה תכלס" testId="copy-email" variant="default" size="default" />}
              {row.voiceShort && <CopyButton text={toTtsSafeHebrew(row.voiceShort)} label="העתק הודעה קולית קצרה (מותאם להקראה)" testId="copy-voice" variant="secondary" size="default" />}
              {row.publicSiteText && <CopyButton text={row.publicSiteText} label="העתק טקסט לאתר הציבורי" testId="copy-public" variant="outline" size="default" />}
              {!row.emailScript && !row.voiceShort && !row.publicSiteText && (
                <p className="text-xs text-muted-foreground italic">אין במאגר נוסחים מוכנים לזכות הזו.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <EligibilityDigitalForm row={row} />

      {(row.emailScript || row.voiceShort || row.podcastScript) && (
        <Card className="p-5 bg-card border border-card-border space-y-6" data-testid="card-scripts">
          <h2 className="text-base font-semibold">נוסחים מוכנים לצוות</h2>
          {row.emailScript && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground/80">נוסח מייל / הודעה תכלס ללקוח</h3>
                <CopyButton text={row.emailScript} label="העתק" testId="copy-email-2" />
              </div>
              <div className="text-sm whitespace-prewrap leading-relaxed bg-muted/40 rounded-md p-3 border border-border" data-testid="text-email-script">{row.emailScript}</div>
            </div>
          )}
          {row.voiceShort && (
            <VoiceScriptBlock
              title="הודעה קולית קצרה ללקוח"
              raw={row.voiceShort}
              testIdRaw="text-voice-short"
              testIdSafe="text-voice-short-tts"
              copyTestId="copy-voice-2"
            />
          )}
          {row.podcastScript && (
            <VoiceScriptBlock
              title="נוסח פודקאסט / מערכת קולית ארוך"
              raw={row.podcastScript}
              testIdRaw="text-podcast"
              testIdSafe="text-podcast-tts"
              copyTestId="copy-podcast"
              tall
            />
          )}
        </Card>
      )}

      {(row.aiSearch || row.aiExtra) && (
        <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-ai">
          <h2 className="text-base font-semibold">מידע לסוכן AI ולחיפוש</h2>
          {row.aiSearch && (
            <Section title="מילות חיפוש (AI)" testId="ai-search">
              <p className="text-sm whitespace-prewrap leading-relaxed text-foreground/85" data-testid="text-ai-search">{row.aiSearch}</p>
            </Section>
          )}
          {row.aiExtra && (
            <Section title="מידע נוסף לסוכן AI" testId="ai-extra">
              <p className="text-sm whitespace-prewrap leading-relaxed text-foreground/85" data-testid="text-ai-extra">{row.aiExtra}</p>
            </Section>
          )}
        </Card>
      )}

      {(row.eligibilityJson || row.intakeJson || row.documentsJson) && (
        <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-json">
          <h2 className="text-base font-semibold">שאלונים מובנים (JSON)</h2>
          {row.eligibilityJson && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80">שאלות לבדיקת זכאות</h3>
              <JsonBlock raw={row.eligibilityJson} testId="eligibility" />
            </div>
          )}
          {row.intakeJson && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80">שאלון פרטני</h3>
              <JsonBlock raw={row.intakeJson} testId="intake" />
            </div>
          )}
          {row.documentsJson && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80">מסמכים נדרשים בטופס</h3>
              <JsonBlock raw={row.documentsJson} testId="documents" />
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-start">
        <Button asChild variant="outline" data-testid="button-back-bottom">
          <Link href="/rights">
            <ArrowRight className="w-4 h-4 ml-1" />
            חזרה לרשימת הזכויות
          </Link>
        </Button>
      </div>
    </article>
  );
}
