import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  searchRecordings,
  searchTerms,
  fetchArchiveStats,
  startTranscription,
  STATUS_LABELS,
  STATUS_ORDER,
  type ArchiveStats,
  type Recording,
  type RecordingStatus,
  type SearchPage,
} from "@/lib/supabase";
import { statusBadgeClass } from "@/lib/status";
import { queryClient } from "@/lib/queryClient";
import {
  formatCost,
  formatDuration,
  recordingTitle,
  excerptAround,
  countHits,
  highlightParts,
} from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Coins,
  FileAudio,
  Upload,
  Sparkles,
  Quote,
  X,
} from "lucide-react";

const PAGE_SIZE = 25;

// The query lives in the address bar so a search can be refreshed, shared and
// returned to from a recording. wouter's hash navigation keeps ?q= intact when
// it moves between routes, which is exactly what the back link needs.
function readQueryFromUrl(): { q: string; wholeWord: boolean } {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", wholeWord: p.get("w") === "1" };
}

function writeQueryToUrl(q: string, wholeWord: boolean) {
  const url = new URL(window.location.href);
  if (q.trim()) url.searchParams.set("q", q.trim());
  else url.searchParams.delete("q");
  if (q.trim() && wholeWord) url.searchParams.set("w", "1");
  else url.searchParams.delete("w");
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, "", url.href);
  }
}

