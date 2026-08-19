type ToastKind = "success" | "error" | "info";
type Notify = (message: string, kind?: ToastKind) => void;

/**
 * גשר בין מודולים שאינם רכיבי React לבין ה-Toaster.
 *
 * ‏`queryClient` נבנה פעם אחת בזמן import, הרבה לפני שיש עץ React — ולכן אינו
 * יכול לקרוא ל-`useToast()`. בלי הגשר הזה כישלון שאילתה היה נבלע בשקט:
 * ‏react-query היה מסמן `isError`, אף מסך לא היה מצייר את זה, והמבקר היה רואה
 * רשימה ריקה שנקראת כמו "אין נתונים" במקום "לא הצלחנו לטעון".
 */
let notify: Notify | null = null;

export function registerToast(fn: Notify | null) {
  notify = fn;
}

// חמש שאילתות שנופלות יחד על אותה תקלת רשת הן תקלה אחת. בלי החלון הזה המסך
// מתמלא בחמש הודעות זהות.
const WINDOW_MS = 5000;
let lastMessage = "";
let lastAt = 0;

export function emitToast(message: string, kind: ToastKind = "info") {
  const now = Date.now();
  if (message === lastMessage && now - lastAt < WINDOW_MS) return;
  lastMessage = message;
  lastAt = now;
  notify?.(message, kind);
}
