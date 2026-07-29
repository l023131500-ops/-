import { supabase } from "@/lib/supabase";
import type {
  Announcement,
  AnnouncementInput,
  CommunityService,
  Inquiry,
  InquiryInput,
  Lesson,
  LessonInput,
  PrayerTime,
  PrayerTimeInput,
  RabbiQuestion,
  RabbiQuestionInput,
  ServiceInput,
  Synagogue,
  SynagogueInput,
} from "@/lib/types";
import { db, newId } from "@/data/store";

/**
 * Data access layer. Reads/writes the `chatzor` schema when Supabase is
 * configured; otherwise uses an in-memory store so the whole system (including
 * admin CRUD) is fully clickable in preview. Writes THROW on error.
 */
const ORG_SLUG = "chatzor-hagelilit";

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
  id: r.id, synagogueId: r.synagogue_id, type: r.prayer_type, label: r.label, time: r.time, note: r.note ?? null,
});
const toLesson = (r: any): Lesson => ({
  id: r.id, synagogueId: r.synagogue_id ?? null, title: r.title, teacher: r.teacher ?? null,
  day: r.day ?? "", time: r.time ?? "", location: r.location ?? null, audience: r.audience ?? null,
});
const toService = (r: any): CommunityService => ({
  id: r.id, name: r.name, category: r.category ?? "", description: r.description ?? null, contact: r.contact ?? null,
});
const toAnnouncement = (r: any): Announcement => ({
  id: r.id, synagogueId: r.synagogue_id ?? null, title: r.title, body: r.body ?? null,
  startsAt: r.starts_at ?? null, endsAt: r.ends_at ?? null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const nowIso = () => new Date().toISOString();

// ============================ READS =========================================
export async function listSynagogues(): Promise<Synagogue[]> {
  if (!supabase) return db.synagogues.filter((s) => s.isPublished);
  const { data, error } = await supabase.from("synagogues").select("*").eq("is_published", true).order("name");
  if (error || !data) return db.synagogues.filter((s) => s.isPublished);
  return data.map(toSynagogue);
}

export async function listAllSynagogues(): Promise<Synagogue[]> {
  if (!supabase) return db.synagogues;
  const { data, error } = await supabase.from("synagogues").select("*").order("name");
  if (error || !data) return db.synagogues;
  return data.map(toSynagogue);
}

/** Synagogues the signed-in gabai/admin may manage (demo: all). */
export async function listManagedSynagogues(): Promise<Synagogue[]> {
  if (!supabase) return db.synagogues;
  const { data: memberships } = await supabase.from("synagogue_admins").select("synagogue_id");
  const ids = (memberships ?? []).map((m: { synagogue_id: string }) => m.synagogue_id);
  if (ids.length === 0) return listAllSynagogues(); // org admins manage all
  const { data, error } = await supabase.from("synagogues").select("*").in("id", ids).order("name");
  if (error || !data) return [];
  return data.map(toSynagogue);
}

export async function getSynagogueBySlug(slug: string): Promise<Synagogue | null> {
  if (!supabase) return db.synagogues.find((s) => s.slug === slug) ?? null;
  const { data } = await supabase.from("synagogues").select("*").eq("slug", slug).maybeSingle();
  return data ? toSynagogue(data) : null;
}

export async function listPrayerTimes(synagogueId: string): Promise<PrayerTime[]> {
  if (!supabase) return db.prayerTimes.filter((p) => p.synagogueId === synagogueId);
  const { data, error } = await supabase.from("prayer_times").select("*").eq("synagogue_id", synagogueId).order("sort_order");
  if (error || !data) return db.prayerTimes.filter((p) => p.synagogueId === synagogueId);
  return data.map(toPrayerTime);
}

export async function listLessons(synagogueId?: string): Promise<Lesson[]> {
  if (!supabase) return synagogueId ? db.lessons.filter((l) => l.synagogueId === synagogueId) : db.lessons;
  let q = supabase.from("lessons").select("*").eq("is_published", true);
  if (synagogueId) q = q.eq("synagogue_id", synagogueId);
  const { data, error } = await q;
  if (error || !data) return db.lessons;
  return data.map(toLesson);
}

export async function listServices(): Promise<CommunityService[]> {
  if (!supabase) return db.services;
  const { data, error } = await supabase.from("community_services").select("*").eq("is_published", true).order("name");
  if (error || !data) return db.services;
  return data.map(toService);
}

export async function listAnnouncements(synagogueId?: string): Promise<Announcement[]> {
  if (!supabase) return synagogueId ? db.announcements.filter((a) => a.synagogueId === synagogueId) : db.announcements;
  let q = supabase.from("announcements").select("*").eq("is_published", true).order("created_at", { ascending: false });
  if (synagogueId) q = q.eq("synagogue_id", synagogueId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(toAnnouncement);
}

export async function listInquiries(): Promise<Inquiry[]> {
  if (!supabase) return [...db.inquiries].reverse();
  const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id, name: r.name, phone: r.phone ?? null, email: r.email ?? null, subject: r.subject ?? null,
    body: r.body, synagogueId: r.synagogue_id ?? null, isRead: r.is_read ?? false, createdAt: r.created_at,
  }));
}

