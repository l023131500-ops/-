import type { Announcement, CommunityService, Lesson, PrayerTime, Synagogue } from "@/lib/types";
import {
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_LESSONS,
  SAMPLE_PRAYER_TIMES,
  SAMPLE_SERVICES,
  SAMPLE_SYNAGOGUES,
} from "@/data/seed";

/**
 * In-memory backend used ONLY when Supabase is not configured (preview / demo).
 * It lets the whole admin + gabai experience be clicked through and reviewed
 * before the database is connected. State is per-session and resets on reload.
 * When Supabase IS configured, this module is bypassed entirely.
 */

let idCounter = 1000;
export const newId = () => `local-${++idCounter}`;

interface Db {
  synagogues: Synagogue[];
  prayerTimes: PrayerTime[];
  lessons: Lesson[];
  services: CommunityService[];
  announcements: Announcement[];
  inquiries: Array<{ id: string; name: string; phone: string | null; email: string | null; subject: string | null; body: string; synagogueId: string | null; isRead: boolean; createdAt: string }>;
  rabbiQuestions: Array<{ id: string; name: string | null; contact: string | null; question: string; answer: string | null; createdAt: string }>;
}

// Deep-ish clone so mutations never touch the exported seed constants.
export const db: Db = {
  synagogues: SAMPLE_SYNAGOGUES.map((s) => ({ ...s })),
  prayerTimes: SAMPLE_PRAYER_TIMES.map((p) => ({ ...p })),
  lessons: SAMPLE_LESSONS.map((l) => ({ ...l })),
  services: SAMPLE_SERVICES.map((s) => ({ ...s })),
  announcements: SAMPLE_ANNOUNCEMENTS.map((a) => ({ ...a })),
  inquiries: [],
  rabbiQuestions: [],
};
