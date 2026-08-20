import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Building2, MapPin, Phone, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface PublicPrayerTimesProps {
  orgId: string;
}

const PRAYER_ORDER = ["שחרית", "מנחה", "מנחה-ערבית", "ערבית", "מוסף", "סליחות", "תיקון חצות", "שיעור תורה", "פעילות נוער", "אחר"];

const PublicPrayerTimes = ({ orgId }: PublicPrayerTimesProps) => {
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"synagogue" | "next">("synagogue");
  const [filterSynagogue, setFilterSynagogue] = useState<string>("all");

  useEffect(() => { fetchData(); }, [orgId]);

  const fetchData = async () => {
    const [synRes, ptRes] = await Promise.all([
      // Synagogues hang off the tenant now, not an org, and the time column is
      // time_hhmm — both names were left over from the pre-migration schema.
      supabase.from("synagogues").select("*").eq("tenant_id", orgId).order("name"),
      supabase.from("prayer_times").select("*").order("time_hhmm"),
    ]);
    const syns = synRes.data || [];
    setSynagogues(syns);
    const synIds = syns.map((s: any) => s.id);
    setPrayerTimes((ptRes.data || []).filter((pt: any) => synIds.includes(pt.synagogue_id)));
    setLoading(false);
  };

  if (loading || synagogues.length === 0) return null;

  // Get current day name in Hebrew
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const now = new Date();
  const currentDay = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isShabbat = now.getDay() === 6;

  // Filter prayer times relevant to today
  const todayPrayers = prayerTimes.filter(pt => {
    const d = pt.day_of_week;
    if (d === "יומי") return true;
    if (d === "חול" && !isShabbat) return true;
    if (d === "שבת וחג" && isShabbat) return true;
    if (d === currentDay) return true;
    return false;
  });

  // Sort by time for "next prayer" view
  const sortedByTime = [...todayPrayers].sort((a, b) => a.time.localeCompare(b.time));
  const upcomingPrayers = sortedByTime.filter(pt => pt.time >= currentTime);
  const pastPrayers = sortedByTime.filter(pt => pt.time < currentTime);
  const orderedPrayers = [...upcomingPrayers, ...pastPrayers];

  const filteredSynagogues = filterSynagogue === "all" ? synagogues : synagogues.filter(s => s.id === filterSynagogue);

  return (
    <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-2xl font-black text-card-foreground mb-6 text-center flex items-center justify-center gap-2">
          <Clock className="w-6 h-6 text-gold" /> זמני תפילות
        </h2>

        {/* View Toggle + Filter */}
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button onClick={() => setViewMode("synagogue")}
              className={`px-4 py-2 font-body text-sm font-bold transition-colors ${viewMode === "synagogue" ? "bg-gold/20 text-gold" : "bg-card text-muted-foreground hover:bg-muted/50"}`}>
              לפי בית כנסת
            </button>
            <button onClick={() => setViewMode("next")}
              className={`px-4 py-2 font-body text-sm font-bold transition-colors ${viewMode === "next" ? "bg-gold/20 text-gold" : "bg-card text-muted-foreground hover:bg-muted/50"}`}>
              התפילה הקרובה
            </button>
          </div>
          {viewMode === "synagogue" && synagogues.length > 1 && (
            <select value={filterSynagogue} onChange={e => setFilterSynagogue(e.target.value)}
              aria-label="סינון לפי בית כנסת"
              className="rounded-xl border border-border bg-card px-3 py-2 font-body text-sm">
              <option value="all">כל בתי הכנסת</option>
              {synagogues.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {viewMode === "synagogue" ? (
          <div className="space-y-4">
            {filteredSynagogues.map((syn, i) => {
              const synPrayers = prayerTimes.filter(pt => pt.synagogue_id === syn.id);
              // Group by prayer type
              const grouped: Record<string, any[]> = {};
              synPrayers.forEach(pt => {
                if (!grouped[pt.prayer_type]) grouped[pt.prayer_type] = [];
                grouped[pt.prayer_type].push(pt);
              });
              const sortedTypes = Object.keys(grouped).sort((a, b) => PRAYER_ORDER.indexOf(a) - PRAYER_ORDER.indexOf(b));

              return (
                <motion.div key={syn.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-gold" />
                    <h3 className="font-display text-lg font-black text-card-foreground">{syn.name}</h3>
                  </div>
                  {(syn.address || syn.city) && (
                    <p className="font-body text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {[syn.address, syn.city, syn.neighborhood].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {sortedTypes.length > 0 ? (
                    <div className="space-y-2">
                      {sortedTypes.map(type => (
                        <div key={type} className="flex items-center gap-3 flex-wrap">
                          <Badge className="bg-gold/15 text-gold font-body text-xs min-w-[70px] justify-center">{type === "אחר" ? "פעילות" : type}</Badge>
                          {grouped[type].map(pt => (
                            <Badge key={pt.id} variant="outline" className="font-body text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              {pt.day_of_week !== "יומי" && <span className="text-muted-foreground">{pt.day_of_week}</span>}
                              <span className="font-bold">{pt.time}</span>
                              {pt.notes && <span className="text-muted-foreground">({pt.notes})</span>}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-xs text-muted-foreground/50">אין זמני תפילות מוגדרים</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Next prayer view - scrolling animation */
          <div className="space-y-2">
            {orderedPrayers.length > 0 ? (
              orderedPrayers.map((pt, i) => {
                const syn = synagogues.find(s => s.id === pt.synagogue_id);
                const isUpcoming = pt.time >= currentTime;
                return (
                  <motion.div key={pt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card rounded-xl border p-4 flex items-center justify-between ${
                      isUpcoming && i === 0 ? "border-gold/50 bg-gold/5 shadow-lg" : isUpcoming ? "border-border" : "border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm ${
                        isUpcoming && i === 0 ? "bg-gradient-to-br from-gold/30 to-gold/10 text-gold" : "bg-muted text-muted-foreground"
                      }`}>
                        {pt.time}
                      </div>
                      <div>
                        <span className="font-display font-bold text-card-foreground">{pt.prayer_type === "אחר" && pt.custom_category ? pt.custom_category : pt.prayer_type}</span>
                        {syn && <span className="font-body text-xs text-muted-foreground mr-2"> • {syn.name}</span>}
                        {pt.notes && <span className="font-body text-xs text-muted-foreground"> ({pt.notes})</span>}
                      </div>
                    </div>
                    {isUpcoming && i === 0 && (
                      <Badge className="bg-gold/20 text-gold font-body text-xs animate-pulse">הבאה</Badge>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <p className="text-center font-body text-muted-foreground py-8">אין זמני תפילות להיום</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPrayerTimes;
