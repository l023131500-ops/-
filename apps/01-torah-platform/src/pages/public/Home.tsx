import { Link } from "react-router-dom";
import { BookOpen, Users, Search, Plus, Sparkles, MapPin, ScrollText, Heart, ShoppingBag, GraduationCap, FileAudio, Image as ImageIcon, ExternalLink, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { useTenant, useTenantFeature } from "@/hooks/useTenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localDateString } from "@/lib/utils";
import AdsBanner from "@/components/AdsBanner";

export default function Home() {
  const { tenant } = useTenant();
  const hasLessons = useTenantFeature("lessons");
  const hasShop = useTenantFeature("shop");
  const hasDonations = useTenantFeature("donations");
  const hasHalacha = useTenantFeature("halacha_daily");
  const hasMatching = useTenantFeature("ai_matching");

  const { data: tip, isPending: tipPending } = useQuery({
    queryKey: ["tip-of-day", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      // tips is a shared table with no tenant_id — the tip of the day is the
      // same for everyone. Filtering by tenant here returned 400 on every load.
      const { data } = await supabase
        .from("tips")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: halacha, isPending: halachaPending } = useQuery({
    queryKey: ["halacha-today", tenant?.id],
    enabled: !!tenant?.id && hasHalacha,
    queryFn: async () => {
      const today = localDateString();
      const { data } = await supabase
        .from("halacha_daily")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .lte("date", today)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: featuredMaterials } = useQuery({
    queryKey: ["featured-materials", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      // materials.featured_on_homepage: moderator-only flag (column-protected
      // by 20260831070000_materials_protect_moderation_fields.sql), set from
      // admin/Content.tsx's "הצג בדף הבית" toggle — this is the only place
      // that ever reads it back out.
      const { data } = await supabase
        .from("materials")
        .select("id, title, description, category, file_url, media_kind")
        .eq("tenant_id", tenant!.id)
        .eq("status", "approved")
        .eq("featured_on_homepage", true)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const heroBg = tenant?.branding?.hero_image_url;
  /* המקום של מקטע הטיפ/הלכה נשמר כל עוד השאילתה בדרך. בלי זה הכרטיס נחת
     ב-2.87 שניות ודחף את "השירותים שלנו" ב-250px למטה — CLS 0.131,
     קפיצת הפריסה היחידה בעמוד.
     ‎isPending‎ של react-query נשאר ‎true‎ לנצח בשאילתה מושבתת, ולכן
     ההמתנה נספרת רק כשהשאילתה באמת רצה — אחרת נשאר כאן חלל ריק קבוע
     אצל כל דייר שהפיצ'ר כבוי אצלו. */
  const tipWaiting = tipPending && !!tenant?.id;
  const halachaWaiting = halachaPending && !!tenant?.id && hasHalacha;
  const showTipRow = !!tip || !!halacha || tipWaiting || halachaWaiting;

  return (
    <div>
      {/* Hero */}
      {/* ‎bg-primary‎ אינו קישוט: עד עכשיו הרקע היחיד היה שכבת הגרדיאנט
          השקופה שמעליו, ולכן הרקע האפקטיבי של ה-‎<section>‎ נמדד לבן —
          וטקסט לבן עליו נספר ככשל ניגותיות 1:1 גם ב-Lighthouse וגם
          בבדיקה שלנו. עכשיו הכחול הוא הרקע האמיתי, הגרדיאנט רק מווסת
          אותו, והעמוד גם לא מהבהב לבן אם התמונה מתעכבת. */}
      <section
        className="relative overflow-hidden border-b bg-primary"
        style={{
          backgroundImage: heroBg ? `url(${heroBg})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-primary/95 via-primary/85 to-primary/70" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          {/* היה ‎motion.div‎ של framer-motion — כ-120KB של JavaScript
              שנטענו בכל ביקור בדף הבית עבור הופעה אחת של 0.6 שניות.
              ‎animate-fade-in‎ כבר היה מוגדר ב-tailwind.config ועושה
              בדיוק את אותו הדבר, בלי חבילה. */}
          <div className="max-w-3xl text-primary-foreground animate-fade-in">
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-4">
              {tenant?.branding?.site_name || tenant?.name || "פלטפורמת תורה"}
            </h1>
            <p className="text-lg md:text-2xl opacity-95 mb-8">
              {tenant?.branding?.site_tagline || "המקום המרכזי ללימוד, הוראה, וקהילה תורנית"}
            </p>
            <div className="flex flex-wrap gap-3">
              {hasLessons && (
                <Button asChild size="xl" variant="gold">
                  <Link to="/find-lesson">
                    <Search className="ml-2 h-5 w-5" /> אתר לי שיעור
                  </Link>
                </Button>
              )}
              {hasLessons && (
                <Button asChild size="xl" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  <Link to="/request-lesson">
                    <Plus className="ml-2 h-5 w-5" /> בקש פתיחת שיעור
                  </Link>
                </Button>
              )}
              {!hasLessons && hasShop && (
                <Button asChild size="xl" variant="gold">
                  <Link to="/shop">
                    <ShoppingBag className="ml-2 h-5 w-5" /> חנות תשמישי קדושה
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <AdsBanner placement="homepage" />

      {/* Tip + Halacha row */}
      {/* גובה הכרטיסים קבוע ותוכנם נקטע אחרי שלוש שורות, ולכן השלד ומה
          שמחליף אותו תופסים בדיוק אותו מקום ואין קפיצה. */}
      {showTipRow && (
        <section className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {tip ? (
            <Card className="border-secondary/40 bg-secondary/5 min-h-[11rem]">
              <CardHeader>
                <div className="flex items-center gap-2 text-gold-ink">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  <CardTitle as="h2" className="text-lg">טיפ היומי</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* tips carries a category, not a title. */}
                {tip.category && <div className="font-medium mb-1">{tip.category}</div>}
                <p className="text-sm text-muted-foreground line-clamp-3">{tip.body}</p>
              </CardContent>
            </Card>
          ) : (
            tipWaiting && <Card className="border-secondary/40 bg-secondary/5 min-h-[11rem]" aria-hidden="true" />
          )}
          {halacha ? (
            <Card className="min-h-[11rem]">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <ScrollText className="h-5 w-5" aria-hidden="true" />
                  <CardTitle as="h2" className="text-lg">הלכה יומית</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-medium mb-1">{halacha.title}</div>
                <p className="text-sm text-muted-foreground line-clamp-3">{halacha.body}</p>
                <Button asChild variant="link" className="px-0 mt-2">
                  <Link to="/halacha">לכל ההלכות ←</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            halachaWaiting && <Card className="min-h-[11rem]" aria-hidden="true" />
          )}
        </section>
      )}

      {/* Feature grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-10">השירותים שלנו</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hasLessons && (
            <FeatureCard icon={BookOpen} title="מאגר שיעורים" desc="מאות שיעורי תורה במגוון נושאים" to="/lessons" />
          )}
          {hasLessons && (
            <FeatureCard icon={Search} title="חיפוש שיעור" desc="מצא שיעור שמתאים לך לפי נושא ואזור" to="/find-lesson" />
          )}
          {hasLessons && (
            <FeatureCard icon={GraduationCap} title="הצטרף כמגיד שיעור" desc="הרחב את קהל הלומדים שלך" to="/join-teacher" />
          )}
          {useTenantFeature("community_services") && (
            <FeatureCard icon={MapPin} title="בתי כנסת" desc="מצא בית כנסת בקרבת מקום" to="/synagogues" />
          )}
          {hasHalacha && (
            <FeatureCard icon={ScrollText} title="הלכה יומית" desc="לימוד הלכה בקצרה ובהירות" to="/halacha" />
          )}
          {useTenantFeature("ask_rabbi") && (
            <FeatureCard icon={Users} title="שאל את הרב" desc="קבל מענה לשאלות יומיומיות" to="/ask-rabbi" />
          )}
          {hasShop && (
            <FeatureCard icon={ShoppingBag} title="תשמישי קדושה" desc="ספרים, ציציות, תפילין ועוד" to="/shop" />
          )}
          {hasDonations && (
            <FeatureCard icon={Heart} title="תרומה" desc="תרמו לחיזוק לימוד התורה" to="/donate" />
          )}
          {hasMatching && (
            <FeatureCard icon={Sparkles} title="התאמת AI" desc="אנו נחזיר אליכם עם הצעות מדויקות" to="/find-lesson" />
          )}
        </div>
      </section>

      {/* Featured materials */}
      {!!featuredMaterials?.length && (
        <section className="container mx-auto px-4 py-12 border-t border-border/60">
          <h2 className="font-heading text-3xl md:text-4xl text-center mb-10">חומרי לימוד מומלצים</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredMaterials.map(m => (
              <Card key={m.id} className="h-full border-border/60">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{m.title}</CardTitle>
                  {m.description && <CardDescription>{m.description}</CardDescription>}
                </CardHeader>
                {m.file_url && (
                  <CardContent>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <a href={m.file_url} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" /> צפייה בקובץ
                      </a>
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* מערכות נוספות מבית איגוד השיעורים */}
      <section className="py-16 border-t border-border/60">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl md:text-4xl mb-3">מערכות נוספות מבית איגוד השיעורים</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">כלים מקצועיים נוספים שאנחנו מפתחים עבור עולם התורה</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* These two point at sibling systems. They used to link straight to
                *.vercel.app, which the audience's content filter blocks outright —
                a dead link for the people this site is for. Both are served under
                more30.com, so link there. */}
            <a href="https://more30.com/tamlul" target="_blank" rel="noopener noreferrer">
              <Card className="h-full hover:shadow-lg transition-shadow border-border/60">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <FileAudio className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    תמלול שיעורי תורה
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>
                    תמלול אוטומטי בעזרת AI ועריכה ספרותית ב-3 סגנונות: ליטאי, חסידי, אידיש
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>
            <a href="https://more30.com/modaot" target="_blank" rel="noopener noreferrer">
              <Card className="h-full hover:shadow-lg transition-shadow border-border/60">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    יוצר מודעות AI
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>
                    יצירת מודעות מקצועיות לשיעורי תורה, גמ"ח, בית כנסת ואירועים — בעברית מלאה
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl mb-4">להצטרף לקהילה</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            הירשמו למערכת שלנו וקבלו גישה מלאה לכל השירותים: שיעורים, חומרי לימוד, פורומים, ועוד.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/auth/sign-up">הרשמה</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth/sign-in">התחברות</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, to }: { icon: any; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="h-full hover:shadow-lg transition-shadow border-border/60">
        <CardHeader>
          <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
