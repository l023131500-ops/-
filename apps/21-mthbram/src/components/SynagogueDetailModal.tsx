import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, Clock, BookOpen, Building2, Download, Printer, Share2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useRef } from "react";
import { toast } from "sonner";

import type { ScheduleBlock } from "@/lib/studyDayLessons";
import { safeUrl } from "@/lib/utils";

export interface SynagogueCardData {
  id: string;
  source: "lesson" | "study_day";
  synagogue_name: string;
  city: string;
  street?: string;
  street_number?: string;
  logo_url?: string;
  schedule_type?: "specific_date" | "weekly_days" | null;
  event_date?: string | null;
  schedule_days?: any;
  lessons: { rabbi_name: string; subject: string; time?: string; day?: string }[];
  blocks?: ScheduleBlock[];
  donation_link?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: SynagogueCardData | null;
}

const HEB_MONTHS: Record<string, string> = {
  "01": "ינואר", "02": "פברואר", "03": "מרץ", "04": "אפריל",
  "05": "מאי", "06": "יוני", "07": "יולי", "08": "אוגוסט",
  "09": "ספטמבר", "10": "אוקטובר", "11": "נובמבר", "12": "דצמבר",
};

const formatHebDate = (iso: string) => {
  try {
    const d = parseISO(iso);
    const day = format(d, "d");
    const m = format(d, "MM");
    return `${day} ב${HEB_MONTHS[m] ?? ""}`;
  } catch { return iso; }
};

export default function SynagogueDetailModal({ open, onClose, data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  if (!data) return null;

  const accentClass = data.source === "study_day"
    ? "from-[hsl(180_45%_30%)] to-[hsl(180_55%_40%)]"
    : "from-gold to-gold-light";

  // Group lessons by day if applicable
  const grouped = (() => {
    const groups: Record<string, typeof data.lessons> = {};
    for (const l of data.lessons) {
      const key = l.day || (data.event_date ? formatHebDate(data.event_date) : "כל השיעורים");
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }
    return groups;
  })();

  const buildShareText = () => {
    const lines: string[] = [];
    lines.push(`🏛️ ${data.synagogue_name}`);
    lines.push(`📍 ${[data.city, data.street, data.street_number].filter(Boolean).join(" ")}`);
    if (data.event_date) lines.push(`📅 ${formatHebDate(data.event_date)}`);
    lines.push("");
    lines.push("📖 סדר השיעורים:");
    Object.entries(grouped).forEach(([groupKey, items]) => {
      if (Object.keys(grouped).length > 1) lines.push(`\n— ${groupKey} —`);
      items.forEach((l) => {
        lines.push(`${l.time ? `🕐 ${l.time} · ` : ""}${l.subject} · ${l.rabbi_name}`);
      });
    });
    if (data.donation_link) {
      lines.push("");
      lines.push(`💛 תרומה: ${data.donation_link}`);
    }
    lines.push("");
    lines.push("באדיבות איגוד השיעורים — mthbram.lovable.app");
    return lines.join("\n");
  };

  const handleShare = async () => {
    const text = buildShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: data.synagogue_name, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("הועתק ללוח");
      }
    } catch (e) {
      // user cancelled
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#fdf8f0",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${data.synagogue_name}-שיעורים.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("התמונה ירדה");
    } catch (e) {
      toast.error("שגיאה ביצירת התמונה");
    }
  };

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handlePrint = () => {
    const text = escapeHtml(buildShareText()).replace(/\n/g, "<br/>");
    const title = escapeHtml(data.synagogue_name);
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><title>${title}</title>
      <style>
        body { font-family: 'Assistant', Arial, sans-serif; padding: 40px; background: #fdf8f0; color: #2a2a2a; line-height: 1.8; }
        h1 { font-size: 28px; color: hsl(180 45% 25%); border-bottom: 2px solid hsl(180 45% 30% / 0.3); padding-bottom: 10px; }
        .content { font-size: 16px; white-space: pre-wrap; }
      </style></head><body>
        <h1>${title}</h1>
        <div class="content">${text}</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#fdf8f0] border-0 p-0" dir="rtl">
        <div ref={cardRef}>
          <div className={`bg-gradient-to-l ${accentClass} p-6 text-white rounded-t-lg`}>
            <DialogHeader>
              <div className="flex items-center gap-4">
                {data.logo_url ? (
                  <img src={data.logo_url} alt={data.synagogue_name ? `לוגו ${data.synagogue_name}` : "לוגו"} className="w-16 h-16 rounded-xl object-cover bg-white/20 border border-white/30" crossOrigin="anonymous" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1 text-right">
                  <DialogTitle className="font-display text-2xl text-white">{data.synagogue_name}</DialogTitle>
                  <p className="text-sm text-white/85 flex items-center gap-1.5 mt-1 justify-start">
                    <MapPin className="w-3.5 h-3.5" />
                    {[data.city, data.street, data.street_number].filter(Boolean).join(" ")}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {data.event_date && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                <Calendar className="w-4 h-4" />
                {formatHebDate(data.event_date)}
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            <h4 className="font-display text-lg text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              סדר השיעורים ({data.lessons.length})
            </h4>

            {Object.entries(grouped).map(([groupKey, items]) => (
              <div key={groupKey} className="space-y-2">
                {Object.keys(grouped).length > 1 && (
                  <p className="text-sm font-bold text-[hsl(180_45%_30%)]">{groupKey}</p>
                )}
                {items.map((l, i) => (
                  <div
                    key={i}
                    className="bg-white border border-foreground/10 rounded-xl p-4 flex items-center gap-3 hover:border-foreground/25 transition-colors"
                  >
                    {l.time && (
                      <div className="flex flex-col items-center justify-center min-w-[60px] bg-[hsl(180_30%_96%)] rounded-lg py-2">
                        <Clock className="w-3 h-3 text-[hsl(180_45%_30%)] mb-0.5" />
                        <span className="font-bold text-[hsl(180_45%_25%)] text-sm">{l.time}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{l.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">{l.rabbi_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Action bar - outside the captured area */}
        <div className="px-6 pb-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownloadImage}
              className="flex items-center justify-center gap-2 bg-[hsl(180_45%_30%)] hover:bg-[hsl(180_45%_25%)] text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Download className="w-4 h-4" /> הורד תמונה
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-white border-2 border-[hsl(180_45%_30%)]/30 hover:border-[hsl(180_45%_30%)] text-[hsl(180_45%_25%)] font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Printer className="w-4 h-4" /> הדפס
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-white border-2 border-[hsl(180_45%_30%)]/30 hover:border-[hsl(180_45%_30%)] text-[hsl(180_45%_25%)] font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" /> שתף
            </button>
          </div>

          {safeUrl(data.donation_link) && (
            <a
              href={safeUrl(data.donation_link)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-gradient-to-l from-gold to-gold-light text-navy font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              💛 תרומה לבית הכנסת
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
