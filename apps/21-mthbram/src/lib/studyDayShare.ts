import type { Tables } from "@/integrations/supabase/types";
import { normalizeToBlocks, blockLabel } from "./studyDayLessons";

type Event = Tables<"study_day_events">;

export function eventToText(e: Event): string {
  const blocks = normalizeToBlocks(e.lessons, {
    schedule_type: e.schedule_type,
    event_date: e.event_date,
    schedule_days: e.schedule_days,
  });

  const lines: string[] = [
    "═══════════════════════════════════",
    "       יום עיון / יום שכולו תורה",
    "═══════════════════════════════════",
    "",
    `🏛️ ${e.synagogue_name || ""}`,
    `🏙️ ${[e.city, e.street, e.street_number].filter(Boolean).join(" ")}`,
  ];

  if (e.target_audience?.length) {
    lines.push(`👥 קהל יעד: ${e.target_audience.join(", ")}`);
  }
  lines.push("");

  blocks.forEach((b) => {
    lines.push(`📅 ${blockLabel(b)}`);
    if (b.items.length === 0) {
      lines.push("   —");
    } else {
      b.items.forEach((l, i) => {
        lines.push(`   ${i + 1}. ${l.rabbi_name || ""} — ${l.subject || ""}${l.time ? ` (${l.time})` : ""}`);
      });
    }
    lines.push("");
  });

  if (e.contact_name) lines.push(`👤 ${e.contact_name}`);
  if (e.contact_phone) lines.push(`📞 ${e.contact_phone}`);
  if (e.contact_email) lines.push(`📧 ${e.contact_email}`);
  if (e.donation_link) lines.push(`💝 ${e.donation_link}`);
  lines.push(
    "",
    "═══════════════════════════════════",
    "   באדיבות איגוד השיעורים",
    "═══════════════════════════════════",
  );

  return lines.filter((l) => l !== undefined).join("\n");
}

export async function copyEventToClipboard(e: Event) {
  await navigator.clipboard.writeText(eventToText(e));
}

export function downloadEventAsText(e: Event) {
  const blob = new Blob(["\uFEFF" + eventToText(e)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `יום-עיון-${e.synagogue_name || "event"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
