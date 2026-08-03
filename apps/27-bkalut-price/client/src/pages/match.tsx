import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { OrgRow, RightRow } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HaredinessBadge, TypeBadge } from "@/components/badges";
import { ArrowLeft, CheckCircle2, ClipboardList, RotateCcw, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchKind = "right" | "org";

interface Situation {
  id: string;
  label: string;
  hint: string;
  terms: string[];
}

interface MatchResult {
  id: number;
  kind: MatchKind;
  title: string;
  category: string;
  body: string;
  audience: string;
  mainValue: string;
  conditions: string;
  haredi: string;
  score: number;
  reasons: string[];
}

const SITUATIONS: Situation[] = [
  {
    id: "children",
    label: "ילדים ומשפחה",
    hint: "ילדים, לידה, מעונות, משפחות",
    terms: ["ילד", "ילדים", "משפחה", "לידה", "יולדת", "מעון", "מזונות", "הורים"],
  },
  {
    id: "income",
    label: "הכנסה נמוכה",
    hint: "קצבאות קיום, הנחות, סיוע",
    terms: ["הכנסה נמוכה", "הבטחת הכנסה", "השלמת הכנסה", "מצוקה", "סיוע", "עני", "קיום"],
  },
  {
    id: "disability",
    label: "נכות או מוגבלות",
    hint: "נכות, ילד נכה, ניידות, פטורים",
    terms: ["נכות", "מוגבלות", "נכה", "ילד נכה", "ניידות", "עיוור", "לקוי ראייה", "שיקום"],
  },
  {
    id: "health",
    label: "בריאות וקופות חולים",
    hint: "החזרים, ציוד, טיפולים, תרופות",
    terms: ["בריאות", "קופת חולים", "קופות חולים", "החזר", "תרופות", "ציוד רפואי", "טיפול", "מחלה"],
  },
  {
    id: "elderly",
    label: "אזרח ותיק וסיעוד",
    hint: "סיעוד, עובד זר, קשישים, דמנציה",
    terms: ["אזרח ותיק", "קשיש", "סיעוד", "גמלת סיעוד", "עובד זר", "דמנציה", "אלצהיימר", "זקנה"],
  },
  {
    id: "housing",
    label: "דיור ומשכנתא",
    hint: "שכר דירה, רכישה, משכנתא",
    terms: ["דיור", "שכר דירה", "דירה", "משכנתא", "רכישת דירה", "שיכון", "שכירות"],
  },
  {
    id: "work",
    label: "עבודה ושכר",
    hint: "זכויות עובדים, אבטלה, פנסיה",
    terms: ["עבודה", "עובד", "מעסיק", "שכר", "אבטלה", "פנסיה", "פיצויים", "תעסוקה"],
  },
  {
    id: "tax",
    label: "מסים והחזרים",
    hint: "מס הכנסה, רשות המסים, החזר מס",
    terms: ["מס הכנסה", "רשות המסים", "החזר מס", "נקודות זיכוי", "מס", "מענק עבודה", "תרומות"],
  },
  {
    id: "debt",
    label: "חובות והוצאה לפועל",
    hint: "חובות, בנק, אשראי, חדלות פירעון",
    terms: ["חוב", "חובות", "הוצאה לפועל", "בנק", "אשראי", "הלוואה", "חדלות פירעון", "עיקול"],
  },
  {
    id: "business",
    label: "עצמאי ועסק",
    hint: "עוסק פטור, מורשה, ביטוח לאומי",
    terms: ["עצמאי", "עסק", "עוסק פטור", "עוסק מורשה", "עוסק זעיר", "מע״מ", "מס בריאות"],
  },
  {
    id: "utilities",
    label: "חשבונות וחיסכון",
    hint: "חשמל, מים, תקשורת, ביטוחים",
    terms: ["חשמל", "מים", "תקשורת", "ביטוח", "ביטוחים", "הוזלה", "חיסכון", "ניוד"],
  },
  {
    id: "sensitive",
    label: "ניסוח צנוע",
    hint: "פריון, הריון, לידה וצניעות",
    terms: ["צניעות", "צנוע", "פריון", "פוריות", "הריון", "היריון", "לידה"],
  },
];

const MAX_RESULTS = 18;

function trimText(value: string, len = 180) {
  if (!value) return "";
  return value.length > len ? `${value.slice(0, len).trimEnd()}…` : value;
}

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[״"]/g, "")
    .replace(/[׳']/g, "")
    .replace(/[\u0591-\u05C7]/g, "");
}

function rightText(row: RightRow) {
  return normalize([
    row.topic,
    row.category,
    row.subCategory,
    row.treatingBody,
    row.audience,
    row.whatReceived,
    row.eligibility,
    row.qualifyingCases,
    row.preparation,
    row.documents,
    row.howToApply,
    row.aiSearch,
    row.aiExtra,
    row.haredi,
  ].join(" \n "));
}

function orgText(row: OrgRow) {
  return normalize([
    row.name,
    row.category,
    row.bodyType,
    row.audience,
    row.helpProvided,
    row.conditions,
    row.preparation,
    row.requirements,
    row.howToContact,
    row.internalNotes,
    row.haredi,
  ].join(" \n "));
}

function needsModestWording(value: string) {
  // Only true modesty subjects (fertility / intimacy / pregnancy / birth /
  // ritual purity / abortion / IVF). Generic "רגיש" tags are intentionally
  // excluded — financial hardship is not a modesty issue.
  return /צניעות|צנוע|פוריות|פריון|הריון|היריון|לידה|אינטימ|אישות|טהרת המשפחה|הפלה|IVF|הזרעה/.test(value);
}

function scoreText(text: string, terms: string[], freeText: string) {
  let score = 0;
  const reasons: string[] = [];
  for (const term of terms) {
    const n = normalize(term);
    if (n && text.includes(n)) {
      score += n.length > 6 ? 3 : 2;
      if (reasons.length < 4) reasons.push(term);
    }
  }

  const words = normalize(freeText)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  for (const word of Array.from(new Set(words))) {
    if (text.includes(word)) {
      score += 2;
      if (reasons.length < 5) reasons.push(word);
    }
  }

  return { score, reasons };
}

export default function MatchPage() {
  const { data: rights, isLoading: rightsLoading } = useQuery<RightRow[]>({ queryKey: ["/api/rights"] });
  const { data: orgs, isLoading: orgsLoading } = useQuery<OrgRow[]>({ queryKey: ["/api/orgs"] });
  const [selected, setSelected] = useState<string[]>(["income", "children"]);
  const [freeText, setFreeText] = useState("");
  const [includeOrgs, setIncludeOrgs] = useState(true);
  const [hideSensitive, setHideSensitive] = useState(false);

  const selectedSituations = useMemo(
    () => SITUATIONS.filter((s) => selected.includes(s.id)),
    [selected],
  );

  const results = useMemo<MatchResult[]>(() => {
    const terms = selectedSituations.flatMap((s) => s.terms);
    if (!rights || terms.length === 0 && !freeText.trim()) return [];

    const matchedRights: MatchResult[] = rights.map((r) => {
      const { score, reasons } = scoreText(rightText(r), terms, freeText);
      const priorityBoost = r.priority ? Math.max(0, 5 - Math.floor(r.priority / 80)) : 0;
      return {
        id: r.id,
        kind: "right",
        title: r.topic,
        category: [r.category, r.subCategory].filter(Boolean).join(" · "),
        body: r.treatingBody,
        audience: r.audience,
        mainValue: r.whatReceived,
        conditions: r.eligibility,
        haredi: r.haredi,
        score: score + priorityBoost,
        reasons,
      };
    });

    const matchedOrgs: MatchResult[] = includeOrgs && orgs
      ? orgs.map((o) => {
          const { score, reasons } = scoreText(orgText(o), terms, freeText);
          return {
            id: o.id,
            kind: "org",
            title: o.name,
            category: o.category,
            body: o.bodyType,
            audience: o.audience,
            mainValue: o.helpProvided,
            conditions: o.conditions,
            haredi: o.haredi,
            score,
            reasons,
          };
        })
      : [];

    return [...matchedRights, ...matchedOrgs]
      .filter((item) => item.score > 0)
      .filter((item) => !hideSensitive || !needsModestWording(item.haredi))
      .sort((a, b) => b.score - a.score || (a.kind === "right" ? -1 : 1))
      .slice(0, MAX_RESULTS);
  }, [rights, orgs, selectedSituations, freeText, includeOrgs, hideSensitive]);

  function toggleSituation(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function reset() {
    setSelected(["income", "children"]);
    setFreeText("");
    setIncludeOrgs(true);
    setHideSensitive(false);
  }

  const isLoading = rightsLoading || orgsLoading;
  const rightsCount = results.filter((r) => r.kind === "right").length;
  const orgsCount = results.filter((r) => r.kind === "org").length;

  return (
    <div className="space-y-6" data-testid="page-match">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">בדיקת התאמה ראשונית</p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-match-title">
          התאמת זכויות לפי מצב הלקוח
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          כלי עבודה פנימי לצוות: מסמנים מצבים מרכזיים ומקבלים כיווני בדיקה מתוך המאגר.
          זו אינה החלטת זכאות סופית, אלא רשימת נושאים לבדיקה מסודרת מול הלקוח והמקורות הרשמיים.
        </p>
      </header>

      <section className="grid lg:grid-cols-[380px_1fr] gap-4">
        <Card className="p-5 border border-card-border bg-card h-fit" data-testid="card-match-controls">
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full p-2 bg-primary/10 text-primary">
              <ClipboardList className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-semibold">מצבי לקוח</h2>
              <p className="text-xs text-muted-foreground">אפשר לסמן כמה מצבים יחד</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2" data-testid="grid-situation-buttons">
            {SITUATIONS.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSituation(s.id)}
                  className={cn(
                    "text-right rounded-lg border p-3 transition-colors hover-elevate",
                    active
                      ? "border-primary bg-primary/8"
                      : "border-card-border bg-background",
                  )}
                  data-testid={`button-situation-${s.id}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{s.hint}</span>
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">תיאור חופשי של הלקוח</span>
              <Input
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="לדוגמה: אברך עם 5 ילדים, שכירות, חוב בבנק, ילד עם אבחון…"
                dir="rtl"
                data-testid="input-match-free-text"
              />
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeOrgs}
                onChange={(e) => setIncludeOrgs(e.target.checked)}
                className="accent-primary"
                data-testid="checkbox-include-orgs"
              />
              לכלול גם עמותות וארגוני סיוע
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={hideSensitive}
                onChange={(e) => setHideSensitive(e.target.checked)}
                className="accent-primary"
                data-testid="checkbox-hide-sensitive"
              />
              להסתיר נושאים שדורשים ניסוח צנוע
            </label>

            <Button variant="secondary" onClick={reset} className="w-full gap-2" data-testid="button-reset-match">
              <RotateCcw className="w-4 h-4" />
              איפוס בדיקה
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 border border-primary/20 bg-primary/5" data-testid="card-match-summary">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold">תוצאות התאמה ראשונית</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" data-testid="badge-match-total">{results.length} כיווני בדיקה</Badge>
                <Badge variant="outline" data-testid="badge-match-rights">{rightsCount} זכויות</Badge>
                <Badge variant="outline" data-testid="badge-match-orgs">{orgsCount} עמותות</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              חשוב: תוצאה כאן אומרת “כדאי לבדוק”, לא “הלקוח זכאי”. ההחלטה נקבעת לפי תנאי הזכאות, מסמכים והגשה בפועל.
            </p>
          </Card>

          <section className="grid gap-3" data-testid="grid-match-results">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" data-testid={`skeleton-match-${i}`} />
              ))
            ) : results.length === 0 ? (
              <Card className="p-10 text-center" data-testid="empty-match-results">
                <Search className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">לא נמצאו כיווני בדיקה</p>
                <p className="text-sm text-muted-foreground mt-1">
                  נסה לסמן מצב נוסף או לכתוב תיאור חופשי של הלקוח.
                </p>
              </Card>
            ) : (
              results.map((item) => <MatchCard key={`${item.kind}-${item.id}`} item={item} />)
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function MatchCard({ item }: { item: MatchResult }) {
  const href = item.kind === "right" ? `/rights/${item.id}` : `/orgs/${item.id}`;
  return (
    <Link href={href} data-testid={`card-match-${item.kind}-${item.id}`} className="block">
        <Card className={cn(
          "p-5 border border-card-border bg-card hover-elevate",
          needsModestWording(item.haredi) && "border-r-4 border-r-[hsl(42_70%_60%)]",
        )}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <TypeBadge kind={item.kind} />
                <span className="text-[11px] text-muted-foreground">{item.category}</span>
              </div>
              <h3 className="font-semibold text-base leading-snug" data-testid={`text-match-title-${item.kind}-${item.id}`}>
                {item.title}
              </h3>
              {item.body && (
                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-match-body-${item.kind}-${item.id}`}>
                  {item.body}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <HaredinessBadge value={item.haredi} />
              <Badge variant="outline" className="tabular-nums text-[11px]">
                התאמה {item.score}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="קהל יעד" value={trimText(item.audience, 130)} />
            <Field label={item.kind === "right" ? "מה ניתן לקבל" : "סיוע בפועל"} value={trimText(item.mainValue, 150)} />
            <Field label={item.kind === "right" ? "תנאי זכאות" : "תנאים ודגשים"} value={trimText(item.conditions, 150)} />
            <Field label="למה עלה בהתאמה" value={item.reasons.length ? item.reasons.join(", ") : "לפי התאמה כללית בטקסט"} />
          </div>

          <div className="mt-3 flex items-center justify-end text-xs text-primary font-medium">
            לפתיחת פירוט מלא <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          </div>
        </Card>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm leading-snug">{value}</span>
    </div>
  );
}
