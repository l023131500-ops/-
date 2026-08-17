import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Wallet,
  ArrowLeft,
  FileText,
  HeartHandshake,
  ShieldCheck,
  ScrollText,
  CheckCircle2,
  Compass,
  Users,
  Search,
  Lightbulb,
  Bell,
  Info,
  HeartPulse,
} from "lucide-react";

const CONTACT_PHONE = "02-3131500";
const CONTACT_EMAIL = "l023131500@gmail.com";

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PublicLanding() {
  const { toast } = useToast();
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadDone, setLeadDone] = useState(false);

  async function submitFinancialLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) {
      toast({ title: "שדות חובה", description: "שם וטלפון נדרשים", variant: "destructive" });
      return;
    }
    setLeadSubmitting(true);
    try {
      await apiRequest("POST", "/api/financial/leads", {
        fullName: leadName.trim(),
        phone: leadPhone.trim(),
        email: leadEmail.trim() || undefined,
        message: leadMessage.trim() || undefined,
        source: "public_marketing_home",
        page: "/",
        formName: "home-financial-interest",
        requestType: "info",
        module: "general",
      });
      setLeadDone(true);
      toast({ title: "תודה!", description: "נחזור אליך בקרוב." });
    } catch (err: any) {
      toast({
        title: "שליחה נכשלה",
        description: err?.message || "נסו שוב או צרו קשר טלפוני",
        variant: "destructive",
      });
    } finally {
      setLeadSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
            (הקצה האינליין-סופי ב-RTL), ושם נגמר הנווט. נמדד ב-390px אחרי
            שהכפתור נוסף למערכת הזו: "ניהול פיננסי" ו"יצירת קשר" מכוסים
            והלחיצה מגיעה לכדור. `--more30-auth-inset` הוא הרוחב שהכדור
            מפרסם בפועל; החיסור מקזז את השוליים שה-container כבר נותן.

            ⚠️ שינוי תצוגה בלבד, ונפרס רק ל-`mechiron-more30` ב-Vercel —
            אינו נוגע בשרת `bkalut-app` המוגן. */}
        {/* חמישה קישורים + לוגו אינם נכנסים ל-390px, ולכן שום ריפוד לא יפנה
            כאן מקום: כיווץ הנווט רק דחס אותו והוא נשאר מתחת לכדור (נמדד
            פעמיים — 14×36 ואז 43×36). במקום להילחם על הרוחב, הנווט יורד
            לשורה משלו במובייל ומתחיל מתחת לכדור לגמרי. ‎min-h-14‎ ולא
            ‎h-14‎ כדי שהסרגל יגדל במקום שהשורה השנייה תגלוש ממנו. */}
        <div
          className="max-w-[1200px] mx-auto px-4 sm:px-6 min-h-14 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1 sm:flex-nowrap sm:py-0"
          style={{
            paddingInlineEnd:
              'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1200px) / 2)))',
          }}
        >
          <Link href="/" data-testid="link-home-public" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          {/* ‎min-w-0‎ אינו קישוט. פריט flex מקבל ‎min-width:auto‎ כברירת מחדל,
              ולכן הוא **מסרב להתכווץ מתחת לרוחב התוכן שלו** — וחמשת הקישורים
              כאן רחבים מ-390px. נמדד: השורה יצאה ‎x14..404‎ בחלון של 390,
              כלומר הריפוד שהפניתי לכפתור הכניסה דחף את השורה החוצה במקום
              לכווץ את הנווט, ושני הקישורים האחרונים נחתו מתחת לכדור.
              ‎min-w-0‎ מאפשר את הכיווץ, ו-‎overflow-x-auto‎ נותן לגלול אליהם
              במקום לחתוך אותם. */}
          {/* ‎w-full‎ במובייל = שורה משלו, מתחת לכדור. ‎min-w-0‎ מאפשר לפריט
              flex להתכווץ מתחת לרוחב התוכן שלו (ברירת המחדל היא
              ‎min-width:auto‎, שמונעת בדיוק את זה), ו-‎overflow-x-auto‎ נותן
              לגלול אל הקישורים האחרונים במקום לחתוך אותם. */}
          <nav className="flex w-full min-w-0 items-center gap-3 overflow-x-auto pb-1 text-[13px] sm:w-auto sm:pb-0">
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="hover-elevate rounded-md px-2 py-1"
              data-testid="nav-public-about"
            >
              עלינו
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how")}
              className="hover-elevate rounded-md px-2 py-1"
              data-testid="nav-public-how"
            >
              איך זה עובד
            </button>
            <Link
              href="/health-funds"
              className="hover-elevate rounded-md px-2 py-1"
              data-testid="nav-public-health-funds"
            >
              השוואת קופות חולים
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("financial-interest")}
              className="hover-elevate rounded-md px-2 py-1"
              data-testid="nav-public-financial"
            >
              ניהול פיננסי
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="hover-elevate rounded-md px-2 py-1"
              data-testid="nav-public-contact"
            >
              יצירת קשר
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ארגון בקלות · זכויות והטבות לכל משפחה</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              בקלות — הזכויות וההטבות שמגיעות לכם, בלי בירוקרטיה
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed">
              ארגון בקלות מסייע למשפחות לממש זכויות והטבות שמגיעות להן לפי חוק.
              מידע ברור, ליווי אישי, ובדיקת זכאות בקליק — לכל נושא רלוונטי.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/eligibility" data-testid="cta-hero-eligibility">
                <Button size="lg" className="w-full sm:w-auto">
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  בדיקת זכאות בקליק
                </Button>
              </Link>
              <Link href="/health-funds" data-testid="cta-hero-health-funds">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <HeartPulse className="w-4 h-4 ml-2" />
                  השוואת קופות חולים
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => scrollToSection("how")}
                data-testid="cta-hero-how"
              >
                איך זה עובד
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              שירות ציבורי · ללא עלות לבדיקה ראשונית · ליווי ברור וממוקד.
            </p>
          </div>
        </section>

        {/* ABOUT / VALUE */}
        <section id="about" className="border-b border-border">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge variant="secondary" className="mb-3">מה אנחנו עושים</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">מסבירים, מלווים, ועוזרים לממש בפועל</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                המון משפחות מפספסות זכויות והטבות פשוט כי לא יודעות עליהן או לא יודעות איך לגשת.
                אנחנו מצמצמים את הפער הזה — בלשון ברורה, צעדים מעשיים, וליווי אנושי כשצריך.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <Card className="p-6 border border-card-border rounded-xl">
                <div className="rounded-full p-2.5 bg-primary/10 text-primary w-fit mb-3">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">איתור הזכויות שלכם</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  מאתרים יחד את הזכויות וההטבות שמגיעות למשפחה לפי המצב האישי — בלי לרדוף אחרי טפסים.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl">
                <div className="rounded-full p-2.5 bg-primary/10 text-primary w-fit mb-3">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">הסבר ברור ומעשי</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  מה מגיע, מי זכאי, איך מגישים, ומה לשים לב — בעברית פשוטה, בלי “סעיפי חוק” מבלבלים.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl">
                <div className="rounded-full p-2.5 bg-primary/10 text-primary w-fit mb-3">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">ליווי אישי כשצריך</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  במקרים מורכבים — צוות בקלות מלווה עד לקבלת תשובה, בלי שתישארו לבד מול הבירוקרטיה.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-b border-border bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge variant="secondary" className="mb-3">איך זה עובד</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">חמש דרכים שבקלות עוזרת לכם</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                כל פנייה לארגון בקלות מתחילה ממקום אישי — ואתם בוחרים את רמת המעורבות שלנו: ממידע בלבד ועד טיפול מלא בפועל.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="how-it-works-grid">
              <Card className="p-6 border border-card-border rounded-xl relative">
                <div className="absolute top-4 left-4 text-3xl font-bold text-primary/15">1</div>
                <Search className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">איתור הזכויות שמתאימות לכם</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  עוברים לקטלוג הזכויות הציבורי, מחפשים נושא רלוונטי או בוחרים קטגוריה — דיור, בריאות, ילדים, חינוך ועוד.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl relative">
                <div className="absolute top-4 left-4 text-3xl font-bold text-primary/15">2</div>
                <CheckCircle2 className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">בדיקת זכאות בקליק</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  עונים על שאלון קצר ואישי, ובסיומו מקבלים תשובה ברורה: זכאים, אולי, או לא — ומה השלב הבא.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl relative">
                <div className="absolute top-4 left-4 text-3xl font-bold text-primary/15">3</div>
                <Info className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">מידע ברור על הזכות</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  אם בוחרים "מידע בלבד" — נשלח אליכם הסבר אישי על מה מגיע, איך מגישים, ומה לשים לב, בלי טפסים ובלי בלבול.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl relative">
                <div className="absolute top-4 left-4 text-3xl font-bold text-primary/15">4</div>
                <Bell className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">תזכורת לפעולה בזמן הנכון</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  בוחרים "תזכורת" ונדאג להזכיר לכם להגיש או להשלים מסמכים — כך שלא תפספסו מועדים חשובים.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl relative">
                <div className="absolute top-4 left-4 text-3xl font-bold text-primary/15">5</div>
                <HeartHandshake className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">טיפול בפועל על ידי בקלות</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  במקרים מורכבים אפשר לבקש שצוות בקלות יטפל עבורכם בהגשה ובמעקב מול הגורם המטפל — עד לקבלת תשובה.
                </p>
              </Card>
              <Card className="p-6 border border-card-border rounded-xl relative bg-primary/5">
                <Users className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">ליווי ברור וממוקד</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  לכל שלב — צוות בקלות מלווה אתכם בשפה פשוטה ובערוצים שנוחים לכם (טלפון, וואטסאפ, מייל).
                </p>
              </Card>
            </div>
            <div className="text-center mt-8">
              <Link href="/eligibility" data-testid="cta-how-to-eligibility">
                <Button size="lg">
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  התחילו בבדיקה
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="border-b border-border">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <Badge variant="secondary" className="mb-3">למה לבחור בבקלות</Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">שירות אנושי, מקצועי, ולמשפחה כולה</h2>
                <ul className="space-y-3 text-foreground/85">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>מידע מעודכן ומבוסס מקורות רשמיים.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>שפה פשוטה ונגישה — בלי לבלבל אתכם בלשון משפטית.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>ליווי אישי במידת הצורך, על ידי צוות אנושי.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>שמירה מלאה על פרטיות — המידע שלכם נשאר אצלכם.</span>
                  </li>
                </ul>
              </div>
              <Card className="p-7 border border-card-border bg-card rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full p-2 bg-primary/10 text-primary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg">פרטיות וכבוד הלקוח</h3>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  בקלות פועלת תמיד מתוך כבוד למשפחות שפונות אלינו. הפרטים שאתם משאירים משמשים אך ורק
                  למתן מענה ענייני — ולא מועברים לגורם שלישי.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  לכל שאלה: {CONTACT_PHONE} · {CONTACT_EMAIL}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA TO ELIGIBILITY */}
        <section className="border-b border-border bg-primary/5">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">מתחילים בבדיקת זכאות עכשיו</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              מאות נושאים, חיפוש מהיר וברור, ולכל נושא בדיקת זכאות בקליק.
            </p>
            <div className="mt-7">
              <Link href="/eligibility" data-testid="cta-main-eligibility">
                <Button size="lg">
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  למעבר לקטלוג הזכויות
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FINANCIAL INTEREST LEAD (bottom only) */}
        <section id="financial-interest" className="border-b border-border bg-muted/40">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>מבית בקלות</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">מעוניינים להצטרף לניהול פיננסי מבית בקלות?</h2>
                <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">
                  ליווי פיננסי משפחתי לאיזון תקציבי, צמצום חובות וזיהוי הזדמנויות חיסכון —
                  באווירה אישית, ללא גיליונות מסובכים. השאירו פרטים ונחזור אליכם.
                </p>
                <ul className="text-sm space-y-2 mt-4 text-foreground/80">
                  <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> פרטיות מלאה — הנתונים שלכם נשארים אצלכם.</li>
                  <li className="flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-primary" /> ליווי אישי עם מאמן פיננסי.</li>
                  <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> תיאום בין הוצאות לזכויות והטבות מתאימות.</li>
                </ul>
              </div>

              <Card className="p-6 md:p-7 border border-card-border bg-card rounded-xl">
                {leadDone ? (
                  <div className="text-center space-y-3 py-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold">קיבלנו את הפנייה!</h3>
                    <p className="text-sm text-muted-foreground">
                      ניצור איתכם קשר תוך 1–2 ימי עסקים.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitFinancialLead} className="space-y-3.5" data-testid="form-home-financial-lead">
                    <h3 className="font-semibold text-lg">השארת פרטים</h3>
                    <p className="text-xs text-muted-foreground -mt-1">לא לכניסה למערכת — רק כדי שניצור איתכם קשר.</p>
                    {/*
                      טופס יצירת הקשר הוא המקום היחיד בעמוד שבו מבקר מוסר פרטים,
                      וארבעת השדות שלו הוכרזו בלי שם: <label> בלי htmlFor ליד
                      <Input> בלי id. מי שממלא אותו בקורא מסך שמע "עריכה, חובה"
                      ולא ידע אם מבקשים ממנו טלפון או אימייל.
                      ה-* של שדה חובה נשאר חזותי בלבד — required מודיע עליו,
                      וכוכבית בתוך התווית הייתה מוקראת כ"כוכב" באמצע השם.
                    */}
                    <div>
                      <label htmlFor="fin-lead-name" className="text-sm font-medium block mb-1.5">שם מלא <span className="text-destructive" aria-hidden="true">*</span></label>
                      <Input
                        id="fin-lead-name"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="שם פרטי ושם משפחה"
                        autoComplete="name"
                        required
                        data-testid="input-home-fin-name"
                      />
                    </div>
                    <div>
                      <label htmlFor="fin-lead-phone" className="text-sm font-medium block mb-1.5">טלפון <span className="text-destructive" aria-hidden="true">*</span></label>
                      <Input
                        id="fin-lead-phone"
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        type="tel"
                        placeholder="05X-XXXXXXX"
                        autoComplete="tel"
                        required
                        data-testid="input-home-fin-phone"
                      />
                    </div>
                    <div>
                      <label htmlFor="fin-lead-email" className="text-sm font-medium block mb-1.5">אימייל</label>
                      <Input
                        id="fin-lead-email"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        type="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        data-testid="input-home-fin-email"
                      />
                    </div>
                    <div>
                      <label htmlFor="fin-lead-message" className="text-sm font-medium block mb-1.5">קצת על הצורך (לא חובה)</label>
                      <Textarea
                        id="fin-lead-message"
                        value={leadMessage}
                        onChange={(e) => setLeadMessage(e.target.value)}
                        rows={3}
                        placeholder="למשל: רוצים לבנות תקציב חודשי, להפחית חובות, או לבחון יעדים."
                        data-testid="input-home-fin-message"
                      />
                    </div>
                    <div className="pt-1">
                      <Button type="submit" size="lg" disabled={leadSubmitting} className="w-full" data-testid="button-home-fin-submit">
                        {leadSubmitting ? "שולח..." : "שלחו לי פרטים"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      שליחה כפופה ל
                      <Link href="/terms" className="underline mx-1" data-testid="link-terms-home">
                        תנאי שימוש ומדיניות פרטיות
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="border-b border-border">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 text-center">
            <h2 className="text-2xl font-bold">יצירת קשר</h2>
            <p className="text-muted-foreground mt-2">
              שאלה? בקשת ייעוץ? פנייה כללית? מוזמנים לדבר איתנו.
            </p>
            <p className="text-base text-foreground/85 mt-5">
              טלפון: <a className="underline" href={`tel:${CONTACT_PHONE.replace(/[^0-9]/g, "")}`} data-testid="link-contact-phone">{CONTACT_PHONE}</a>
            </p>
            <p className="text-base text-foreground/85 mt-1">
              דוא"ל: <a className="underline" href={`mailto:${CONTACT_EMAIL}`} data-testid="link-contact-email">{CONTACT_EMAIL}</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center md:text-right">
            ארגון בקלות · {CONTACT_PHONE} · {CONTACT_EMAIL}
            <div className="mt-1">להבחין תמיד בין זכות לפי חוק לבין אפשרות לפנייה לסיוע התנדבותי.</div>
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
