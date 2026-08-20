import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bot, Power, Save, Phone, Mail, MessageCircle, ExternalLink, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminGate } from "@/components/admin-gate";

// Admin page that controls the public-facing floating chatbot.
// - Toggle: enabled / disabled (read by /api/public/chatbot/config).
// - Hebrew copy: intro, CTA, closing.
// - Admin-only system instructions: free-text guidelines that are stored
//   server-side but never returned to public callers.

interface ChatbotConfigResponse {
  key: string;
  enabled: boolean;
  config: {
    intro?: string;
    instructions?: string;
    ctaText?: string;
    closingText?: string;
    contact?: { phone?: string; email?: string; whatsapp?: string };
  };
  updatedAt: string;
}

function ChatbotAdminInner() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ChatbotConfigResponse>({ queryKey: ["/api/admin/chatbot"] });

  const [enabled, setEnabled] = useState(false);
  const [intro, setIntro] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [closingText, setClosingText] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(Boolean(data.enabled));
    setIntro(data.config?.intro ?? "");
    setInstructions(data.config?.instructions ?? "");
    setCtaText(data.config?.ctaText ?? "");
    setClosingText(data.config?.closingText ?? "");
    setPhone(data.config?.contact?.phone ?? "");
    setEmail(data.config?.contact?.email ?? "");
    setWhatsapp(data.config?.contact?.whatsapp ?? "");
  }, [data]);

  async function save(extra: Partial<{ enabled: boolean }> = {}) {
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/admin/chatbot", {
        enabled: extra.enabled !== undefined ? extra.enabled : enabled,
        intro,
        instructions,
        ctaText,
        closingText,
        contact: { phone, email, whatsapp },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot"] });
      toast({ title: "נשמר", description: "ההגדרות עודכנו." });
    } catch (err: any) {
      toast({
        title: "השמירה נכשלה",
        description: err?.message || "נסו שוב",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(next: boolean) {
    setEnabled(next);
    await save({ enabled: next });
  }

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-chatbot-admin">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" /> צ׳אטבוט באתר הציבורי
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          בוט צף שמופיע בפינת האתר הציבורי. שני נתיבים: שאלות על מיצוי זכויות/הטבות, או בקשת סיוע מארגון בקלות.
          התשובות מבוססות על המאגר אך מוצגות בקצרה — לעולם לא נחשפים כל פרטי הזכות, התסריטים הפנימיים, או הגוף המטפל.
          לידים שמגיעים מהבוט נכנסים ל־webhook הקיים (NEDARIM3873) ולמסך הלידים הנכנסים.
        </p>
      </header>

      <Card className="p-5 border border-card-border space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Power className={`w-5 h-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="font-semibold text-sm">סטטוס הבוט</div>
              <div className="text-xs text-muted-foreground">
                {enabled ? "הבוט מוצג כרגע באתר הציבורי" : "הבוט כבוי — לא מוצג למבקרים באתר"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              data-testid="chatbot-toggle-enabled"
              checked={enabled}
              onCheckedChange={(v) => toggle(Boolean(v))}
              disabled={isLoading || saving}
            />
            <span className="text-sm font-medium" data-testid="chatbot-status-label">
              {enabled ? "הפעל בוט · מופעל" : "כיבוי בוט · כבוי"}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5 border border-card-border space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> הנחיות פנימיות לבוט
          </h2>
          <p className="text-xs text-muted-foreground">
            הטקסט הזה נשמר במסד הנתונים ואינו נחשף ללקוח. הוא משמש כהנחיה לסגנון התשובות (מותג, גוונים, נושאים מומלצים, גבולות).
          </p>
        </div>
        <Textarea
          data-testid="chatbot-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="min-h-[140px] text-sm"
          placeholder="לדוגמה: לענות בעברית קצרה ומכבדת; להציע פנייה למשרד בנושאים רגישים; לא לחשוף עלויות פנימיות..."
          aria-label="הנחיות פנימיות לבוט"
        />
      </Card>

      <Card className="p-5 border border-card-border space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold">טקסטים שמוצגים ללקוח</h2>
          <p className="text-xs text-muted-foreground">השדות הללו מוצגים בפועל בבוט באתר הציבורי.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">משפט פתיחה</Label>
            <Textarea
              data-testid="chatbot-intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className="text-sm min-h-[80px]"
              aria-label="משפט פתיחה"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CTA אחרי תשובה</Label>
            <Textarea
              data-testid="chatbot-cta"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="text-sm min-h-[80px]"
              aria-label="CTA אחרי תשובה"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">הודעת סיום</Label>
            <Textarea
              data-testid="chatbot-closing"
              value={closingText}
              onChange={(e) => setClosingText(e.target.value)}
              className="text-sm min-h-[60px]"
              aria-label="הודעת סיום"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 border border-card-border space-y-4">
        <h2 className="font-semibold">פרטי קשר שמוצגים בבוט</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> טלפון</Label>
            <Input data-testid="chatbot-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> מייל</Label>
            <Input data-testid="chatbot-email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</Label>
            <Input data-testid="chatbot-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="text-sm" />
          </div>
        </div>
      </Card>

      <Separator />

      <div className="flex items-center gap-3 flex-wrap">
        <Button data-testid="chatbot-save" onClick={() => save()} disabled={saving || isLoading} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "שומר..." : "שמירה"}
        </Button>
        <a
          href="/#/"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary inline-flex items-center gap-1 underline"
          data-testid="chatbot-preview-link"
        >
          תצוגה מקדימה באתר הציבורי <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function ChatbotAdminPage() {
  return (
    <AdminGate>
      <ChatbotAdminInner />
    </AdminGate>
  );
}
