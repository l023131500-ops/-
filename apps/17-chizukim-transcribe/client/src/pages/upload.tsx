import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { queryClient, API_BASE } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, UploadCloud, FileAudio, X } from "lucide-react";

const ALLOWED_EXT = /\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)$/i;

/**
 * The real ceiling, measured against the bucket — not a number chosen here.
 *
 * This page used to promise "עד 500MB". 500MB is the multer limit on the
 * Express fallback route, which the direct-to-storage path never touches;
 * what governs is the Supabase bucket. Asked directly, it accepts 50MB and
 * answers 413 "Maximum size exceeded" at 51MB — so the page was overstating
 * by a factor of ten, and a large shiur failed only after the user had
 * watched the progress bar climb.
 *
 * Re-measure with scripts/qa/chizukim-upload-ceiling.mjs before changing it.
 * Raising this constant does not raise the limit; the bucket does.
 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Read audio duration in the browser (best-effort).
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("audio");
      a.preload = "metadata";
      a.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(isFinite(a.duration) ? Math.round(a.duration) : null);
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      a.src = url;
    } catch {
      resolve(null);
    }
  });
}

// Direct PUT to Supabase Storage with real progress via XHR.
function putWithProgress(
  url: string,
  file: File,
  apikey: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("Authorization", `Bearer ${apikey}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`שגיאת אחסון ${xhr.status}: ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error("שגיאת רשת בזמן ההעלאה"));
    xhr.send(file);
  });
}

export default function UploadPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState("");
  const [parsha, setParsha] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    if (f && !f.type.startsWith("audio") && !ALLOWED_EXT.test(f.name)) {
      toast({
        title: "קובץ לא נתמך",
        description: "אנא בחר קובץ אודיו (mp3, wav, m4a, ogg, flac ועוד).",
        variant: "destructive",
      });
      return;
    }
    // Refuse here rather than after a full upload: the storage service rejects
    // it anyway, and finding out at 100% is the worst possible moment.
    if (f && f.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "הקובץ גדול מדי",
        description: `המגבלה היא ${fmtBytes(MAX_UPLOAD_BYTES)} והקובץ הזה ${fmtBytes(f.size)}. אפשר לפצל את ההקלטה או לדחוס אותה לאיכות נמוכה יותר לפני ההעלאה.`,
        variant: "destructive",
      });
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      // 1) Extract duration (best-effort) while we init.
      setPhase("מכין את ההעלאה…");
      const duration = await readDuration(file);

      // 2) Reserve a slot on the backend.
      const initRes = await fetch(`${API_BASE}/api/upload/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_name: file.name }),
      });
      if (!initRes.ok) {
        const j = await initRes.json().catch(() => ({}));
        throw new Error(j.error || `שגיאת אתחול ${initRes.status}`);
      }
      const { seq, objectPath, uploadUrl, apikey } = await initRes.json();

      // 3) Upload directly to storage (no server memory pressure, handles GBs).
      setPhase("מעלה את הקובץ…");
      await putWithProgress(uploadUrl, file, apikey, setProgress);

      // 4) Register the DB row.
      setPhase("רושם את ההקלטה…");
      const regRes = await fetch(`${API_BASE}/api/upload/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seq,
          objectPath,
          original_name: file.name,
          file_size_bytes: file.size,
          duration_seconds: duration,
          topic,
          parsha_or_date: parsha,
        }),
      });
      if (!regRes.ok) {
        const j = await regRes.json().catch(() => ({}));
        throw new Error(j.error || `שגיאת רישום ${regRes.status}`);
      }
      const { recording } = await regRes.json();
      queryClient.invalidateQueries({ queryKey: ["/recordings"] });
      toast({
        title: "ההקלטה הועלתה",
        description: "הרשומה נוצרה עם סטטוס ״הועלה״ וממתינה לתמלול.",
      });
      navigate(`/recording/${recording.id}`);
    } catch (e: any) {
      // Fallback to server-side upload (smaller files) if direct path failed.
      try {
        setPhase("מנסה נתיב חלופי…");
        const fd = new FormData();
        fd.append("audio", file);
        fd.append("topic", topic);
        fd.append("parsha_or_date", parsha);
        if (duration != null) fd.append("duration_seconds", String(duration));
        const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `שגיאה ${res.status}`);
        }
        const { recording } = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/recordings"] });
        toast({ title: "ההקלטה הועלתה", description: "הרשומה נוצרה בהצלחה." });
        navigate(`/recording/${recording.id}`);
        return;
      } catch (e2: any) {
        toast({
          title: "שגיאה בהעלאה",
          description: e2.message || e.message,
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-testid="link-back"
          >
            <ChevronRight className="w-4 h-4" />
            חזרה לרשימה
          </Link>
          <a
            href="/subscribe?app=chizukim"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover-elevate rounded-md px-2 py-1"
            data-testid="link-pricing"
          >
            מחירון
          </a>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">העלאת הקלטה חדשה</h1>
        <p className="text-sm text-muted-foreground mb-6">
          עד {fmtBytes(MAX_UPLOAD_BYTES)} לקובץ — ההעלאה נעשית ישירות לאחסון עם מד התקדמות.
          הקלטה ארוכה יותר אפשר לפצל, או לדחוס לאיכות נמוכה יותר.
        </p>

        <Card className="p-6 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) pick(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="בחירת קובץ אודיו להעלאה"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!busy) inputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate ${
              drag ? "border-primary bg-primary/5" : "border-input"
            } ${busy ? "opacity-60 pointer-events-none" : ""}`}
            data-testid="dropzone"
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.webm,.flac"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              data-testid="input-file"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileAudio className="w-6 h-6 text-primary" />
                <span className="font-medium" data-testid="text-filename">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fmtBytes(file.size)}
                </span>
                {!busy && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  גרור לכאן קובץ אודיו או לחץ לבחירה
                </p>
              </>
            )}
          </div>

          {busy && (
            <div className="space-y-2" data-testid="progress-block">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{phase}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                  data-testid="progress-bar"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="upload-topic" className="text-xs text-muted-foreground mb-1 block">
              נושא (אופציונלי — ניתן למלא לאחר התמלול)
            </label>
            <Input
              id="upload-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="נושא המאמר…"
              disabled={busy}
              data-testid="input-topic"
            />
          </div>
          <div>
            <label htmlFor="upload-parsha" className="text-xs text-muted-foreground mb-1 block">
              פרשה / תאריך (אופציונלי)
            </label>
            <Input
              id="upload-parsha"
              value={parsha}
              onChange={(e) => setParsha(e.target.value)}
              placeholder="לדוגמה: פרשת יתרו / י״ט טבת"
              disabled={busy}
              data-testid="input-parsha"
            />
          </div>

          <Button
            onClick={submit}
            disabled={!file || busy}
            className="w-full"
            data-testid="button-submit"
          >
            {busy ? "מעלה…" : "העלה הקלטה"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            הקובץ יאוחסן והרשומה תיווצר עם סטטוס ״הועלה״. התמלול והעריכה יבוצעו בשלב הבא.
          </p>
        </Card>
      </main>
    </div>
  );
}
