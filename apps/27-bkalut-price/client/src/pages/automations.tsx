import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  MessageCircle,
  Phone,
  Workflow,
  Cable,
  Database,
  GitBranch,
  HardDriveDownload,
  RefreshCw,
  AlertTriangle,
  Lock,
  Beaker,
  Save,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { AdminGate } from "@/components/admin-gate";
import type { AutomationConfig } from "@/types/admin";

const ICONS: Record<string, any> = {
  email: Mail,
  whatsapp: MessageCircle,
  voice: Phone,
  n8n: Workflow,
  github: GitBranch,
  supabase: Database,
  google_drive: HardDriveDownload,
  monthly_refresh: RefreshCw,
  rights_api: Cable,
};

function AutomationsInner() {
  const list = useQuery<AutomationConfig[]>({ queryKey: ["/api/admin/automations"] });

  return (
    <div dir="rtl" className="space-y-8" data-testid="page-automations">
      <header className="space-y-3">
        <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">אוטומציות וקונקטורים</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          הגדרה חיה של כל קונקטור: כתובת endpoint, secret מצביע, סטטוס פעיל/לא פעיל ובדיקה ידנית.
          השליחה לערוצים חיצוניים בפועל (מייל, WhatsApp, מערכת קולית, n8n) מבוצעת רק אם הקונקטור מופעל.
          כל פעולה בעמוד הזה נשמרת ב-SQLite המקומי. סודות אמיתיים יוכנסו ב-secrets של הסביבה, לא כאן.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        {list.isLoading
          ? Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="p-4 h-44 animate-pulse bg-muted/30" />
            ))
          : (list.data ?? []).length === 0
          ? (
              <Card className="p-6 text-center text-muted-foreground md:col-span-2" data-testid="card-automations-empty">
                לא נמצאו קונקטורים. נסו לרענן את העמוד — אם הבעיה נמשכת, בדקו את החיבור ל-Supabase.
              </Card>
            )
          : (list.data ?? []).map((cfg) => (
              <ConnectorCard key={cfg.key} config={cfg} />
            ))}
      </section>

      <Separator />

      <Card className="p-6 space-y-3 border-2 border-yellow-500/40 bg-yellow-500/5" data-testid="card-security-note">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
          <h2 className="text-lg font-semibold">אבטחה והכנה לייצור</h2>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pr-5">
          <li>הטוקנים האמיתיים (SMTP, WhatsApp Business, n8n bearer, Supabase service key) חייבים לחיות ב-env / Secrets Manager. השדה <code>secretRef</code> כאן רק מצביע על שם המפתח.</li>
          <li>השליחה הציבורית של טפסים ל-n8n הקיים (NEDARIM3873) ממשיכה לעבוד כברירת מחדל.</li>
          <li>כל שליחה אדמיניסטרטיבית נכתבת ב-delivery_queue יחד עם status, statusDetail ו-response.</li>
          <li>
            <strong>הכנה לייצור:</strong> להחליף את התחברות צוות הסביבה (l023131500@gmail.com / 023131500 · קוד 123456) ב-OTP/MFA דרך
            ספק זהויות, להוסיף Audit log, להפעיל cookie עם <code>__Host-</code> רק מעל HTTPS, ולנעול CORS.
          </li>
        </ul>
      </Card>

      <Card className="p-6 space-y-3" data-testid="card-quick-links">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-foreground/70" />
          <h2 className="text-lg font-semibold">קישורים מהירים</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <a className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover-elevate" href="https://github.com/new" target="_blank" rel="noreferrer" data-testid="link-github-new">
            <GitBranch className="w-4 h-4" /> פתיחת ריפוזיטורי חדש ב-GitHub
            <ExternalLink className="w-3 h-3 mr-auto opacity-60" />
          </a>
          <a className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover-elevate" href="https://supabase.com/dashboard/new" target="_blank" rel="noreferrer" data-testid="link-supabase-new">
            <Database className="w-4 h-4" /> פתיחת פרויקט Supabase חדש
            <ExternalLink className="w-3 h-3 mr-auto opacity-60" />
          </a>
          <a className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover-elevate" href="https://drive.google.com" target="_blank" rel="noreferrer" data-testid="link-drive">
            <HardDriveDownload className="w-4 h-4" /> Google Drive · עדכוני מאגר זכויות
            <ExternalLink className="w-3 h-3 mr-auto opacity-60" />
          </a>
          <a className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover-elevate" href="/exports/" target="_blank" rel="noreferrer" data-testid="link-exports">
            <HardDriveDownload className="w-4 h-4" /> הורדת ארכיוני קוד מקור
            <ExternalLink className="w-3 h-3 mr-auto opacity-60" />
          </a>
        </div>
      </Card>
    </div>
  );
}

