export const INTAKE_CHANNEL = {
  form: "טופס אתר",
  email: "אימייל",
  whatsapp: "וואטסאפ",
  voice: "מערכת קולית",
  phone: "שיחת טלפון",
  other: "אחר",
} as const;

export type IntakeChannel = keyof typeof INTAKE_CHANNEL;

export const INTAKE_STATUS = {
  new: "חדש",
  in_triage: "בבירור",
  converted: "נקלט כלקוח",
  routed: "הופנה לשותף",
  rejected: "נדחה",
} as const;

export type IntakeStatus = keyof typeof INTAKE_STATUS;

export const INTAKE_STATUS_COLOR: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  in_triage: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  converted: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  routed: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export const INTAKE_CHANNEL_COLOR: Record<string, string> = {
  form: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  email: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  whatsapp: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  voice: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  phone: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  other: "bg-muted text-muted-foreground",
};
