export type UserRole = "teacher" | "seeker";

export type SeekerType = "individual" | "mourning" | "group" | "synagogue";

export interface TeacherFormData {
  // פרטים אישיים
  fullName: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;

  // רקע
  background: string[]; // ליטאי, חסידי, ספרדי, דתי לאומי, חרד"לי, חוזר בתשובה
  
  // נושאי לימוד
  subjects: string[];
  
  // סגנון השיעור
  teachingStyle: string[];
  
  // אופי דיבור
  speakingStyle: string[];
  
  // קהל יעד
  targetAudience: string[];
  
  // סוגי שיעורים
  lessonTypes: string[];
  
  // מיקומי שיעור
  lessonLocations: string[];
  
  // קביעות
  frequency: string;
  availableDays: string[];
  availableHours: string[];
  
  // תשלום
  payment: string;
  
  // הערות
  notes: string;
}

export interface SeekerFormData {
  // פרטי הפונה
  seekerType: SeekerType;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
  street: string;

  // פרטי בית אבלים (if mourning)
  deceasedName?: string;
  deceasedOccupation?: string;
  mourningLocation?: string;
  prayerTimes?: string;

  // פרטי בית כנסת (if synagogue)
  synagogueName?: string;
  gabaiName?: string;
  prayerStyle?: string; // נוסח
  congregationSize?: string;
  activityLevel?: string;
  existingLessons?: boolean;

  // התאמת קהל יעד
  familyStyle: string[];
  
  // נושאי לימוד
  subjects: string[];
  
  // רקע מגיד שיעור מבוקש
  teacherBackground: string[];
  
  // אופי השיעורים
  lessonStyle: string[];
  
  // סגנון דיבור מועדף
  speakingStyle: string[];
  
  // כמות משתתפים
  participantSize: string[];
  
  // מיקום השיעור
  lessonLocation: string[];
  
  // קביעות
  frequency: string;
  preferredDays: string[];
  preferredHours: string[];
  
  // תשלום
  payment: string;
  
  // הערות
  notes: string;
}

// Options data
export const styleOptions = [
  "חסידי", "ספרדי", "ליטאי", "ישיבתי"
];

export const backgroundOptions = [
  "ליטאי", "חסידי", "ספרדי בני תורה", "דתי לאומי", "חרד\"לי", "חוזר בתשובה"
];

export const subjectOptions = [
  "גמרא עיון", "גמרא בקיאות", "משניות", "דף יומי", "עמוד היומי",
  "עין יעקב", "הלכה בעיון", "משנה ברורה", "הלכות פסוקות",
  "פרשת שבוע", "דרשות", "מוסר", "חסידות", "קבלה",
  "אגדות ומדרשי חז\"ל", "נ\"ך והיסטוריה", "חינוך ילדים",
  "שלום בית", "מחשבה והשקפה", "יסודות האמונה",
  "חושן משפט", "טעמי המקרא"
];

export const teachingStyleOptions = [
  "לימוד משותף", "שיעור מתוך ספר", "לימוד מעמיק",
  "מסירת שיעור מוכן", "דרשות", "פנינים ודרשות קצרות",
  "הלכות", "שאלות ותשובות"
];

export const speakingStyleOptions = [
  "שפה גבוהה ומשכילה", "מפולפל", "עמוק", "ענייני וממוקד",
  "שפה עשירה", "שפה פשוטה ועממית", "הומור", "מתובל בסיפורים והמחשות"
];

export const audienceOptions = [
  "חילונים", "משכילים", "מסורתיים", "נערים מתחזקים",
  "בעלי בתים - סגנון ספרדי", "דתיים לאומיים", "חרד\"לים",
  "חוזרים בתשובה", "בוגרי ישיבות", "אברכים", "נוער", "ילדים"
];

export const participantSizeOptions = [
  "לימוד משותף בחברותא", "קבוצות קטנות", "שיעורים עם כמות משתתפים גדולה"
];

export const locationOptions = [
  "בתי כנסת", "שיעורים מאורגנים", "חוגי בית",
  "שיעורים קבועים", "אזכרות", "בתי אבלים", "אירועים שונים"
];

export const dayOptions = [
  "יום ראשון", "יום שני", "יום שלישי", "יום רביעי",
  "יום חמישי", "יום שישי", "ליל שבת", "שבת", "מוצאי שבת"
];

export const hourOptions = [
  "לפנות בוקר", "בוקר", "לפנה\"צ", "אחה\"צ", "ערב", "לילה", "בתיאום"
];

export const frequencyOptions = [
  "כל יום", "פעמיים בשבוע", "פעם בשבוע", "לפי תאריך / מאורע מסוים - חד פעמי"
];

export const paymentOptions = [
  "לא מעוניינים לשלם כלום", "תשלום מזדמן לא קבוע",
  "תשלום על נסיעות", "שכר קבוע", "תשלום על כל שיעור"
];

export const prayerStyleOptions = [
  "אשכנז", "ספרד", "עדות המזרח", "תימני", "חב\"ד"
];

export const activityLevelOptions = [
  "פעילות מלאה כל השבוע", "מנחה וערבית בכל יום",
  "פעילות חלקית ביום חול", "רק בשבתות וחגים"
];
