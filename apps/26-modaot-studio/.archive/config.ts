/**
 * הגדרות סטטיות של המערכת — סוגי מודעות, סגנונות, קהילות, וכללי מודרציה.
 * משותף בין ה-frontend (בחירות המשתמש) וה-backend (בניית פרומפט + רנדור).
 */

export type AdTypeId = "event" | "memorial" | "organization";
export type CommunityId = "general" | "chasidi" | "litai" | "dl";

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  required: boolean;
  maxLength?: number;
}

export interface AdType {
  id: AdTypeId;
  name: string;
  description: string;
  icon: string; // lucide icon name
  fields: FieldDef[];
}

export interface AdStyle {
  id: string;
  name: string;
  description: string;
  // תיאור חזותי המוזרק לפרומפט של ה-AI (יצירת הרקע בלבד — ללא טקסט)
  bgPromptEn: string;
  // פלטת הטקסט של שכבת הרנדור
  palette: {
    text: string; // צבע כותרת ראשי
    subtext: string; // צבע טקסט משני
    accent: string; // קו/אקצנט
    overlay: string; // רובד כהה/בהיר מעל הרקע לקריאוּת (rgba)
  };
  // פונט מומלץ עבור סגנון זה
  font: string;
}

// ---------- קהילות (פרופיל תרבותי) ----------
export interface Community {
  id: CommunityId;
  name: string;
  // הנחיות מודרציה המוזרקות לכל פרומפט
  moderation: string;
}

export const COMMUNITIES: Community[] = [
  {
    id: "general",
    name: "כללי / חרדי",
    moderation:
      "No human figures of any kind. No women, no children faces. Modest, respectful religious aesthetic.",
  },
  {
    id: "chasidi",
    name: "חסידי",
    moderation:
      "Absolutely no human images or figures. Warm, ornate, traditional decorative style. No modern imagery.",
  },
  {
    id: "litai",
    name: "ליטאי",
    moderation:
      "No human figures. Restrained, dignified, scholarly aesthetic. Classic sefarim / study-hall feel.",
  },
  {
    id: "dl",
    name: "דתי-לאומי",
    moderation:
      "No immodest imagery, no women's images. Clean, modern, dignified. Subtle Israeli/traditional motifs allowed.",
  },
];

// ---------- סוגי מודעות ----------
export const AD_TYPES: AdType[] = [
  {
    id: "memorial",
    name: "מודעת אבל / זיכרון",
    description: "אזכרה, הודעת פטירה, יום השנה — נוסח מכובד ומדויק",
    icon: "Flower2",
    fields: [
      { key: "deceased", label: "שם הנפטר/ת", placeholder: "ר׳ ישראל בן ר׳ אברהם", type: "text", required: true, maxLength: 60 },
      { key: "opening", label: "פתיח", placeholder: "בדמע ובכאב לב נודיע על פטירת", type: "text", required: false, maxLength: 80 },
      { key: "details", label: "פרטי הלוויה / אזכרה", placeholder: "ההלוויה תצא היום בשעה 14:00 מבית הלוויות...", type: "textarea", required: true, maxLength: 300 },
      { key: "mourners", label: "המשפחה / החתום", placeholder: "המשפחה האבלה", type: "text", required: false, maxLength: 120 },
    ],
  },
  {
    id: "event",
    name: "מודעת שמחה / אירוע",
    description: "חתונה, בר מצווה, אירוסין, שבע ברכות, כנס",
    icon: "PartyPopper",
    fields: [
      { key: "headline", label: "כותרת", placeholder: "בשמחה רבה", type: "text", required: true, maxLength: 40 },
      { key: "main", label: "עיקר ההודעה", placeholder: "הננו מתכבדים להזמינכם לשמחת נישואי ילדינו", type: "textarea", required: true, maxLength: 200 },
      { key: "names", label: "שמות / החתן והכלה", placeholder: "החתן ... עב״ג הכלה ...", type: "text", required: false, maxLength: 120 },
      { key: "when", label: "מתי והיכן", placeholder: "אי״ה ביום שלישי ... באולמי ...", type: "textarea", required: true, maxLength: 200 },
      { key: "signature", label: "חתימה", placeholder: "המשפחות המאושרות", type: "text", required: false, maxLength: 120 },
    ],
  },
  {
    id: "organization",
    name: "מודעת ארגון / בית כנסת",
    description: "הודעה, שיעור, כנס, מגבית, אירוע קהילתי",
    icon: "Building2",
    fields: [
      { key: "headline", label: "כותרת ראשית", placeholder: "שיעור מיוחד", type: "text", required: true, maxLength: 40 },
      { key: "subheadline", label: "כותרת משנה", placeholder: "לרגל...", type: "text", required: false, maxLength: 80 },
      { key: "body", label: "גוף ההודעה", placeholder: "הציבור מוזמן להשתתף...", type: "textarea", required: true, maxLength: 300 },
      { key: "when", label: "מתי", placeholder: "ביום ... בשעה ...", type: "text", required: false, maxLength: 120 },
      { key: "where", label: "היכן", placeholder: "בבית הכנסת ...", type: "text", required: false, maxLength: 120 },
      { key: "signature", label: "חתימה / הנהלה", placeholder: "הנהלת בית הכנסת", type: "text", required: false, maxLength: 120 },
    ],
  },
];

