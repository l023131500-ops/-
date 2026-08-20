import { useQuery } from "@tanstack/react-query";
import type { RightRow, MetaResponse } from "@shared/schema";
import { useMemo, useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, Star, ArrowLeft, Plus, Save } from "lucide-react";
import { HaredinessBadge, TypeBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ANY = "__any__";

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function searchableText(r: RightRow): string {
  return [
    r.topic,
    r.category,
    r.subCategory,
    r.audience,
    r.eligibility,
    r.documents,
    r.howToApply,
    r.aiSearch,
    r.aiExtra,
    r.treatingBody,
    r.whatReceived,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

export default function RightsPage() {
  const { data: rows, isLoading } = useQuery<RightRow[]>({ queryKey: ["/api/rights"] });
  const { data: meta } = useQuery<MetaResponse>({ queryKey: ["/api/meta"] });
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ topic: "", category: "", subCategory: "", audience: "", whatReceived: "", publicSiteText: "" });
  const [saving, setSaving] = useState(false);

  async function saveNewRight() {
    if (!draft.topic.trim()) {
      toast({ title: "כותרת חובה", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/rights", draft);
      await queryClient.invalidateQueries({ queryKey: ["/api/rights"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/rights"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/meta"] });
      setAddOpen(false);
      setDraft({ topic: "", category: "", subCategory: "", audience: "", whatReceived: "", publicSiteText: "" });
      toast({ title: "נוסף", description: "הנושא החדש נוסף לסוף המאגר." });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "נסו שוב", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const search = useSearch();
  const initialCategory = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("category") ?? ANY;
  }, [search]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>(initialCategory);
  const [subCategory, setSubCategory] = useState<string>(ANY);
  const [treatingBody, setTreatingBody] = useState<string>(ANY);
  const [haredi, setHaredi] = useState<string>(ANY);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  // Sub-category options depend on chosen category
  const subOptions = useMemo(() => {
    if (!rows) return [];
    const filtered = category === ANY ? rows : rows.filter((r) => r.category === category);
    return Array.from(new Set(filtered.map((r) => r.subCategory).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "he"),
    );
  }, [rows, category]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qlow = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== ANY && r.category !== category) return false;
      if (subCategory !== ANY && r.subCategory !== subCategory) return false;
      if (treatingBody !== ANY && r.treatingBody !== treatingBody) return false;
      if (haredi !== ANY && r.haredi !== haredi) return false;
      if (qlow && !searchableText(r).includes(qlow)) return false;
      return true;
    });
  }, [rows, q, category, subCategory, treatingBody, haredi]);

  const activeFilters = [category, subCategory, treatingBody, haredi].filter((v) => v !== ANY).length;

  function clearFilters() {
    setQ("");
    setCategory(ANY);
    setSubCategory(ANY);
    setTreatingBody(ANY);
    setHaredi(ANY);
  }

  return (
    <div className="space-y-6" data-testid="page-rights">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">מאגר זכויות והטבות</p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-rights-title">
              זכויות והטבות לפי חוק
            </h1>
          </div>
          <Button
            type="button"
            size="sm"
            variant={addOpen ? "secondary" : "default"}
            onClick={() => setAddOpen((v) => !v)}
            data-testid="button-add-new-right"
          >
            <Plus className="w-4 h-4 ml-1" />
            {addOpen ? "סגירת הוספה" : "הוסף נושא חדש"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          זכויות לפי חוק וקצבאות רשמיות. עמותות וארגוני סיוע נמצאים במסך נפרד.
        </p>
      </header>

      {addOpen && (
        <Card className="p-5 border border-primary/40 bg-primary/5 space-y-3" data-testid="card-add-right">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">הוספת נושא חדש</h2>
            <p className="text-xs text-muted-foreground">
              נוסף לסוף המאגר — סדר ה-IDs הקיים נשמר. ניתן להוסיף שדות מורחבים בעריכה בהמשך.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">שם הנושא *</Label>
              <Input value={draft.topic} onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))} data-testid="input-new-right-topic" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">קטגוריה</Label>
              <Input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תת קטגוריה</Label>
              <Input value={draft.subCategory} onChange={(e) => setDraft((d) => ({ ...d, subCategory: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">קהל יעד</Label>
              <Input value={draft.audience} onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">מה ניתן לקבל (קצר)</Label>
              <Textarea value={draft.whatReceived} onChange={(e) => setDraft((d) => ({ ...d, whatReceived: e.target.value }))} className="min-h-20" aria-label="מה ניתן לקבל (קצר)" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">הסבר ציבורי קצר (publicSiteText)</Label>
              <Textarea value={draft.publicSiteText} onChange={(e) => setDraft((d) => ({ ...d, publicSiteText: e.target.value }))} className="min-h-20" aria-label="הסבר ציבורי קצר (publicSiteText)" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>ביטול</Button>
            <Button size="sm" onClick={saveNewRight} disabled={saving} data-testid="button-save-new-right">
              <Save className="w-4 h-4 ml-1" /> {saving ? "שומר..." : "הוספה"}
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 md:p-5 bg-card border border-card-border" data-testid="card-filters">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4 text-primary" />
            <span>חיפוש וסינון</span>
            {activeFilters > 0 && (
              <Badge variant="secondary" data-testid="badge-active-filters">
                {activeFilters} סינונים פעילים
              </Badge>
            )}
          </div>
          {(activeFilters > 0 || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5" />
              נקה הכל
            </Button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="חיפוש בשם, קטגוריה, קהל יעד, זכאות, מסמכים, מילות חיפוש AI…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-10"
            dir="rtl"
            data-testid="input-search"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            label="קטגוריה"
            value={category}
            onChange={(v) => {
              setCategory(v);
              setSubCategory(ANY);
            }}
            options={meta?.rightsCategories ?? []}
            testId="select-category"
          />
          <FilterSelect
            label="תת קטגוריה"
            value={subCategory}
            onChange={setSubCategory}
            options={subOptions}
            testId="select-subcategory"
            disabled={subOptions.length === 0}
          />
          <FilterSelect
            label="גוף מטפל"
            value={treatingBody}
            onChange={setTreatingBody}
            options={meta?.treatingBodies ?? []}
            testId="select-treating-body"
          />
          <FilterSelect
            label="התאמה לציבור חרדי"
            value={haredi}
            onChange={setHaredi}
            options={meta?.haredi ?? []}
            testId="select-haredi"
          />
        </div>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between" data-testid="bar-results-count">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "טוען…"
            : `נמצאו ${filtered.length} מתוך ${rows?.length ?? 0} זכויות`}
        </p>
        <TypeBadge kind="right" />
      </div>

      <section className="grid gap-3" data-testid="grid-results">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" data-testid={`skeleton-result-${i}`} />
            ))
          : filtered.length === 0
            ? (
              <Card className="p-10 text-center" data-testid="empty-results">
                <p className="font-medium">לא נמצאו תוצאות</p>
                <p className="text-sm text-muted-foreground mt-1">
                  נסה לנקות את הסינונים או לחפש מילת מפתח אחרת.
                </p>
              </Card>
            )
            : filtered.map((r) => <RightCard key={r.id} row={r} />)}
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
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={testId} className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={testId} dir="rtl" data-testid={testId}>
          <SelectValue placeholder="הכל" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value={ANY} data-testid={`${testId}-any`}>
            הכל
          </SelectItem>
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

function RightCard({ row }: { row: RightRow }) {
  // Modesty marker — only fertility/intimacy themes (not generic "רגיש").
  const needsModestWording = /צניעות|צנוע|פוריות|פריון|הריון|היריון|לידה|אינטימ|אישות|טהרת המשפחה|הפלה|IVF|הזרעה/.test(row.haredi);
  return (
        <Card
          data-testid={`card-right-${row.id}`}
          className={cn(
          "p-5 hover-elevate border border-card-border bg-card transition-colors",
          needsModestWording && "border-r-4 border-r-[hsl(42_70%_60%)]",
        )}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground tracking-wide">
                <span data-testid={`text-card-category-${row.id}`}>{row.category}</span>
                {row.subCategory && (
                  <>
                    <span>·</span>
                    <span>{row.subCategory}</span>
                  </>
                )}
              </div>
              <h3 className="font-semibold text-base leading-snug" data-testid={`text-card-topic-${row.id}`}>
                {row.topic}
              </h3>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <HaredinessBadge value={row.haredi} />
              {row.priority && (
                <Badge variant="outline" className="bg-secondary text-secondary-foreground tabular-nums text-[11px]">
                  עדיפות {row.priority}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <CardField label="גוף מטפל" value={truncate(row.treatingBody, 110)} testId={`card-body-${row.id}`} />
            <CardField label="קהל יעד" value={truncate(row.audience, 110)} testId={`card-audience-${row.id}`} />
            <CardField label="מה ניתן לקבל" value={truncate(row.whatReceived, 140)} testId={`card-received-${row.id}`} />
            <CardField label="זכאות בקצרה" value={truncate(row.eligibility, 140)} testId={`card-eligibility-${row.id}`} />
          </div>

          {row.goldTip && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-[hsl(42_75%_94%)] border border-[hsl(42_60%_82%)] p-2.5 text-xs" data-testid={`card-gold-${row.id}`}>
              <Star className="w-3.5 h-3.5 text-[hsl(42_80%_42%)] mt-0.5 shrink-0" />
              <span className="text-foreground/85 line-clamp-2">{truncate(row.goldTip, 200)}</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {row.bkalutCost && (
                <span data-testid={`card-cost-${row.id}`}>
                  <span className="opacity-70">עלות בקלות:</span> {truncate(row.bkalutCost, 60)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" data-testid={`link-service-${row.id}`}>
                <Link href={`/service/${row.id}`}>קישור לשירות</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" data-testid={`link-details-${row.id}`}>
                <Link href={`/rights/${row.id}`} className="flex items-center gap-1 text-primary font-medium">
                  לפרטים מלאים <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
  );
}

function CardField({ label, value, testId }: { label: string; value: string; testId: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm leading-snug" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
