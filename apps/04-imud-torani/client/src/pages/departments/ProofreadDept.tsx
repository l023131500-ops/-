import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ContentBlock } from "@shared/schema";
import {
  scanBook, applyFix, countByCategory, issueSignature,
  CATEGORY_META, type ProofIssue, type IssueCategory,
} from "@shared/proofread";
import {
  aiScanBook, PROVIDER_LABELS, DEFAULT_MODELS,
  type AiProvider, type AiConfig,
} from "@/lib/aiProofread";
import { Check, X, Trash2, ScanSearch, Sparkles, ChevronLeft, Eye, EyeOff } from "lucide-react";

/**
 * מחלקת הגהה — סורקת את כל הספר, מציגה רשימת טעויות מסודרת לפי 3 קטגוריות,
 * ומאפשרת לכל טעות: אישור תיקון / התעלמות / מחיקת הקטע.
 *
 * חוק ברזל: שום שינוי אינו מוחל ללא לחיצת "אשר תיקון" מפורשת.
 */
export function ProofreadDept({
  blocks, onApplyFix, onDeleteRange, onFocusBlock,
}: {
  blocks: ContentBlock[];
  onApplyFix: (blockId: string, issue: ProofIssue) => void;
  onDeleteRange: (blockId: string, start: number, end: number) => void;
  onFocusBlock: (blockId: string) => void;
}) {
  const { toast } = useToast();
  const [issues, setIssues] = useState<ProofIssue[]>([]);
  const [scanned, setScanned] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<IssueCategory | "all">("all");

  // AI config (in-memory only)
  const [showAi, setShowAi] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState({ done: 0, total: 0 });

  function runRuleScan() {
    const found = scanBook(blocks, ignored);
    setIssues(found);
    setScanned(true);
    toast({ title: `נמצאו ${found.length} הערות`, description: "עברו על הרשימה ואשרו/דחו כל אחת." });
  }

  async function runAiScan() {
    if (!apiKey.trim()) {
      toast({ title: "נדרש מפתח API", description: "הזן מפתח כדי להפעיל הגהת AI.", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    setAiProgress({ done: 0, total: 0 });
    try {
      const cfg: AiConfig = { provider, apiKey: apiKey.trim(), model: DEFAULT_MODELS[provider] };
      const found = await aiScanBook(cfg, blocks, ignored, (done, total) => setAiProgress({ done, total }));
      // מיזוג עם טעויות מבוססות-כללים קיימות (ללא כפילויות חתימה)
      const sigs = new Set(issues.map((i) => issueSignature(i.blockId, i.category, i.start, i.original)));
      const merged = [...issues];
      for (const f of found) {
        const s = issueSignature(f.blockId, f.category, f.start, f.original);
        if (!sigs.has(s)) { merged.push(f); sigs.add(s); }
      }
      setIssues(merged);
      setScanned(true);
      toast({ title: `הגהת AI הושלמה`, description: `נוספו ${found.length} הצעות.` });
    } catch (e: any) {
      toast({ title: "שגיאת הגהת AI", description: String(e?.message || e).slice(0, 200), variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  }

  function resolve(issue: ProofIssue, action: "fix" | "ignore" | "delete") {
    if (action === "fix") {
      if (!issue.suggestion) {
        toast({ title: "אין תיקון אוטומטי", description: "הערה זו דורשת עריכה ידנית. עבור לבלוק ותקן." });
        onFocusBlock(issue.blockId);
        return;
      }
      onApplyFix(issue.blockId, issue);
      toast({ title: "התיקון הוחל" });
    } else if (action === "delete") {
      onDeleteRange(issue.blockId, issue.start, issue.end);
      toast({ title: "הקטע נמחק" });
    } else {
      const sig = issueSignature(issue.blockId, issue.category, issue.start, issue.original);
      setIgnored((prev) => new Set(prev).add(sig));
    }
    // הסר את הטעות מהרשימה (וגם טעויות שהוסטו במיקום — נריץ סריקה מחדש קלה בפעם הבאה)
    setIssues((prev) => prev.filter((x) => x.id !== issue.id));
  }

  const counts = useMemo(() => countByCategory(issues), [issues]);
  const visible = filter === "all" ? issues : issues.filter((i) => i.category === filter);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          ההגהה סורקת את כל הספר ומציגה רשימת הערות. <b>שום שינוי לא מבוצע ללא אישורך</b> — הטקסט מוגן.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runRuleScan} data-testid="button-scan-rules">
            <ScanSearch className="ms-1.5 h-4 w-4" /> סרוק (כללים)
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAi((v) => !v)} data-testid="button-toggle-ai">
            <Sparkles className="ms-1.5 h-4 w-4" /> הגהת AI
          </Button>
        </div>

        {showAi && (
          <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              הגהת AI פועלת מהדפדפן ישירות מול הספק, עם המפתח שלך. המפתח נשמר בזיכרון בלבד — לא נשלח לשרת ולא נשמר.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-[11px] font-semibold">ספק</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as AiProvider)}>
                  <SelectTrigger data-testid="select-ai-provider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-[11px] font-semibold">מפתח API</Label>
                {/*
                  כפתור "הצג סיסמה" (priority §1א). המפתח מודבק ידנית ואי אפשר לאמת
                  אותו כשהוא מוסתר — טעות תו אחד מתגלה רק בכישלון הקריאה לספק.
                  השדה dir="ltr" בתוך עמוד RTL, כלומר התווים נצמדים לשמאל וגדלים ימינה,
                  ולכן הצד הפנוי הוא הימני; pr-9 שומר שהמפתח לא ייכנס מתחת לכפתור.
                  ה-type, ה-aria-label והאייקון נגזרים מאותו state, כדי שלא ייתכן
                  שהכפתור אומר "הצג" בזמן שהמפתח כבר גלוי.
                */}
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-…" dir="ltr" className="pr-9" data-testid="input-ai-key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-pressed={showKey}
                    aria-label={showKey ? "הסתר מפתח" : "הצג מפתח"}
                    title={showKey ? "הסתר מפתח" : "הצג מפתח"}
                    className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="button-toggle-ai-key"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={runAiScan} disabled={aiBusy} data-testid="button-scan-ai">
              {aiBusy ? `מגיה… ${aiProgress.done}/${aiProgress.total}` : "הפעל הגהת AI"}
            </Button>
          </div>
        )}
      </div>

      {scanned && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label={`הכל (${issues.length})`} active={filter === "all"} onClick={() => setFilter("all")} color="#5a4636" />
          {(Object.keys(CATEGORY_META) as IssueCategory[]).map((c) => (
            <FilterChip
              key={c}
              label={`${CATEGORY_META[c].label} (${counts[c]})`}
              active={filter === c}
              onClick={() => setFilter(c)}
              color={CATEGORY_META[c].color}
            />
          ))}
        </div>
      )}

      {scanned && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {issues.length === 0 ? "לא נמצאו טעויות — הספר נקי! ✓" : "אין הערות בקטגוריה זו."}
        </p>
      )}

      <div className="space-y-2">
        {visible.map((issue) => (
          <div key={issue.id} className="rounded-lg border border-card-border bg-card p-3" data-testid={`issue-${issue.id}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: CATEGORY_META[issue.category].color }}
              >
                {CATEGORY_META[issue.category].label}{issue.source === "ai" ? " · AI" : ""}
              </span>
              <button
                onClick={() => onFocusBlock(issue.blockId)}
                className="flex items-center gap-1 rounded p-1 text-xs text-primary hover-elevate"
                data-testid={`button-goto-${issue.id}`}
              >
                מעבר לטעות <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mb-1.5 text-xs text-muted-foreground">{issue.message}</p>
            <div className="mb-2 rounded bg-background p-2 font-serif text-sm">
              <span className="text-destructive line-through">{issue.original || "—"}</span>
              {issue.suggestion && issue.suggestion !== issue.original && (
                <>
                  {" → "}
                  <span className="font-bold text-primary">{issue.suggestion}</span>
                </>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => resolve(issue, "fix")} data-testid={`button-fix-${issue.id}`}>
                <Check className="ms-1 h-3.5 w-3.5" /> אשר תיקון
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolve(issue, "ignore")} data-testid={`button-ignore-${issue.id}`}>
                <X className="ms-1 h-3.5 w-3.5" /> התעלם
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => resolve(issue, "delete")} data-testid={`button-delete-${issue.id}`}>
                <Trash2 className="ms-1 h-3.5 w-3.5" /> מחק קטע
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "text-white" : "text-foreground hover-elevate"}`}
      style={active ? { background: color, borderColor: color } : { borderColor: "var(--border)" }}
    >
      {label}
    </button>
  );
}
