import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowRight, CheckCircle2, Mail, Phone, Send, Users, Award, Tag, HeartPulse,
} from "lucide-react";

// Public "קרא עוד" service form for the health-fund database. Mirrors the rights
// service form: 3 request types (info / reminder / treatment). On submit it POSTs
// to /api/hf/public/request, which logs the request and dispatches it through the
// unified webhook bus (NEDARIM3873) so the full info reaches the client by email
// per the automation settings — exactly the same flow as the rights database.

interface HfPublicTopic {
  id: number;
  catalogNo: number;
  kind: string;
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  benefitSummary: string;
  rangeText: string;
  bestFund: string;
  publicSiteText: string;
  serviceUrl: string;
}

const CONTACT_EMAIL = "l023131500@gmail.com";
const CONTACT_PHONE = "02-3131500";

const REQUEST_TYPES = [
  { key: "info", label: "קבלת מידע", description: "פרטי קשר בלבד — נשלח לכם את המידע המלא על ההטבה וההבדלים בין הקופות." },
  { key: "reminder", label: "קבלת מידע ותזכורת", description: "פרטי קשר בלבד — נשלח מידע וגם תזכורת לביצוע במועד הנכון. ללא מסמכים." },
  { key: "treatment", label: 'ביצוע המשימה ע"י צוות בקלות', description: "פתיחת טיפול מלא — צוות בקלות יבצע עבורכם את הבקשה מול הקופה." },
] as const;

type ReqType = "info" | "reminder" | "treatment" | "";

