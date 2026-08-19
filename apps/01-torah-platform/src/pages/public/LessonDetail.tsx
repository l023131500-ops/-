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
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <User className="h-4 w-4" /> {lesson.teacher_name}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lesson.description && <p className="text-foreground/80">{lesson.description}</p>}
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {lesson.location && (
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {lesson.location}</div>
            )}
            {lesson.time && (
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {lesson.time}</div>
            )}
            {lesson.contact_phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {lesson.contact_phone}</div>
            )}
            {lesson.lesson_type && (
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {lesson.lesson_type}</div>
            )}
          </div>
          {Array.isArray(lesson.days_of_week) && lesson.days_of_week.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">ימי השיעור:</div>
              <div className="flex flex-wrap gap-2">
                {lesson.days_of_week.map((d: number) => <Badge key={d}>{DAY_NAMES[d]}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
