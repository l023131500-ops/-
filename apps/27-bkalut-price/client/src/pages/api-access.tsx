import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, RefreshCcw, ShieldCheck, ShieldOff, ExternalLink, Trash2 } from "lucide-react";

interface ApiSettings {
  ok: boolean;
  requireToken: boolean;
  hasToken: boolean;
  tokenPrefix: string;
  docsUrl: string;
}

export default function ApiAccessPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ApiSettings>({ queryKey: ["/api/admin/api-access"] });
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const togglerequireToken = useMutation({
    mutationFn: async (value: boolean) => {
      const r = await apiRequest("PATCH", "/api/admin/api-access", { requireToken: value });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
      toast({ title: "ההגדרה נשמרה" });
    },
    onError: () => toast({ title: "שמירה נכשלה", variant: "destructive" }),
  });

  const rotate = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/admin/api-access/rotate", {});
      return r.json();
    },
    onSuccess: (resp) => {
      setRevealedToken(resp.token);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
      toast({ title: "טוקן חדש נוצר", description: "העתיקו אותו כעת — לא נציג אותו שוב." });
    },
    onError: () => toast({ title: "יצירת טוקן נכשלה", variant: "destructive" }),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/admin/api-access/clear", {});
      return r.json();
    },
    onSuccess: () => {
      setRevealedToken(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-access"] });
      toast({ title: "הטוקן בוטל" });
    },
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} הועתק` });
    } catch {
      toast({ title: "לא ניתן להעתיק", variant: "destructive" });
    }
  }

  const exampleUrl = typeof window !== "undefined" ? `${window.location.origin}/api/external` : "/api/external";
  const curl = revealedToken
    ? `curl -H "Authorization: Bearer ${revealedToken}" ${exampleUrl}/health`
    : `curl -H "Authorization: Bearer <TOKEN>" ${exampleUrl}/health`;

  return (
    <div className="space-y-6" data-testid="page-api-access">
      <header>
        <p className="text-sm text-muted-foreground">גישה ל-API ואוטומציות</p>
        <h1 className="text-2xl font-bold mt-1">ניהול API חיצוני</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          ניהול גישה לכלי אוטומציה (n8n / Make / סקריפטים) לקריאת נתוני בקלות.
          הגדירו טוקן והפעילו בקרה — או פתחו גישה אנונימית קריאה בלבד (לא מומלץ).
        </p>
      </header>

      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-api-token">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary"><Key className="w-5 h-5" /></span>
            <div>
              <h2 className="font-semibold">סטטוס טוקן</h2>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "טוען..."
                  : data?.hasToken
                  ? `מוגדר טוקן (תחילית: ${data.tokenPrefix}…)`
                  : "אין טוקן מוגדר"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data?.requireToken ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary"><ShieldCheck className="w-4 h-4" /> דרישת טוקן פעילה</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700"><ShieldOff className="w-4 h-4" /> פתוח לקריאה אנונימית</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={() => rotate.mutate()} disabled={rotate.isPending} data-testid="button-rotate-token">
            <RefreshCcw className="w-4 h-4 ml-1" />
            {data?.hasToken ? "החלפת טוקן" : "יצירת טוקן חדש"}
          </Button>
          {data?.hasToken && (
            <Button variant="outline" onClick={() => clear.mutate()} disabled={clear.isPending} data-testid="button-clear-token">
              <Trash2 className="w-4 h-4 ml-1" />
              ביטול טוקן קיים
            </Button>
          )}
        </div>

        {revealedToken && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2" data-testid="reveal-token">
            <div className="text-xs font-semibold text-primary">טוקן חדש — העתיקו ושמרו במקום מאובטח:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono p-2 rounded bg-card border break-all">{revealedToken}</code>
              <Button size="sm" variant="outline" onClick={() => copy(revealedToken, "הטוקן")}><Copy className="w-3.5 h-3.5" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              שומרים רק את ההאש של הטוקן. אם תאבדו אותו תצטרכו ליצור טוקן חדש.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <div>
            <p className="text-sm font-medium">דרישת טוקן</p>
            <p className="text-xs text-muted-foreground">
              כשכבוי — נקודות הקצה /api/external/* פתוחות לכל מי שמכיר את הכתובת. השתמשו רק בסביבת בדיקה.
            </p>
          </div>
          <Switch
            checked={Boolean(data?.requireToken)}
            onCheckedChange={(v) => togglerequireToken.mutate(v)}
            data-testid="switch-require-token"
          />
        </div>
      </Card>

      <Card className="p-5 border border-card-border bg-card space-y-3" data-testid="card-api-docs">
        <div className="flex items-center gap-3">
          <span className="rounded-full p-2 bg-primary/10 text-primary"><ExternalLink className="w-5 h-5" /></span>
          <div>
            <h2 className="font-semibold">תיעוד וקריאה לדוגמה</h2>
            <p className="text-xs text-muted-foreground">קריאה לכל המסלולים תחת <code className="font-mono text-[11px]">/api/external</code></p>
          </div>
        </div>
        <div className="text-xs space-y-2">
          <p className="font-semibold">דוגמה (Bearer):</p>
          <code className="block text-[11px] font-mono p-2 rounded bg-muted border break-all">{curl}</code>
          <p className="font-semibold">דוגמה (Query):</p>
          <code className="block text-[11px] font-mono p-2 rounded bg-muted border break-all">
            {exampleUrl}/rights/public?token=&lt;TOKEN&gt;
          </code>
          <p className="font-semibold pt-2">מסלולים זמינים:</p>
          <ul className="list-disc pr-5 space-y-1 leading-relaxed">
            <li><code className="font-mono">/api/external</code> — מפת המסלולים</li>
            <li><code className="font-mono">/api/external/health</code> — בדיקת חיבור</li>
            <li><code className="font-mono">/api/external/rights/public</code> — קטלוג זכויות ציבורי (סניטרי)</li>
            <li><code className="font-mono">/api/external/rights</code> — נתוני זכויות מלאים</li>
            <li><code className="font-mono">/api/external/orgs</code> — עמותות וארגונים</li>
            <li><code className="font-mono">/api/external/params-topics</code> — מאגר פרמטרים/נושאים</li>
            <li><code className="font-mono">/api/external/potential/submissions</code> — שליחות סורק פוטנציאל</li>
            <li><code className="font-mono">/api/external/service-submissions</code> — פניות שירות מהאתר</li>
            <li><code className="font-mono">/api/external/inbound-leads</code> — לידים נכנסים</li>
            <li><code className="font-mono">/api/external/clients</code> — לקוחות זכויות</li>
            <li><code className="font-mono">/api/external/financial/clients</code> — לקוחות ניהול פיננסי</li>
            <li><code className="font-mono">/api/external/financial/tasks?clientId=…</code> — משימות CRM</li>
            <li><code className="font-mono">/api/external/financial/messages?clientId=…</code> — הודעות CRM</li>
            <li><code className="font-mono">/api/external/financial/documents?clientId=…</code> — מסמכים</li>
            <li><code className="font-mono">/api/external/financial/plans?clientId=…</code> — תוכניות פיננסיות</li>
            <li><code className="font-mono">/api/external/financial/activity?clientId=…</code> — יומן פעילות</li>
            <li><code className="font-mono">/api/external/financial/reminders?clientId=…</code> — תזכורות</li>
            <li><code className="font-mono">/api/external/financial/reports?clientId=…</code> — דוחות חודשיים</li>
          </ul>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          חשוב — המסך הזה מנהל גישה לקריאה. בקשות כתיבה (שינוי, יצירת ליד וכו') ממשיכות לעבור דרך נקודות הקצה הקיימות והאוטומציות.
        </div>
      </Card>
    </div>
  );
}
