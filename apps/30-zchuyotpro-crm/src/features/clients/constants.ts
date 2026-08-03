export const CLIENT_STATUS = {
  active: "פעיל",
  pending: "ממתין",
  closed: "סגור",
  archived: "בארכיון",
} as const;

export const GENDER = {
  male: "זכר",
  female: "נקבה",
  other: "אחר",
} as const;

export const MARITAL_STATUS = {
  single: "רווק/ה",
  married: "נשוי/אה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
} as const;

export const RELATION = {
  spouse: "בן/בת זוג",
  child: "ילד/ה",
  parent: "הורה",
  sibling: "אח/ות",
  other: "אחר",
} as const;

export const HEALTH_FUND = {
  Maccabi: "מכבי",
  Clalit: "כללית",
  Meuhedet: "מאוחדת",
  Leumit: "לאומית",
} as const;

export const HEALTH_FUND_COLOR: Record<string, string> = {
  Maccabi: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  Clalit: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  Meuhedet: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  Leumit: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

export const EMPLOYMENT_STATUS = {
  employed: "שכיר",
  "self-employed": "עצמאי",
  unemployed: "מובטל",
  retired: "פנסיונר",
  disabled: "נכה",
} as const;

export const HOUSING_TYPE = {
  owned: "בבעלות",
  rented: "בשכירות",
  parents: "אצל הורים",
  other: "אחר",
} as const;

export const ENTITLEMENT_STATUS = {
  to_check: "לבדיקה",
  not_relevant: "לא רלוונטי",
  recommended: "מומלץ לבדוק",
  handled: "טופל",
} as const;

export const ENTITLEMENT_STATUS_COLOR: Record<string, string> = {
  to_check: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200",
  not_relevant: "bg-muted text-muted-foreground border-border",
  recommended: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
  handled: "bg-green-100 text-green-900 border-green-300 dark:bg-green-950 dark:text-green-200",
};

export const ENTITLEMENT_CATEGORY = {
  health: "בריאות",
  financial: "פיננסי",
  housing: "דיור",
  employment: "תעסוקה",
  education: "חינוך",
  legal: "משפטי/הנחות",
  social: "רווחה",
  other: "אחר",
} as const;

export const ENTITLEMENT_CATEGORY_COLOR: Record<string, string> = {
  health: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  financial: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  housing: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  employment: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  education: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  legal: "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-200",
  social: "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200",
  other: "bg-muted text-muted-foreground",
};

export const PARTNER_CATEGORY = {
  mortgage: "משכנתאות",
  insurance: "ביטוח",
  housing: "דיור",
  employment: "תעסוקה",
  health: "בריאות",
  legal: "משפטי",
  other: "אחר",
} as const;

export const REFERRAL_STATUS = {
  sent: "נשלח",
  pending: "ממתין",
  in_progress: "בטיפול",
  completed: "הושלם",
  rejected: "נדחה",
} as const;

export const REFERRAL_STATUS_COLOR: Record<string, string> = {
  sent: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export const CHANNEL = {
  whatsapp: "וואטסאפ",
  email: "אימייל",
  voice: "שיחה",
  sms: "SMS",
  internal: "הערה פנימית",
} as const;

export const MESSAGE_STATUS = {
  sent: "נשלח",
  delivered: "נמסר",
  read: "נקרא",
  failed: "נכשל",
} as const;

export const STATUS_BADGE_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  closed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};
