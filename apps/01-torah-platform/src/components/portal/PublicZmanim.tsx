import { Sunrise, Sunset, Star, Flame, Clock } from "lucide-react";
import { getZmanimSnapshot, formatIsraelTime } from "@/lib/zmanim";

interface PublicZmanimProps {
  city?: string | null;
}

const PublicZmanim = ({ city }: PublicZmanimProps) => {
  const snapshot = getZmanimSnapshot(city);

  const rows = [
    { label: "הנץ החמה", value: snapshot.today.sunrise, icon: Sunrise },
    { label: 'סוף זמן ק"ש', value: snapshot.today.sofZmanShma, icon: Clock },
    { label: "שקיעה", value: snapshot.today.sunset, icon: Sunset },
    { label: "צאת הכוכבים", value: snapshot.today.tzeitHakochavim, icon: Star },
  ];

  return (
    <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-2xl font-black text-card-foreground mb-2 text-center flex items-center justify-center gap-2">
          <Sunrise className="w-6 h-6 text-gold" /> זמני היום ההלכתיים
        </h2>
        <p className="font-body text-xs text-muted-foreground text-center mb-6">
          {snapshot.cityLabel}
          {snapshot.isApproximate ? " (זמנים משוערים)" : ""}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {rows.map((r) => (
            <div key={r.label} className="bg-card rounded-2xl border border-border p-4 text-center">
              <r.icon className="w-5 h-5 mx-auto mb-2 text-gold" />
              <div className="font-body text-xs text-muted-foreground mb-1">{r.label}</div>
              <div className="font-display font-black text-card-foreground" dir="ltr">
                {formatIsraelTime(r.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <div className="bg-card rounded-2xl border border-gold/40 p-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-2 text-gold" />
            <div className="font-body text-xs text-muted-foreground mb-1">הדלקת נרות</div>
            <div className="font-display font-black text-card-foreground" dir="ltr">
              {formatIsraelTime(snapshot.shabbat.candleLighting)}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-gold/40 p-4 text-center">
            <Star className="w-5 h-5 mx-auto mb-2 text-gold" />
            <div className="font-body text-xs text-muted-foreground mb-1">מוצאי שבת</div>
            <div className="font-display font-black text-card-foreground" dir="ltr">
              {formatIsraelTime(snapshot.shabbat.havdalah)}
            </div>
          </div>
        </div>

        <p className="font-body text-[11px] text-muted-foreground/70 text-center mt-4">
          זמנים משוערים לפי חישוב הלכתי כללי — יש להתייעץ עם רב המקום לפני הסתמכות הלכתית.
        </p>
      </div>
    </div>
  );
};

export default PublicZmanim;
