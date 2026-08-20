import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  fetchRecording,
  updateRecording,
  startTranscription,
  driveStreamUrl,
  driveOpenUrl,
  searchTerms,
  STATUS_LABELS,
  STATUS_ORDER,
  type Recording,
  type RecordingStatus,
} from "@/lib/supabase";
import { statusBadgeClass, canTranscribe, isProcessing } from "@/lib/status";
import { queryClient } from "@/lib/queryClient";
import {
  formatCost,
  formatDuration,
  renderEditedHtml,
  recordingTitle,
  countHits,
} from "@/lib/format";
import { exportWord, exportPdf, exportSubtitles } from "@/lib/export";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  Save,
  FileText,
  FileType,
  Coins,
  Clock,
  Eye,
  Pencil,
  ExternalLink,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  Search,
  Captions,
} from "lucide-react";

export default function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // The archive search puts its query in ?q=, and wouter's hash navigation
  // carries it across routes — so arriving from a search result means knowing
  // which passage the reader came for. Read once: the term does not change
  // while a recording is open.
  const [search] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return { q: p.get("q") ?? "", wholeWord: p.get("w") === "1" };
  });
  const terms = useMemo(() => searchTerms(search.q), [search.q]);
  const wholeWord = search.wholeWord;
  const rawRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading, error } = useQuery<Recording>({
    queryKey: ["/recordings", id],
    queryFn: () => fetchRecording(id),
    // Live polling every 4s while the pipeline is running; stops at ready/error.
    refetchInterval: (query) => {
      const st = query.state.data?.status;
      return st && isProcessing(st) ? 4000 : false;
    },
  });

  // Kick off transcription. The backend runs the full pipeline (long-lived);
  // meanwhile the polling query above tracks status transitions live.
  const transcribe = useMutation({
    mutationFn: () => startTranscription(id),
    onMutate: () => {
      // Optimistically flip to "transcribing" so the stepper appears at once
      // and polling starts immediately.
      queryClient.setQueryData<Recording>(["/recordings", id], (prev) =>
        prev ? { ...prev, status: "transcribing" } : prev,
      );
    },
    onSuccess: (rec) => {
      queryClient.setQueryData(["/recordings", id], rec);
      queryClient.invalidateQueries({ queryKey: ["/recordings"] });
      queryClient.invalidateQueries({ queryKey: ["/recordings", id] });
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/recordings", id] });
      toast({ title: "שגיאה בתמלול", description: e.message, variant: "destructive" });
    },
  });

  // Local editable state
  const [topic, setTopic] = useState("");
  const [parshaOrDate, setParshaOrDate] = useState("");
  const [rawText, setRawText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [status, setStatus] = useState<RecordingStatus>("ready");
  const [editedMode, setEditedMode] = useState<"read" | "edit">("read");

  useEffect(() => {
    if (data) {
      setTopic(data.topic ?? "");
      setParshaOrDate(data.parsha_or_date ?? "");
      setRawText(data.raw_transcript ?? "");
      setEditedText(data.edited_transcript ?? "");
      setStatus(data.status);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateRecording(id, {
        topic: topic.trim() || null,
        parsha_or_date: parshaOrDate.trim() || null,
        raw_transcript: rawText,
        edited_transcript: editedText,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/recordings"] });
      queryClient.invalidateQueries({ queryKey: ["/recordings", id] });
      toast({ title: "נשמר בהצלחה", description: "השינויים נשמרו במסד הנתונים." });
    },
    onError: (e: Error) =>
      toast({ title: "שגיאה בשמירה", description: e.message, variant: "destructive" }),
  });

  const dirty =
    data != null &&
    (topic !== (data.topic ?? "") ||
      parshaOrDate !== (data.parsha_or_date ?? "") ||
      rawText !== (data.raw_transcript ?? "") ||
      editedText !== (data.edited_transcript ?? "") ||
      status !== data.status);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4" role="alert" aria-live="assertive" data-testid="text-error">
          לא ניתן לטעון את ההקלטה.
        </p>
        <Link href="/" className="text-primary underline">
          חזרה לרשימה
        </Link>
      </div>
    );
  }

  const current: Recording = {
    ...data,
    topic: topic || data.topic,
    parsha_or_date: parshaOrDate || data.parsha_or_date,
    raw_transcript: rawText,
    edited_transcript: editedText,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-testid="link-back"
          >
            <ChevronRight className="w-4 h-4" />
            {terms.length ? "חזרה לתוצאות החיפוש" : "חזרה לרשימה"}
          </Link>
          <Button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            data-testid="button-save"
          >
            <Save className="w-4 h-4 ml-2" />
            {save.isPending ? "שומר…" : "שמירה"}
          </Button>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Meta card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px] space-y-3">
              <div>
                <label htmlFor="detail-topic" className="text-xs text-muted-foreground mb-1 block">
                  נושא המאמר (שם הקובץ)
                </label>
                <Input
                  id="detail-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="font-semibold text-base"
                  placeholder="הזן נושא…"
                  data-testid="input-topic"
                />
              </div>
              <div>
                <label htmlFor="detail-parsha" className="text-xs text-muted-foreground mb-1 block">
                  פרשה / תאריך
                </label>
                <Input
                  id="detail-parsha"
                  value={parshaOrDate}
                  onChange={(e) => setParshaOrDate(e.target.value)}
                  placeholder="לדוגמה: פרשת יתרו / י״ט טבת"
                  data-testid="input-parsha"
                />
              </div>
            </div>
            <div className="space-y-3 min-w-[180px]">
              <div>
                <label htmlFor="detail-status" className="text-xs text-muted-foreground mb-1 block">סטטוס</label>
                <Select value={status} onValueChange={(v) => setStatus(v as RecordingStatus)}>
                  <SelectTrigger id="detail-status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(data.duration_seconds)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {formatCost(data.transcription_cost_usd)}
                </span>
              </div>
            </div>
          </div>

          {/* Audio player — prefer Google Drive stream to avoid duplicate storage */}
          <AudioSection recording={data} />
        </Card>

        {/* Where the search term sits in this recording */}
        {terms.length > 0 && (
          <SearchContextBar
            terms={terms}
            editedHits={countHits(editedText, terms, wholeWord)}
            rawHits={countHits(rawText, terms, wholeWord)}
            onJumpRaw={() => jumpToNextHit(rawRef.current, terms, wholeWord)}
          />
        )}

        {/* Transcription control + live progress */}
        <TranscribePanel
          status={data.status}
          pending={transcribe.isPending}
          onTranscribe={() => transcribe.mutate()}
        />

        {/* Transcripts side by side */}
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {/* Edited transcript */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-transparent">
                  תמלול ערוך
                </Badge>
                <span className="text-xs text-muted-foreground">מוכן להגהה והדפסה</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditedMode("read")}
                  className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 hover-elevate ${editedMode === "read" ? "bg-secondary" : ""}`}
                  aria-pressed={editedMode === "read"}
                  data-testid="button-mode-read"
                >
                  <Eye className="w-3 h-3" /> קריאה
                </button>
                <button
                  onClick={() => setEditedMode("edit")}
                  className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 hover-elevate ${editedMode === "edit" ? "bg-secondary" : ""}`}
                  aria-pressed={editedMode === "edit"}
                  data-testid="button-mode-edit"
                >
                  <Pencil className="w-3 h-3" /> עריכה
                </button>
              </div>
            </div>

            {editedMode === "read" ? (
              <div
                className="prose-hebrew min-h-[300px]"
                data-testid="text-edited-render"
                dangerouslySetInnerHTML={{
                  __html: renderEditedHtml(editedText, terms, wholeWord),
                }}
              />
            ) : (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[340px] font-serif text-base leading-relaxed"
                dir="rtl"
                placeholder="הטקסט הערוך… השתמש ב־**כותרת** לכותרת משנה, ושורה ריקה כפולה להפרדת פסקאות."
                aria-label="התמלול הערוך לעריכה"
                data-testid="textarea-edited"
              />
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportWord(current, "edited")}
                data-testid="button-word-edited"
              >
                <FileText className="w-4 h-4 ml-1" /> הורדה Word
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportPdf(current, "edited")}
                data-testid="button-pdf-edited"
              >
                <FileType className="w-4 h-4 ml-1" /> הורדה PDF
              </Button>
            </div>
          </Card>

          {/* Raw transcript */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-secondary text-secondary-foreground border-transparent">
                תמלול גולמי
              </Badge>
              <span className="text-xs text-muted-foreground">כפי שנאמר, מילה במילה</span>
            </div>
            <Textarea
              ref={rawRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[340px] font-serif text-base leading-relaxed"
              dir="rtl"
              placeholder="התמלול הגולמי…"
              aria-label="התמלול הגולמי לעריכה"
              data-testid="textarea-raw"
            />
            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportWord(current, "raw")}
                data-testid="button-word-raw"
              >
                <FileText className="w-4 h-4 ml-1" /> הורדה Word
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportPdf(current, "raw")}
                data-testid="button-pdf-raw"
              >
                <FileType className="w-4 h-4 ml-1" /> הורדה PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!current.segments?.length}
                onClick={() => exportSubtitles(current, "srt")}
                data-testid="button-srt"
              >
                <Captions className="w-4 h-4 ml-1" /> כתוביות SRT
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!current.segments?.length}
                onClick={() => exportSubtitles(current, "vtt")}
                data-testid="button-vtt"
              >
                <Captions className="w-4 h-4 ml-1" /> כתוביות VTT
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ---- Archive search context ----
// A textarea cannot carry <mark>, so the raw transcript gets a stepper that
// selects the next occurrence instead — same purpose, native selection.
function jumpToNextHit(
  el: HTMLTextAreaElement | null,
  terms: string[],
  wholeWord: boolean,
) {
  if (!el) return;
  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!pattern) return;
  const tail = wholeWord ? "(?![\\p{L}\\p{N}_])" : "";
  const re = new RegExp(`(?:${pattern})${tail}`, "giu");
  // Start just past the current selection, and wrap around at the end.
  re.lastIndex = el.selectionEnd ?? 0;
  let m = re.exec(el.value);
  if (!m) {
    re.lastIndex = 0;
    m = re.exec(el.value);
  }
  if (!m) return;

  el.focus();
  el.setSelectionRange(m.index, m.index + m[0].length);
  // Scroll the hit into view: textarea has no scrollIntoView for a selection,
  // so estimate the line from the text before it.
  const linesBefore = el.value.slice(0, m.index).split("\n").length - 1;
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
  el.scrollTop = Math.max(0, linesBefore * lineHeight - el.clientHeight / 2);
}

