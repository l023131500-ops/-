import { cn } from "@/lib/cn";

/**
 * מאפייני כפתור המחיקה בשורת רשימה במסכי הניהול/גבאי.
 *
 * שורת `isSample` מגיעה מ-`src/data/seed.ts`, לא מהמסד — אין לה מה למחוק.
 * לחיצה על מחיקה בשורה כזו שולחת את מזהה הזרע (`pt-1`, `sample-1`)
 * ל-`delete().eq("id", …)`: או שגיאת טיפוס מהמסד, או מחיקה של אפס שורות
 * שמדווחת "נמחק." והשורה נשארת. שני המקרים משקרים לגבאי.
 *
 * ‏עדכון: מאז ש-`repositories.ts` זורק במקום ליפול חזרה לזרעים כשהשאילתה
 * נכשלת, שורת זרע יכולה להגיע רק ממצב `!supabase`. שם המחיקה בזיכרון כן
 * תסיר את השורה — הנטרול נשאר בכל זאת, כדי שמצב התצוגה יישאר יציב ולא ייגמר
 * בכך שהמבקר מחק את התוכן שנועד להראות לו איך המסך נראה.
 */
export function sampleRowProps(isSample?: boolean) {
  return {
    disabled: !!isSample,
    title: isSample ? "שורת דוגמה — אינה במסד ואין מה למחוק" : "מחיקה",
    className: cn(
      "grid h-9 w-9 place-items-center rounded-md text-muted-foreground",
      isSample
        ? "cursor-not-allowed opacity-40"
        : "hover:bg-red-500/10 hover:text-red-500",
    ),
  };
}
