import { supabase } from "@/lib/supabase";
import type {
  Announcement,
  CommunityService,
  InquiryInput,
  Lesson,
  PrayerTime,
  RabbiQuestionInput,
  Synagogue,
} from "@/lib/types";
import {
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_LESSONS,
  SAMPLE_PRAYER_TIMES,
  SAMPLE_SERVICES,
  SAMPLE_SYNAGOGUES,
} from "@/data/seed";

/**
 * Data access layer. Every function reads/writes the `chatzor` schema when
 * Supabase is configured, and falls back to clearly-flagged seed content
 * otherwise, so the app is fully demoable before the DB is connected.
 *
 * Reads degrade gracefully (log + fall back). Writes THROW on error so the UI
 * shows an honest failure instead of a false "success".
 */

const ORG_SLUG = "chatzor-hagelilit";

// ---- mappers (snake_case DB row → camelCase domain type) -------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
const toSynagogue = (r: any): Synagogue => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  nusach: r.nusach ?? null,
  address: r.address ?? null,
  brandGradient: r.brand_gradient ?? "linear-gradient(135deg, hsl(200 50% 18%), hsl(210 45% 25%))",
  logoUrl: r.logo_url ?? null,
  description: r.description ?? null,
  donationLink: r.donation_link ?? null,
  isPublished: r.is_published ?? true,
});

const toPrayerTime = (r: any): PrayerTime => ({
  id: r.id,
  synagogueId: r.synagogue_id,
  type: r.prayer_type,
  label: r.label,
  time: r.time,
  note: r.note ?? null,
});

const toLesson = (r: any): Lesson => ({
  id: r.id,
  synagogueId: r.synagogue_id ?? null,
  title: r.title,
  teacher: r.teacher ?? null,
  day: r.day ?? "",
  time: r.time ?? "",
  location: r.location ?? null,
  audience: r.audience ?? null,
});

const toService = (r: any): CommunityService => ({
  id: r.id,
  name: r.name,
  category: r.category ?? "",
  description: r.description ?? null,
  contact: r.contact ?? null,
});

const toAnnouncement = (r: any): Announcement => ({
  id: r.id,
  synagogueId: r.synagogue_id ?? null,
  title: r.title,
  body: r.body ?? null,
  startsAt: r.starts_at ?? null,
  endsAt: r.ends_at ?? null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- reads -----------------------------------------------------------------
export async function listSynagogues(): Promise<Synagogue[]> {
  if (!supabase) return SAMPLE_SYNAGOGUES;
  const { data, error } = await supabase.from("synagogues").select("*").eq("is_published", true).order("name");
  if (error || !data) {
    console.warn("listSynagogues fell back to seed:", error?.message);
    return SAMPLE_SYNAGOGUES;
  }
  return data.map(toSynagogue);
}

export async function getSynagogueBySlug(slug: string): Promise<Synagogue | null> {
  if (!supabase) return SAMPLE_SYNAGOGUES.find((s) => s.slug === slug) ?? null;
  const { data, error } = await supabase.from("synagogues").select("*").eq("slug", slug).maybeSingle();
  if (error) console.warn("getSynagogueBySlug error:", error.message);
  return data ? toSynagogue(data) : null;
}

export async function listPrayerTimes(synagogueId: string): Promise<PrayerTime[]> {
  if (!supabase) return SAMPLE_PRAYER_TIMES.filter((p) => p.synagogueId === synagogueId);
  const { data, error } = await supabase
    .from("prayer_times")
    .select("*")
    .eq("synagogue_id", synagogueId)
    .order("sort_order");
  if (error || !data) return SAMPLE_PRAYER_TIMES.filter((p) => p.synagogueId === synagogueId);
  return data.map(toPrayerTime);
}

export async function listLessons(synagogueId?: string): Promise<Lesson[]> {
  if (!supabase) {
    return synagogueId ? SAMPLE_LESSONS.filter((l) => l.synagogueId === synagogueId) : SAMPLE_LESSONS;
  }
  let q = supabase.from("lessons").select("*").eq("is_published", true);
  if (synagogueId) q = q.eq("synagogue_id", synagogueId);
  const { data, error } = await q;
  if (error || !data) return SAMPLE_LESSONS;
  return data.map(toLesson);
}

export async function listServices(): Promise<CommunityService[]> {
  if (!supabase) return SAMPLE_SERVICES;
  const { data, error } = await supabase.from("community_services").select("*").eq("is_published", true).order("name");
  if (error || !data) return SAMPLE_SERVICES;
  return data.map(toService);
}

export async function listAnnouncements(synagogueId?: string): Promise<Announcement[]> {
  if (!supabase) {
    return synagogueId ? SAMPLE_ANNOUNCEMENTS.filter((a) => a.synagogueId === synagogueId) : SAMPLE_ANNOUNCEMENTS;
  }
  let q = supabase.from("announcements").select("*").eq("is_published", true).order("created_at", { ascending: false });
  if (synagogueId) q = q.eq("synagogue_id", synagogueId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(toAnnouncement);
}

// ---- writes (throw on failure) ---------------------------------------------
export async function submitInquiry(input: InquiryInput): Promise<void> {
  if (!supabase) {
    // Preview mode: no DB. Simulate a short delay so the UX is realistic.
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  const { error } = await supabase.from("inquiries").insert({
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    subject: input.subject || null,
    body: input.body,
    synagogue_id: input.synagogueId || null,
  });
  if (error) throw new Error(error.message);
}

export async function submitRabbiQuestion(input: RabbiQuestionInput): Promise<void> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  const { error } = await supabase.from("rabbi_questions").insert({
    name: input.name || null,
    contact: input.contact || null,
    question: input.question,
  });
  if (error) throw new Error(error.message);
}

export { ORG_SLUG };
