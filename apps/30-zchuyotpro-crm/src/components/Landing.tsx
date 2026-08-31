import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, Wallet, HandHeart, Lock, PhoneCall, ArrowLeft } from "lucide-react";
import {
  ClientFileIllustration,
  PartnersHandshakeIllustration,
  FinanceLedgerIllustration,
  SecureVaultIllustration,
} from "@/components/illustrations";

const FEATURES = [
  {
    icon: Users,
    illustration: ClientFileIllustration,
    title: "תיק לקוח דיגיטלי מלא",
    description:
      "פרטים אישיים, בני משפחה, קופת חולים, דיור ורכבים — כל הנתונים במקום אחד, עם קטלוג זכאויות מותאם ומעקב סטטוס לכל זכות: לבדיקה, מומלצת, בטיפול או מומשה.",
  },
  {
    icon: HandHeart,
    illustration: PartnersHandshakeIllustration,
    title: "שיתופי פעולה בהסכמת הלקוח",
    description:
      "הפניה ליועץ ביטוח, משכנתאות או זכויות — הלקוח רואה בדיוק אילו שדות יועברו ומאשר לפני שכל פרט יוצא מהמערכת. שום נתון לא זז בלי אישור מפורש.",
  },
  {
    icon: Wallet,
    illustration: FinanceLedgerIllustration,
    title: "ניהול פיננסי אישי",
    description:
      "יומן תזרים חודשי, תקציבים לפי קטגוריה, ניהול הלוואות ומחשבוני חיסכון — לילדים, לקרן חתונה, לפנסיה ולרכישת דירה. הכל בזמן אמת, גם בדוח המודפס.",
  },
  {
    icon: Lock,
    illustration: SecureVaultIllustration,
    title: "אזור אישי מאובטח ללקוח",
    description:
      "כספת דיגיטלית לסיסמאות ואזורים אישיים לכל נושא, תיוק מסמכים לפי קטגוריה, ומרכז התראות שמלווה כל החלטה — נגיש אך ורק ללקוח ולצוות המשרד שלו.",
  },
];

const CHANNELS = [
  { icon: PhoneCall, label: "שלוחת קול (ימות המשיח)" },
  { icon: ShieldCheck, label: "וואטסאפ דו-כיווני" },
  { icon: Wallet, label: "מייל אוטומטי" },
];

export function Landing() {
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/40 to-accent/30">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold">זכויות פרו</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            מערכת ה-CRM שמלווה את הלקוח שלכם
            <br className="hidden sm:block" /> מהזכאות הראשונה ועד המימוש
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            תיק לקוח מלא, ניהול פיננסי אישי, שיתופי פעולה עם יועצים בהסכמה מלאה,
            ואוטומציה בקול, בוואטסאפ ובמייל — הכל במקום אחד, בעברית, ובאבטחה
            מלאה לכל משרד.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link to="/auth">
                כניסה למערכת
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <a href="#features">לתכונות המערכת</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">כל מה שהמשרד שלכם צריך</h2>
          <p className="mt-3 text-muted-foreground">
            נבנה עבור אנשי מקצוע שמלווים לקוחות במימוש זכויות — פיננסים, ביטוח,
            נדל&quot;ן ועוד
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} className="overflow-hidden shadow-md">
              <div className="flex items-center justify-center bg-secondary/40 px-6 py-4">
                <f.illustration className="h-28 w-full max-w-[220px]" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {f.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Automation channels */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            סנכרון אוטומטי בכל הערוצים
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            כל שיחה, הודעה ומייל נכנס נרשם אוטומטית בציר הלקוח הנכון — כך שהצוות
            תמיד רואה תמונה מלאה, בלי הקלדה כפולה.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {CHANNELS.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm"
              >
                <c.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground">מוכנים להתחיל?</h2>
        <p className="mt-3 text-muted-foreground">
          כניסה למוצר האמיתי — לא לדף תדמית. פתחו חשבון למשרד שלכם או התחברו אם
          כבר יש לכם חשבון.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="gap-2 text-base">
            <Link to="/auth">
              כניסה / הרשמה
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        זכויות פרו — מערכת ניהול לקוחות, זכאויות ושותפים
      </footer>
    </main>
  );
}
