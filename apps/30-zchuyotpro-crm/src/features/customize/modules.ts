// Per-tenant module registry (flagship spec items 1+2): non-essential parts of
// the client file / portal can be hidden per tenant via tenants.settings.modules.
// A module is enabled unless the manager explicitly turned it off — so tenants
// that never touched the settings see the full system (zero regression).

export type ModuleDef = {
  key: string; // matches the client-file tab value
  label: string;
  description: string;
  // which portal nav url this module gates, if any
  portalUrl?: string;
};

// Always-on tabs (personal, family, entitlements, tasks, timeline, messages,
// documents) are core CRM and cannot be hidden. These are the optional ones.
export const OPTIONAL_MODULES: ModuleDef[] = [
  { key: "financial", label: "פרופיל פיננסי", description: "הכנסות, הוצאות קבועות, חובות וחסכונות בתיק הלקוח" },
  { key: "cashflow", label: "תזרים חודשי", description: "יומן הכנסות/הוצאות, תקרות תקציב ומחשבוני חיסכון — בתיק ובאזור האישי", portalUrl: "/client-area/finance" },
  { key: "housing", label: "דיור וחשבונות", description: "פרטי דיור, משכנתא, ארנונה, חשמל ומים" },
  { key: "vehicles", label: "רכבים", description: "רכבי הלקוח ותו נכה" },
  { key: "property-media", label: "תמונות ווידאו", description: "גלריית מדיה של נכס הלקוח" },
  { key: "personal-areas", label: "אזורים אישיים וסיסמאות", description: "רשימת האזורים האישיים של הלקוח לכל נושא עם פרטי הכניסה — בתיק ובאזור האישי, לעולם לא לשותפים", portalUrl: "/client-area/vault" },
  { key: "referrals", label: "הפניות לשת״פ", description: "העברת פרטי הלקוח ליועצים ושותפים, כולל אישורי הלקוח באזור האישי", portalUrl: "/client-area/consents" },
];

export type ModulesMap = Record<string, boolean>;

export function isModuleEnabled(modules: ModulesMap | null | undefined, key: string): boolean {
  return modules?.[key] !== false;
}