// ---------- סגנונות (רקע + פלטה) ----------
export const AD_STYLES: Record<AdTypeId, AdStyle[]> = {
  memorial: [
    {
      id: "mem_navy_gold",
      name: "כחול כהה וזהב",
      description: "מכובד, קלאסי, רשמי",
      bgPromptEn:
        "An elegant dignified memorial poster background. Deep midnight navy blue base with a subtle dark marble texture, delicate ornamental gold filigree border framing the edges, faint gold light glow in the upper center, soft vignette. Absolutely no text, no letters, no people. Solemn, respectful, timeless.",
      palette: { text: "#EBD9A6", subtext: "#D8C88B", accent: "#C9A84C", overlay: "rgba(8,18,42,0.55)" },
      font: "FrankRuhlLibre",
    },
    {
      id: "mem_stone",
      name: "אבן ירושלמית",
      description: "טבעי, אדמתי, מסורתי",
      bgPromptEn:
        "A dignified memorial poster background evoking Jerusalem stone. Warm sandstone beige texture, subtle carved-stone relief along the borders, faint olive-branch decorative motif in the corners, soft warm light. No text, no letters, no people. Solemn and timeless.",
      palette: { text: "#3B2F1C", subtext: "#5A4A32", accent: "#8A6B2F", overlay: "rgba(245,238,224,0.45)" },
      font: "DavidLibre",
    },
    {
      id: "mem_black_silver",
      name: "שחור וכסף",
      description: "מינימליסטי, חד, מודרני",
      bgPromptEn:
        "A minimalist dignified memorial poster background. Deep charcoal black with a very subtle dark textured gradient, a single thin elegant silver line frame near the edges, faint soft grey glow center-top. No text, no letters, no people. Restrained, modern, solemn.",
      palette: { text: "#E8E8EA", subtext: "#C4C4C8", accent: "#9AA0A6", overlay: "rgba(10,10,12,0.5)" },
      font: "Heebo",
    },
  ],
  event: [
    {
      id: "evt_royal_gold",
      name: "מלכותי זהב",
      description: "חגיגי, מפואר, יוקרתי",
      bgPromptEn:
        "A luxurious festive Jewish celebration poster background. Rich royal blue and deep burgundy blend with lavish ornate gold baroque flourishes framing the edges, sparkling golden bokeh light, elegant damask pattern faint in the center. No text, no letters, no people. Joyful, opulent, celebratory.",
      palette: { text: "#F5E3A3", subtext: "#EAD68C", accent: "#D4AF37", overlay: "rgba(20,20,60,0.4)" },
      font: "FrankRuhlLibre",
    },
    {
      id: "evt_cream_floral",
      name: "שמנת ופרחים",
      description: "עדין, רך, קלאסי",
      bgPromptEn:
        "An elegant refined wedding invitation background. Soft ivory cream base with delicate hand-drawn botanical floral line-art in dusty gold and sage green framing the corners, gentle watercolor wash, airy and light. No text, no letters, no people. Graceful and timeless.",
      palette: { text: "#5A4632", subtext: "#7A6448", accent: "#B08D57", overlay: "rgba(252,248,240,0.35)" },
      font: "DavidLibre",
    },
    {
      id: "evt_modern_teal",
      name: "מודרני טורקיז",
      description: "נקי, עכשווי, רענן",
      bgPromptEn:
        "A clean modern celebration poster background. Elegant deep teal to emerald gradient with subtle geometric gold line accents in the corners, soft light glow, refined and contemporary. No text, no letters, no people. Fresh, festive, modern.",
      palette: { text: "#F3EAD0", subtext: "#E4D6AE", accent: "#E0B84C", overlay: "rgba(6,40,40,0.42)" },
      font: "Rubik",
    },
  ],
  organization: [
    {
      id: "org_classic_blue",
      name: "כחול קלאסי",
      description: "רשמי, אמין, מכובד",
      bgPromptEn:
        "A dignified formal community announcement poster background. Deep classic blue with a subtle radial light gradient, thin elegant gold double-line frame, faint decorative Star-of-David-inspired geometric motif very subtle in the corners. No text, no letters, no people. Trustworthy, formal, clean.",
      palette: { text: "#F2E7BE", subtext: "#E2D3A0", accent: "#CDA94A", overlay: "rgba(10,26,58,0.5)" },
      font: "Heebo",
    },
    {
      id: "org_parchment",
      name: "קלף ומסורת",
      description: "מסורתי, חם, תורני",
      bgPromptEn:
        "A traditional Torah-study announcement poster background. Warm aged parchment texture, ornate brown-and-gold decorative border reminiscent of old sefarim, subtle ink flourishes in the corners, warm candlelight glow. No text, no letters, no people. Scholarly, warm, traditional.",
      palette: { text: "#3E2B15", subtext: "#5C4222", accent: "#8B5E1F", overlay: "rgba(244,232,205,0.4)" },
      font: "DavidLibre",
    },
    {
      id: "org_modern_slate",
      name: "אפור מודרני",
      description: "מינימלי, עכשווי, חד",
      bgPromptEn:
        "A modern minimalist community poster background. Refined slate grey gradient with a single bold accent stripe in warm amber along one edge, clean geometric negative space, soft light. No text, no letters, no people. Contemporary, sharp, professional.",
      palette: { text: "#F5F5F3", subtext: "#D6D6D2", accent: "#E0A93C", overlay: "rgba(28,30,34,0.5)" },
      font: "Rubik",
    },
  ],
};

export const ASPECT_RATIOS = [
  { id: "4:5", name: "מאונך (וואטסאפ/סטטוס)", w: 1080, h: 1350 },
  { id: "1:1", name: "מרובע", w: 1080, h: 1080 },
  { id: "3:4", name: "פוסטר מודעה", w: 1080, h: 1440 },
];

export function getAdType(id: string): AdType | undefined {
  return AD_TYPES.find((t) => t.id === id);
}
export function getStyle(adType: string, styleId: string): AdStyle | undefined {
  return (AD_STYLES[adType as AdTypeId] || []).find((s) => s.id === styleId);
}
export function getCommunity(id: string): Community | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}
