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
  //
  // ⚠️ Two of these are ASSUMPTIONS, not confirmed data, and both move the
  // published time of candle lighting. Do not treat them as verified and do
  // not quietly "correct" them — they are halachic decisions for the council,
  // filed in NEEDS_USER.md §0ז. Measured with scripts/qa/chatzor-zmanim-verify.mjs.
  location: {
    label: "חצור הגלילית",
    latitude: 32.9797,
    longitude: 35.5386,
    /**
     * ⚠️ UNVERIFIED, and elevation is switched ON in lib/zmanim.ts. At 350 m
     * sunset lands 3 minutes later than at sea level, which pushes Shabbat
     * onset later — the less protective direction. No source for the figure.
     */
    elevation: 350,
    timeZone: "Asia/Jerusalem",
    /**
     * ⚠️ UNVERIFIED. 40 minutes is the Jerusalem custom; Tzfat and Haifa are
     * commonly 30. The installed @hebcal/core carries no candle-lighting
     * minutes on Location and has no entry for Chatzor, Tzfat or Rosh Pina,
     * so this cannot be checked offline — it has to come from the council.
     */
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
