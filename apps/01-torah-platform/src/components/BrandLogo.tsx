import { Mic } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const BrandLogo = ({ size = "md", showText = true }: BrandLogoProps) => {
  const sizes = {
    sm: { icon: "w-9 h-9", iconInner: "w-4 h-4", text: "text-lg", sub: "text-[9px]" },
    md: { icon: "w-12 h-12", iconInner: "w-5 h-5", text: "text-xl", sub: "text-[10px]" },
    lg: { icon: "w-16 h-16", iconInner: "w-7 h-7", text: "text-3xl", sub: "text-xs" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.icon} rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg`}>
        <Mic className={`${s.iconInner} text-navy`} />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-display ${s.text} font-black text-gradient-brand`}>
            איגוד השיעורים
          </span>
          {size !== "sm" && (
            <span className={`font-body ${s.sub} text-muted-foreground -mt-0.5`}>
              הארגון העולמי של שיעורי התורה
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
