import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Search, UserRoundCheck } from "lucide-react";

interface SubmissionRow {
  id: number;
  createdAt: string;
  clientId: number;
  fullName: string;
  phone: string;
  email: string;
  idNumber: string;
  birthDate: string;
  familyStatus: string;
  city: string;
  rightId: number;
  topic: string;
  category: string;
  requestType: string;
  potentialPercent: number;
  potentialLevel: string;
  answersJson: string;
  detailsJson: string;
  documentsJson: string;
  additionalTopicsJson: string;
  webhookStatus: string;
  webhookResponse: string;
  webhookSentAt: string;
}

const REQUEST_LABELS: Record<string, string> = {
  info: "מידע בלבד",
  reminder: "תזכורת לביצוע",
  treatment: "טיפול בפועל",
};

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function parseAdditionalTopics(json: string): Array<{ id: number; topic: string; category: string }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const KNOWN_DETAIL_KEYS = new Set(["full_name", "phone", "email", "id_number", "birth_date", "family_status", "city"]);

function parseExtraDetails(json: string): Array<[string, string]> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        !KNOWN_DETAIL_KEYS.has(entry[0]) && typeof entry[1] === "string" && entry[1].trim().length > 0,
    );
  } catch {
    return [];
  }
}

function toCsv(rows: SubmissionRow[]) {
  const headers = [
    "מספר פנייה",
    "תאריך",
    "שם מלא",
    "טלפון",
    "מייל",
    "תעודת זהות",
    "תאריך לידה",
    "מצב משפחתי",
    "עיר",
    "נושא",
    "קטגוריה",
    "סוג פנייה",
    "רמת פוטנציאל",
    "אחוז פוטנציאל",
    "סטטוס שליחה ל-n8n",
    "תאריך שליחה ל-n8n",
  ];
  const body = rows.map((row) => [
    row.id,
    formatDate(row.createdAt),
    row.fullName,
    row.phone,
    row.email,
    row.idNumber,
    row.birthDate,
    row.familyStatus,
    row.city,
    row.topic,
    row.category,
    REQUEST_LABELS[row.requestType] ?? row.requestType,
    row.potentialLevel,
    row.potentialPercent,
    row.webhookStatus,
    row.webhookSentAt ? formatDate(row.webhookSentAt) : "",
  ]);
  return [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export default function SubmissionsPage() {
  const { data: rows = [], isLoading } = useQuery<SubmissionRow[]>({ queryKey: ["/api/crm/submissions"] });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.fullName, row.phone, row.email, row.topic, row.category, row.potentialLevel, row.webhookStatus, REQUEST_LABELS[row.requestType]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q, rows]);

  function downloadCsv() {
    const blob = new Blob(["\ufeff" + toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bkalut-service-submissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5" data-testid="page-submissions">
      <Card className="p-5 border border-card-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">מסד נתונים לפניות שנכנסו מטפסי השירות</p>
            <h1 className="text-xl font-bold mt-1 flex items-center gap-2">
              <UserRoundCheck className="w-5 h-5 text-primary" />
              לקוחות ופניות
            </h1>
            <p className="text-sm text-foreground/70 mt-2 max-w-3xl">
              כאן נשמרים נושא הזכות, רמת הפוטנציאל, סוג הבקשה, שם מלא, טלפון, מייל, ואם מולאו גם תעודת זהות, תאריך לידה ומצב משפחתי.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={downloadCsv} data-testid="button-download-submissions">
            <Download className="w-4 h-4 ml-1" />
            הורדת CSV
          </Button>
        </div>
      </Card>

      <Card className="p-4 border border-card-border bg-card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון, מייל, נושא, קטגוריה או רמת פוטנציאל"
            className="pr-9"
            data-testid="input-search-submissions"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((row) => (
            <Card key={row.id} className="p-4 border border-card-border bg-card" data-testid={`card-submission-${row.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{row.fullName || "לקוח ללא שם"}</h2>
                    <Badge variant={row.requestType === "treatment" ? "default" : "secondary"}>
                      {REQUEST_LABELS[row.requestType] ?? row.requestType}
                    </Badge>
                    <Badge variant="outline">{row.potentialLevel} · {row.potentialPercent}%</Badge>
                    <Badge variant={row.webhookStatus === "sent" ? "default" : "destructive"}>
                      n8n: {row.webhookStatus === "sent" ? "נשלח" : row.webhookStatus === "pending" ? "ממתין" : "נכשל"}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/75">{row.topic}</p>
                  <p className="text-xs text-muted-foreground">{row.category} · פנייה #{row.id} · {formatDate(row.createdAt)}</p>
                </div>
                <Button asChild variant="outline" size="sm" data-testid={`link-right-${row.rightId}`}>
                  <Link href={`/rights/${row.rightId}`}>
                    לפתיחת הנושא
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Link>
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-2 mt-4 text-xs">
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">טלפון: </span><span dir="ltr">{row.phone}</span></div>
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">מייל: </span><span dir="ltr">{row.email}</span></div>
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">ת. זהות: </span>{row.idNumber || "לא מולא"}</div>
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">תאריך לידה: </span>{row.birthDate || "לא מולא"}</div>
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">מצב משפחתי: </span>{row.familyStatus || "לא מולא"}</div>
                <div className="rounded-md bg-muted/30 p-2"><span className="text-muted-foreground">עיר: </span>{row.city || "לא מולא"}</div>
                <div className="rounded-md bg-muted/30 p-2 md:col-span-3">
                  <span className="text-muted-foreground">אוטומציה: </span>
                  {row.webhookStatus === "sent" ? `נשלח ל-n8n ${row.webhookSentAt ? `ב-${formatDate(row.webhookSentAt)}` : ""}` : row.webhookResponse || "טרם נשלח"}
                </div>
                {parseAdditionalTopics(row.additionalTopicsJson).length > 0 && (
                  <div className="rounded-md bg-muted/30 p-2 md:col-span-3" data-testid={`row-additional-topics-${row.id}`}>
                    <span className="text-muted-foreground">נושאים נוספים שנבדקו באותה פנייה: </span>
                    {parseAdditionalTopics(row.additionalTopicsJson).map((t) => t.topic).filter(Boolean).join(", ")}
                  </div>
                )}
                {parseExtraDetails(row.detailsJson).length > 0 && (
                  <div className="rounded-md bg-muted/30 p-2 md:col-span-3" data-testid={`row-extra-details-${row.id}`}>
                    <span className="text-muted-foreground">פרטים נוספים מהשאלון: </span>
                    {parseExtraDetails(row.detailsJson).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center border border-card-border bg-card">
          <p className="font-medium">אין פניות להצגה</p>
          <p className="text-sm text-muted-foreground mt-2">ברגע שלקוח ישלח טופס שירות, הפנייה תופיע כאן.</p>
        </Card>
      )}
    </div>
  );
}
