import type { Tables } from "@/integrations/supabase/types";

type Lesson = Tables<"lessons">;

export function formatLessonText(lesson: Partial<Lesson>): string {
  const lines: string[] = [];
  if (lesson.rabbi_name) lines.push(`👤 ${lesson.rabbi_name}`);
  if (lesson.subject) lines.push(`📖 ${lesson.subject}`);
  if (lesson.language) lines.push(`🗣️ ${lesson.language}`);
  if (lesson.audience_type?.length) lines.push(`👥 ${lesson.audience_type.join(", ")}`);
  if (lesson.target_audience?.length) lines.push(`🎯 ${lesson.target_audience.join(", ")}`);

  const loc = [lesson.city, lesson.neighborhood, lesson.street, lesson.street_number]
    .filter(Boolean)
    .join(" ");
  if (loc) lines.push(`📍 ${loc}`);
  if (lesson.synagogue_name) lines.push(`🕍 ${lesson.synagogue_name}`);

  if (lesson.specific_date) lines.push(`📅 ${lesson.specific_date}`);
  const days = (lesson.schedule_days as Array<{ day?: string; time?: string }> | null) ?? [];
  if (Array.isArray(days) && days.length) {
    days.forEach((d) => {
      if (d.day || d.time) lines.push(`🕐 ${d.day ?? ""} ${d.time ?? ""}`.trim());
    });
  }
  if (lesson.schedule_notes) lines.push(`📝 ${lesson.schedule_notes}`);
  if (lesson.rabbi_phone) lines.push(`📞 ${lesson.rabbi_phone}`);

  return lines.join("\n");
}

export async function copyLessonToClipboard(lesson: Partial<Lesson>) {
  const text = formatLessonText(lesson);
  await navigator.clipboard.writeText(text);
}

export function downloadLessonAsText(lesson: Partial<Lesson>) {
  const text = formatLessonText(lesson);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `שיעור-${lesson.rabbi_name || "פרטים"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
