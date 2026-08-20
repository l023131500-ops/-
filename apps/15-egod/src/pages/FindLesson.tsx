import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Search, MapPin, BookOpen, Clock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const subjects = ["גמרא", "הלכה", "פרשת שבוע", "דף יומי", "מוסר", "חסידות", "נשים"];
const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];

const FindLesson = () => {
  const [city, setCity] = useState("");
  const [subject, setSubject] = useState("");
  const [day, setDay] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    let query = supabase
      .from("lessons")
      .select("*, profiles!inner(full_name, city, neighborhood)")
      .eq("is_active", true);
    if (city) query = query.or(`city.ilike.%${city}%,neighborhood.ilike.%${city}%`);
    if (subject) query = query.eq("subject", subject);
    if (day) query = query.contains("schedule_days", [day]);
    const { data } = await query;
    setResults(data || []);
    setLoading(false);
  };

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
              <Search className="inline w-8 h-8 text-secondary ml-2" />
              מצא שיעור באזורך
            </h1>
            <p className="text-muted-foreground text-lg">חפש שיעורי תורה לפי אזור, נושא, יום ושעה</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border max-w-4xl mx-auto mb-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="findlesson-city" className="text-sm font-medium text-foreground mb-1 block">אזור</label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="findlesson-city" placeholder="עיר או שכונה" className="pr-9" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>
              <div>
                <label htmlFor="findlesson-subject" className="text-sm font-medium text-foreground mb-1 block">נושא</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="findlesson-subject"><SelectValue placeholder="בחר נושא" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="findlesson-day" className="text-sm font-medium text-foreground mb-1 block">יום</label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger id="findlesson-day"><SelectValue placeholder="בחר יום" /></SelectTrigger>
                  <SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark" onClick={handleSearch} disabled={loading}>
                  <Search className="w-4 h-4 ml-2" />{loading ? "מחפש..." : "חפש"}
                </Button>
              </div>
            </div>
          </div>

          {searched && results.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-muted-foreground text-sm">נמצאו {results.length} שיעורים</p>
              {results.map(lesson => (
                <div key={lesson.id} className="bg-card rounded-xl border border-border p-5 hover:border-secondary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-foreground text-lg">{lesson.subject}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" />{(lesson.profiles as any)?.full_name || "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{lesson.city || ""} {lesson.neighborhood || ""}</span>
                        {lesson.schedule_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{lesson.schedule_time}</span>}
                      </div>
                      {lesson.schedule_days?.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {lesson.schedule_days.map((d: string) => (
                            <span key={d} className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full">{d}</span>
                          ))}
                        </div>
                      )}
                      {lesson.synagogue_name && <p className="text-sm text-muted-foreground mt-1">📍 {lesson.synagogue_name}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searched && results.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">לא נמצאו שיעורים. נסה לשנות את החיפוש.</p>
            </div>
          )}

          {!searched && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">חפש שיעור כדי לראות תוצאות</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default FindLesson;