export async function listRabbiQuestions(): Promise<RabbiQuestion[]> {
  if (!supabase) return [...db.rabbiQuestions].reverse();
  const { data, error } = await supabase.from("rabbi_questions").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id, name: r.name ?? null, contact: r.contact ?? null, question: r.question,
    answer: r.answer ?? null, createdAt: r.created_at,
  }));
}

// ============================ PUBLIC WRITES =================================
export async function submitInquiry(input: InquiryInput): Promise<void> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 400));
    db.inquiries.push({
      id: newId(), name: input.name, phone: input.phone || null, email: input.email || null,
      subject: input.subject || null, body: input.body, synagogueId: input.synagogueId ?? null,
      isRead: false, createdAt: nowIso(),
    });
    return;
  }
  const { error } = await supabase.from("inquiries").insert({
    name: input.name, phone: input.phone || null, email: input.email || null,
    subject: input.subject || null, body: input.body, synagogue_id: input.synagogueId || null,
  });
  if (error) throw new Error(error.message);
}

export async function submitRabbiQuestion(input: RabbiQuestionInput): Promise<void> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 400));
    db.rabbiQuestions.push({
      id: newId(), name: input.name || null, contact: input.contact || null, question: input.question,
      answer: null, createdAt: nowIso(),
    });
    return;
  }
  const { error } = await supabase.from("rabbi_questions").insert({
    name: input.name || null, contact: input.contact || null, question: input.question,
  });
  if (error) throw new Error(error.message);
}

