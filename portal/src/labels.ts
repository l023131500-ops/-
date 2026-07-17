import type { Category } from "@more30/config";

/** Hebrew category labels + display order for the portal (RTL). */
export const CATEGORY_LABELS: Record<Category, string> = {
  hub: "מרכז (HUB)",
  transcription: "תמלול",
  advertising: "פרסום ומודעות",
  torah: "תורני",
  finance: "פיננסי",
  health: "קופות חולים ובריאות",
  commerce: "מסחר",
  rights: "זכויות",
  marketing: "שיווק ועיצוב",
  realestate: "נדל\"ן",
  events: "אירועים ושמחות",
  crm: "CRM",
  other: "נוסף",
};

export const CATEGORY_ORDER: Category[] = [
  "hub", "transcription", "health", "torah", "advertising",
  "finance", "commerce", "rights", "realestate", "events", "marketing", "crm", "other",
];

export const STAGE_LABELS: Record<string, string> = {
  live: "חי",
  beta: "בטא",
  wip: "בפיתוח",
  archived: "בארכיון",
  protected: "מוגן",
};
