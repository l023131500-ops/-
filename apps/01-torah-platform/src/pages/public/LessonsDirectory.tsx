import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Clock, BookOpen, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const TIME_BUCKETS = [
  { value: "morning", label: "בוקר (עד 12:00)" },
  { value: "afternoon", label: "צהריים (12:00–17:00)" },
  { value: "evening", label: "ערב (17:00–21:00)" },
  { value: "night", label: "לילה (אחרי 21:00)" },
];

function timeBucketOf(hhmm?: string | null): string | null {
  if (!hhmm) return null;
  const hour = parseInt(String(hhmm).split(":")[0], 10);
  if (Number.isNaN(hour)) return null;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export default function LessonsDirectory() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [day, setDay] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [timeBucket, setTimeBucket] = useState<string>("all");
  const [savedOnly, setSavedOnly] = useState(false);

  const { data: topics } = useQuery({
    queryKey: ["lesson_topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_topics")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons-public", tenant?.id, q, topic, day, city],
    enabled: !!tenant?.id,
    queryFn: async () => {
      // Publication is expressed by is_active + is_approved; there is no
      // is_public column, and asking for one made this query fail outright.
      let qb = supabase
        .from("lessons")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (topic !== "all") qb = qb.eq("topic_id", topic);
      // The searchable free text lives in title / rabbi_name / city / neighborhood.
      if (q) {
        const like = q.replace(/[%,()]/g, " ");
        qb = qb.or(
          `title.ilike.%${like}%,rabbi_name.ilike.%${like}%,city.ilike.%${like}%,neighborhood.ilike.%${like}%`,
        );
      }
      // day_of_week is a single integer per lesson, not an array.
      if (day !== "all") qb = qb.eq("day_of_week", parseInt(day));
      if (city !== "all") qb = qb.eq("city", city);
      const { data } = await qb;
      return data || [];
    },
  });

  // Distinct real cities across all published lessons (unfiltered by the
  // other controls), used only to populate the city dropdown options.
  const { data: cityRows } = useQuery({
    queryKey: ["lesson-cities", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("city")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .eq("is_approved", true)
        .not("city", "is", null);
      return data || [];
    },
  });
  const cities = Array.from(new Set((cityRows || []).map((r: any) => r.city).filter(Boolean))).sort();

  const { data: bookmarks } = useQuery({
    queryKey: ["lesson-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_bookmarks")
        .select("lesson_id")
        .eq("user_id", user!.id);
      return data || [];
    },
  });
  const bookmarkedIds = new Set((bookmarks || []).map((b: any) => b.lesson_id));

  const toggleBookmark = async (lessonId: string, isSaved: boolean) => {
    if (!user?.id) return;
    const { error } = isSaved
      ? await supabase.from("lesson_bookmarks").delete().eq("user_id", user.id).eq("lesson_id", lessonId)
      : await supabase.from("lesson_bookmarks").insert({ user_id: user.id, lesson_id: lessonId });
    if (error) {
      // e.g. a double-click race hits the UNIQUE(user_id, lesson_id) constraint
      // with a 23505 on insert. Surface it instead of refetching as if it worked --
      // the star would otherwise flip to "saved" while no row exists (or vice versa).
      toast.error(isSaved ? "הסרת השיעור מהשמורים נכשלה" : "שמירת השיעור נכשלה");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["lesson-bookmarks", user.id] });
  };

  const visibleLessons = (savedOnly ? (lessons || []).filter((l: any) => bookmarkedIds.has(l.id)) : lessons)?.filter(
    (l: any) => timeBucket === "all" || timeBucketOf(l.time_hhmm) === timeBucket,
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl mb-2">מאגר שיעורי תורה</h1>
        <p className="text-muted-foreground">חיפוש שיעור לפי נושא, מגיד, אזור או יום</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש לפי שם, מגיד, אזור..." className="pr-10" />
        </div>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger><SelectValue placeholder="כל הנושאים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הנושאים</SelectItem>
            {topics?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger><SelectValue placeholder="כל הימים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הימים</SelectItem>
            {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue placeholder="כל הערים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הערים</SelectItem>
            {cities.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timeBucket} onValueChange={setTimeBucket}>
          <SelectTrigger><SelectValue placeholder="כל השעות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל השעות</SelectItem>
            {TIME_BUCKETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {user && (
        <div className="mb-6">
          <Button
            type="button"
            variant={savedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setSavedOnly((v) => !v)}
            className="gap-2"
          >
            <Star className={`h-4 w-4 ${savedOnly ? "fill-current" : ""}`} />
            {savedOnly ? "מציג רק שיעורים שמורים" : "הצג רק שיעורים שמורים"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (visibleLessons?.length || 0) === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">{savedOnly ? "עדיין לא שמרת שיעורים" : "אין שיעורים תואמים לחיפוש"}</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLessons!.map((l: any) => {
            const isSaved = bookmarkedIds.has(l.id);
            return (
            <Link key={l.id} to={`/lessons/${l.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <BookOpen className="h-3 w-3" /> {l.audience || "פתוח לכולם"}
                    </div>
                    {user && (
                      <button
                        type="button"
                        aria-label={isSaved ? "הסר משיעורים שמורים" : "שמור שיעור"}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(l.id, isSaved); }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Star className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                      </button>
                    )}
                  </div>
                  <CardTitle className="text-lg line-clamp-1">{l.title}</CardTitle>
                  <CardDescription>{l.rabbi_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(l.city || l.neighborhood || l.address) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[l.city, l.neighborhood, l.address].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {l.time_hhmm && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {l.time_hhmm}
                    </div>
                  )}
                  {typeof l.day_of_week === "number" && DAY_NAMES[l.day_of_week] && (
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{DAY_NAMES[l.day_of_week]}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
