import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, MapPin, Clock, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function LessonDetail() {
  const { id } = useParams();
  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-10">טוען...</div>;
  if (!lesson) return <div className="container mx-auto px-4 py-10">שיעור לא נמצא</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/lessons"><ArrowRight className="ml-2 h-4 w-4" /> חזור לרשימה</Link>
      </Button>

      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit mb-2">{lesson.audience || "פתוח לכולם"}</Badge>
          <CardTitle className="text-3xl">{lesson.title}</CardTitle>
          {lesson.rabbi_name && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <User className="h-4 w-4" /> {lesson.rabbi_name}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {lesson.description && <p className="text-foreground/80">{lesson.description}</p>}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {(lesson.city || lesson.neighborhood || lesson.address) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {[lesson.city, lesson.neighborhood, lesson.address].filter(Boolean).join(" · ")}
              </div>
            )}
            {lesson.time_hhmm && (
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {lesson.time_hhmm}</div>
            )}
            {lesson.contact_phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {lesson.contact_phone}</div>
            )}
            {lesson.style && (
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {lesson.style}</div>
            )}
          </div>
          {typeof lesson.day_of_week === "number" && DAY_NAMES[lesson.day_of_week] && (
            <div>
              <div className="text-sm font-medium mb-2">יום השיעור:</div>
              <div className="flex flex-wrap gap-2">
                <Badge>{DAY_NAMES[lesson.day_of_week]}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
