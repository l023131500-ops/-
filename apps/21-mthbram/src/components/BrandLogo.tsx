/* הסמל נטען מהעץ ולא מכתובת מארחת. הייבוא הקודם היה
   `logo-igud.jpg.asset.json`, קובץ שאינו תמונה אלא מצביע ל-CDN של סביבת
   הבנייה: /__l5e/assets-v1/<uuid>/logo-igud.jpg. הנתיב הזה חי רק בתוך אותה
   סביבה — בייצור הוא מחזיר 404 (נמדד ב-10/08 מול more30.com), והכותרת
   והפוטר ציירו את ה-alt במקום את הסמל. ייבוא מ-src נבנה על ידי vite,
   מקבל חתימה בשם הקובץ ונפרס עם האתר, כך שאין תלות במארח חיצוני.
   הקובץ הוא ריבוע 256 שנחתך ממרכז agud-logo.png (1536x1024) — בדיוק
   החיתוך ש-object-cover היה עושה בעיגול — ולכן 18KB במקום 1.35MB
   בכל עמוד, כי הרכיב יושב ב-Navbar וב-Footer. */
import agudLogoMark from "@/assets/agud-logo-mark.jpg";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const BrandLogo = ({ size = "md", showText = true }: BrandLogoProps) => {
  const sizes = {
    sm: { icon: "w-11 h-11", text: "text-lg", sub: "text-[9px]" },
    md: { icon: "w-14 h-14", text: "text-xl", sub: "text-[10px]" },
    lg: { icon: "w-20 h-20", text: "text-3xl", sub: "text-xs" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`${s.icon} rounded-full overflow-hidden ring-1 ring-gold/40 shadow-gold-ring flex-shrink-0`}>
        <img src={agudLogoMark} alt="איגוד השיעורים" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-display ${s.text} font-black text-gradient-gold`}>
            איגוד השיעורים
          </span>
          {size !== "sm" && (
            <span className={`font-body ${s.sub} text-muted-foreground -mt-0.5`}>
              מחברים בין לומדים ומלמדים
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
