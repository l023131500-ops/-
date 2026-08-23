import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Public, no-login inquiry form — the link an org shares (from the intake
// board header) so anyone can open an inquiry that lands on the org's intake
// board. Same base-path pitfall as case.$token.tsx: the app is served under
// /crm (vite base) but the router has no basepath, so API calls go through
// import.meta.env.BASE_URL.
const apiUrl = (path: string) => `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

// Mirrors PARTNER_CATEGORY (features/clients/constants) — the caller's topic
// suggestion pre-filters the routing partner list on the staff side.
const TOPICS = {
  mortgage: "משכנתאות",
  insurance: "ביטוח",
  housing: "דיור",
  employment: "תעסוקה",
  health: "בריאות",
  legal: "משפטי",
  other: "אחר / לא בטוח",
} as const;

export const Route = createFileRoute("/intake-form/$tenantId")({
  head: () => ({ meta: [{ title: "פנייה חדשה | זכויות פרו" }] }),
  ssr: false,
  component: PublicIntakeFormPage,
});

function PublicIntakeFormPage() {
  const { tenantId } = Route.useParams();
  const [tenantName, setTenantName] = useState<string | null | undefined>(undefined);
  const [d, setD] = useState({ full_name: "", phone: "", email: "", topic: "", body: "", website: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`api/public/intake-submit?tenant=${encodeURIComponent(tenantId)}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setTenantName(data?.name ?? null); })
      .catch(() => { if (!cancelled) setTenantName(null); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const submit = async () => {
    setError(null);
    if (!d.full_name.trim()) { setError("נא למלא שם מלא"); return; }
    if (!d.phone.trim() && !d.email.trim()) { setError("נא למלא טלפון או אימייל ליצירת קשר"); return; }
    setSending(true);
    try {
      const r = await fetch(apiUrl("api/public/intake-submit"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          channel: "form",
          full_name: d.full_name,
          phone: d.phone || null,
          email: d.email || null,
          subject: d.topic ? (TOPICS as Record<string, string>)[d.topic] ?? d.topic : null,
          suggested_category: d.topic || null,
          body: d.body || null,
          website: d.website,
        }),
      });
      if (!r.ok) throw new Error("submit failed");
      setSent(true);
    } catch {
      setError("שליחת הפנייה נכשלה, נסו שוב בעוד רגע");
    } finally {
      setSending(false);
    }
  };

  if (tenantName === undefined) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tenantName === null) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-bold">הקישור אינו זמין</h1>
          <p className="text-sm text-muted-foreground">הקישור שגוי או שהארגון אינו קיים.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-semibold">{tenantName}</span>
        </div>

        {sent ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <h2 className="text-lg font-bold">הפנייה התקבלה</h2>
              <p className="text-sm text-muted-foreground">נציג מטעם {tenantName} יחזור אליכם בהקדם.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>פנייה חדשה</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>שם מלא *</Label>
                <Input value={d.full_name} onChange={(e) => setD({ ...d, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>טלפון</Label>
                  <Input dir="ltr" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>אימייל</Label>
                  <Input dir="ltr" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>נושא הפנייה</Label>
                <Select value={d.topic} onValueChange={(v) => setD({ ...d, topic: v })}>
                  <SelectTrigger><SelectValue placeholder="בחרו נושא" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOPICS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>תוכן הפנייה</Label>
                <Textarea rows={5} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder="ספרו לנו במה נוכל לעזור..." />
              </div>
              {/* Honeypot — hidden from real users, bots fill it and get silently dropped */}
              <input
                type="text"
                value={d.website}
                onChange={(e) => setD({ ...d, website: e.target.value })}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={submit} disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
                שליחת פנייה
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                הפרטים נשלחים ישירות אל {tenantName} ולא מועברים לגורם אחר ללא אישורכם.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
