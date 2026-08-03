/**
 * טבלת otvedaf.books מנוהלת ב-Supabase דרך migration (DDL הורץ מראש).
 * אין צורך ליצור טבלאות בזמן ריצה — פונקציה זו נשארת כ-no-op לשמירת תאימות.
 */
export function ensureTables(): void {
  // ניהול הסכימה מתבצע ב-Supabase (סכימת otvedaf). לא נדרשת פעולה.
}
