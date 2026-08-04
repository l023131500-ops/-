import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ArrowRight, CheckCircle2, ScrollText, Wallet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CONTACT_PHONE = "02-3131500";
const CONTACT_EMAIL = "l023131500@gmail.com";

export default function PublicFinancial() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "שדות חובה", description: "שם וטלפון נדרשים", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/financial/leads", {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        source: "public_marketing_site",
        page: "/p/financial",
        formName: "public-financial-lead",
        requestType: "info",
        module: "general",
      });
      setDone(true);
      toast({ title: "תודה!", description: "נחזור אליך בקרוב." });
    } catch (err: any) {
      toast({
        title: "שליחה נכשלה",
        description: err?.message || "נסו שוב או צרו קשר טלפוני",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-home-public" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          <Link
            href="/"
            data-testid="link-back-to-catalog"
            className="inline-flex items-center gap-1 text-[13px] hover-elevate rounded-md px-2 py-1"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לאתר
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <Wallet className="w-3.5 h-3.5" />
              ניהול פיננסי מבית בקלות
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              ניהול פיננסי שעובד בשבילך
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              השאירו פרטים ונחזור אליכם לליווי אישי בתקציב, חובות, יעדים והזדמנויות חיסכון.
            </p>
          </div>

          {done ? (
            <Card className="p-8 text-center space-y-3 border border-card-border">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">קיבלנו את הפנייה!</h2>
              <p className="text-sm text-muted-foreground">
                ניצור איתך קשר תוך 1–2 ימי עסקים. בינתיים אפשר לחזור לקטלוג הציבורי.
              </p>
              <Link href="/" data-testid="link-back-after-submit">
                <Button variant="outline" size="sm">
                  <ArrowRight className="w-4 h-4 ml-1" />
                  חזרה לאתר
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-6 md:p-8 border border-card-border">
              <form onSubmit={submit} className="space-y-4" data-testid="form-financial-lead">
                {/* אותו טופס ואותה תקלה כמו בעמוד הבית — תוקן בשני המקומות
                    כדי שלא יישאר מסלול אחד שבו השדות עדיין חסרי שם. */}
                <div>
                  <label htmlFor="fin-name" className="text-sm font-medium block mb-1.5">שם מלא <span className="text-destructive" aria-hidden="true">*</span></label>
                  <Input
                    id="fin-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="שם פרטי ושם משפחה"
                    autoComplete="name"
                    required
                    data-testid="input-fin-name"
                  />
                </div>
                <div>
                  <label htmlFor="fin-phone" className="text-sm font-medium block mb-1.5">טלפון <span className="text-destructive" aria-hidden="true">*</span></label>
                  <Input
                    id="fin-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="05X-XXXXXXX"
                    autoComplete="tel"
                    required
                    data-testid="input-fin-phone"
                  />
                </div>
                <div>
                  <label htmlFor="fin-email" className="text-sm font-medium block mb-1.5">אימייל</label>
                  <Input
                    id="fin-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    data-testid="input-fin-email"
                  />
                </div>
                <div>
                  <label htmlFor="fin-message" className="text-sm font-medium block mb-1.5">קצת על הצורך (לא חובה)</label>
                  <Textarea
                    id="fin-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="למשל: רוצים לבנות תקציב חודשי, להפחית חובות, או לבחון יעדים."
                    data-testid="input-fin-message"
                  />
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    שליחה כפופה ל
                    <Link href="/terms" className="underline mx-1" data-testid="link-terms">
                      תנאי שימוש ומדיניות פרטיות
                    </Link>
                    .
                  </p>
                  <Button type="submit" size="lg" disabled={submitting} data-testid="button-fin-submit">
                    {submitting ? "שולח..." : "שלחו לי פרטים"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center md:text-right">
            מאגר בקלות · {CONTACT_PHONE} · {CONTACT_EMAIL}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/terms"
              className="px-2 py-1 rounded-md hover-elevate inline-flex items-center gap-1"
              data-testid="footer-terms"
            >
              <ScrollText className="w-3.5 h-3.5" />
              תנאים
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
