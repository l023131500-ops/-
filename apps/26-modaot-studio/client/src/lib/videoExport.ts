// ייצוא "וידאו קידום" — הבנייה בפועל שהובטחה ב-CHECKLIST/graphics.md #16 (שלב 5):
// רצף פריימים על גבי התמונה הסטטית ברזולוציה מלאה (אותו stage.toCanvas ששכבות
// PNG/PDF כבר משתמשות בו ב-lib/exporter.ts — שום רינדור/שכבה קיימים לא משתנים),
// עם תנועת זום/פאן איטית (Ken Burns) שמסונכרנת למשך הקריינות שנוצרה ב-#16
// (server/narration.ts). מוקלט ב-MediaRecorder + canvas.captureStream בדפדפן,
// בלי תלות ב-ffmpeg בסביבת Vercel serverless — בדיוק לפי התוכנית שתועדה שם.
import type Konva from "konva";

const MAX_VIDEO_DIM = 1080;
const FPS = 30;
const FALLBACK_DURATION_SEC = 6;
const MAX_DURATION_SEC = 90; // תקרת ביטחון — קריינות ל-2000 תווים לא אמורה לעבור את זה
const ZOOM_END = 1.08;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

/** ממתין למשך האודיו האמיתי. data URL טעון במלואו בזיכרון (לא סטרימינג), ולכן
 * loadedmetadata אמור למסור duration תקין; אם לא (או שאין קריינות בכלל) —
 * נופל למשך קבוע כדי שהייצוא תמיד יסתיים ולא ייתקע. */
function waitForAudioDuration(audioEl: HTMLAudioElement): Promise<number> {
  if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
    return Promise.resolve(Math.min(audioEl.duration, MAX_DURATION_SEC));
  }
  return new Promise((resolve) => {
    const finish = () => {
      audioEl.removeEventListener("loadedmetadata", finish);
      const d = audioEl.duration;
      resolve(Number.isFinite(d) && d > 0 ? Math.min(d, MAX_DURATION_SEC) : FALLBACK_DURATION_SEC);
    };
    audioEl.addEventListener("loadedmetadata", finish, { once: true });
    setTimeout(finish, 4000);
  });
}

/** מצייר פריים בודד: זום איטי מהמרכז + פאן קל, לפי חלקיק זמן t ב-[0,1]. */
function drawKenBurnsFrame(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, vw: number, vh: number, t: number) {
  const p = easeInOut(t);
  const scale = 1 + (ZOOM_END - 1) * p;
  const sw = src.width / scale;
  const sh = src.height / scale;
  const dxMax = src.width - sw;
  const dyMax = src.height - sh;
  const sx = dxMax * 0.5 * p;
  const sy = dyMax * 0.35 * p;
  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, vw, vh);
}

export interface PromoVideoOptions {
  /** data:audio/mpeg;base64,... שכבר נוצר ב-server/narration.ts (שלב 5, #16). */
  narrationAudioUrl?: string | null;
  onProgress?: (fraction: number) => void;
}

/**
 * מרכיב וידאו קידום אמיתי מתוך תבנית סטטית: תמונה ברזולוציה מלאה (כמו PNG),
 * תנועת Ken Burns על פני משך הקריינות, ופס קול מהקריינות עצמה (אם קיימת).
 * מחזיר Blob של webm להורדה/שיתוף — לא נוגע ברינדור/בשמירה/בייצוא הקיימים.
 */
export async function exportPromoVideo(
  stage: Konva.Stage,
  fullWidth: number,
  fullHeight: number,
  opts: PromoVideoOptions = {},
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("הדפדפן הזה לא תומך בהקלטת וידאו (MediaRecorder חסר)");
  }

  const displayW = stage.width();
  const basePixelRatio = fullWidth / displayW; // כמו stageToDataURL ב-lib/exporter.ts
  const longSide = Math.max(fullWidth, fullHeight);
  const videoScale = Math.min(1, MAX_VIDEO_DIM / longSide);
  const sourceCanvas = stage.toCanvas({ pixelRatio: basePixelRatio * videoScale });
  const vw = sourceCanvas.width;
  const vh = sourceCanvas.height;

  let audioEl: HTMLAudioElement | null = null;
  let duration = FALLBACK_DURATION_SEC;
  if (opts.narrationAudioUrl) {
    audioEl = new Audio(opts.narrationAudioUrl);
    audioEl.preload = "auto";
    duration = await waitForAudioDuration(audioEl);
  }

  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = vw;
  recordCanvas.height = vh;
  const ctx = recordCanvas.getContext("2d");
  if (!ctx) throw new Error("לא ניתן ליצור הקשר ציור לקנבס הוידאו");
  drawKenBurnsFrame(ctx, sourceCanvas, vw, vh, 0);

  const canvasStream = (recordCanvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(FPS);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioEl && typeof (audioEl as any).captureStream === "function") {
    try {
      const audioStream: MediaStream = (audioEl as any).captureStream();
      tracks.push(...audioStream.getAudioTracks());
    } catch {
      // דפדפן ללא תמיכה ב-HTMLMediaElement.captureStream — הוידאו ייצא בלי פס קול, לא קריטי.
    }
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
  });

  recorder.start();
  if (audioEl) {
    audioEl.currentTime = 0;
    await audioEl.play().catch(() => {});
  }

  const startTime = performance.now();
  await new Promise<void>((resolve) => {
    function frame() {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / duration);
      drawKenBurnsFrame(ctx!, sourceCanvas, vw, vh, t);
      opts.onProgress?.(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });

  if (audioEl) audioEl.pause();
  recorder.stop();
  return stopped;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
