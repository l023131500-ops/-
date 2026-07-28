/** Domain types — mirror the `chatzor` Postgres schema (see supabase/migrations). */

export interface Synagogue {
  id: string;
  slug: string;
  name: string;
  nusach: string | null; // e.g. ספרד / אשכנז / עדות המזרח
  address: string | null;
  brandGradient: string; // CSS gradient for the synagogue's branded mini-site
  logoUrl: string | null;
  description: string | null;
  donationLink: string | null;
  isPublished: boolean;
  /** true = built-in sample content, replaced by real DB rows. Never shown as authoritative. */
  isSample?: boolean;
}

export type PrayerType = "shacharit" | "mincha" | "arvit" | "special";

export interface PrayerTime {
  id: string;
  synagogueId: string;
  type: PrayerType;
  label: string;
  time: string; // HH:MM (fixed community time, not an astronomical zman)
  note: string | null;
}

export interface Lesson {
  id: string;
  synagogueId: string | null; // null = community-wide
  title: string;
  teacher: string | null;
  day: string; // e.g. "יום שלישי"
  time: string; // HH:MM
  location: string | null;
  audience: string | null;
  isSample?: boolean;
}

export interface CommunityService {
  id: string;
  name: string;
  category: string; // גמ"ח / שירות דת / חסד
  description: string | null;
  contact: string | null;
  isSample?: boolean;
}

export interface Announcement {
  id: string;
  synagogueId: string | null;
  title: string;
  body: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isSample?: boolean;
}

export interface InquiryInput {
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  body: string;
  synagogueId?: string | null;
}

export interface RabbiQuestionInput {
  name?: string;
  contact?: string;
  question: string;
}