function SearchContextBar({
  terms,
  editedHits,
  rawHits,
  onJumpRaw,
}: {
  terms: string[];
  editedHits: number;
  rawHits: number;
  onJumpRaw: () => void;
}) {
  const quoted = terms.map((t) => `״${t}״`).join(" ו־");
  return (
    <Card
      className="p-4 flex items-center justify-between gap-4 flex-wrap border-primary/30 bg-primary/5"
      data-testid="panel-search-context"
    >
      <div className="flex items-center gap-2 text-sm">
        <Search className="w-4 h-4 text-primary shrink-0" />
        <span data-testid="text-search-context">
          הגעת מחיפוש {quoted} —{" "}
          {editedHits > 0 ? (
            <>
              <strong>{editedHits}</strong> מופעים בתמלול הערוך (מסומנים בצהוב)
            </>
          ) : (
            "אין מופעים בתמלול הערוך"
          )}
          {rawHits > 0 && (
            <>
              , <strong>{rawHits}</strong> בגולמי
            </>
          )}
          .
        </span>
      </div>
      {rawHits > 0 && (
        <Button variant="outline" size="sm" onClick={onJumpRaw} data-testid="button-jump-raw">
          <Search className="w-3.5 h-3.5 ml-1" />
          סמן את המופע הבא בגולמי
        </Button>
      )}
    </Card>
  );
}