export default function HealthFundServicePage() {
  const { toast } = useToast();
  const [, params] = useRoute("/health-fund-service/:id");
  const id = params?.id;

  const { data: topic, isLoading } = useQuery<HfPublicTopic>({
    queryKey: ["/api/hf/public/topic", id],
    enabled: !!id,
  });

  const [requestType, setRequestType] = useState<ReqType>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitted, setSubmitted] = useState<null | { requestId: number; webhook?: { ok: boolean; status: number } }>(null);

  const missingContact = !fullName.trim() || phone.trim().length < 6 || !email.trim();
  const canSubmit = Boolean(requestType) && !missingContact && termsAccepted;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hf/public/request", {
        topicId: topic?.id,
        requestType,
        fullName,
        phone,
        email,
        address,
        note,
        termsAccepted,
      });
      return (await res.json()) as { ok: boolean; requestId: number; webhook?: { ok: boolean; status: number } };
    },
    onSuccess: (result) => {
      setSubmitted(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      toast({
        title: "לא ניתן לשלוח את הטופס",
        description: error instanceof Error ? error.message : "בדקו שמולאו שם, טלפון ומייל ואושרו התנאים.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-16" dir="rtl" data-testid="hf-service-notfound">
        <p className="font-medium">הנושא לא נמצא</p>
        <Link href="/health-funds" className="text-primary text-sm mt-3 inline-block">חזרה להשוואת הקופות</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-health-fund-service">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/health-funds" data-testid="link-hfs-home">
            <a className="flex items-center gap-2"><Logo className="h-8 w-auto" /></a>
          </Link>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <HeartPulse className="w-4 h-4 text-primary" /> בקשת מידע מורחב
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5 pb-12">
        {submitted && (
          <Card className="p-6 border border-primary/20 bg-primary/5" data-testid="hf-card-success">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-primary text-primary-foreground p-2"><CheckCircle2 className="w-6 h-6" /></span>
              <div>
                <h2 className="text-xl font-bold">הפנייה התקבלה</h2>
                <p className="text-sm leading-relaxed mt-2">
                  צוות בקלות יטפל בפנייתכם בהקדם. מספר פנייה: {submitted.requestId}.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  המידע המלא יישלח אליכם לפי הפרטים שמילאתם, בהתאם להגדרות. ניתן לקבל מידע ותזכורות ללא עלות.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Topic summary — the basic public info the client already saw */}
        <Card className="p-5 border border-primary/20 bg-primary/5 space-y-3" data-testid="hf-service-topic">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Logo size={36} className="text-primary" />
            <div className="text-sm text-foreground/75 text-left" dir="ltr">
              <div className="flex items-center gap-2 justify-end"><Phone className="w-4 h-4" /> {CONTACT_PHONE}</div>
              <div className="flex items-center gap-2 justify-end"><Mail className="w-4 h-4" /> {CONTACT_EMAIL}</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground tabular-nums">#{topic.catalogNo}</span>
              {topic.category && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted/60 border border-border inline-flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {topic.category}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold mt-1.5" data-testid="text-hfs-title">{topic.topic}</h1>
            {topic.audience && (
              <p className="text-sm text-foreground/80 mt-2 flex items-start gap-1">
                <Users className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span><span className="font-medium">למי מיועד: </span>{topic.audience}</span>
              </p>
            )}
            {topic.benefitSummary && <p className="text-sm text-foreground/80 mt-1">{topic.benefitSummary}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
              {topic.rangeText && (
                <span className="font-semibold text-primary">{topic.rangeText}</span>
              )}
              {topic.bestFund && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> הקופה המיטיבה: <span className="font-medium text-foreground">{topic.bestFund}</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            המידע המלא — החזרים מדויקים מתוך העלות, תנאי זכאות ממוספרים, מסמכים נדרשים ואופן הבקשה בכל קופה — יישלח אליכם לאחר שליחת הטופס.
          </p>
        </Card>

        {/* Request type */}
        <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="hf-card-request-type">
          <div>
            <h2 className="text-base font-semibold">איך תרצו להמשיך?</h2>
            <p className="text-xs text-muted-foreground mt-1">הבחירה קובעת מה נשלח אליכם וכיצד נטפל בפנייה.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {REQUEST_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setRequestType(t.key)}
                className={`text-right rounded-lg border p-4 transition-colors hover-elevate ${
                  requestType === t.key ? "border-primary bg-primary/10" : "border-border bg-background/70"
                }`}
                data-testid={`button-hf-request-type-${t.key}`}
              >
                <span className="font-semibold text-sm">{t.label}</span>
                <span className="block text-xs text-muted-foreground mt-2 leading-relaxed">{t.description}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Contact details */}
        <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="hf-card-contact">
          <h2 className="text-base font-semibold">פרטי קשר</h2>
          <p className="text-xs text-muted-foreground">נדרשים שם מלא, טלפון ומייל. כתובת המגורים עוזרת לנו להתאים את המידע. לא נבקש ת.ז. או מסמכים בשלב זה.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">שם מלא *</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="input-hf-fullname" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">טלפון לחזרה *</span>
              <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-hf-phone" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">מייל *</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-hf-email" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">כתובת מגורים</span>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="עיר, רחוב ומספר" data-testid="input-hf-address" />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-muted-foreground">הערה (לא חובה)</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" data-testid="textarea-hf-note" />
          </label>
        </Card>

        {/* Terms + submit */}
        <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="hf-card-submit">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              data-testid="checkbox-hf-terms"
            />
            <span>
              אני מאשר/ת שהפרטים נמסרים לצורך קבלת מידע ומיצוי זכויות, נכונים ועדכניים כמיטב ידיעתי, אינם מהווים החלטת זכאות סופית,
              וצוות בקלות רשאי ליצור קשר בטלפון / וואטסאפ / מייל לפי הפרטים שמילאתי. ראו גם <a className="underline" href="#/terms" target="_blank">תנאי השירות ומדיניות הפרטיות</a>.
            </span>
          </label>
          {(!requestType || missingContact) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="hf-submit-notice">
              לפני השליחה צריך לבחור איך להמשיך ולמלא שם מלא, טלפון ומייל.
            </div>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => {
              if (!canSubmit) {
                toast({ title: "חסרים פרטים", description: "בחרו סוג פנייה, מלאו שם, טלפון ומייל ואשרו את התנאים.", variant: "destructive" });
                return;
              }
              submitMutation.mutate();
            }}
            data-testid="button-hf-submit"
          >
            <Send className="w-4 h-4 ml-1" />
            {submitMutation.isPending ? "שולח את הטופס..." : "שליחת הבקשה לבקלות"}
          </Button>
        </Card>

        <div className="pt-1">
          <Link href="/health-funds" data-testid="link-hfs-back">
            <a className="text-sm text-primary inline-flex items-center gap-1">
              <ArrowRight className="w-4 h-4" /> חזרה להשוואת הקופות
            </a>
          </Link>
        </div>
      </main>
    </div>
  );
}
