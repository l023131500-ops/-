/**
 * Admin operations handbook — "מרכז תיעוד והטמעה".
 *
 * Single source of truth for the things the team needs at hand: repos,
 * Supabase project, inbound webhook contract, RLS status, Google OAuth setup,
 * deployment commands, login credentials, premium flow, legal docs. All
 * Hebrew RTL. Snippets are copyable, not just prose.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/admin-gate";
import {
  BookOpen,
  Github,
  Database,
  Webhook,
  ShieldCheck,
  KeyRound,
  Rocket,
  ScrollText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

function InlineCopy({ text, testId }: { text: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handle}
      className="h-7 w-7 p-0"
      aria-label="העתק"
      data-testid={testId}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

interface GoogleStatus {
  configured: boolean;
  callbackUrl: string | null;
  allowedAdminEmails: string[];
  missing: string[];
}

interface DbStatus {
  mode: "supabase" | "sqlite";
  usingSupabase: boolean;
  supabase: { url: string; keyConfigured: boolean; keyKind: string | null };
  inboundEndpoint: { path: string; secretConfigured: boolean };
  warnings: string[];
  ready: boolean;
}

const RLS_TABLES = [
  "fin_clients", "fin_categories", "fin_budgets", "fin_transactions",
  "fin_recurring", "fin_opportunities", "fin_leads", "fin_tips",
  "fin_debts", "fin_goals", "fin_alerts", "fin_plans", "fin_notes",
];

const INBOUND_EXAMPLE = JSON.stringify(
  {
    sourceSite: "bkalut-marketing",
    sourcePage: "/financial-help",
    origin: "landing",
    category: "כלכלי",
    topic: "ייעוץ פיננסי",
    requestType: "info",
    selectedPath: "single",
    potentialScore: 72,
    contact: { fullName: "ישראל ישראלי", phone: "0501234567", email: "x@example.com" },
    answers: { hasDebts: true, monthlyIncome: 12000 },
    documents: ["id_card", "bank_statement"],
    legalAccepted: true,
    utm: { source: "facebook", campaign: "summer25" },
    referrer: "https://facebook.com/...",
    externalId: "lead_abc_123",
  },
  null,
  2,
);

const CURL_INBOUND = `curl -X POST \\
  https://YOUR_HOST/api/inbound/leads \\
  -H "content-type: application/json" \\
  -H "x-bkalut-secret: $INBOUND_WEBHOOK_SECRET" \\
  -d @lead.json`;

const CURL_PPLX = `curl -X POST \\
  https://YOUR_PPLX_HOST/port/5000/api/inbound/leads \\
  -H "content-type: application/json" \\
  -H "x-bkalut-secret: $INBOUND_WEBHOOK_SECRET" \\
  -d @lead.json`;

const BUILD_COMMANDS = `# Dev
npm install
npm run dev                      # http://localhost:5000

# Production
npm run build                    # → dist/index.cjs + dist/public + dist/data
NODE_ENV=production node dist/index.cjs

# Type check
npm run check

# Drizzle migrations
npm run db:push`;

const ROLES_MATRIX = [
  { role: "admin", access: "כל המסלולים: זכויות, פיננסי, אוטומציות, יומני וובהוקים, ניהול משתמשים, RLS, אישור פרימיום" },
  { role: "coach", access: "צפייה בלקוחות פיננסיים שהוקצו אליו, עדכון תקציבים והערות. ללא ניהול משתמשים." },
  { role: "user", access: "ראיית נתוני המשתמש עצמו בלבד דרך /api/user/* + GET /api/user/me. אין גישה ל-/api/admin/*." },
];

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="relative" dir="ltr">
      <pre className="bg-muted/60 text-foreground/90 text-xs rounded-md p-3 pl-10 overflow-x-auto whitespace-pre" data-testid={label ? `code-${label}` : undefined}>
        {children}
      </pre>
      <div className="absolute top-1 left-1">
        <InlineCopy text={children} testId={label ? `copy-${label}` : undefined} />
      </div>
    </div>
  );
}

function StatusPill({ ok, okLabel, badLabel }: { ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="gap-1">
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? okLabel : badLabel}
    </Badge>
  );
}

function AdminDocsInner() {
  const googleQ = useQuery<GoogleStatus>({
    queryKey: ["/api/admin/google/status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/google/status");
      if (!r.ok) throw new Error("status fetch failed");
      const j = await r.json();
      return j as GoogleStatus;
    },
  });
  const dbQ = useQuery<DbStatus>({ queryKey: ["/api/admin/db-status"] });

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-admin-docs">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">מרכז תיעוד פנימי</p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> הוראות מערכת בקלות
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          כל מה שצריך כדי להפעיל, לתחזק, לאבטח ולשלב את המערכת — במקום אחד.
          הקטעים ניתנים להעתקה ולשליחה לצוות אוטומציות / DevOps.
        </p>
      </header>

      {/* --------------- 1. Repos --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-repos">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Github className="w-4 h-4" /> מאגרים ומקורות קוד
        </h2>
        <ul className="text-sm space-y-1">
          <li>
            <strong>אפליקציה ראשית:</strong>{" "}
            <a className="underline" href="https://github.com/l023131500-ops/bkalut-app" target="_blank" rel="noreferrer">
              github.com/l023131500-ops/bkalut-app
            </a>
          </li>
          <li>
            <strong>חשבון GitHub פעיל:</strong> <code dir="ltr">l023131500-ops</code>
          </li>
          <li>
            <strong>ענף ראשי:</strong> <code dir="ltr">main</code>
          </li>
          <li>
            <strong>קומיטים בולטים:</strong> ראו <code dir="ltr">git log --oneline -20</code> מתוך הענף.
          </li>
        </ul>
        <CodeBlock label="git-log">{`git log --oneline -20\ngit fetch origin && git pull --ff-only origin main`}</CodeBlock>
      </Card>

      {/* --------------- 2. Supabase --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-supabase">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" /> Supabase — מצב והגדרה
        </h2>
        <div className="text-sm space-y-1">
          <p>
            <strong>Project:</strong> <code dir="ltr">bkalut-production</code> · <strong>Ref:</strong>{" "}
            <code dir="ltr">bieebmnmkffwbqlsfozh</code>
          </p>
          <p>
            <strong>סטטוס פעיל:</strong>{" "}
            {dbQ.data ? (
              <StatusPill
                ok={dbQ.data.usingSupabase}
                okLabel="Supabase Postgres"
                badLabel="SQLite מקומי (לפיתוח בלבד)"
              />
            ) : (
              <span className="text-muted-foreground">טוען…</span>
            )}
          </p>
          <p>
            <strong>טבלאות במסד:</strong> 25 (לאחר מיגרציית קובץ הסכמה{" "}
            <code dir="ltr">deliverables/supabase_bkalut_schema.sql</code>).
          </p>
          <p>
            <strong>גישה מהשרת:</strong> רק עם <code dir="ltr">service_role</code> דרך משתנה הסביבה{" "}
            <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code>. אסור להחזיק מפתח זה ב-frontend.
          </p>
          <p>
            <strong>גישת ה-frontend:</strong> רק דרך Express API (<code dir="ltr">/api/*</code>) — אין שימוש
            ב-anon key מהדפדפן.
          </p>
        </div>
      </Card>

      {/* --------------- 3. RLS --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-rls">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> אבטחה — RLS על טבלאות פיננסיות
        </h2>
        <p className="text-sm leading-relaxed">
          ה-advisory של Supabase מציין כי RLS כבוי על 13 טבלאות פיננסיות. הסטטוס המומלץ:{" "}
          הפעלת RLS על כל הטבלאות, ללא מדיניות מתירנית עבור anon/authenticated — כך שהבק-אנד עם{" "}
          <code dir="ltr">service_role</code> ממשיך לעבוד אבל גישה ישירה מ-anon נחסמת.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RLS_TABLES.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">סטטוס נוכחי</p>
            <p>
              המיגרציה מוכנה ב-<code dir="ltr">deliverables/supabase_rls_financial_tables.sql</code> אך{" "}
              <strong>לא הוחלה אוטומטית</strong>. יש להעתיק אותה לעורך ה-SQL של Supabase ולהריץ. הקובץ
              אידמפוטנטי וניתן להרצה חוזרת ללא נזק.
            </p>
          </div>
        </div>
        <CodeBlock label="rls-verify">{`-- אימות לאחר הרצה:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'fin_%'
ORDER BY tablename;`}</CodeBlock>
        <CodeBlock label="rls-enable-short">{`-- תמצית מהקובץ (לפניות מהירות):
ALTER TABLE public.fin_clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transactions  ENABLE ROW LEVEL SECURITY;
-- ... והלאה לכל 13 הטבלאות.
-- מדיניות RESTRICTIVE deny לאנונים ולמאומתים נוספת בקובץ המלא.`}</CodeBlock>
      </Card>

      {/* --------------- 4. Inbound webhook --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-inbound">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Webhook className="w-4 h-4" /> וובהוק נכנס — לידים מאתרים חיצוניים
        </h2>
        <ul className="text-sm space-y-1">
          <li>
            <strong>שרת רגיל:</strong> <code dir="ltr">POST /api/inbound/leads</code>
          </li>
          <li>
            <strong>אפליקציית pplx:</strong> <code dir="ltr">POST /port/5000/api/inbound/leads</code>
          </li>
          <li>
            <strong>כותרת אבטחה:</strong> <code dir="ltr">x-bkalut-secret: $INBOUND_WEBHOOK_SECRET</code>{" "}
            (תואם את <code dir="ltr">INBOUND_WEBHOOK_SECRET</code> בסביבת השרת).
          </li>
          <li>
            <strong>פיזור החוצה:</strong> כל ליד נשלח גם ל-{" "}
            <code dir="ltr">https://n8n.l023131500.work/webhook/NEDARIM3873</code> (NEDARIM3873).
          </li>
          <li>
            <strong>יומן + Retry:</strong> בעמוד "יומן וובהוקים" — כל ניסיון נשמר, ניתן להפעיל ניסיון חוזר ידני.
          </li>
        </ul>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">דוגמת JSON</p>
            <CodeBlock label="inbound-json">{INBOUND_EXAMPLE}</CodeBlock>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">curl לשרת רגיל</p>
              <CodeBlock label="curl-normal">{CURL_INBOUND}</CodeBlock>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">curl ל-pplx</p>
              <CodeBlock label="curl-pplx">{CURL_PPLX}</CodeBlock>
            </div>
          </div>
        </div>
      </Card>

      {/* --------------- 5. Google OAuth --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-google">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> כניסה עם Google — הגדרה
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <strong>סטטוס נוכחי:</strong>
          {googleQ.data ? (
            <StatusPill
              ok={googleQ.data.configured}
              okLabel="מוגדר ופעיל"
              badLabel="לא מוגדר — הכפתור מושבת"
            />
          ) : (
            <span className="text-muted-foreground">טוען…</span>
          )}
        </div>
        {googleQ.data && !googleQ.data.configured && googleQ.data.missing.length > 0 && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md p-2">
            חסר: <code dir="ltr">{googleQ.data.missing.join(", ")}</code>
          </p>
        )}
        {googleQ.data && googleQ.data.allowedAdminEmails.length > 0 && (
          <p className="text-sm">
            <strong>חשבונות מורשים:</strong>{" "}
            <code dir="ltr">{googleQ.data.allowedAdminEmails.join(", ")}</code>
          </p>
        )}
        <ol className="text-sm list-decimal pr-5 space-y-1">
          <li>
            יוצרים OAuth Client ID ב-Google Cloud Console (Web Application).
          </li>
          <li>
            רושמים את כתובת ה-callback בקונסול:{" "}
            <code dir="ltr">https://YOUR_HOST/api/admin/google/callback</code>
          </li>
          <li>
            מגדירים בסביבת השרת:{" "}
            <code dir="ltr">GOOGLE_CLIENT_ID</code>, <code dir="ltr">GOOGLE_CLIENT_SECRET</code>,{" "}
            <code dir="ltr">GOOGLE_CALLBACK_URL</code>,{" "}
            <code dir="ltr">GOOGLE_ALLOWED_ADMIN_EMAILS</code>{" "}
            (ברירת מחדל <code dir="ltr">l023131500@gmail.com</code>).
          </li>
          <li>מפעילים מחדש את השרת. הכפתור "כניסה עם Google" יופעל אוטומטית.</li>
        </ol>
        <CodeBlock label="env-google">{`GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://YOUR_HOST/api/admin/google/callback
GOOGLE_ALLOWED_ADMIN_EMAILS=l023131500@gmail.com`}</CodeBlock>
      </Card>

      {/* --------------- 6. Roles --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-roles">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> תפקידים, הרשאות ו-Locks
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right border-b">
              <th className="py-1 pl-3">תפקיד</th>
              <th className="py-1">הרשאות עיקריות</th>
            </tr>
          </thead>
          <tbody>
            {ROLES_MATRIX.map((r) => (
              <tr key={r.role} className="border-b last:border-0">
                <td className="py-1.5 pl-3 font-medium">
                  <Badge variant="outline" className="text-[11px]">{r.role}</Badge>
                </td>
                <td className="py-1.5 text-foreground/85">{r.access}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground leading-relaxed">
          ניהול שדות פר-משתמש (productAccess, plan, status) נעשה בעמוד "משתמשים".{" "}
          <code dir="ltr">productAccessJson</code> שולט באילו מוצרים המשתמש רואה (bkalut / financial).
          <code dir="ltr"> plan = premium</code> נדרש כדי לפתוח פיצ'רים מתקדמים. סטטוס{" "}
          <code dir="ltr">disabled</code> חוסם התחברות מיידית.
        </p>
      </Card>

      {/* --------------- 7. Admin login --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-admin-login">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> פרטי כניסה אדמין
        </h2>
        <ul className="text-sm space-y-1">
          <li>
            <strong>דוא"ל ראשי:</strong> <code dir="ltr">l023131500@gmail.com</code> ·{" "}
            <strong>סיסמה:</strong> <code dir="ltr">eueu1234</code>{" "}
            <span className="text-muted-foreground">(בייצור — להחליף ל-<code dir="ltr">BKALUT_ADMIN_PASSWORD_SHA256</code>)</span>
          </li>
          <li>
            <strong>זהות מספרית legacy:</strong> <code dir="ltr">023131500</code> · סיסמה{" "}
            <code dir="ltr">123456</code> (לא לייצור).
          </li>
          <li>
            <strong>טוקן הסשן:</strong> נשמר בזיכרון ה-SPA בלבד; רענון דפדפן מנתק.
          </li>
        </ul>
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded p-2">
          בייצור: לא להחזיק סיסמה בטקסט חופשי. למלא{" "}
          <code dir="ltr">BKALUT_ADMIN_PASSWORD_SHA256</code> במשתני הסביבה — הוא גובר על הסיסמה הגולמית.
        </p>
        <CodeBlock label="sha256-cmd">{`node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"`}</CodeBlock>
      </Card>

      {/* --------------- 8. Premium flow --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-premium">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="w-4 h-4" /> זרימת פרימיום ושליחת פרטים ללקוח
        </h2>
        <ol className="text-sm list-decimal pr-5 space-y-1">
          <li>אדמין יוצר משתמש בעמוד "משתמשים" (כולל סיסמה — נשמר ב-<code dir="ltr">passwordPlain</code> זמני).</li>
          <li>פרטי גישה נשלחים אוטומטית למייל/וואטסאפ דרך outbox / delivery_queue.</li>
          <li>הסיסמה הגולמית נמחקת מהטבלה לאחר אישור מסירה (<code dir="ltr">credentialsDeliveredAt</code>).</li>
          <li>הלקוח מתחבר ב-<code dir="ltr">/user-login</code> ורואה דשבורד אישי, מבקש שדרוג פרימיום.</li>
          <li>אדמין מאשר/דוחה ב-"בקשות פרימיום". אישור משדרג <code dir="ltr">plan=premium</code>.</li>
          <li>וובהוק <code dir="ltr">webhook_premium_decision</code> ⟵ NEDARIM3873 ל-n8n.</li>
        </ol>
      </Card>

      {/* --------------- 9. Legal docs --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-legal">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> מסמכי תקנון ופרטיות
        </h2>
        <p className="text-sm">
          הטיוטות נמצאות בעמוד "תנאים" ועוברות ל-<code dir="ltr">legal_acceptances</code> בכל אישור.
          <strong> אזהרה:</strong> הטקסטים מסומנים כטיוטות עד אישור עורך/ת דין. אין להציג ללקוחות כאלמנט סופי.
        </p>
      </Card>

      {/* --------------- 10. Deployment commands --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-deploy">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="w-4 h-4" /> פקודות בנייה ופריסה
        </h2>
        <CodeBlock label="build">{BUILD_COMMANDS}</CodeBlock>
        <p className="text-xs text-muted-foreground">
          ה-CI ב-<code dir="ltr">.github/workflows/deploy.yml</code>. הקובץ{" "}
          <code dir="ltr">server/data/bklot.xlsx</code> מועתק ל-<code dir="ltr">dist/data/</code> בעת{" "}
          <code dir="ltr">npm run build</code>.
        </p>
      </Card>

      {/* --------------- 11. Db status snapshot --------------- */}
      {dbQ.data && (
        <Card className="p-5 space-y-2" data-testid="section-db-status">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" /> תמונת מצב מסד נתונים
          </h2>
          <ul className="text-sm space-y-1">
            <li>
              <strong>מצב:</strong>{" "}
              <code dir="ltr">{dbQ.data.usingSupabase ? "supabase" : "sqlite"}</code>
            </li>
            <li>
              <strong>Supabase URL:</strong> <code dir="ltr">{dbQ.data.supabase.url || "(לא מוגדר)"}</code>
            </li>
            <li>
              <strong>Service key:</strong>{" "}
              <StatusPill
                ok={dbQ.data.supabase.keyConfigured}
                okLabel={`מוגדר (${dbQ.data.supabase.keyKind ?? "?"})`}
                badLabel="חסר"
              />
            </li>
            <li>
              <strong>Inbound endpoint:</strong> <code dir="ltr">{dbQ.data.inboundEndpoint.path}</code>{" "}
              · secret:{" "}
              <StatusPill
                ok={dbQ.data.inboundEndpoint.secretConfigured}
                okLabel="מוגדר"
                badLabel="ריק (dev בלבד)"
              />
            </li>
          </ul>
          {dbQ.data.warnings.length > 0 && (
            <div className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">
              <p className="font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> אזהרות
              </p>
              <ul className="list-disc pr-5">
                {dbQ.data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* --------------- 12. Checklist --------------- */}
      <Card className="p-5 space-y-2" data-testid="section-checklist">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> רשימת בדיקות לפריסה
        </h2>
        <ul className="text-sm space-y-1 list-disc pr-5">
          <li>הוחל <code dir="ltr">deliverables/supabase_rls_financial_tables.sql</code> ב-Supabase.</li>
          <li>אומת <code dir="ltr">rowsecurity=true</code> על כל 13 הטבלאות הפיננסיות.</li>
          <li>אין שימוש ב-anon key ב-frontend; כל בקשת DB עוברת ב-<code dir="ltr">/api/*</code>.</li>
          <li>הוחלף <code dir="ltr">BKALUT_ADMIN_PASSWORD</code> ל-<code dir="ltr">BKALUT_ADMIN_PASSWORD_SHA256</code>.</li>
          <li><code dir="ltr">INBOUND_WEBHOOK_SECRET</code> הוגדר וערך תואם הוטמע באתרי הלידים.</li>
          <li>נבדק <code dir="ltr">/api/admin/google/status</code> — מציג <code dir="ltr">configured: true</code>.</li>
          <li>הופעל וובהוק NEDARIM3873 ב-n8n והתקבלה תגובה 2xx.</li>
        </ul>
      </Card>

      {/* --------------- 13. Public site & known TODOs --------------- */}
      <Card className="p-5 space-y-3" data-testid="section-public-site">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> אתר ציבורי — מפת מסלולים
        </h2>
        <ul className="text-sm space-y-1 list-disc pr-5">
          <li><code dir="ltr">/</code> — דף הנחיתה הציבורי (קטלוג נושאים, חיפוש, הפניה לבדיקת זכאות וטופס פיננסי).</li>
          <li><code dir="ltr">/#/p/topic/:id</code> — דף נושא ציבורי עם CTA לבדיקת זכאות, העתקת/שיתוף קישור, והורדת תמונה ממותגת (SVG).</li>
          <li><code dir="ltr">/#/p/financial</code> — טופס לידים פיננסי ציבורי. הפניה ל-<code dir="ltr">/api/financial/leads</code>.</li>
          <li><code dir="ltr">/#/r/:topicId</code> — מסך תזכורת ציבורי "כן / עדיין לא / לא זכאי". כותב ל-<code dir="ltr">POST /api/public/reminder-response</code> ונקרא ב-<code dir="ltr">/#/reminders</code>.</li>
          <li><code dir="ltr">/#/admin</code> — לוח ניהול פנימי (Shell עם תפריט מלא). כפתור "ניהול" ב-footer הציבורי מוביל ל-<code dir="ltr">/#/login</code>.</li>
          <li>מסלולי <code dir="ltr">/rights</code>, <code dir="ltr">/financial</code>, <code dir="ltr">/submissions</code>, <code dir="ltr">/reminders</code> וכו' זמינים רק במצב ניהול.</li>
        </ul>
      </Card>

      <Card className="p-5 space-y-3" data-testid="section-advanced-match">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> חיפוש מתוחכם (Advanced Matcher)
        </h2>
        <ul className="text-sm space-y-1 list-disc pr-5">
          <li>
            עמוד פנימי: <code dir="ltr">/#/advanced-match</code> — תחת כותרת "חיפוש מתוחכם".
            ניתן להדביק טקסט חופשי או JSON פרופיל מלא.
          </li>
          <li>
            דטרמיניסטי / מבוסס חוקים, ללא LLM. ההתאמה מבוססת על שדות
            <code dir="ltr"> categories, publicSiteText, eligibility, audience, aiSearch, aiExtra, documents</code>
            וכו', עם משקלות לפי סיגנלים: גיל, מצב משפחתי, ילדים, הכנסה, נכות/בריאות, תעסוקה, דיור, עסק, פנסיה,
            ניצולי שואה, סטודנט/אברך, עולה חדש.
          </li>
          <li>
            תוצאות מכילות: כותרת נושא, קטגוריה, סיבה ("למה רלוונטי"), סיגנלים תואמים, רמת פוטנציאל
            (גבוה/בינוני/נמוך) וציון 0..100, וקישורים: עמוד ציבורי (<code dir="ltr">serviceUrl</code>) ופירוט פנימי
            (<code dir="ltr">/#/rights/:id</code>). אפשר להעתיק טקסט או להוריד JSON.
          </li>
          <li>
            Endpoint: <code dir="ltr">POST /api/admin/advanced-match</code> עם <code dir="ltr">{`{ text } | { profile: {...} }`}</code>.
            דרוש Bearer admin.
          </li>
        </ul>
      </Card>

      <Card className="p-5 space-y-3" data-testid="section-general-inquiry">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> מייל לפנייה כללית (General Inquiry Reply)
        </h2>
        <ul className="text-sm space-y-1 list-disc pr-5">
          <li>
            עמוד עורך פנימי: <code dir="ltr">/#/general-inquiry</code>. עורכים בעברית את הנושא וגוף ההודעה,
            עם משתנים: <code dir="ltr">{"{{fullName}}, {{phone}}, {{email}}, {{publicEligibilityUrl}}"}</code>.
          </li>
          <li>
            התבנית נשמרת ב-<code dir="ltr">automation_configs</code> תחת
            <code dir="ltr"> key = "general_inquiry_reply"</code>. ה-configJson מכיל
            <code dir="ltr"> {`{ subject, body, channels[], defaultPublicEligibilityUrl }`}</code>.
          </li>
          <li>
            השליחה בפועל מועברת לקונקטור <code dir="ltr">webhook_email_automation</code> (מסך אוטומציות) דרך באס הוובהוקים המאוחד.
            ה-payload כולל <code dir="ltr">templateKey: "general_inquiry_reply"</code>, נושא, גוף מורכב, וערוצים.
            <strong> אנחנו לא מתחזים</strong> לשרת SMTP — נרשם "delivered_via_webhook" רק כש-HTTP 2xx חזר.
          </li>
          <li>
            Endpoints (דורשים Bearer admin):
            <ul className="list-disc pr-5 mt-1 space-y-0.5 text-xs">
              <li><code dir="ltr">GET    /api/admin/general-inquiry-reply</code> — שליפת תבנית</li>
              <li><code dir="ltr">PATCH  /api/admin/general-inquiry-reply</code> — עדכון תבנית</li>
              <li><code dir="ltr">POST   /api/admin/general-inquiry-reply/preview</code> — תצוגה מקדימה</li>
              <li><code dir="ltr">POST   /api/admin/general-inquiry-reply/send</code> — שליחה לוובהוק</li>
              <li><code dir="ltr">POST   /api/admin/inbound-leads/:id/general-inquiry-reply</code> — שליחה ללקוח של ליד נכנס קיים</li>
            </ul>
          </li>
        </ul>
      </Card>

      <Card className="p-5 space-y-3" data-testid="section-reminders">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> תזכורות לקוחות (Reminders)
        </h2>
        <ul className="text-sm space-y-1 list-disc pr-5">
          <li>
            בדף נושא פנימי (<code dir="ltr">/#/rights/:id</code>) יש כרטיס <strong>נוסח תזכורת ללקוח</strong> עם נוסח מוכן וקישור ייעודי לכל נושא.
          </li>
          <li>
            כל לחיצה במסך הציבורי <code dir="ltr">/#/r/:topicId</code> נשמרת ב-SQLite מקומי בטבלה <code dir="ltr">reminder_responses</code>.
            הכתיבה ל-Supabase אינה נדרשת — הטבלה תמיד נוצרת ב-<code dir="ltr">data.db</code>.
          </li>
          <li>
            עמוד "תזכורות לקוחות" בתפריט מציג את כל התשובות (חדש בראש), כולל "עדיין לא" עם תאריך תזכורת הבא ו"רוצה שנטפל בזה" שמוביל ל-<code dir="ltr">/#/service/:topicId</code>.
          </li>
          <li>
            ה-Endpoint הציבורי: <code dir="ltr">POST /api/public/reminder-response</code> עם <code dir="ltr">{`{ topicId, response: "yes"|"not_yet"|"not_eligible", contactName?, contactPhone?, nextReminderDate?, wantsService?, note? }`}</code>.
          </li>
          <li>
            ה-Endpoint האדמיני: <code dir="ltr">GET /api/admin/reminder-responses?limit=200</code> (דורש Bearer admin).
          </li>
        </ul>
      </Card>
    </div>
  );
}

export default function AdminDocsPage() {
  return (
    <AdminGate>
      <AdminDocsInner />
    </AdminGate>
  );
}