// ---- Transcription control panel + live 3-step progress ----
// Steps map: תמלול (transcribing/transcribed) -> עריכה (editing) -> מוכן (ready)
type StepState = "done" | "active" | "pending";

const STEPS: { key: string; label: string }[] = [
  { key: "transcribe", label: "תמלול" },
  { key: "edit", label: "עריכה" },
  { key: "ready", label: "מוכן" },
];

function stepStates(status: RecordingStatus): StepState[] {
  // index 0 transcribe, 1 edit, 2 ready
  switch (status) {
    case "transcribing":
      return ["active", "pending", "pending"];
    case "transcribed":
      return ["done", "pending", "pending"];
    case "editing":
      return ["done", "active", "pending"];
    case "ready":
      return ["done", "done", "done"];
    default:
      return ["pending", "pending", "pending"];
  }
}

function phaseLabel(status: RecordingStatus): string {
  switch (status) {
    case "uploaded":
      return "ממתין לתמלול";
    case "transcribing":
      return "מתמלל…";
    case "transcribed":
      return "התמלול הושלם, מכין עריכה…";
    case "editing":
      return "עורך…";
    case "ready":
      return "מוכן ✓";
    case "error":
      return "שגיאה בתמלול";
    default:
      return "";
  }
}

function TranscribePanel({
  status,
  pending,
  onTranscribe,
}: {
  status: RecordingStatus;
  pending: boolean;
  onTranscribe: () => void;
}) {
  const processing = isProcessing(status);
  const showTranscribeBtn = canTranscribe(status);

  // Nothing to show for a completed recording (transcripts appear below).
  if (status === "ready") {
    return (
      <Card
        className="p-4 flex items-center gap-2 text-sm"
        data-testid="panel-transcribe"
      >
        <span className="inline-flex items-center gap-1.5 text-chart-3 font-medium">
          <Check className="w-4 h-4" />
          {phaseLabel(status)}
        </span>
        <span className="text-muted-foreground">
          — התמלול והעריכה זמינים למטה.
        </span>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4" data-testid="panel-transcribe">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {status === "error" ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : processing ? (
            <Loader2 className="w-5 h-5 text-chart-4 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary" />
          )}
          <div>
            <div className="font-semibold leading-tight" data-testid="text-transcribe-phase">
              {phaseLabel(status)}
            </div>
            <div className="text-xs text-muted-foreground">
              {status === "error"
                ? "ארעה תקלה. ניתן לנסות שוב."
                : status === "uploaded"
                  ? "לחץ כדי לתמלל את ההקלטה במנוע ivrit.ai."
                  : "התהליך רץ — העמוד מתעדכן אוטומטית."}
            </div>
          </div>
        </div>

        {showTranscribeBtn && (
          <Button
            size="lg"
            onClick={onTranscribe}
            disabled={pending}
            className="font-semibold"
            data-testid="button-transcribe"
          >
            <Sparkles className="w-4 h-4 ml-2" />
            {pending
              ? "מתמלל…"
              : status === "error"
                ? "נסה לתמלל שוב"
                : "תמלל עכשיו"}
          </Button>
        )}
      </div>

      {/* Live 3-step stepper (shown while processing) */}
      {(processing || status === "uploaded") && (
        <Stepper status={status} />
      )}
    </Card>
  );
}

