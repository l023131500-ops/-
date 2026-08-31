import { useMemo } from "react";
import { Flame, Star } from "lucide-react";
import { getZmanimSnapshot, formatIsraelTime } from "@/lib/zmanim";

interface ZmanimTabProps {
  city?: string | null;
}

const ZmanimTab = ({ city }: ZmanimTabProps) => {
  const snapshot = useMemo(() => getZmanimSnapshot(city), [city]);

  const rows = [
    { label: "עלות השחר", value: snapshot.today.alotHaShachar },
    { label: "הנץ החמה", value: snapshot.today.sunrise },
    { label: 'סוף זמן ק"ש (גר"א)', value: snapshot.today.sofZmanShma },
    { label: "מנחה גדולה", value: snapshot.today.minchaGedola },
    { label: "פלג המנחה", value: snapshot.today.plagHaMincha },
    { label: "שקיעה", value: snapshot.today.sunset },
    { label: "צאת הכוכבים", value: snapshot.today.tzeitHakochavim },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold" style={{ color: "hsl(180 45% 25%)" }}>
          זמני היום ההלכתיים — היום
        </h3>
        <span className="text-xs text-muted-foreground">
          מבוסס על מיקום: {snapshot.cityLabel}
          {snapshot.isApproximate ? " (ברירת מחדל — לא הוגדרה עיר לבית הכנסת)" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="bg-muted/50 rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">{r.label}</div>
            <div className="font-bold text-foreground" dir="ltr">
              {formatIsraelTime(r.value)}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-display text-lg font-bold mb-3" style={{ color: "hsl(180 45% 25%)" }}>
          שבת קודש
        </h3>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 text-center border border-amber-200">
            <Flame className="w-5 h-5 mx-auto mb-1 text-amber-600" />
            <div className="text-xs text-muted-foreground mb-1">הדלקת נרות</div>
            <div className="font-bold text-foreground" dir="ltr">
              {formatIsraelTime(snapshot.shabbat.candleLighting)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 text-center border border-indigo-200">
            <Star className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
            <div className="text-xs text-muted-foreground mb-1">מוצאי שבת</div>
            <div className="font-bold text-foreground" dir="ltr">
              {formatIsraelTime(snapshot.shabbat.havdalah)}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        זמנים משוערים לפי חישוב הלכתי כללי לאזור {snapshot.cityLabel} — יש להתייעץ עם רב המקום לפני הסתמכות הלכתית.
      </p>
    </div>
  );
};

export default ZmanimTab;
