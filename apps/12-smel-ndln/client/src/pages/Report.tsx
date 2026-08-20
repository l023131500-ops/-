import { useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import {
  MapPin,
  TrendingUp,
  Coins,
  Home as HomeIcon,
  Lightbulb,
  Lock,
  ArrowLeft,
  Building2,
  Users,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useAppState } from "@/lib/app-state";
import {
  paramByKey,
  metric,
  formatCurrency,
  formatNumber,
  friendlyInsights,
  localityMismatch,
  placeFacts,
  scoreVerdict,
} from "@/lib/research";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  testid,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  testid: string;
}) {
  return (
    <Card className="p-5 text-right" data-testid={testid}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-foreground" dir="ltr">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

const PREMIUM_ITEMS = [
  { icon: BadgeCheck, text: "דוח כדאיות עסקה מעמיק" },
  { icon: MapPin, text: "רקע מפורט על השכונה" },
  { icon: Users, text: "סוג אוכלוסייה (גיל, השכלה, שכר)" },
  { icon: Building2, text: "רקע על הבניין ונתוני סביבה" },
  { icon: Coins, text: "מחקר שווי מעמיק והמלצה" },
  { icon: Lightbulb, text: "התאמה אישית לפי שאלון" },
];

export default function Report() {
  const [, navigate] = useHashLocation();
  const { profile, address, typedCity } = useAppState();

  useEffect(() => {
    // Guard against direct visits without a profile. Delay slightly so we do
    // not fire during the same render cycle in which navigation + setProfile
    // are batched together (which caused an immediate bounce back to "/").
    if (profile) return;
    const t = setTimeout(() => {
      if (!profile) navigate("/");
    }, 400);
    return () => clearTimeout(t);
  }, [profile, navigate]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        טוען דוח…
      </div>
    );
  }

  const avgPrice =
    (paramByKey(profile, "avg_price")?.value as number) ??
    (metric(profile, "avg_price") as number);
  const yieldVal =
    (paramByKey(profile, "yield")?.value as number) ??
    (metric(profile, "index_yield") as number);
  const priceTrend = paramByKey(profile, "price_increases")?.value as number;
  const insights = friendlyInsights(profile);
  const placeRows = placeFacts(profile);
  const verdict = scoreVerdict(profile.opportunity_score);
  const shownAddress = profile.matched_address || address;
  const wrongCity = localityMismatch(typedCity, profile.locality_name);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -mr-2"
          onClick={() => navigate("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="ml-1.5 h-4 w-4" />
          חיפוש חדש
        </Button>

        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-accent/15 dark:text-accent">
            <MapPin className="h-3.5 w-3.5" />
            דוח נכס
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-foreground" data-testid="text-report-address">
            {shownAddress}
          </h1>
          <p className="mt-1 text-muted-foreground" data-testid="text-report-locality">
            {profile.locality_name}
            {profile.neighborhood_name ? ` · ${profile.neighborhood_name}` : ""}
          </p>
        </div>

        {/* ⚠️ שם העיר שהוקלד אינו מגביל את ההתאמה בפונקציית המחקר: «יפו 30
            ירושלים» אותר כ«דרך יפו-ת"א 30» בתל אביב-יפו, וכל מספר בדוח — הציון,
            המחיר הממוצע, התשואה והמגמה — חושב אז על עיר אחרת מזו שנשאלה. עד
            שההתאמה עצמה תתוקן, הפער נאמר כאן במפורש במקום להיקרא בשקט מתוך
            כותרת הדוח. אין כאן ניחוש: מוצגים שני השמות כפי שהם. */}
        {wrongCity && (
          <Card
            className="mb-8 border-destructive/50 bg-destructive/5 p-5 text-right sm:p-6"
            data-testid="card-locality-mismatch"
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">
                המרשם איתר את הכתובת בעיר אחרת
              </h2>
            </div>
            <p className="leading-relaxed text-muted-foreground" data-testid="text-locality-mismatch">
              ביקשתם כתובת ב<span className="font-semibold text-foreground">{typedCity}</span>,
              והמרשם החזיר התאמה ב
              <span className="font-semibold text-foreground">{profile.locality_name}</span>
              {profile.matched_address ? ` (${profile.matched_address})` : ""}. כל הנתונים
              בדוח הזה — ציון הכדאיות, המחיר הממוצע, מדד התשואה ומגמת המחירים —
              מתייחסים ל{profile.locality_name}, ולא ל{typedCity}.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/")}
              data-testid="button-retry-address"
            >
              <ArrowLeft className="ml-1.5 h-4 w-4" />
              לחיפוש כתובת מדויקת יותר
            </Button>
          </Card>
        )}

        {/* Score + summary */}
        <Card className="mb-8 overflow-hidden">
          <div className="grid items-center gap-6 p-6 md:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex justify-center">
              <ScoreGauge score={profile.opportunity_score} />
            </div>
            <div className="text-right">
              <h2 className="text-xl font-extrabold text-foreground">ציון כדאיות ההשקעה</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                על בסיס הצלבת נתוני שווי, תשואה, נגישות ומאפייני האזור, הנכס מקבל דירוג
                של <span className="font-bold gold-text">{verdict.label}</span>. הציון משקלל
                את היתרונות והחסרונות של המיקום ומספק אינדיקציה אובייקטיבית להשקעה.
              </p>
            </div>
          </div>
        </Card>

        {/* Free stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Coins}
            label="מחיר ממוצע בשכונה"
            value={formatCurrency(avgPrice)}
            sub="עסקאות בשנה האחרונה"
            testid="stat-avg-price"
          />
          <StatCard
            icon={TrendingUp}
            label="מדד תשואה"
            value={yieldVal != null ? Number(yieldVal).toFixed(2) : "—"}
            sub="ככל שגבוה יותר — אטרקטיבי יותר"
            testid="stat-yield"
          />
          <StatCard
            icon={TrendingUp}
            label="מגמת מחירים"
            value={priceTrend != null ? Number(priceTrend).toFixed(2) : "—"}
            sub="אינדקס עליית מחירים אזורי"
            testid="stat-price-trend"
          />
        </div>

        {/* Place background + highlights */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* ⚠️ הפסקה שהייתה כאן נכתבה בלקוח ולא נשענה על אף שדה: "אזור עם אופי
              מובהק המשלב נגישות, ביקוש ותמהיל אוכלוסייה ייחודי" יצא זהה מילה
              במילה לכל כתובת בארץ, והמשפט "הנתונים שאספנו מציירים תמונה" הצהיר
              על נתונים בלי להציג אחד. זה הבלוק היחיד בדוח שכתב טענה בלי מקור,
              בזמן שכל השאר מדפיס "—" כשאין ערך. במקומו: היכן המרשם איתר את
              הכתובת, ואילו שדות סביבה הוא באמת החזיר. */}
          <Card className="p-6 text-right" data-testid="card-place-background">
            <div className="mb-3 flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-primary dark:text-accent" />
              <h3 className="text-lg font-bold text-foreground">רקע על המקום</h3>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              הכתובת אותרה במרשם כ
              <span className="font-semibold text-foreground">
                {profile.matched_address || shownAddress}
              </span>
              {profile.neighborhood_name ? (
                <>, בשכונת <span className="font-semibold text-foreground">{profile.neighborhood_name}</span> ב{profile.locality_name}.</>
              ) : (
                <> ב{profile.locality_name}. שיוך לשכונה אינו זמין במרשם לכתובת זו.</>
              )}
            </p>
            {/* הודעת ההיעדר אינה נושאת "text-place-…": הקידומת הזו שמורה לשורות
                העובדה עצמן, וכל שאילתה שסופרת אותן הייתה סופרת גם אותה. */}
            {placeRows.length > 0 ? (
              <ul className="mt-4 space-y-2" data-testid="list-place-facts">
                {placeRows.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-baseline justify-between gap-3 text-sm"
                    data-testid={`text-place-${f.key}`}
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold text-foreground">{f.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground" data-testid="text-noplace">
                נתוני סביבה נוספים אינם זמינים במרשם לכתובת זו.
              </p>
            )}
          </Card>

          <Card className="p-6 text-right" data-testid="card-highlights">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary dark:text-accent" />
              <h3 className="text-lg font-bold text-foreground">הדגשים מרכזיים</h3>
            </div>
            <ul className="space-y-2.5">
              {insights.map((ins, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                  data-testid={`text-highlight-${i}`}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {ins}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Premium gate */}
        <Card
          className="relative overflow-hidden border-accent/40 bg-primary text-white"
          data-testid="card-premium-gate"
        >
          <div className="grid gap-6 p-7 md:grid-cols-[1fr_auto] sm:p-9">
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent">
                <Lock className="h-3.5 w-3.5" />
                תוכן פרימיום
              </div>
              <h2 className="mt-3 text-2xl font-extrabold">
                רוצים את התמונה המלאה על כדאיות העסקה?
              </h2>
              <p className="mt-2 max-w-xl leading-relaxed text-white/75">
                הדוח המפורט חושף את כל הנתונים מאחורי הציון — פילוח אוכלוסייה, נגישות
                מלאה, רקע על הבניין וניתוח שווי מעמיק, בהתאמה אישית לצרכים שלכם.
              </p>

              {/* Blurred teaser */}
              <div className="relative mt-5">
                <div className="premium-blur grid grid-cols-2 gap-3">
                  {PREMIUM_ITEMS.slice(0, 4).map((it) => (
                    <div key={it.text} className="flex items-center gap-2 rounded-lg bg-white/10 p-3 text-sm">
                      <it.icon className="h-4 w-4 text-accent" />
                      {it.text}
                    </div>
                  ))}
                </div>
              </div>

              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {PREMIUM_ITEMS.map((it) => (
                  <li key={it.text} className="flex items-center gap-2 text-sm text-white/85">
                    <it.icon className="h-4 w-4 shrink-0 text-accent" />
                    {it.text}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="mt-7 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => navigate("/premium")}
                data-testid="button-unlock-premium"
              >
                מעוניין לקבל את המידע המפורט על כדאיות העסקה
              </Button>
            </div>
          </div>
        </Card>

        {/* Sources footnote */}
        {profile.sources?.length > 0 && (
          <div className="mt-8" data-testid="section-sources">
            <Separator className="mb-4" />
            <p className="text-xs text-muted-foreground">
              מקורות הנתונים:{" "}
              {profile.sources.map((s, i) => (
                <span key={s.key}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted hover:text-foreground"
                    data-testid={`link-source-${i}`}
                  >
                    {s.title}
                  </a>
                  {i < profile.sources.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
