import type { AllowedField } from "./constants";

// מיפוי תחומי שיתוף-פעולה (מפרט סעיפים 4+5): אילו פרטים ומסמכים כל תחום
// באמת צריך. ממופה על partners.category הקיים — ללא מיגרציה.
// level: required = בלעדיו היועץ לא יכול להתחיל; recommended = מזרז את הטיפול.

export type RequirementLevel = "required" | "recommended";

export type FieldRequirement = {
  field: AllowedField;
  level: RequirementLevel;
  reason?: string;
};

export type DocRequirement = {
  label: string;
  level: RequirementLevel;
  // מילות מפתח לאיתור המסמך בשם הקובץ שהועלה לתיק (התאמה חלקית, ללא רישיות)
  keywords: string[];
};

export type CollabDomain = {
  key: string;
  label: string;
  category: string; // one of PARTNER_CATEGORY keys
  description: string;
  fields: FieldRequirement[];
  documents: DocRequirement[];
};

export const COLLAB_DOMAINS: CollabDomain[] = [
  {
    key: "car_insurance",
    label: "ביטוח רכב",
    category: "insurance",
    description: "השוואת/חידוש ביטוח חובה ומקיף. הפרמיה נקבעת לפי הנהג, הרכב והיסטוריית התביעות.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "phone", level: "required" },
      { field: "birth_date", level: "recommended", reason: "גיל הנהג משפיע על הפרמיה" },
      { field: "vehicles", level: "required", reason: "פרטי הרכב הם בסיס ההצעה" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "רישיון רכב", level: "required", keywords: ["רישיון רכב", "car license"] },
      { label: "רישיון נהיגה", level: "required", keywords: ["רישיון נהיגה", "driving"] },
      { label: "אישור העדר תביעות", level: "recommended", keywords: ["העדר תביעות", "תביעות"] },
      { label: "פוליסה קודמת", level: "recommended", keywords: ["פוליסה"] },
    ],
  },
  {
    key: "health_insurance",
    label: "ביטוח רפואי",
    category: "insurance",
    description: "בדיקת כפל ביטוחים והתאמת פוליסת בריאות. נדרש מידע על כל המבוטחים וקופת החולים.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "birth_date", level: "required", reason: "גיל המבוטח קובע את הפרמיה" },
      { field: "phone", level: "required" },
      { field: "family_members", level: "recommended", reason: "בני משפחה מצורפים לפוליסה + קופת חולים" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "פוליסה קיימת", level: "recommended", keywords: ["פוליסה"] },
      { label: "הצהרת בריאות", level: "recommended", keywords: ["הצהרת בריאות"] },
      { label: "תקציר מידע רפואי", level: "recommended", keywords: ["מידע רפואי", "רפואי"] },
    ],
  },
  {
    key: "bl_disability",
    label: "ביטוח לאומי · נכות",
    category: "health",
    description: "תביעת קצבת נכות כללית / אי-כושר. התביעה נשענת על תיעוד רפואי ומצב תעסוקתי.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "birth_date", level: "required" },
      { field: "phone", level: "required" },
      { field: "financial_profile", level: "required", reason: "מצב תעסוקה והכנסות — תנאי לקצבה" },
      { field: "family_members", level: "recommended", reason: "תוספת תלויים לקצבה" },
      { field: "entitlements", level: "recommended", reason: "זכאויות שכבר מוצו או נבדקו" },
      { field: "documents", level: "required" },
    ],
    documents: [
      { label: "מסמכים רפואיים", level: "required", keywords: ["רפואי", "אבחנה", "סיכום מחלה", "סיכום אשפוז"] },
      { label: "אישורי אי-כושר", level: "recommended", keywords: ["אי כושר", "אי-כושר", "אישור מחלה"] },
      { label: "תלושי שכר", level: "recommended", keywords: ["תלוש", "שכר"] },
      { label: "טופס תביעה", level: "recommended", keywords: ["טופס תביעה", "7801"] },
    ],
  },
  {
    key: "income_support",
    label: "הבטחת הכנסה",
    category: "employment",
    description: "השלמת הכנסה מביטוח לאומי. הזכאות נבחנת לפי הרכב משפחה, הכנסות, ורכוש — כולל רכב.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "marital_status", level: "required" },
      { field: "num_children", level: "required" },
      { field: "family_members", level: "required", reason: "הזכאות מחושבת לפי הרכב המשפחה" },
      { field: "financial_profile", level: "required" },
      { field: "vehicles", level: "required", reason: "בעלות על רכב משפיעה על הזכאות" },
      { field: "housing_profile", level: "recommended" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "דפי חשבון בנק (3 חודשים)", level: "required", keywords: ["דפי חשבון", "עוש", "עו\"ש", "בנק"] },
      { label: "תלושי שכר / אישור מעסיק", level: "recommended", keywords: ["תלוש", "מעסיק"] },
      { label: "אישור דמי אבטלה", level: "recommended", keywords: ["אבטלה"] },
      { label: "חוזה שכירות", level: "recommended", keywords: ["שכירות", "חוזה"] },
    ],
  },
  {
    key: "rent_assistance",
    label: "סיוע בשכר דירה",
    category: "housing",
    description: "סיוע ממשרד הבינוי והשיכון. נדרשת תעודת זכאות, חוזה בתוקף והוכחת הכנסות.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "marital_status", level: "required" },
      { field: "num_children", level: "required" },
      { field: "family_members", level: "required" },
      { field: "financial_profile", level: "required" },
      { field: "housing_profile", level: "required", reason: "סטטוס דיור ופרטי השכירות" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "חוזה שכירות", level: "required", keywords: ["חוזה", "שכירות"] },
      { label: "תלושי שכר", level: "required", keywords: ["תלוש", "שכר"] },
      { label: "תעודת זכאות", level: "recommended", keywords: ["זכאות", "משרד השיכון"] },
      { label: "אישור ניהול חשבון", level: "recommended", keywords: ["ניהול חשבון"] },
    ],
  },
  {
    key: "mortgage_advisor",
    label: "ייעוץ משכנתאות",
    category: "mortgage",
    description: "בניית תמהיל ומיקוח מול הבנקים. הבנק דורש הוכחת הכנסה, התנהלות עו\"ש ונתוני אשראי.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "phone", level: "required" },
      { field: "email", level: "recommended" },
      { field: "marital_status", level: "recommended", reason: "לווה יחיד / זוג לווים" },
      { field: "financial_profile", level: "required" },
      { field: "housing_profile", level: "required", reason: "נכס קיים / ראשון, הון עצמי" },
      { field: "documents", level: "required" },
    ],
    documents: [
      { label: "תלושי שכר (3 חודשים)", level: "required", keywords: ["תלוש", "שכר"] },
      { label: "דפי חשבון בנק (3 חודשים)", level: "required", keywords: ["דפי חשבון", "עוש", "עו\"ש", "בנק"] },
      { label: "דוח נתוני אשראי", level: "recommended", keywords: ["אשראי"] },
      { label: "אישור עקרוני קיים", level: "recommended", keywords: ["אישור עקרוני"] },
      { label: "הערכת שמאי", level: "recommended", keywords: ["שמאי"] },
    ],
  },
  {
    key: "financial_advisor",
    label: "ייעוץ פיננסי",
    category: "other",
    description: "תכנון תקציב, טיפול בחובות והשקעות. תמונה פיננסית מלאה חשובה מכל מסמך בודד.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "phone", level: "required" },
      { field: "email", level: "recommended" },
      { field: "marital_status", level: "recommended" },
      { field: "num_children", level: "recommended" },
      { field: "financial_profile", level: "required" },
      { field: "housing_profile", level: "recommended" },
      { field: "vehicles", level: "recommended" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "דפי חשבון בנק", level: "recommended", keywords: ["דפי חשבון", "בנק"] },
      { label: "ריכוז הלוואות", level: "recommended", keywords: ["הלוואה", "הלוואות"] },
      { label: "דוח פנסיה / מסלקה", level: "recommended", keywords: ["פנסיה", "מסלקה"] },
      { label: "תלושי שכר", level: "recommended", keywords: ["תלוש", "שכר"] },
    ],
  },
  {
    key: "legal_rep",
    label: "ייצוג משפטי",
    category: "legal",
    description: "ייצוג מול גופים וערעורים. נדרש ייפוי כוח וכל מסמכי התיק הרלוונטיים.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "id_number", level: "required" },
      { field: "phone", level: "required" },
      { field: "entitlements", level: "recommended", reason: "החלטות קודמות שעליהן מערערים" },
      { field: "documents", level: "required" },
    ],
    documents: [
      { label: "ייפוי כוח", level: "required", keywords: ["ייפוי כוח", "יפוי כח", "ייפוי-כוח"] },
      { label: "מסמכי התיק", level: "recommended", keywords: ["תביעה", "פסק דין", "החלטה", "ערעור"] },
    ],
  },
  {
    key: "employment_placement",
    label: "השמה ותעסוקה",
    category: "employment",
    description: "השמה בעבודה והכוונה מקצועית. קורות חיים עדכניים הם הבסיס.",
    fields: [
      { field: "full_name", level: "required" },
      { field: "phone", level: "required" },
      { field: "email", level: "recommended" },
      { field: "birth_date", level: "recommended" },
      { field: "financial_profile", level: "recommended", reason: "מצב תעסוקה נוכחי" },
      { field: "documents", level: "recommended" },
    ],
    documents: [
      { label: "קורות חיים", level: "required", keywords: ["קורות חיים", "קוח", "cv", "resume"] },
      { label: "תעודות השכלה", level: "recommended", keywords: ["תעודה", "תואר", "השכלה", "הסמכה"] },
    ],
  },
];

export function domainsForCategory(category: string): CollabDomain[] {
  return COLLAB_DOMAINS.filter((d) => d.category === category);
}

/** שדות ברירת-מחדל לשותף חדש בקטגוריה: איחוד שדות החובה של כל תחומי הקטגוריה. */
export function defaultFieldsForCategory(category: string): AllowedField[] {
  const out = new Set<AllowedField>();
  for (const d of domainsForCategory(category)) {
    for (const f of d.fields) if (f.level === "required") out.add(f.field);
  }
  return Array.from(out);
}

/** כל השדות (חובה+מומלץ) של תחום — לכפתור "החל מיפוי מומלץ". */
export function presetFieldsForDomain(domain: CollabDomain): AllowedField[] {
  return Array.from(new Set(domain.fields.map((f) => f.field)));
}
