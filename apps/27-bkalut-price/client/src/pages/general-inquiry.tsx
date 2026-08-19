/**
 * Admin editor for the "מייל לפנייה כללית" template (key: general_inquiry_reply).
 *
 * Edit subject / body / channels / default eligibility URL. Live preview with
 * placeholders ({{fullName}}, {{phone}}, {{email}}, {{publicEligibilityUrl}}).
 * "Send" delivers via the unified webhook bus (webhook_email_automation) — we
 * only claim "delivered to webhook" when HTTP 2xx is returned.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AdminGate } from "@/components/admin-gate";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Save,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Workflow,
} from "lucide-react";

interface Template {
  subject: string;
  body: string;
  channels: string[];
  defaultPublicEligibilityUrl: string;
}

interface LoadResponse {
  ok: boolean;
  template: Template;
  enabled: boolean;
  lastStatus: string | null;
  lastTestedAt: string | null;
  lastResult: string | null;
  deliveryEndpoint: { configKey: string; note: string };
}

interface PreviewResponse {
  ok: boolean;
  rendered: { subject: string; body: string; vars: Record<string, string> };
}

interface SendResponse {
  ok: boolean;
  delivered_via_webhook: boolean;
  httpStatus: number;
  endpointUrl: string;
  logId: number;
  rendered: { subject: string; body: string };
  channels: string[];
  note?: string;
}

const PLACEHOLDERS = ["{{fullName}}", "{{phone}}", "{{email}}", "{{publicEligibilityUrl}}"];

function GeneralInquiryInner() {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template>({
    subject: "",
    body: "",
    channels: ["email"],
    defaultPublicEligibilityUrl: "/#/",
  });
  const [enabled, setEnabled] = useState(true);
  const [lastInfo, setLastInfo] = useState<{ at: string | null; status: string | null; result: string | null }>({ at: null, status: null, result: null });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Preview / test send state
  const [previewName, setPreviewName] = useState("יוסי כהן");
  const [previewPhone, setPreviewPhone] = useState("050-0000000");
  const [previewEmail, setPreviewEmail] = useState("test@example.com");
  const [previewUrl, setPreviewUrl] = useState("/#/");
  const [previewRendered, setPreviewRendered] = useState<{ subject: string; body: string } | null>(null);
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiRequest("GET", "/api/admin/general-inquiry-reply");
      const data: LoadResponse = await r.json();
      setTemplate(data.template);
      setEnabled(Boolean(data.enabled));
      setLastInfo({ at: data.lastTestedAt, status: data.lastStatus, result: data.lastResult });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    setFeedback(null);
    try {
      const r = await apiRequest("PATCH", "/api/admin/general-inquiry-reply", {
        subject: template.subject,
        body: template.body,
        channels: template.channels,
        defaultPublicEligibilityUrl: template.defaultPublicEligibilityUrl,
        enabled,
      });
      const data = await r.json();
      if (data?.template) setTemplate(data.template);
      setFeedback("נשמר בהצלחה");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    setBusy(true);
    setFeedback(null);
    try {
      // Always save first so preview uses the latest text — but only if dirty.
      const r = await apiRequest("POST", "/api/admin/general-inquiry-reply/preview", {
        fullName: previewName,
        phone: previewPhone,
        email: previewEmail,
        publicEligibilityUrl: previewUrl,
      });
      const data: PreviewResponse = await r.json();
      setPreviewRendered(data.rendered);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "תצוגה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setFeedback(null);
    setSendResult(null);
    try {
      const r = await apiRequest("POST", "/api/admin/general-inquiry-reply/send", {
        fullName: previewName,
        phone: previewPhone,
        email: previewEmail,
        publicEligibilityUrl: previewUrl,
        channels: template.channels,
      });
      const data: SendResponse = await r.json();
      setSendResult(data);
      if (data.delivered_via_webhook) {
        setFeedback("השליחה לוובהוק האוטומציה בוצעה בהצלחה.");
      } else {
        setFeedback("השליחה לוובהוק האוטומציה נכשלה. בדוק את הקונקטור webhook_email_automation.");
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "שליחה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function toggleChannel(ch: string) {
    setTemplate((prev) => {
      const has = prev.channels.includes(ch);
      const next = has ? prev.channels.filter((c) => c !== ch) : [...prev.channels, ch];
      return { ...prev, channels: next.length ? next : ["email"] };
    });
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground" data-testid="loading">
        טוען תבנית...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-general-inquiry">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
          <Badge variant="secondary" className="text-[11px]">תבנית הודעה</Badge>
          {enabled ? (
            <Badge variant="default" className="text-[11px]">פעילה</Badge>
          ) : (
            <Badge variant="outline" className="text-[11px]">מושבתת</Badge>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> מייל לפנייה כללית
        </h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          תבנית ברירת מחדל לתשובה אוטומטית על פניות כלליות שמגיעות מצורות הקשר באתר.
          הטקסט נשמר ב-automation_configs עם key=<code>general_inquiry_reply</code>,
          ניתן להזכיר משתנים: {PLACEHOLDERS.join(", ")}.
          השליחה בפועל מתבצעת דרך אוטומציית המייל/הוובהוקים (<code>webhook_email_automation</code>) ומתועדת ב-webhook_log.
        </p>
      </header>

      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-4">
        <Card className="p-5 space-y-3" data-testid="card-template">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">תבנית עריכה</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">נושא ההודעה</Label>
            <Input
              id="subject"
              value={template.subject}
              onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              dir="rtl"
              data-testid="input-subject"
              placeholder="תודה שפניתם לארגון בקלות"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">גוף ההודעה</Label>
            <Textarea
              id="body"
              rows={14}
              value={template.body}
              onChange={(e) => setTemplate({ ...template, body: e.target.value })}
              dir="rtl"
              className="font-mono text-sm leading-relaxed"
              data-testid="textarea-body"
            />
            <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              <span>משתנים זמינים:</span>
              {PLACEHOLDERS.map((p) => (
                <code key={p} className="bg-muted px-1.5 py-0.5 rounded">{p}</code>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="default-url">URL ברירת מחדל לבדיקת זכאות</Label>
              <Input
                id="default-url"
                value={template.defaultPublicEligibilityUrl}
                onChange={(e) => setTemplate({ ...template, defaultPublicEligibilityUrl: e.target.value })}
                dir="ltr"
                placeholder="/#/  או  https://..."
                data-testid="input-default-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ערוצי שליחה</Label>
              <div className="flex flex-wrap gap-2 text-sm">
                {["email", "whatsapp", "voice"].map((ch) => (
                  <label key={ch} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs cursor-pointer hover-elevate" data-testid={`channel-${ch}`}>
                    <input
                      type="checkbox"
                      checked={template.channels.includes(ch)}
                      onChange={() => toggleChannel(ch)}
                      className="accent-primary"
                    />
                    {ch === "email" ? "מייל" : ch === "whatsapp" ? "WhatsApp" : "הודעה קולית"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-primary"
                data-testid="checkbox-enabled"
              />
              תבנית פעילה (אם מושבתת — שליחות אוטומטיות לא ירוצו)
            </label>
            <Button onClick={save} disabled={busy} className="gap-1" data-testid="button-save">
              <Save className="w-4 h-4" /> שמירה
            </Button>
          </div>

          {feedback && (
            <div className="text-xs text-muted-foreground border-t border-border pt-2">{feedback}</div>
          )}
          {lastInfo.at && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 border-t border-border pt-2">
              <Workflow className="w-3 h-3 mt-0.5" />
              נבחנה לאחרונה: {new Date(lastInfo.at).toLocaleString("he-IL")} · {lastInfo.status}
              {lastInfo.result ? ` · ${lastInfo.result}` : ""}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3" data-testid="card-preview">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">תצוגה מקדימה ושליחת בדיקה</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            הזן ערכי דמה למשתנים, לחץ "תצוגה מקדימה" כדי לראות את הטקסט המורכב,
            או "שלח בדיקה" כדי לדחוף לתור הוובהוק האוטומציה (פעולה אמיתית — תיכתב ל-webhook_log).
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">שם מלא ({"{{fullName}}"})</Label>
              <Input id="p-name" value={previewName} onChange={(e) => setPreviewName(e.target.value)} dir="rtl" data-testid="input-preview-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">טלפון ({"{{phone}}"})</Label>
              <Input id="p-phone" value={previewPhone} onChange={(e) => setPreviewPhone(e.target.value)} dir="ltr" data-testid="input-preview-phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">מייל ({"{{email}}"})</Label>
              <Input id="p-email" value={previewEmail} onChange={(e) => setPreviewEmail(e.target.value)} dir="ltr" data-testid="input-preview-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-url">URL זכאות ({"{{publicEligibilityUrl}}"})</Label>
              <Input id="p-url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} dir="ltr" data-testid="input-preview-url" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={preview} disabled={busy} variant="outline" size="sm" className="gap-1" data-testid="button-preview">
              <Eye className="w-4 h-4" /> תצוגה מקדימה
            </Button>
            <Button onClick={sendTest} disabled={busy} size="sm" className="gap-1" data-testid="button-send-test">
              <Send className="w-4 h-4" /> שלח בדיקה לוובהוק
            </Button>
          </div>

          {previewRendered && (
            <div className="border border-border rounded-md p-3 bg-muted/30 space-y-1 text-sm" data-testid="rendered-preview">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">נושא</div>
              <div className="font-semibold">{previewRendered.subject}</div>
              <Separator className="my-2" />
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">גוף</div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{previewRendered.body}</pre>
            </div>
          )}

          {sendResult && (
            <div
              className={`border rounded-md p-3 text-sm space-y-1 ${
                sendResult.delivered_via_webhook
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
              data-testid="send-result"
            >
              <div className="flex items-center gap-2 font-medium">
                {sendResult.delivered_via_webhook ? (
                  <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                )}
                {sendResult.delivered_via_webhook ? "נמסר לוובהוק האוטומציה" : "השליחה נכשלה"}
              </div>
              <div className="text-xs text-muted-foreground" dir="ltr">
                HTTP {sendResult.httpStatus} · {sendResult.endpointUrl || "אין endpoint"}
              </div>
              {sendResult.note && <div className="text-xs text-muted-foreground">{sendResult.note}</div>}
              <div className="text-[11px] text-muted-foreground">
                templateKey=<code>general_inquiry_reply</code> · logId={sendResult.logId} · channels=
                {(sendResult.channels || []).join(", ")}
              </div>
            </div>
          )}
        </Card>
      </section>

      <Card className="p-4 border border-yellow-500/30 bg-yellow-500/5" data-testid="card-honesty-note">
        <div className="flex gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            המערכת לא מתחזה לשרת SMTP. השליחה מועברת לקונקטור <code>webhook_email_automation</code>
            (מסך אוטומציות), ושם n8n / ספק חיצוני מטפל בשליחה ללקוח. אנחנו רושמים בכנות
            "נמסר לוובהוק" רק כש-HTTP 2xx חזר, ולא טוענים שנשלח מייל אם הוובהוק לא פעיל.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function GeneralInquiryPage() {
  return (
    <AdminGate>
      <GeneralInquiryInner />
    </AdminGate>
  );
}
