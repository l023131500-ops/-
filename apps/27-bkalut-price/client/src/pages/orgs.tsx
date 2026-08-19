import { useQuery } from "@tanstack/react-query";
import type { OrgRow, MetaResponse } from "@shared/schema";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter, ArrowLeft } from "lucide-react";
import { HaredinessBadge, TypeBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

const ANY = "__any__";

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function searchableText(o: OrgRow): string {
  return [
    o.name,
    o.category,
    o.bodyType,
    o.audience,
    o.helpProvided,
    o.conditions,
    o.phoneEmail,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

export default function OrgsPage() {
  const { data: rows, isLoading } = useQuery<OrgRow[]>({ queryKey: ["/api/orgs"] });
  const { data: meta } = useQuery<MetaResponse>({ queryKey: ["/api/meta"] });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ANY);
  const [bodyType, setBodyType] = useState(ANY);
  const [haredi, setHaredi] = useState(ANY);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qlow = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (category !== ANY && o.category !== category) return false;
      if (bodyType !== ANY && o.bodyType !== bodyType) return false;
      if (haredi !== ANY && o.haredi !== haredi) return false;
      if (qlow && !searchableText(o).includes(qlow)) return false;
      return true;
    });
  }, [rows, q, category, bodyType, haredi]);

  const activeFilters = [category, bodyType, haredi].filter((v) => v !== ANY).length;

  function clear() {
    setQ("");
    setCategory(ANY);
    setBodyType(ANY);
    setHaredi(ANY);
  }

  return (
    <div className="space-y-6" data-testid="page-orgs">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">עמותות וארגונים</p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-orgs-title">
          ארגוני סיוע לפנייה משלימה
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          זוהי לא רשימת זכויות לפי חוק — אלו עמותות וגופים שאפשר להציע ללקוח כפנייה משלימה.
          תמיד יש להבהיר ללקוח: סיוע תלוי במלאי, בנהלי הארגון ובשיקול דעת.
        </p>
      </header>

      <Card className="p-4 md:p-5 bg-card border border-card-border" data-testid="card-org-filters">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4 text-primary" />
            <span>חיפוש וסינון</span>
            {activeFilters > 0 && (
              <Badge variant="secondary" data-testid="badge-org-active-filters">
                {activeFilters} פעילים
              </Badge>
            )}
          </div>
          {(activeFilters > 0 || q) && (
            <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground" data-testid="button-clear-org-filters">
              <X className="w-3.5 h-3.5" />
              נקה הכל
            </Button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="חיפוש בשם ארגון, תחום, סוג סיוע, טלפון…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-10"
            dir="rtl"
            data-testid="input-search-orgs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FilterSelect label="תחום" value={category} onChange={setCategory} options={meta?.orgCategories ?? []} testId="select-org-category" />
          <FilterSelect label="סוג הגוף" value={bodyType} onChange={setBodyType} options={meta?.orgBodyTypes ?? []} testId="select-org-body-type" />
          <FilterSelect label="התאמה לציבור חרדי" value={haredi} onChange={setHaredi} options={meta?.orgHaredi ?? []} testId="select-org-haredi" />
        </div>
      </Card>

      <div className="flex items-center justify-between" data-testid="bar-org-results-count">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "טוען…" : `נמצאו ${filtered.length} מתוך ${rows?.length ?? 0} ארגונים`}
        </p>
        <TypeBadge kind="org" />
      </div>

      <section className="grid gap-3" data-testid="grid-org-results">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)
          : filtered.length === 0
            ? (
              <Card className="p-10 text-center" data-testid="empty-org-results">
                <p className="font-medium">לא נמצאו תוצאות</p>
                <p className="text-sm text-muted-foreground mt-1">נסה לנקות את הסינונים.</p>
              </Card>
            )
            : filtered.map((o) => <OrgCard key={o.id} row={o} />)}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger dir="rtl" data-testid={testId}>
          <SelectValue placeholder="הכל" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value={ANY} data-testid={`${testId}-any`}>הכל</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o} data-testid={`${testId}-option-${o}`}>
              {truncate(o, 80)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OrgCard({ row }: { row: OrgRow }) {
  // Modesty marker — only fertility/intimacy themes (not generic "רגיש").
  const needsModestWording = /צניעות|צנוע|פוריות|פריון|הריון|היריון|לידה|אינטימ|אישות|טהרת המשפחה|הפלה|IVF|הזרעה/.test(row.haredi);
  return (
    <Link href={`/orgs/${row.id}`} data-testid={`card-org-${row.id}`} className="block">
        <Card className={cn(
          "p-5 hover-elevate border border-card-border bg-card",
          needsModestWording && "border-r-4 border-r-[hsl(42_70%_60%)]",
        )}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="text-[11px] text-muted-foreground" data-testid={`text-org-card-category-${row.id}`}>
                {row.category}
              </div>
              <h3 className="font-semibold text-base leading-snug" data-testid={`text-org-card-name-${row.id}`}>
                {row.name}
              </h3>
              {row.bodyType && (
                <span className="text-xs text-muted-foreground" data-testid={`text-org-card-bodytype-${row.id}`}>{row.bodyType}</span>
              )}
            </div>
            <HaredinessBadge value={row.haredi} />
          </div>

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mt-2">
            {row.audience && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">למי מיועד</span>
                <span data-testid={`text-org-card-audience-${row.id}`}>{truncate(row.audience, 130)}</span>
              </div>
            )}
            {row.helpProvided && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">סיוע בפועל</span>
                <span data-testid={`text-org-card-help-${row.id}`}>{truncate(row.helpProvided, 130)}</span>
              </div>
            )}
          </div>

          {row.phoneEmail && (
            <div className="mt-3 text-xs text-foreground/80" data-testid={`text-org-card-phone-${row.id}`}>
              <span className="opacity-60">פנייה: </span>
              {truncate(row.phoneEmail, 120)}
            </div>
          )}

          <div className="mt-3 flex items-center justify-end text-xs text-primary font-medium">
            לפרטים מלאים <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          </div>
        </Card>
    </Link>
  );
}
