/**
 * Admin view: shows which database backend is active (SQLite or Supabase),
 * which expected tables exist, and warnings about missing env config.
 */
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminGate } from "@/components/admin-gate";
import { Database, CheckCircle2, AlertTriangle, XCircle, Shield } from "lucide-react";

interface DbStatus {
  mode: "supabase" | "sqlite";
  usingSupabase: boolean;
  supabase: { url: string; keyConfigured: boolean; keyKind: string | null };
  tables: Array<{ table: string; ok: boolean; error?: string }>;
  missingTables: string[];
  ready: boolean;
  probeError: string | null;
  warnings: string[];
  inboundEndpoint: { path: string; secretConfigured: boolean };
}

function DbStatusInner() {
  const q = useQuery<DbStatus>({ queryKey: ["/api/admin/db-status"] });

  if (q.isLoading) {
    return (
      <div className="text-muted-foreground" data-testid="db-status-loading">
        טוען מצב מסד נתונים...
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <Card className="p-6 text-destructive" dir="rtl" data-testid="db-status-error">
        שגיאה בטעינת מצב מסד הנתונים.
      </Card>
    );
  }

  const s = q.data;

  return (
    <div dir="rtl" className="space-y-4" data-testid="page-db-status">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">בריאות מסד הנתונים</p>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database className="w-5 h-5" /> מצב מסד הנתונים והוובהוקים
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          דף זה מציג איזה מסד נתונים פעיל כעת (Supabase לעומת SQLite מקומי),
          איזה טבלאות נדרשות לפיצ'רים החדשים, ואיזה משתני סביבה חסרים בייצור.
        </p>
      </header>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">מצב פעיל</h2>
          <Badge variant={s.usingSupabase ? "default" : "secondary"} data-testid="db-mode">
            {s.usingSupabase ? "Supabase Postgres" : "SQLite (מקומי)"}
          </Badge>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">SUPABASE_URL</dt>
          <dd dir="ltr">{s.supabase.url || "—"}</dd>
          <dt className="text-muted-foreground">סוג מפתח Supabase</dt>
          <dd>{s.supabase.keyKind ?? "לא הוגדר"}</dd>
          <dt className="text-muted-foreground">קבלת לידים חיצוניים</dt>
          <dd dir="ltr">{s.inboundEndpoint.path}</dd>
          <dt className="text-muted-foreground">סוד וובהוק (INBOUND_WEBHOOK_SECRET)</dt>
          <dd className="flex items-center gap-1">
            {s.inboundEndpoint.secretConfigured ? (
              <>
                <Shield className="w-4 h-4 text-green-600" /> מוגדר
              </>
            ) : (
              <span className="text-amber-600">לא מוגדר — מתקבלות בקשות לא מאומתות</span>
            )}
          </dd>
        </dl>
      </Card>

      {s.warnings.length > 0 && (
        <Card className="p-5 space-y-2 border-amber-500/40 bg-amber-500/5" data-testid="db-warnings">
          <h3 className="font-semibold flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" /> אזהרות תצורה
          </h3>
          <ul className="text-sm list-disc pr-5 space-y-1 text-amber-800">
            {s.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">טבלאות נדרשות</h2>
          <Badge variant={s.ready ? "default" : "destructive"} data-testid="db-ready">
            {s.ready ? "מוכן" : `חסרות ${s.missingTables.length} טבלאות`}
          </Badge>
        </div>
        {s.probeError && (
          <p className="text-sm text-destructive" data-testid="db-probe-error">
            שגיאה בבדיקה: {s.probeError}
          </p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {s.tables.map((t) => (
            <div
              key={t.table}
              className="flex items-center justify-between border border-border rounded-md px-3 py-1.5"
              data-testid={`tbl-${t.table}`}
            >
              <span dir="ltr" className="font-mono text-xs">{t.table}</span>
              {t.ok ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="קיים" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" aria-label="חסר" />
              )}
            </div>
          ))}
        </div>
        {!s.usingSupabase && (
          <p className="text-xs text-muted-foreground">
            המערכת רצה כעת על SQLite. להפעלת Supabase: הגדירו <code dir="ltr">SUPABASE_URL</code> ו-
            <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> והפעילו את <code dir="ltr">deliverables/supabase_bkalut_schema.sql</code>
            ב-SQL Editor של Supabase.
          </p>
        )}
      </Card>
    </div>
  );
}

export default function DbStatusPage() {
  return (
    <AdminGate>
      <DbStatusInner />
    </AdminGate>
  );
}