// ============================ ADMIN / GABAI WRITES =========================
export async function createSynagogue(input: SynagogueInput): Promise<Synagogue> {
  if (!supabase) {
    const s: Synagogue = {
      id: newId(), slug: input.slug, name: input.name, nusach: input.nusach ?? null, address: input.address ?? null,
      brandGradient: input.brandGradient ?? "linear-gradient(135deg, hsl(200 50% 18%), hsl(210 45% 25%))",
      logoUrl: input.logoUrl ?? null, description: input.description ?? null, donationLink: input.donationLink ?? null,
      isPublished: input.isPublished,
    };
    db.synagogues.push(s);
    return s;
  }
  const { data, error } = await supabase.from("synagogues").insert({
    name: input.name, slug: input.slug, nusach: input.nusach || null, address: input.address || null,
    description: input.description || null, brand_gradient: input.brandGradient || null,
    logo_url: input.logoUrl || null, donation_link: input.donationLink || null, is_published: input.isPublished,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return toSynagogue(data);
}

export async function updateSynagogue(id: string, input: Partial<SynagogueInput>): Promise<void> {
  if (!supabase) {
    const s = db.synagogues.find((x) => x.id === id);
    if (s) Object.assign(s, {
      name: input.name ?? s.name, slug: input.slug ?? s.slug, nusach: input.nusach ?? s.nusach,
      address: input.address ?? s.address, description: input.description ?? s.description,
      brandGradient: input.brandGradient ?? s.brandGradient, logoUrl: input.logoUrl ?? s.logoUrl,
      donationLink: input.donationLink ?? s.donationLink,
      isPublished: input.isPublished ?? s.isPublished,
    });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.nusach !== undefined) patch.nusach = input.nusach;
  if (input.address !== undefined) patch.address = input.address;
  if (input.description !== undefined) patch.description = input.description;
  if (input.brandGradient !== undefined) patch.brand_gradient = input.brandGradient;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
  if (input.donationLink !== undefined) patch.donation_link = input.donationLink;
  if (input.isPublished !== undefined) patch.is_published = input.isPublished;
  const { error } = await supabase.from("synagogues").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSynagogue(id: string): Promise<void> {
  if (!supabase) {
    db.synagogues = db.synagogues.filter((s) => s.id !== id);
    return;
  }
  const { error } = await supabase.from("synagogues").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createLesson(input: LessonInput): Promise<void> {
  if (!supabase) {
    db.lessons.push({
      id: newId(), synagogueId: input.synagogueId, title: input.title, teacher: input.teacher ?? null,
      day: input.day ?? "", time: input.time ?? "", location: input.location ?? null, audience: input.audience ?? null,
    });
    return;
  }
  const { error } = await supabase.from("lessons").insert({
    synagogue_id: input.synagogueId, title: input.title, teacher: input.teacher || null,
    day: input.day || null, time: input.time || null, location: input.location || null, audience: input.audience || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteLesson(id: string): Promise<void> {
  if (!supabase) { db.lessons = db.lessons.filter((l) => l.id !== id); return; }
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createService(input: ServiceInput): Promise<void> {
  if (!supabase) {
    db.services.push({ id: newId(), name: input.name, category: input.category, description: input.description ?? null, contact: input.contact ?? null });
    return;
  }
  const { error } = await supabase.from("community_services").insert({
    name: input.name, category: input.category, description: input.description || null, contact: input.contact || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteService(id: string): Promise<void> {
  if (!supabase) { db.services = db.services.filter((s) => s.id !== id); return; }
  const { error } = await supabase.from("community_services").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  if (!supabase) {
    db.announcements.push({ id: newId(), synagogueId: input.synagogueId, title: input.title, body: input.body ?? null, startsAt: null, endsAt: null });
    return;
  }
  const { error } = await supabase.from("announcements").insert({
    synagogue_id: input.synagogueId, title: input.title, body: input.body || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!supabase) { db.announcements = db.announcements.filter((a) => a.id !== id); return; }
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createPrayerTime(input: PrayerTimeInput): Promise<void> {
  if (!supabase) {
    db.prayerTimes.push({ id: newId(), synagogueId: input.synagogueId, type: input.type, label: input.label, time: input.time, note: input.note ?? null });
    return;
  }
  const { error } = await supabase.from("prayer_times").insert({
    synagogue_id: input.synagogueId, prayer_type: input.type, label: input.label, time: input.time, note: input.note || null,
  });
  if (error) throw new Error(error.message);
}

export async function deletePrayerTime(id: string): Promise<void> {
  if (!supabase) { db.prayerTimes = db.prayerTimes.filter((p) => p.id !== id); return; }
  const { error } = await supabase.from("prayer_times").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markInquiryRead(id: string): Promise<void> {
  if (!supabase) { const i = db.inquiries.find((x) => x.id === id); if (i) i.isRead = true; return; }
  const { error } = await supabase.from("inquiries").update({ is_read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export { ORG_SLUG };
