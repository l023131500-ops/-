/**
 * Admin advanced matcher / AI-like profile search.
 *
 * Pastable free-text OR full JSON profile -> ranked rights with reason,
 * matched signals, score and potential level. Deterministic / rule-based —
 * no LLM (no key support required). Results can be copied as text or JSON.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AdminGate } from "@/components/admin-gate";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  ClipboardCopy,
  Download,
  AlertTriangle,
  ArrowLeft,
  ListChecks,
  Wand2,
  CheckCircle2,
} from "lucide-react";

interface MatchHit {
  rightId: number;
  topic: string;
  category: string;
  subCategory: string;
  audience: string;
  publicSiteText: string;
  eligibilitySnippet: string;
  serviceUrl: string;
  haredi: string;
  score: number;
  potentialScore: number;
  potentialLevel: "גבוה" | "בינוני" | "נמוך";
  matchedSignals: string[];
  matchedKeywords: string[];
  reason: string;
}

interface ParsedProfile {
  age?: number;
  familyStatus?: string;
  childrenCount?: number;
  income?: number;
  hasDisability?: boolean;
  hasHealthIssue?: boolean;
  employment?: string;
  housing?: string;
  hasBusiness?: boolean;
  hasPension?: boolean;
  holocaustSurvivor?: boolean;
  student?: boolean;
  oleh?: boolean;
  signals: Array<{ key: string; label: string; weight: number; severity?: string }>;
}

interface MatchResponse {
  ok: boolean;
  profile: ParsedProfile;
  hits: MatchHit[];
  counts: { total: number; high: number; medium: number; low: number };
}

const SAMPLE_TEXT =
  "אברך עם 5 ילדים, גיל 34, מתגורר בשכירות בבני ברק, הכנסה חודשית 6500 ש\"ח, " +
  "אישתו עובדת חלקית, ילד עם אבחון לקות שמיעה, חוב בבנק 35,000 ש\"ח, " +
  "ההורים שלו ניצולי שואה.";

const SAMPLE_JSON = JSON.stringify(
  {
    age: 34,
    familyStatus: "נשוי",
    childrenCount: 5,
    monthlyIncome: 6500,
    disability: false,
    health: true,
    employment: "אברך",
    housing: "שכירות",
    business: false,
    pension: false,
    holocaustSurvivor: false,
    student: true,
    oleh: false,
    city: "בני ברק",
    notes: "ילד עם לקות שמיעה, ההורים ניצולי שואה",
  },
  null,
  2,
);

function levelBadgeVariant(level: MatchHit["potentialLevel"]) {
  if (level === "גבוה") return "default" as const;
  if (level === "בינוני") return "secondary" as const;
  return "outline" as const;
}

function levelEmoji(level: MatchHit["potentialLevel"]) {
  if (level === "גבוה") return "🟢";
  if (level === "בינוני") return "🟡";
  return "⚪";
}

function AdvancedMatchInner() {
  const [text, setText] = useState<string>(SAMPLE_TEXT);
  const [jsonText, setJsonText] = useState<string>("");
  const [mode, setMode] = useState<"text" | "json">("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<MatchResponse | null>(null);

  async function runMatch() {
    setBusy(true);
    setError(null);
    try {
      let bodyPayload: Record<string, unknown> = {};
      if (mode === "json") {
        const t = jsonText.trim();
        if (!t) { setError("הדבק JSON או עבור למצב טקסט חופשי"); setBusy(false); return; }
        try {
          const parsed = JSON.parse(t);
          if (!parsed || typeof parsed !== "object") throw new Error("not object");
          bodyPayload.profile = parsed;
        } catch {
          setError("ה-JSON של הפרופיל לא תקין");
          setBusy(false);
          return;
        }
      } else {
        if (!text.trim()) { setError("הקלד תיאור מצב הלקוח לפני הרצה"); setBusy(false); return; }
        bodyPayload.text = text;
      }
      bodyPayload.maxResults = 25;
      const r = await apiRequest("POST", "/api/admin/advanced-match", bodyPayload);
      const data: MatchResponse = await r.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "הרצה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function loadSampleText() { setMode("text"); setText(SAMPLE_TEXT); }
  function loadSampleJson() { setMode("json"); setJsonText(SAMPLE_JSON); }

  const copyText = useMemo(() => {
    if (!response) return "";
    const lines: string[] = [];
    lines.push("חיפוש מתוחכם — תוצאות התאמה");
    lines.push(`סה\"כ ${response.counts.total} | גבוה ${response.counts.high} | בינוני ${response.counts.medium} | נמוך ${response.counts.low}`);
    lines.push("");
    response.hits.forEach((h, i) => {
      lines.push(`${i + 1}. ${h.topic}`);
      lines.push(`   קטגוריה: ${h.category}${h.subCategory ? " · " + h.subCategory : ""}`);
      lines.push(`   פוטנציאל: ${h.potentialLevel} (${h.potentialScore}/100, ציון ${h.score})`);
      if (h.matchedSignals.length) lines.push(`   סיגנלים: ${h.matchedSignals.join(", ")}`);
      if (h.matchedKeywords.length) lines.push(`   מילים: ${h.matchedKeywords.slice(0, 6).join(", ")}`);
      if (h.eligibilitySnippet) lines.push(`   זכאות: ${h.eligibilitySnippet}`);
      lines.push(`   קישור פנימי: /#/rights/${h.rightId}`);
      if (h.serviceUrl) lines.push(`   קישור שירות ציבורי: ${h.serviceUrl}`);
      lines.push("");
    });
    return lines.join("\n");
  }, [response]);

  async function handleCopy() {
    try { await navigator.clipboard.writeText(copyText); } catch {}
  }
  function handleDownloadJson() {
    if (!response) return;
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bkalut-advanced-match-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const profileSummary = response?.profile;
  return (
    <div dir="rtl" className="space-y-6" data-testid="page-advanced-match">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
          <Badge variant="secondary" className="text-[11px]">חיפוש מתוחכם</Badge>
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" /> חיפוש מתוחכם — התאמת זכויות לפי פרופיל
        </h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          הדביקו פרופיל לקוח כטקסט חופשי (עברית/אנגלית) או כ-JSON מובנה. המערכת מחשבת
          התאמה דטרמיניסטית מבוססת חוקים על פני כל שדות המאגר (categories, publicSiteText,
          eligibility, audience, aiSearch, aiExtra, documents) ומחזירה רשימה של זכויות
          פוטנציאליות עם סיבה, סיגנלים, ציון ורמת פוטנציאל. אין כאן LLM — אין הבטחת AI מזויפת.
        </p>
      </header>

      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card className="p-5 space-y-4" data-testid="card-input">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("text")}
                data-testid="button-mode-text"
              >טקסט חופשי</Button>
              <Button
                type="button"
                variant={mode === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("json")}
                data-testid="button-mode-json"
              >JSON פרופיל</Button>
            </div>
            <div className="flex gap-2 text-xs">
              <Button type="button" variant="ghost" size="sm" onClick={loadSampleText} data-testid="button-sample-text">דוגמה — טקסט</Button>
              <Button type="button" variant="ghost" size="sm" onClick={loadSampleJson} data-testid="button-sample-json">דוגמה — JSON</Button>
            </div>
          </div>

          {mode === "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="text-area">תיאור מצב הלקוח</Label>
              <Textarea
                id="text-area"
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="למשל: אישה גרושה עם 3 ילדים, גיל 42, מקבלת הבטחת הכנסה, גרה בשכירות..."
                data-testid="textarea-free-text"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                ניתן לפרט גיל, מצב משפחתי, ילדים, הכנסה, נכות/בריאות, תעסוקה, דיור, עסק/עצמאי,
                פנסיה, ניצולי שואה, סטודנט/אברך, עולה חדש וכל מידע רלוונטי נוסף.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="json-area">JSON פרופיל מלא</Label>
              <Textarea
                id="json-area"
                rows={14}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"age":34,"familyStatus":"נשוי","childrenCount":5,"monthlyIncome":6500,...}'
                className="font-mono text-xs"
                dir="ltr"
                data-testid="textarea-json"
              />
              <p className="text-xs text-muted-foreground">
                שדות נתמכים: age, familyStatus, childrenCount, monthlyIncome, disability, health, employment,
                housing, business, pension, holocaustSurvivor, student, oleh, city, notes. כל שדה לא חובה.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button
              type="button"
              onClick={runMatch}
              disabled={busy}
              className="gap-2"
              data-testid="button-run-match"
            >
              <Sparkles className="w-4 h-4" /> {busy ? "מחפש..." : "הרץ חיפוש מתוחכם"}
            </Button>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-3" data-testid="card-parsed-profile">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">פרופיל מזוהה</h2>
          </div>
          {!profileSummary ? (
            <p className="text-xs text-muted-foreground">
              לאחר ההרצה — נציג כאן את הסיגנלים שזוהו: גיל, מצב משפחתי, מספר ילדים, הכנסה,
              נכות/בריאות, תעסוקה, דיור, עסק, פנסיה, ניצולי שואה, סטודנט/אברך ועוד.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <ProfileField label="גיל" value={profileSummary.age?.toString()} />
              <ProfileField label="מצב משפחתי" value={profileSummary.familyStatus} />
              <ProfileField label="ילדים" value={profileSummary.childrenCount?.toString()} />
              <ProfileField label="הכנסה חודשית" value={profileSummary.income ? `${profileSummary.income} ש"ח` : undefined} />
              <ProfileField label="תעסוקה" value={profileSummary.employment} />
              <ProfileField label="דיור" value={profileSummary.housing} />
              <ProfileBool label="נכות / מוגבלות" value={profileSummary.hasDisability} />
              <ProfileBool label="סוגיית בריאות" value={profileSummary.hasHealthIssue} />
              <ProfileBool label="עוסק / עצמאי" value={profileSummary.hasBusiness} />
              <ProfileBool label="פנסיה / קרנות" value={profileSummary.hasPension} />
              <ProfileBool label="ניצול/ת שואה" value={profileSummary.holocaustSurvivor} />
              <ProfileBool label="סטודנט/אברך" value={profileSummary.student} />
              <ProfileBool label="עולה חדש" value={profileSummary.oleh} />
              {profileSummary.signals?.length ? (
                <div className="pt-2 border-t border-border">
                  <div className="text-[11px] uppercase text-muted-foreground mb-1">סיגנלים מחושבים</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profileSummary.signals.map((s) => (
                      <Badge key={s.key} variant={s.severity === "high" ? "default" : "secondary"} className="text-[11px]">
                        {s.label} · {s.weight}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      {response && (
        <>
          <Separator />
          <section className="space-y-4" data-testid="section-results">
            <Card className="p-4 border border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3" data-testid="card-summary">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold">תוצאות חיפוש מתוחכם</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{response.counts.total} זכויות פוטנציאליות</Badge>
                <Badge variant="default">{response.counts.high} פוטנציאל גבוה</Badge>
                <Badge variant="secondary">{response.counts.medium} בינוני</Badge>
                <Badge variant="outline">{response.counts.low} נמוך</Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleCopy} className="gap-1" data-testid="button-copy">
                  <ClipboardCopy className="w-3.5 h-3.5" /> העתק טקסט
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleDownloadJson} className="gap-1" data-testid="button-download">
                  <Download className="w-3.5 h-3.5" /> הורד JSON
                </Button>
              </div>
            </Card>

            {response.hits.length === 0 ? (
              <Card className="p-8 text-center" data-testid="card-empty">
                <AlertTriangle className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">לא נמצאה התאמה</p>
                <p className="text-sm text-muted-foreground mt-1">נסה להוסיף עוד פרטים על הלקוח: גיל, מצב משפחתי, הכנסה, מצב בריאות וכו'.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {response.hits.map((hit) => (
                  <HitCard key={hit.rightId} hit={hit} />
                ))}
              </div>
            )}

            <Card className="p-4 border border-yellow-500/30 bg-yellow-500/5" data-testid="card-disclaimer">
              <div className="flex gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">
                  התאמה כאן אומרת "כדאי לבדוק" — לא "הלקוח זכאי". ההחלטה נקבעת על פי תנאי
                  הזכאות, המסמכים והגשת הבקשה מול הגוף המטפל. החיפוש דטרמיניסטי ומבוסס חוקים,
                  בלי שימוש ב-LLM.
                </p>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ProfileBool({ label, value }: { label: string; value?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
      <span>{label}</span>
    </div>
  );
}

function HitCard({ hit }: { hit: MatchHit }) {
  return (
    <Card className="p-4 hover-elevate" data-testid={`hit-${hit.rightId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant={levelBadgeVariant(hit.potentialLevel)} className="text-[11px]">
              פוטנציאל {hit.potentialLevel} {levelEmoji(hit.potentialLevel)}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {hit.category}{hit.subCategory ? " · " + hit.subCategory : ""}
            </span>
          </div>
          <h3 className="font-semibold text-base leading-snug" data-testid={`hit-title-${hit.rightId}`}>{hit.topic}</h3>
          {hit.audience && (
            <p className="text-xs text-muted-foreground mt-0.5">קהל יעד: {hit.audience.slice(0, 160)}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge variant="outline" className="tabular-nums text-[11px]">{hit.potentialScore}/100</Badge>
          <Badge variant="outline" className="tabular-nums text-[11px]">ציון {hit.score}</Badge>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90 mb-2">{hit.reason}</p>

      {hit.matchedSignals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hit.matchedSignals.map((s) => (
            <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
          ))}
        </div>
      )}
      {hit.matchedKeywords.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">מילים: </span>{hit.matchedKeywords.slice(0, 8).join(", ")}
        </div>
      )}
      {hit.eligibilitySnippet && (
        <div className="text-xs text-muted-foreground mt-2">
          <span className="font-medium">זכאות: </span>{hit.eligibilitySnippet}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-3 text-xs">
        {hit.serviceUrl && (
          <a
            href={hit.serviceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-medium hover:underline flex items-center gap-1"
            data-testid={`hit-service-link-${hit.rightId}`}
          >
            עמוד ציבורי <ArrowLeft className="w-3.5 h-3.5" />
          </a>
        )}
        <Link href={`/rights/${hit.rightId}`} className="text-primary font-medium hover:underline flex items-center gap-1" data-testid={`hit-internal-link-${hit.rightId}`}>
          לפירוט פנימי <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export default function AdvancedMatchPage() {
  return (
    <AdminGate>
      <AdvancedMatchInner />
    </AdminGate>
  );
}