function Stepper({ status }: { status: RecordingStatus }) {
  const states = stepStates(status);
  return (
    <div className="flex items-center" data-testid="stepper">
      {STEPS.map((step, i) => {
        const st = states[i];
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full grid place-items-center border-2 transition-colors ${
                  st === "done"
                    ? "bg-chart-3/20 border-chart-3 text-chart-3"
                    : st === "active"
                      ? "bg-chart-4/20 border-chart-4 text-chart-4"
                      : "bg-muted border-border text-muted-foreground"
                }`}
                data-testid={`step-${step.key}-${st}`}
              >
                {st === "done" ? (
                  <Check className="w-4 h-4" />
                ) : st === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  st === "pending" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 mb-5 rounded ${
                  states[i] === "done" ? "bg-chart-3" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AudioSection({ recording }: { recording: Recording }) {
  const driveOpen = driveOpenUrl(recording.drive_id);
  const driveStream = driveStreamUrl(recording.drive_id);
  // Prefer Drive streaming to avoid duplicate audio storage; fall back to storage URL.
  const playSrc = driveStream ?? recording.audio_url ?? undefined;

  if (!playSrc && !driveOpen) {
    return (
      <p className="text-sm text-muted-foreground mt-2" data-testid="text-no-audio">
        אין קובץ אודיו זמין להקלטה זו.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {playSrc && (
        <audio
          controls
          preload="none"
          className="w-full"
          src={playSrc}
          data-testid="audio-player"
        />
      )}
      {driveOpen && (
        <a
          href={driveOpen}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          data-testid="link-drive"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          האזנה / פתיחה בגוגל דרייב
        </a>
      )}
    </div>
  );
}
