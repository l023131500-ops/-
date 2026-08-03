import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MetaResponse, RightRow, OrgRow } from "@shared/schema";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Building2,
  Layers,
  AlertTriangle,
  ArrowLeft,
  Search,
  ClipboardList,
  Cable,
  Globe,
  CheckCircle2,
  Copy,
  Wallet,
  Link as LinkIcon,
  Sparkles,
  BookOpen,
  Key,
  Briefcase,
  ShoppingCart,
  Settings2,
  ClipboardCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FINANCIAL_SITE_URL } from "@/lib/external-links";
import { getPublicOrigin } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  tone?: "primary" | "warn" | "neutral";
}

function Kpi({ label, value, hint, icon: Icon, testId, tone = "neutral" }: KpiProps) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/8 border-primary/20"
      : tone === "warn"
        ? "bg-[hsl(354_55%_94%)]/40 border-[hsl(354_55%_80%)]/50"
        : "bg-card border-card-border";
  return (
    <Card className={`p-5 border ${toneClass}`} data-testid={`kpi-${testId}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground tracking-wide" data-testid={`kpi-${testId}-label`}>
            {label}
          </span>
          <span
            className="text-3xl font-bold tabular-nums mt-1"
            style={{ fontFeatureSettings: '"tnum"' }}
            data-testid={`kpi-${testId}-value`}
          >
            {value}
          </span>
          {hint && <span className="text-[11px] text-muted-foreground mt-1.5">{hint}</span>}
        </div>
        <div className="rounded-full p-2 bg-background border border-border">
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data: meta, isLoading } = useQuery<MetaResponse>({ queryKey: ["/api/meta"] });
  const { data: rights } = useQuery<RightRow[]>({ queryKey: ["/api/rights"] });
  const { data: orgs } = useQuery<OrgRow[]>({ queryKey: ["/api/orgs"] });
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const origin = getPublicOrigin();
  const publicHomeUrl = `${origin}/#/`;
  const publicEligibilityUrl = `${origin}/#/eligibility`;

  async function copyUrl(label: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(label);
      toast({ title: "הקישור הועתק", description: url });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "לא הצלחנו להעתיק", description: "נסו ידנית.", variant: "destructive" });
    }
  }

  // Top categories preview (by count)
  const topCats: { name: string; count: number }[] = (() => {
    if (!rights) return [];
    const m = new Map<string, number>();
    rights.forEach((r) => r.category && m.set(r.category, (m.get(r.category) ?? 0) + 1));
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  })();

  return (
    <div className="space-y-8" data-testid="page-dashboard">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground" data-testid="text-dashboard-eyebrow">
          סקירה כללית
        </p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          ברוכים הבאים למאגר בקלות
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl mt-1" data-testid="text-dashboard-subtitle">
          מאגר פנימי לחיפוש מהיר של זכויות והטבות לפי חוק, ולצדן עמותות וארגוני סיוע.
          חשוב לזכור — זכות לפי חוק היא לא אותו דבר כמו אפשרות לפנות לעמותה.
          תמיד יש להבחין במפורש מול הלקוח.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="grid-kpis">
        {isLoading || !meta ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" data-testid={`skeleton-kpi-${i}`} />
          ))
        ) : (
          <>
            <Kpi
              label="זכויות / הטבות במאגר"
              value={meta.rightsCount}
              hint="זכויות לפי חוק"
              icon={FileText}
              testId="rights"
              tone="primary"
            />
            <Kpi
              label="עמותות וארגוני סיוע"
              value={meta.orgsCount}
              hint="גופים לפנייה לסיוע"
              icon={Building2}
              testId="orgs"
            />
            <Kpi
              label="קטגוריות נושאים"
              value={meta.categoriesCount}
              hint="קיבוץ לפי תחום"
              icon={Layers}
              testId="categories"
            />
            <Kpi
              label="דורש ניסוח צנוע"
              value={meta.sensitiveCount}
              hint="צניעות/פריון/הריון/לידה בלבד"
              icon={AlertTriangle}
              testId="modesty"
              tone="warn"
            />
          </>
        )}
      </section>

      <section
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="grid-admin-shortcuts"
      >
        <Card
          className="p-5 border border-primary/30 bg-gradient-to-br from-primary/8 to-card flex flex-col gap-3"
          data-testid="card-admin-financial"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base">ניהול פיננסי מבית בקלות</h2>
              <p className="text-xs text-muted-foreground">מערכת הניהול הפיננסי — לאדמין בלבד</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            כניסה לניהול לקוחות, יעדים, תזרים והגדרות של מערכת הניהול הפיננסי המשלימה.
          </p>
          <div className="flex flex-col gap-2 mt-auto">
            <Button asChild className="gap-2" data-testid="button-admin-financial">
              <a href={FINANCIAL_SITE_URL} target="_blank" rel="noreferrer">
                <Wallet className="w-4 h-4" />
                פתיחת אתר הניהול הפיננסי
                <ArrowLeft className="w-4 h-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2" data-testid="button-internal-financial">
              <Link href="/financial">
                <Wallet className="w-4 h-4" />
                מודול ניהול פיננסי פנימי
              </Link>
            </Button>
            <div
              dir="ltr"
              className="text-[10px] font-mono px-2 py-1 rounded bg-muted/60 border border-border break-all text-muted-foreground"
              data-testid="text-financial-site-url"
            >
              {FINANCIAL_SITE_URL}
            </div>
          </div>
        </Card>

        <Card
          className="p-5 border border-card-border bg-card flex flex-col gap-3"
          data-testid="card-public-marketing-url"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base">אתר בקלות הציבורי (שיווקי)</h2>
              <p className="text-xs text-muted-foreground">לשליחה כללית — דף הבית הציבורי</p>
            </div>
          </div>
          <div
            dir="ltr"
            className="text-[11px] font-mono px-2 py-1 rounded bg-muted/60 border border-border break-all"
            data-testid="text-public-marketing-url"
          >
            {publicHomeUrl}
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => copyUrl("marketing", publicHomeUrl)}
              data-testid="button-copy-marketing-url"
            >
              {copied === "marketing" ? (
                <CheckCircle2 className="w-4 h-4 ml-1" />
              ) : (
                <Copy className="w-4 h-4 ml-1" />
              )}
              {copied === "marketing" ? "הועתק" : "העתקת קישור"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={publicHomeUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="button-open-marketing-url"
              >
                <LinkIcon className="w-4 h-4 ml-1" />
                פתיחה בכרטיסייה
              </a>
            </Button>
          </div>
        </Card>

        <Card
          className="p-5 border border-card-border bg-card flex flex-col gap-3"
          data-testid="card-public-eligibility-url"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base">דף בדיקת זכאות לציבור</h2>
              <p className="text-xs text-muted-foreground">לשליחה ללקוחות — קטלוג זכויות ציבורי</p>
            </div>
          </div>
          <div
            dir="ltr"
            className="text-[11px] font-mono px-2 py-1 rounded bg-muted/60 border border-border break-all"
            data-testid="text-public-eligibility-url"
          >
            {publicEligibilityUrl}
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => copyUrl("eligibility", publicEligibilityUrl)}
              data-testid="button-copy-eligibility-url"
            >
              {copied === "eligibility" ? (
                <CheckCircle2 className="w-4 h-4 ml-1" />
              ) : (
                <Copy className="w-4 h-4 ml-1" />
              )}
              {copied === "eligibility" ? "הועתק" : "העתקת קישור"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={publicEligibilityUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="button-open-eligibility-url"
              >
                <LinkIcon className="w-4 h-4 ml-1" />
                פתיחה בכרטיסייה
              </a>
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="grid-quick-actions">
        <Card className="p-6 flex flex-col gap-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-match-title">
                בדיקת התאמה ללקוח
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-match-sub">
                סימון מצבים אישיים וקבלת כיווני בדיקה מתוך המאגר
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/match" data-testid="button-go-match">
                <ClipboardList className="w-4 h-4" /> פתיחת בדיקת התאמה
                <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-rights-title">
                חיפוש בזכויות והטבות
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-rights-sub">
                סינון לפי קטגוריה, גוף מטפל, קהל יעד והתאמה לציבור חרדי
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/rights" data-testid="button-go-rights">
                <Search className="w-4 h-4" /> פתיחת מאגר הזכויות
                <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-[hsl(42_75%_88%)] text-[hsl(22_60%_28%)]">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-orgs-title">
                עמותות וארגוני סיוע
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-orgs-sub">
                לפי תחום, סוג גוף והתאמה לציבור — להציע ללקוח כפנייה משלימה
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/orgs" data-testid="button-go-orgs">
                <Search className="w-4 h-4" /> פתיחת מאגר העמותות
                <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Cable className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-api-title">
                API ואוטומציות
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-api-sub">
                מיפוי שדות המאגר לשליחה למייל, קול, סרטון ובוטים
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/integrations" data-testid="button-go-integrations">
              <Cable className="w-4 h-4" /> פתיחת מרכז API
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-chatbot-title">
                צ׳אטבוט באתר הציבורי
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-chatbot-sub">
                הפעלה / כיבוי, עריכת הנחיות והודעות, תצוגה מקדימה
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/chatbot" data-testid="button-go-chatbot">
              <Globe className="w-4 h-4" /> ניהול הבוט
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-potential-title">
                ניהול שאלון פוטנציאל זכויות
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-potential-sub">
                הפעלה/כיבוי, עריכת סעיפים, כללי מיפוי וקישורים מותאמים
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/potential-admin" data-testid="button-go-potential">
              <Sparkles className="w-4 h-4" /> ניהול הסורק
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-api-access-title">
                גישת API לאוטומציות
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-api-access-sub">
                ניהול טוקן, פתיחת/סגירת גישה ל-/api/external לשימוש n8n והאוטומציות
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/api-access" data-testid="button-go-api-access">
              <Key className="w-4 h-4" /> ניהול גישת API
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Briefcase className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-fincrm-title">
                CRM פיננסי
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-fincrm-sub">
                ניהול לקוחות פיננסיים: משימות, הודעות, מסמכים, תזכורות, דוחות וטיימליין
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/financial-crm" data-testid="button-go-financial-crm">
              <Briefcase className="w-4 h-4" /> פתיחת ה-CRM
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-params-title">
                מאגר פרמטרים ונושאים
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-params-sub">
                רשימה ניתנת להרחבה: תנאים משפחתיים/כלכליים/בריאותיים לזכויות
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/params-topics" data-testid="button-go-params">
              <BookOpen className="w-4 h-4" /> פתיחת המאגר
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card" data-testid="card-price-comparison-public">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-[hsl(150_45%_88%)] text-[hsl(150_50%_24%)]">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-pc-public-title">
                השוואת מחירים
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-pc-public-sub">
                האתר הציבורי להשוואת מחירים בין חנויות — מערכת נפרדת
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <a href={`${origin}/#/price-comparison`} target="_blank" rel="noreferrer" data-testid="button-go-pc-public">
              <ShoppingCart className="w-4 h-4" /> פתיחת האתר הציבורי
              <ArrowLeft className="w-4 h-4" />
            </a>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5" data-testid="card-price-comparison-admin">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Settings2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-pc-admin-title">
                ניהול השוואת מחירים
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-pc-admin-sub">
                קטגוריות, חנויות, מוצרים, מחירים, מבצעים והגדרות — לאדמין בלבד
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/price-comparison-admin" data-testid="button-go-pc-admin">
              <Settings2 className="w-4 h-4" /> פתיחת הניהול
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-card-border bg-card" data-testid="card-health-funds-public">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-[hsl(190_45%_88%)] text-[hsl(190_55%_24%)]">
              <Stethoscope className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-hf-public-title">
                השוואת קופות חולים
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-hf-public-sub">
                מאגר השוואת קופות החולים והשב"ן — קישור נפרד לחיפוש
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2">
            <a href={`${origin}/#/health-funds`} target="_blank" rel="noreferrer" data-testid="button-go-hf-public">
              <Stethoscope className="w-4 h-4" /> פתיחת המאגר הציבורי
              <ArrowLeft className="w-4 h-4" />
            </a>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5" data-testid="card-health-funds-admin">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <Settings2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-hf-admin-title">
                ניהול השוואת קופות חולים
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-hf-admin-sub">
                נושאים, רמות שב"ן, טווחי החזר, פניות והגדרות — לאדמין בלבד
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/health-funds-admin" data-testid="button-go-hf-admin">
              <Settings2 className="w-4 h-4" /> פתיחת הניהול
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 border border-primary/30 bg-primary/5" data-testid="card-community-questionnaires">
          <div className="flex items-center gap-3">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-semibold text-base" data-testid="text-cta-community-title">
                שאלוני גבאי קהילות
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-cta-community-sub">
                בניית שאלונים, סוגי תשובות, קישורים, תגובות והגדרות — לאדמין בלבד
              </p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link href="/community-questionnaires" data-testid="button-go-community">
              <ClipboardCheck className="w-4 h-4" /> ניהול השאלונים
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <section data-testid="section-top-categories">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          קטגוריות מובילות במאגר
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {topCats.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))
            : topCats.map((c) => (
                <Link
                  key={c.name}
                  href={`/rights?category=${encodeURIComponent(c.name)}`}
                  data-testid={`link-top-category-${c.name}`}
                >
                  <a className="block p-3 rounded-md bg-card border border-card-border hover-elevate">
                    <div className="text-sm font-medium truncate" title={c.name}>
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {c.count} נושאים
                    </div>
                  </a>
                </Link>
              ))}
        </div>
      </section>

      <section className="rounded-lg border border-card-border bg-card p-5 text-sm text-muted-foreground" data-testid="section-disclaimer">
        <p className="font-medium text-foreground mb-1">תזכורת לצוות</p>
        <p>
          זכות לפי חוק = משהו שמגיע ללקוח על פי המוסד לביטוח לאומי, משרד ממשלתי או חוק רשמי.
          ארגון/עמותה = אפשרות לפנות לסיוע התנדבותי, לא התחייבות וזכאות. תמיד להסביר את ההבדל
          בצורה מפורשת ופשוטה ללקוח.
        </p>
      </section>
    </div>
  );
}
