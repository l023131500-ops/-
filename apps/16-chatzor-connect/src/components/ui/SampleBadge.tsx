import { cn } from "@/lib/cn";

/**
 * תג "דוגמה" — מסמן פריט שמקורו ב-`src/data/seed.ts` ולא במסד.
 *
 * seed.ts מבטיח בראשו שאין בו נתון סמכותי; התג הוא מה שמוסר את ההבטחה הזו
 * לקורא. כל מסך שמצייר פריט עם `isSample` חייב לצייר גם אותו — אחרת שעה,
 * שם או תיאור שנכתבו כמילוי-פריסה נקראים כמו נתון אמת.
 *
 * `overlay` — מעל גרדיאנט/תמונה. `inline` — בתוך גוף כרטיס או שורת רשימה.
 */
export function SampleBadge({
  variant = "inline",
  className,
}: {
  variant?: "inline" | "overlay";
  className?: string;
}) {
  return (
    <span
      title="תוכן לדוגמה — יוחלף בנתונים אמיתיים"
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        variant === "overlay"
          ? "bg-black/30 text-white backdrop-blur"
          : "border border-border bg-secondary text-muted-foreground",
        className,
      )}
    >
      דוגמה
    </span>
  );
}
