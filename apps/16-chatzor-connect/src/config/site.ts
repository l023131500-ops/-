/**
 * Single source of truth for the organization and locale.
 * Phase 1 runs on ONE organization (Chatzor Hagelilit religious council); the
 * data model is multi-tenant so this becomes a row in `chatzor.organizations`
 * once the admin can manage several councils.
 */
export const SITE = {
  name: "מחוברים",
  tagline: "יהדות וקהילה · חצור הגלילית",
  org: "המועצה הדתית חצור הגלילית",
  description:
    "כל המידע התורני והקהילתי של חצור הגלילית במקום אחד — זמני תפילה, שיעורי תורה, בתי כנסת, גמ״חים ושירותי דת.",
  // Chatzor Hagelilit — used for astronomical zman calculations.
  location: {
    label: "חצור הגלילית",
    latitude: 32.9797,
    longitude: 35.5386,
    elevation: 350, // metres above sea level (approx.)
    timeZone: "Asia/Jerusalem",
    /** Israel candle-lighting custom is 40 minutes before sunset in most of the Galil. */
    candleLightingMinutes: 40,
  },
  // Contact details are intentionally left blank until confirmed by the council,
  // so the site never shows placeholder / fabricated numbers.
  contact: {
    phone: "",
    email: "",
    address: "",
  },
} as const;

export type SiteConfig = typeof SITE;
