import logoAsset from "@/assets/logo-igud.jpg.asset.json";

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
        <img src={logoAsset.url} alt="איגוד השיעורים" className="w-full h-full object-cover" />
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
