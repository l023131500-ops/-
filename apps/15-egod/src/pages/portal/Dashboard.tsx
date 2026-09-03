import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, BookOpen, MessageSquare, Lightbulb,
  Send, FileDown, Palette, ArrowLeft, Share2, Copy, ExternalLink, Sparkles,
  UserPlus, Phone, MapPin
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { buildRabbiUrl } from "@/lib/site";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [tip, setTip] = useState<any>(null);
  const [savingAvail, setSavingAvail] = useState(false);
  const [assignedLeads, setAssignedLeads] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    setProfile(profileData);

    if (profileData) {
      // Fetch lesson count
      const { count } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", profileData.id);
      setLessonCount(count || 0);

      // Fetch participant count
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("teacher_id", profileData.id);
      
      if (lessons && lessons.length > 0) {
        const lessonIds = lessons.map(l => l.id);
        const { count: pCount } = await supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .in("lesson_id", lessonIds);
        setParticipantCount(pCount || 0);
      }

      // Fetch students assigned to me by admin matching, not yet completed/cancelled
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .eq("assigned_teacher_id", profileData.id)
        .in("status", ["assigned", "contacted"])
        .order("created_at", { ascending: false });
      setAssignedLeads(leadsData || []);
    }

    // Fetch active tip
    const { data: tipData } = await supabase
      .from("tips")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTip(tipData);
  };

  const toggleAvailability = async (next: boolean) => {
    if (!profile) return;
    setSavingAvail(true);
    const { error } = await supabase
      .from("profiles")
      .update({ available_for_matching: next })
      .eq("id", profile.id);
    setSavingAvail(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    setProfile({ ...profile, available_for_matching: next });
    toast({
      title: next ? "הצטרפת לאיגוד מגידי השיעורים הפנויים" : "הוסרת מרשימת המגידים הפנויים",
      description: next ? "פרטיך יוצגו במסך התאמת השיעורים בניהול" : "לא תופיע יותר בהתאמות חדשות",
    });
  };

  const today = new Date();
  const hebrewDate = today.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const quickLinks = [
    { icon: Send, label: "שלח הודעה לתלמידים", path: "/portal/participants", color: "text-blue-500" },
    { icon: Calendar, label: "עדכן הספק לימודי", path: "/portal/schedule", color: "text-green-500" },
    { icon: FileDown, label: "הורד חומר עזר", path: "/portal/materials", color: "text-purple-500" },
    { icon: Palette, label: "צור מודעה מעוצבת", path: "/portal/materials", color: "text-orange-500" },
  ];

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary rounded-2xl p-6 text-primary-foreground"
        >
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            שלום{profile?.full_name ? ` הרב ${profile.full_name}` : ""}! 👋
          </h1>
          <p className="text-primary-foreground/70">{hebrewDate}</p>
        </motion.div>

        {/* Public share banner */}
        {profile?.public_token && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-l from-secondary/15 via-card to-card border-2 border-secondary/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_8px_30px_-10px_hsl(var(--secondary)/0.3)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-gold-dark flex items-center justify-center shadow-md">
                <Share2 className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">קישור ההפצה הציבורי שלך</h3>
                <p className="text-sm text-muted-foreground">שתף בוואטסאפ, מייל או ברשתות חברתיות לקבלת פניות מתלמידים חדשים</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const url = buildRabbiUrl(profile.public_token);
                  navigator.clipboard.writeText(url);
                  toast({ title: "הקישור הועתק!", description: url });
                }}
                className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground hover:opacity-90 gap-2 shadow-md"
              >
                <Copy className="w-4 h-4" />העתק קישור
              </Button>
              <a href={`/rabbi/${profile.public_token}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2 border-secondary/40 hover:bg-secondary/5">
                  <ExternalLink className="w-4 h-4" />צפה
                </Button>
              </a>
            </div>
          </motion.div>
        )}

        {/* Students assigned to me by admin matching */}
        {assignedLeads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="bg-gradient-to-l from-blue-500/10 via-card to-card border-2 border-blue-500/30 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">תלמידים חדשים שהוקצו לך</h3>
                <p className="text-sm text-muted-foreground">פניות שהתאמת שיעורים בניהול שייכה אליך — צור קשר להתחלת השיעור</p>
              </div>
            </div>
            <div className="space-y-2">
              {assignedLeads.map((l) => (
                <div key={l.id} className="bg-background/60 rounded-xl p-3 border border-border flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground">{l.full_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      {l.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.area}</span>}
                      {l.preferred_subject && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{l.preferred_subject}</span>}
                      {l.preferred_times && <span>זמנים מועדפים: {l.preferred_times}</span>}
                    </div>
                    {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
                  </div>
                  {l.phone && (
                    <a href={`tel:${l.phone}`} dir="ltr" className="shrink-0">
                      <Button size="sm" variant="outline" className="gap-2 border-blue-500/40 hover:bg-blue-500/5">
                        <Phone className="w-3.5 h-3.5" />{l.phone}
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Availability for matching */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-gradient-to-r from-primary/5 via-card to-card border-2 border-secondary/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-gold-dark flex items-center justify-center shadow">
                <Sparkles className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">פנוי למסירת שיעורים נוספים</h3>
                <p className="text-sm text-muted-foreground">
                  בהפעלה — פרטיך יוצגו במסך "התאמת שיעורים" באיגוד, ותוכל לקבל פניות חדשות. ניתן לכבות בכל רגע.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${profile.available_for_matching ? "text-secondary" : "text-muted-foreground"}`}>
                {profile.available_for_matching ? "פעיל" : "כבוי"}
              </span>
              <Switch
                checked={!!profile.available_for_matching}
                onCheckedChange={toggleAvailability}
                disabled={savingAvail}
              />
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-muted-foreground text-sm">שיעורים פעילים</span>
            </div>
            <p className="font-heading text-3xl font-bold text-foreground">{lessonCount}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-muted-foreground text-sm">משתתפים</span>
            </div>
            <p className="font-heading text-3xl font-bold text-foreground">{participantCount}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground text-sm">הספק לימודי</span>
            </div>
            <Link to="/portal/schedule" className="text-secondary hover:text-gold-dark text-sm font-medium flex items-center gap-1">
              צפה בלוח <ArrowLeft className="w-3 h-3" />
            </Link>
          </motion.div>
        </div>

        {/* Quick Links + Tip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">קישורים מהירים</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.label} to={link.path}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-secondary/30 hover:bg-secondary/5 transition-all text-sm">
                  <link.icon className={`w-4 h-4 ${link.color}`} />
                  <span className="text-foreground">{link.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Tip of the Day */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-secondary" />
              <h3 className="font-heading text-lg font-bold text-foreground">טיפ היום</h3>
            </div>
            {tip ? (
              <div>
                <p className="font-bold text-foreground mb-2">{tip.title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{tip.content}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                💡 מעורבות משתתפים: שלח הודעת תזכורת 30 דקות לפני השיעור – זה מגדיל נוכחות ב-40%!
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Dashboard;