import type { Announcement, CommunityService, Lesson, PrayerTime, Synagogue } from "@/lib/types";

/**
 * SAMPLE content for the Phase-1 preview only.
 *
 * Every item is flagged `isSample: true`. These are structural placeholders so
 * the layout reads as complete — they are REPLACED by real rows from the
 * `chatzor` schema (imported in Phase 2). No phone numbers or authoritative
 * times are invented here; sample contacts are left blank on purpose.
 */

// Reused, real design presets carried over from the existing site.
export const BRAND_GRADIENTS = {
  classicBlue: "linear-gradient(135deg, hsl(200 50% 18%), hsl(210 45% 25%))",
  skyGold: "linear-gradient(135deg, hsl(200 60% 22%), hsl(40 70% 48%))",
  deepGreen: "linear-gradient(135deg, hsl(180 40% 18%), hsl(170 50% 30%))",
  royalPurple: "linear-gradient(135deg, hsl(260 40% 22%), hsl(280 45% 35%))",
  warmBrown: "linear-gradient(135deg, hsl(25 40% 20%), hsl(35 50% 30%))",
} as const;

export const SAMPLE_SYNAGOGUES: Synagogue[] = [
  {
    id: "sample-1",
    slug: "tiferet-israel",
    name: "בית הכנסת תפארת ישראל",
    nusach: "עדות המזרח",
    address: null,
    brandGradient: BRAND_GRADIENTS.classicBlue,
    logoUrl: null,
    description: "בית כנסת מרכזי עם שיעורי תורה יומיים ומניינים לאורך כל היום.",
    donationLink: null,
    isPublished: true,
    isSample: true,
    latitude: null,
    longitude: null,
  },
  {
    id: "sample-2",
    slug: "ohel-yaakov",
    name: "בית הכנסת אהל יעקב",
    nusach: "ספרד",
    address: null,
    brandGradient: BRAND_GRADIENTS.skyGold,
    logoUrl: null,
    description: "מניין ותיקין קבוע וכולל אברכים בשעות הבוקר.",
    donationLink: null,
    isPublished: true,
    isSample: true,
    latitude: null,
    longitude: null,
  },
  {
    id: "sample-3",
    slug: "beit-midrash-hagadol",
    name: "בית המדרש הגדול",
    nusach: "אשכנז",
    address: null,
    brandGradient: BRAND_GRADIENTS.deepGreen,
    logoUrl: null,
    description: "בית מדרש פעיל עם שיעורי הלכה וגמרא בערבים.",
    donationLink: null,
    isPublished: true,
    isSample: true,
    latitude: null,
    longitude: null,
  },
];

export const SAMPLE_LESSONS: Lesson[] = [
  {
    id: "l-1",
    synagogueId: null,
    title: "דף היומי",
    teacher: null,
    day: "כל יום",
    time: "20:00",
    location: "בית המדרש הגדול",
    audience: "לגברים",
    isSample: true,
  },
  {
    id: "l-2",
    synagogueId: null,
    title: "שיעור בהלכה יומית",
    teacher: null,
    day: "יום שני",
    time: "21:00",
    location: "בית הכנסת תפארת ישראל",
    audience: "לכל הציבור",
    isSample: true,
  },
  {
    id: "l-3",
    synagogueId: null,
    title: "פרשת השבוע",
    teacher: null,
    day: "יום חמישי",
    time: "20:30",
    location: "בית הכנסת אהל יעקב",
    audience: "לכל הציבור",
    isSample: true,
  },
];

export const SAMPLE_SERVICES: CommunityService[] = [
  { id: "s-1", name: 'גמ"ח כלי עבודה', category: 'גמ"ח', description: "השאלת כלי עבודה לתושבים.", contact: null, isSample: true },
  { id: "s-2", name: 'גמ"ח ציוד לאירועים', category: 'גמ"ח', description: "כיסאות, שולחנות וכלים לשמחות.", contact: null, isSample: true },
  { id: "s-3", name: "שירותי דת", category: "שירות דת", description: "רישום נישואין, כשרות, מקוואות.", contact: null, isSample: true },
];

export const SAMPLE_PRAYER_TIMES: PrayerTime[] = [
  { id: "pt-1", synagogueId: "sample-1", type: "shacharit", label: "שחרית א׳", time: "06:00", note: "ותיקין", isSample: true },
  { id: "pt-2", synagogueId: "sample-1", type: "shacharit", label: "שחרית ב׳", time: "07:30", note: null, isSample: true },
  { id: "pt-3", synagogueId: "sample-1", type: "shacharit", label: "שחרית ג׳", time: "08:30", note: null, isSample: true },
  { id: "pt-4", synagogueId: "sample-1", type: "mincha", label: "מנחה", time: "17:30", note: null, isSample: true },
  { id: "pt-5", synagogueId: "sample-1", type: "arvit", label: "ערבית", time: "20:00", note: null, isSample: true },
  { id: "pt-6", synagogueId: "sample-2", type: "shacharit", label: "שחרית", time: "06:45", note: null, isSample: true },
  { id: "pt-7", synagogueId: "sample-2", type: "mincha", label: "מנחה", time: "13:15", note: null, isSample: true },
  { id: "pt-8", synagogueId: "sample-2", type: "arvit", label: "ערבית", time: "19:45", note: null, isSample: true },
  { id: "pt-9", synagogueId: "sample-3", type: "shacharit", label: "שחרית", time: "07:00", note: null, isSample: true },
  { id: "pt-10", synagogueId: "sample-3", type: "arvit", label: "ערבית", time: "20:15", note: null, isSample: true },
];

export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a-1",
    synagogueId: "sample-1",
    title: "שיעור מיוחד לרגל ראש חודש",
    body: "השבוע יתקיים שיעור מיוחד בנושא הלכות ראש חודש, בשעה 20:30 בבית המדרש.",
    startsAt: null,
    endsAt: null,
    isSample: true,
  },
  {
    id: "a-2",
    synagogueId: "sample-2",
    title: "קידוש קהילתי בשבת",
    body: "מוזמנים לקידוש קהילתי לאחר תפילת שחרית בשבת הקרובה.",
    startsAt: null,
    endsAt: null,
    isSample: true,
  },
];
