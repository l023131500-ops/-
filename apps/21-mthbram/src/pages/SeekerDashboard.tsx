import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { BookOpen, Star, Eye, Heart, Phone, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockTeachers = [
  {
    id: 1,
    fullName: "הרב יוסף כהן",
    city: "ירושלים",
    background: ["ליטאי"],
    subjects: ["גמרא עיון", "דף יומי", "הלכה בעיון"],
    teachingStyle: ["לימוד מעמיק", "שאלות ותשובות"],
    speakingStyle: ["עמוק", "ענייני וממוקד"],
    matchScore: 96,
  },
  {
    id: 2,
    fullName: "הרב משה לוי",
    city: "בני ברק",
    background: ["ספרדי בני תורה"],
    subjects: ["פרשת שבוע", "דרשות", "מוסר"],
    teachingStyle: ["מסירת שיעור מוכן", "פנינים ודרשות קצרות"],
    speakingStyle: ["שפה עשירה", "מתובל בסיפורים והמחשות"],
    matchScore: 89,
  },
  {
    id: 3,
    fullName: "הרב אברהם ישראלי",
    city: "תל אביב",
    background: ["דתי לאומי"],
    subjects: ["מחשבה והשקפה", "יסודות האמונה", "חסידות"],
    teachingStyle: ["שיעור מתוך ספר", "שאלות ותשובות"],
    speakingStyle: ["שפה פשוטה ועממית", "הומור"],
    matchScore: 78,
  },
];

const SeekerDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            האזור האישי שלי
          </h1>
          <p className="font-body text-muted-foreground mb-8">
            מגידי שיעור שמתאימים לבקשה שלך
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: BookOpen, label: "מגידי שיעור מתאימים", value: "8", color: "text-accent" },
              { icon: Heart, label: "שמורים", value: "3", color: "text-destructive" },
              { icon: Eye, label: "צפיות בבקשה", value: "24", color: "text-muted-foreground" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-5 shadow-elegant">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="font-display text-2xl font-bold text-card-foreground">{stat.value}</p>
                <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl font-bold text-foreground mb-4">מגידי שיעור מומלצים</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTeachers.map((teacher, i) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border p-6 shadow-elegant hover:border-gold/30 hover:glow-gold transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                      <Award className="w-6 h-6 text-cream" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-card-foreground">{teacher.fullName}</h3>
                      <p className="font-body text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {teacher.city}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold font-body ${
                    teacher.matchScore >= 90 ? "bg-green-100 text-green-700" :
                    teacher.matchScore >= 80 ? "bg-gold-light text-gold-dark" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {teacher.matchScore}%
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-body text-xs text-muted-foreground mb-1.5">רקע</p>
                  <div className="flex flex-wrap gap-1">
                    {teacher.background.map((b) => (
                      <Badge key={b} variant="outline" className="font-body text-xs">{b}</Badge>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-body text-xs text-muted-foreground mb-1.5">נושאים</p>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-body">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="font-body text-xs text-muted-foreground mb-1.5">סגנון</p>
                  <div className="flex flex-wrap gap-1">
                    {teacher.speakingStyle.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-navy/10 text-navy text-xs font-body">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-gradient-gold text-primary font-semibold hover:opacity-90">
                    <Phone className="w-3.5 h-3.5 ml-1" />
                    יצירת קשר
                  </Button>
                  <Button size="sm" variant="outline">
                    <Heart className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SeekerDashboard;