function StatusBadge({ status }: { status: RecordingStatus }) {
  return (
    <Badge
      className={`${statusBadgeClass(status)} border-transparent font-medium`}
      data-testid={`badge-status-${status}`}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export default function RecordingsPage() {
  const [q, setQ] = useState(() => readQueryFromUrl().q);
  const [wholeWord, setWholeWord] = useState(() => readQueryFromUrl().wholeWord);
  const [status, setStatus] = useState<RecordingStatus | "all">("all");
  const [page, setPage] = useState(0);

  // Debounced: every keystroke would otherwise be a scan of 1,138 transcripts.
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    writeQueryToUrl(debouncedQ, wholeWord);
  }, [debouncedQ, wholeWord]);

  // A new search or filter always starts from the first page. This has to
  // happen with the keystroke, not in an effect afterwards: an effect runs
  // after the render that already asked for "page 3 of the new query", and
  // PostgREST answers an offset past the end with 416.
  const onSearchChange = (value: string) => {
    setQ(value);
    setPage(0);
  };
  const onStatusChange = (value: RecordingStatus | "all") => {
    setStatus(value);
    setPage(0);
  };
  const onWholeWordChange = (value: boolean) => {
    setWholeWord(value);
    setPage(0);
  };

  const terms = useMemo(() => searchTerms(debouncedQ), [debouncedQ]);
  const searching = terms.length > 0;

  const { data, isLoading, isFetching, error } = useQuery<SearchPage>({
    queryKey: ["/recordings", debouncedQ, wholeWord, status, page],
    queryFn: () =>
      searchRecordings({ q: debouncedQ, status, page, pageSize: PAGE_SIZE, wholeWord }),
    // Keep the previous page on screen while the next one loads, so paging
    // and typing don't flash the list away.
    placeholderData: keepPreviousData,
  });

  const { data: stats } = useQuery<ArchiveStats>({
    queryKey: ["/recordings/stats"],
    queryFn: fetchArchiveStats,
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Self-correct if the archive shrank under a page that is already open.
  useEffect(() => {
    if (data && page > 0 && page >= pageCount) setPage(pageCount - 1);
  }, [data, page, pageCount]);
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
            (הקצה האינליין-סופי ב-RTL) — בדיוק על "העלאת הקלטה". נמדד
            ב-`scripts/qa/authbutton-overlap.mjs` שהלחיצה מגיעה לכדור.
            `--more30-auth-inset` מפורסם על ידי הכדור עצמו לפי רוחבו בפועל. */}
        <div
          className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4"
          style={{
            paddingInlineEnd:
              'max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1152px) / 2)))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center font-serif text-xl font-bold">
              ח
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight" data-testid="text-app-title">
                חיזוקים קצרים
              </h1>
              <p className="text-sm text-muted-foreground">מערכת תמלול ועריכה</p>
            </div>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover-elevate active-elevate-2"
            data-testid="link-upload"
          >
            <Upload className="w-4 h-4" />
            העלאת הקלטה
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats — counted by the database over the whole archive */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <FileAudio className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xl font-bold" data-testid="text-stat-total">
                {stats ? stats.total.toLocaleString("he-IL") : "…"}
              </div>
              <div className="text-xs text-muted-foreground">סה״כ הקלטות</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-chart-3/30 grid place-items-center">
              <div className="w-2 h-2 rounded-full bg-chart-3" />
            </div>
            <div>
              <div className="text-xl font-bold" data-testid="text-stat-ready">
                {stats ? stats.ready.toLocaleString("he-IL") : "…"}
              </div>
              <div className="text-xs text-muted-foreground">מוכנים</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <Coins className="w-5 h-5 text-chart-4" />
            <div>
              <div className="text-xl font-bold" data-testid="text-stat-cost">
                {stats ? formatCost(stats.costUsd) : "…"}
              </div>
              <div className="text-xs text-muted-foreground">עלות תמלול כוללת</div>
            </div>
          </Card>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            {/* placeholder אינו תווית: קורא מסך לא מקריא אותו כשם השדה. */}
            <Input
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חיפוש בכל התמלולים — מילה, ביטוי או נושא…"
              aria-label="חיפוש בכל התמלולים"
              type="search"
              className="pr-9 pl-9"
              data-testid="input-search"
            />
            {q && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover-elevate"
                aria-label="נקה חיפוש"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <FilterChip active={status === "all"} onClick={() => onStatusChange("all")} label="הכל" />
            {STATUS_ORDER.map((s) => (
              <FilterChip
                key={s}
                active={status === s}
                onClick={() => onStatusChange(s)}
                label={STATUS_LABELS[s]}
              />
            ))}
          </div>
        </div>

        {/* Whole-word toggle, shown only once there is something to narrow */}
        {searching && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => onWholeWordChange(!wholeWord)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border hover-elevate ${
                wholeWord
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground"
              }`}
              aria-pressed={wholeWord}
              data-testid="button-whole-word"
            >
              מילה שלמה
            </button>
            <span className="text-xs text-muted-foreground">
              {wholeWord
                ? "מתעלם ממילים שהמונח רק פותח אותן (״יתרו״ לא יתפוס ״שיתרום״). אותיות השימוש בהתחלה עדיין נתפסות."
                : "כולל כל מילה שהמונח מופיע בתוכה, על כל הטיותיה."}
            </span>
          </div>
        )}

        {/* What the numbers on screen actually mean */}
        <p className="text-sm text-muted-foreground mb-6" data-testid="text-result-summary">
          {isLoading
            ? "טוען…"
            : searching
              ? total === 0
                ? `אין הקלטה שבה מופיע ${terms.map((t) => `״${t}״`).join(" ו־")}.`
                : `${total.toLocaleString("he-IL")} הקלטות שבהן מופיע ${terms
                    .map((t) => `״${t}״`)
                    .join(" ו־")} — בתמלול, בנושא או בשם הקובץ. מוצגות ${from}–${to}.`
              : total === 0
                ? "אין הקלטות בסינון הזה."
                : `מוצגות ${from}–${to} מתוך ${total.toLocaleString("he-IL")} הקלטות.`}
          {isFetching && !isLoading && <span className="opacity-60"> · מעדכן…</span>}
        </p>

        {error && (
          <Card className="p-6 text-center text-destructive" data-testid="text-error">
            שגיאה בטעינת ההקלטות. נסה לרענן את הדף.
          </Card>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && !error && (
          <Card className="p-10 text-center text-muted-foreground" data-testid="text-empty">
            לא נמצאו הקלטות התואמות את החיפוש.
          </Card>
        )}

        <div className="space-y-3">
          {rows.map((r) => (
            <RecordingRow key={r.id} recording={r} terms={terms} wholeWord={wholeWord} />
          ))}
        </div>

        {!isLoading && pageCount > 1 && (
          <div
            className="flex items-center justify-center gap-2 mt-8"
            data-testid="pagination"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              data-testid="button-prev-page"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              הקודם
            </Button>
            <span className="text-sm text-muted-foreground px-2" data-testid="text-page-indicator">
              עמוד {page + 1} מתוך {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              הבא
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function RecordingRow({
  recording: r,
  terms,
  wholeWord,
}: {
  recording: Recording;
  terms: string[];
  wholeWord: boolean;
}) {
  // Prefer the edited text for the excerpt — it is the readable version — but
  // fall back to the raw one, and say which it came from so the passage can be
  // found on the page it links to.
  const source = useMemo(() => {
    if (!terms.length) return null;
    const edited = excerptAround(r.edited_transcript, terms, wholeWord);
    if (edited) return { text: edited, label: "בתמלול הערוך" };
    const raw = excerptAround(r.raw_transcript, terms, wholeWord);
    if (raw) return { text: raw, label: "בתמלול הגולמי" };
    return null;
  }, [r.edited_transcript, r.raw_transcript, terms, wholeWord]);

  const hits = useMemo(() => {
    if (!terms.length) return 0;
    return Math.max(
      countHits(r.edited_transcript, terms, wholeWord),
      countHits(r.raw_transcript, terms, wholeWord),
    );
  }, [r.edited_transcript, r.raw_transcript, terms, wholeWord]);

  return (
    <Link href={`/recording/${r.id}`}>
      <Card
        className="p-4 hover-elevate cursor-pointer"
        data-testid={`card-recording-${r.seq}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 shrink-0 rounded-lg bg-secondary grid place-items-center font-mono text-sm text-muted-foreground">
            {r.seq ?? "—"}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate leading-snug" data-testid={`text-topic-${r.seq}`}>
              <Highlighted text={recordingTitle(r)} terms={terms} wholeWord={wholeWord} />
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {r.parsha_or_date && <span>{r.parsha_or_date}</span>}
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(r.duration_seconds)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {formatCost(r.transcription_cost_usd)}
              </span>
              {hits > 0 && (
                <span className="text-primary font-medium" data-testid={`text-hits-${r.seq}`}>
                  {hits === 1 ? "מופע אחד" : `${hits} מופעים`}
                </span>
              )}
            </div>
          </div>
          <QuickTranscribe recording={r} />
          <StatusBadge status={r.status} />
          <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>

        {source && (
          <div
            className="mt-3 pt-3 border-t flex gap-2 text-sm leading-relaxed"
            data-testid={`text-excerpt-${r.seq}`}
          >
            <Quote className="w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground" />
            <p className="text-muted-foreground">
              <Highlighted text={source.text} terms={terms} wholeWord={wholeWord} />
              <span className="text-xs opacity-70"> · {source.label}</span>
            </p>
          </div>
        )}
      </Card>
    </Link>
  );
}

function Highlighted({
  text,
  terms,
  wholeWord,
}: {
  text: string;
  terms: string[];
  wholeWord: boolean;
}) {
  if (!terms.length) return <>{text}</>;
  return (
    <>
      {highlightParts(text, terms, wholeWord).map((part, i) =>
        part.hit ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

// Quick "transcribe" action shown inline on list rows for uploaded/error items.
function QuickTranscribe({ recording }: { recording: Recording }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => startTranscription(recording.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/recordings"] });
      queryClient.invalidateQueries({ queryKey: ["/recordings", recording.id] });
    },
    onError: (e: Error) =>
      toast({ title: "שגיאה בתמלול", description: e.message, variant: "destructive" }),
  });

  if (recording.status !== "uploaded" && recording.status !== "error") return null;

  return (
    <Button
      size="sm"
      variant={recording.status === "error" ? "outline" : "default"}
      className="shrink-0"
      disabled={mutation.isPending}
      onClick={(e) => {
        // Card is wrapped in a Link — don't navigate when transcribing.
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
        toast({
          title: "התמלול החל",
          description: "הפעולה עשויה להימשך מספר דקות. פתח את ההקלטה למעקב.",
        });
      }}
      data-testid={`button-quick-transcribe-${recording.seq}`}
    >
      <Sparkles className="w-4 h-4 ml-1" />
      {mutation.isPending ? "מתמלל…" : recording.status === "error" ? "נסה שוב" : "תמלל"}
    </Button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium border hover-elevate ${
        active
          ? "bg-primary text-primary-foreground border-transparent"
          : "bg-card text-muted-foreground"
      }`}
      data-testid={`button-filter-${label}`}
    >
      {label}
    </button>
  );
}
