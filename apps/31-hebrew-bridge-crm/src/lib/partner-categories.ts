// The partner categories are rows in public.visibility_rules — never a hard-coded list.
// This map only supplies display text for the keys that were seeded; anything else
// falls back to the raw key with underscores turned into spaces.
export const PRETTY_CATEGORY: Record<string, string> = {
  סוכני_פנסיה: "סוכני פנסיה",
  עורכי_דין: "עורכי דין",
  יועצים_פיננסיים: "יועצים פיננסיים",
};

export function prettyCategory(category: string): string {
  return PRETTY_CATEGORY[category] ?? category.replace(/_/g, " ");
}

// Display text for the schema fields a category is allowed to see.
// Keys mirror SCHEMA_FIELDS in the admin's VisibilityRulesGrid — that is what gets stored.
export const PRETTY_FIELD: Record<string, string> = {
  full_name: "שם מלא",
  phone: "טלפון",
  email: 'דוא"ל',
  lead_source: "מקור הגעה",
  payment_status: "סטטוס מנוי",
  raw_voicemail_transcription: "תמלול הודעה קולית",
  uploaded_documents: "מסמכים שהועלו",
  internal_admin_notes: "הערות מנהל פנימיות",
};

export function prettyField(field: string): string {
  return PRETTY_FIELD[field] ?? field.replace(/_/g, " ");
}