function ConnectorCard({ config }: { config: AutomationConfig }) {
  const Icon = ICONS[config.key] ?? Cable;
  const [enabled, setEnabled] = useState<boolean>(Boolean(config.enabled));
  const [endpointUrl, setEndpointUrl] = useState<string>(config.endpointUrl ?? "");
  const [secretRef, setSecretRef] = useState<string>(config.secretRef ?? "");
  const [configJson, setConfigJson] = useState<string>(JSON.stringify(config.config ?? {}, null, 2));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setFeedback(null);
    try {
      let parsedConfig: Record<string, unknown> = {};
      try { parsedConfig = configJson.trim() ? JSON.parse(configJson) : {}; }
      catch { setFeedback("ה-JSON של ההגדרות לא תקין"); setBusy(false); return; }
      await apiRequest("PATCH", `/api/admin/automations/${config.key}`, {
        enabled,
        endpointUrl,
        secretRef,
        config: parsedConfig,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      setFeedback("נשמר");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setFeedback(null);
    try {
      const r = await apiRequest("POST", `/api/admin/automations/${config.key}/test`);
      const data = await r.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      if (!data.executed) {
        setFeedback("הבדיקה לא נשלחה החוצה — הקונקטור לא מוגדר/מופעל.");
      } else {
        setFeedback(data.ok ? `נבדק בהצלחה (${data.detail})` : `הבדיקה נכשלה (${data.detail})`);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "בדיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  const statusVariant = enabled ? "default" : "outline";
  const statusLabel = enabled ? "מופעל" : "כבוי";

  return (
    <Card className="p-4 space-y-3" data-testid={`card-automation-${config.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-foreground/70" />
          <div className="font-semibold">{config.label}</div>
        </div>
        <Badge variant={statusVariant} className="text-[11px]">{statusLabel}</Badge>
      </div>
      {config.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <Label htmlFor={`toggle-${config.key}`} className="text-foreground/80">פעיל לשליחה בפועל</Label>
        <Switch id={`toggle-${config.key}`} checked={enabled} onCheckedChange={setEnabled} data-testid={`switch-${config.key}`} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`endpoint-${config.key}`}>Endpoint URL</Label>
        <Input
          id={`endpoint-${config.key}`}
          dir="ltr"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder="https://..."
          data-testid={`input-endpoint-${config.key}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`secret-${config.key}`}>Secret ref (שם משתנה סביבה)</Label>
        <Input
          id={`secret-${config.key}`}
          dir="ltr"
          value={secretRef}
          onChange={(e) => setSecretRef(e.target.value)}
          placeholder="EMAIL_PROVIDER_TOKEN"
          data-testid={`input-secret-${config.key}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`config-${config.key}`}>תצורה (JSON)</Label>
        <Textarea
          id={`config-${config.key}`}
          dir="ltr"
          rows={3}
          className="font-mono text-xs"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          data-testid={`textarea-config-${config.key}`}
        />
      </div>

      {config.lastTestedAt && (
        <div className="text-xs text-muted-foreground flex items-start gap-1.5 border-t border-border pt-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-700 dark:text-yellow-500" />
          <span>
            בדיקה אחרונה: {new Date(config.lastTestedAt).toLocaleString("he-IL")} · {config.lastStatus}
            {config.lastResult ? ` — ${config.lastResult}` : ""}
          </span>
        </div>
      )}

      {feedback && <div className="text-xs text-muted-foreground">{feedback}</div>}

      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" disabled={busy} onClick={test} data-testid={`button-test-${config.key}`} className="gap-1">
          <Beaker className="w-4 h-4" /> בדיקה
        </Button>
        <Button size="sm" disabled={busy} onClick={save} data-testid={`button-save-${config.key}`} className="gap-1">
          <Save className="w-4 h-4" /> שמירה
        </Button>
      </div>
    </Card>
  );
}

export default function AutomationsPage() {
  return (
    <AdminGate>
      <AutomationsInner />
    </AdminGate>
  );
}
