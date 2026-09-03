import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, MapPin, Clock, Phone, User, Mic, Video } from "lucide-react";
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
      // lessons_tenant_read (RLS) only checks the tenant is active -- it does
      // NOT check is_approved/is_active, unlike LessonsDirectory.tsx's list
      // query. Without this filter, a lesson a moderator rejected (or an
      // admin deactivated after publication) stays fully viewable forever at
      // its direct /lessons/:id URL for anyone who has the link (verified
      // live: an anon-role SELECT on an is_approved=false/is_active=false row
      // returned the full row).
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id!)
        .eq("is_active", true)
        .eq("is_approved", true)
        .maybeSingle();
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
          {lesson.recording_url && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Mic className="h-4 w-4 text-primary" /> הקלטת השיעור
              </div>
              {/^https?:\/\//i.test(lesson.recording_url) ? (
                <a href={lesson.recording_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary underline break-all">
                  {lesson.recording_url}
                </a>
              ) : (
                <p className="text-sm text-foreground/80">{lesson.recording_url}</p>
              )}
            </div>
          )}
          {(lesson.meta as { is_live_stream?: boolean } | null)?.is_live_stream && lesson.stream_url && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Video className="h-4 w-4 text-primary" /> שידור חי
              </div>
              {/^https?:\/\//i.test(lesson.stream_url) ? (
                <a href={lesson.stream_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary underline break-all">
                  {lesson.stream_url}
                </a>
              ) : (
                <p className="text-sm text-foreground/80">{lesson.stream_url}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
