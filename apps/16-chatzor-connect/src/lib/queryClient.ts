import { QueryCache, QueryClient } from "@tanstack/react-query";
import { emitToast } from "@/lib/toastBus";

/**
 * שאילתה שנכשלה מודיעה על עצמה.
 *
 * ‏`repositories.ts` כבר לא בולע שגיאת מסד ולא ממציא במקומה שורות זרע — הוא
 * זורק. ההשלכה היא ש-`data` נשאר undefined, וכל מסך שמצייר `data ?? []` היה
 * מראה רשימה ריקה שנקראת כמו "אין שיעורים" במקום "לא הצלחנו לטעון". ה-Toast
 * הגלובלי הוא המשמעות ההפוכה, בלי לגעת בכל מסך בנפרד.
 *
 * ‏המסכים הציבוריים, מסכי הניהול ומסכי הגבאי מציירים מאז `ErrorState` משלהם,
 * כך שהטענה נשארת על המסך גם אחרי שה-Toast נעלם.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: () => emitToast("לא הצלחנו לטעון חלק מהנתונים. נסו לרענן.", "error"),
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
