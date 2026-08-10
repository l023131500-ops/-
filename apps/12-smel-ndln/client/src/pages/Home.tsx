import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useMutation } from "@tanstack/react-query";
import {
  Search,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Building2,
  Sparkles,
  Check,
  Loader2,
  FileSearch,
  Landmark,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { fetchResearch } from "@/lib/nadlanApi";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import type { ResearchProfile } from "@shared/schema";

const STEPS = [
  {
    icon: MapPin,
    title: "הזינו כתובת",
    body: "עיר, רחוב ומספר — זה כל מה שצריך כדי להתחיל את המחקר.",
  },
  {
    icon: FileSearch,
    title: "מנוע המחקר עובד",
    body: "אנחנו מצליבים עשרות מקורות נתונים ממשלתיים רשמיים על הנכס והשכונה.",
  },
  {
    icon: Sparkles,
    title: "מקבלים את הדוח",
    body: "הערכת שווי, ציון כדאיות ותובנות ברורות — בשפה שמובנת לכולם.",
  },
];

const FREE_FEATURES = [
  "הערכת שווי ומחיר ממוצע בשכונה",
  "מגמת מחירים ומדד תשואה",
  "ציון כדאיות עסקה (0–100)",
  "רקע כללי על המקום",
  "הדגשים ותובנות מרכזיות",
];

const PREMIUM_FEATURES = [
  "דוח כדאיות עסקה מעמיק",
  "רקע מפורט על השכונה וסוג האוכלוסייה",
  "רקע על הבניין ונתוני סביבה",
  "מחקר שווי מעמיק והמלצה",
  "התאמה אישית לפי שאלון",
];

export default function Home() {
  const [, navigate] = useHashLocation();
  const { setAddress, setProfile, setLeadSubmitted } = useAppState();
  const { toast } = useToast();
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [num, setNum] = useState("");

  const research = useMutation({
    mutationFn: async (address: string) => {
      return (await fetchResearch(address)) as ResearchProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      setLeadSubmitted(false);
      navigate("/report");
    },
    onError: (err: any) => {
      toast({
        title: "המחקר נכשל",
        description: err?.message ?? "נסו שוב בעוד רגע",
        variant: "destructive",
      });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = [street.trim(), num.trim(), city.trim()]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!address || !city.trim() || !street.trim()) {
      toast({
        title: "חסרים פרטים",
        description: "נא למלא עיר ורחוב לפחות",
        variant: "destructive",
      });
      return;
    }
    setAddress(address);
    research.mutate(address);
  }

  const loading = research.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary to-[hsl(218_50%_22%)] dark:from-[hsl(218_44%_11%)] dark:to-background" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <Landmark className="h-4 w-4" />
            מבוסס על נתוני ממשלה רשמיים
          </div>
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            כל מה שצריך לדעת על הנכס
            <span className="gold-text"> לפני שקונים</span>
          </h1>
          {/* ⚠️ היה "מחקר נדל״ן חכם וברור ... ותובנות אמיתיות על השכונה, במקום
              אחד". שלושה סימנים באותה פסקה: תואר ריק ("חכם וברור"), תואר
              שמגן על עצמו ("תובנות אמיתיות" — לעומת אילו?), ו"במקום אחד"
              שאינו אומר מה יש במקום הזה. הוחלף במה שהדוח באמת מכיל. */}
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            עסקאות שנסגרו בבניין ובסביבה, ייעוד הקרקע והתוכניות שבהליך, מוסדות
            ותחבורה במרחק הליכה — מתוך המרשמים הממשלתיים, עם תאריך ומקור לכל נתון.
          </p>

          {/* Search card */}
          <Card className="mx-auto mt-9 max-w-2xl border-card-border bg-card/95 p-5 text-right shadow-2xl backdrop-blur sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.7fr]">
                {/*
                  שלוש הכותרות האלה נראו כמו תוויות ולא היו כאלה: <label> בלי
                  htmlFor ליד <Input> בלי id הוא טקסט שמרחף ליד השדה. מי שרואה
                  את המסך קורא "עיר" ומבין; קורא מסך הכריז על שדה בלי שם, ומה
                  שנשאר לו היה ה-placeholder — שנעלם ברגע שמתחילים להקליד.
                  הקישור מפורש עכשיו, והעיצוב לא זז.
                */}
                <div className="text-right">
                  <label htmlFor="smel-city" className="mb-1.5 block text-sm font-semibold text-foreground">
                    עיר
                  </label>
                  <Input
                    id="smel-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="תל אביב"
                    data-testid="input-city"
                    disabled={loading}
                  />
                </div>
                <div className="text-right">
                  <label htmlFor="smel-street" className="mb-1.5 block text-sm font-semibold text-foreground">
                    רחוב
                  </label>
                  <Input
                    id="smel-street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="דיזנגוף"
                    data-testid="input-street"
                    disabled={loading}
                  />
                </div>
                <div className="text-right">
                  <label htmlFor="smel-number" className="mb-1.5 block text-sm font-semibold text-foreground">
                    מספר
                  </label>
                  <Input
                    id="smel-number"
                    value={num}
                    onChange={(e) => setNum(e.target.value)}
                    placeholder="100"
                    inputMode="numeric"
                    data-testid="input-number"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={loading}
                data-testid="button-research"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    חוקרים את הנכס…
                  </>
                ) : (
                  <>
                    <Search className="ml-2 h-5 w-5" />
                    חקור נכס
                  </>
                )}
              </Button>
              {loading && (
                <p className="text-center text-sm text-muted-foreground" data-testid="text-loading-hint">
                  המחקר אורך כ־10–30 שניות — מצליבים נתונים ממשלתיים בזמן אמת.
                </p>
              )}
            </form>
          </Card>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" /> נתונים ממשלתיים מאומתים
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-accent" /> ציון כדאיות אובייקטיבי
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-accent" /> מבוסס נתוני נדל״ן ממשלתיים
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold text-foreground">איך זה עובד</h2>
        {/* ⚠️ היה "שלושה צעדים פשוטים ממחיר לא ידוע להחלטה בטוחה".
            "שלושה צעדים פשוטים" הוא מילוי — הקוראים רואים שלושה כרטיסים.
            "החלטה בטוחה" גרוע יותר: דוח מידע אינו יכול להפוך החלטה לבטוחה,
            והבטחה כזו סותרת את הכלל של הפלטפורמה עצמה — מקור ותאריך לכל
            נתון, ו"לא זמין" כשאין. מה שהמערכת באמת נותנת זה בסיס עובדתי. */}
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          מכתובת אחת לתמונה מלאה של מה שידוע על הנכס — ומה לא.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card
              key={s.title}
              className="relative p-6 text-right"
              data-testid={`card-step-${i + 1}`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
                <s.icon className="h-6 w-6" />
              </div>
              <span className="absolute left-6 top-6 text-3xl font-black text-muted/60">
                {i + 1}
              </span>
              <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing / tiers */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-foreground">
            בחרו את רמת המחקר
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            מתחילים בחינם — משדרגים לפרימיום כשרוצים את התמונה המלאה.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Free */}
            <Card className="flex flex-col p-7 text-right" data-testid="card-tier-free">
              <div className="mb-1 text-sm font-semibold text-muted-foreground">חינם</div>
              <div className="text-2xl font-extrabold text-foreground">דוח בסיסי</div>
              <p className="mt-1 text-sm text-muted-foreground">
                לכל גולש, ללא הרשמה.
              </p>
              <ul className="mt-6 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Premium */}
            <Card
              className="relative flex flex-col overflow-hidden border-accent/50 bg-primary p-7 text-right text-white shadow-xl"
              data-testid="card-tier-premium"
            >
              <div className="absolute left-5 top-5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                מומלץ
              </div>
              <div className="mb-1 text-sm font-semibold text-accent">פרימיום</div>
              <div className="text-2xl font-extrabold">דוח כדאיות מלא</div>
              <p className="mt-1 text-sm text-white/70">
                תמונה מלאה + התאמה אישית לצרכים שלכם.
              </p>
              <ul className="mt-6 space-y-3">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-7 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => navigate("/premium")}
                data-testid="button-goto-premium"
              >
                מעוניין בדוח המפורט
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>SMEL NDLN — מחקר נדל״ן. הנתונים מבוססים על מקורות ממשלתיים רשמיים ואינם מהווים ייעוץ.</p>
      </footer>
    </div>
  );
}
