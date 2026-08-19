export const ALLOWED_CLIENT_FIELDS = {
  full_name: "שם מלא",
  id_number: "מספר זהות",
  phone: "טלפון",
  email: "אימייל",
  birth_date: "תאריך לידה",
  marital_status: "מצב משפחתי",
  num_children: "מספר ילדים",
  family_members: "פרטי בני משפחה",
  financial_profile: "פרופיל פיננסי",
  housing_profile: "פרופיל דיור",
  vehicles: "פרטי רכבים",
  entitlements: "זכאויות",
  documents: "מסמכים",
} as const;

export type AllowedField = keyof typeof ALLOWED_CLIENT_FIELDS;

export const ALLOWED_FIELD_KEYS = Object.keys(ALLOWED_CLIENT_FIELDS) as AllowedField[];
