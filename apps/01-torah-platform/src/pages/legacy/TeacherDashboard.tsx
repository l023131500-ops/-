import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Users, BookOpen, Star, Eye, Phone, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock data for seekers who want lessons
const mockSeekers = [
  {
    id: 1,
    contactName: "משה כהן",
    type: "בית כנסת",
    city: "ירושלים",
    subjects: ["גמרא עיון", "דף יומי", "הלכה בעיון"],
    familyStyle: ["בוגרי ישיבות", "אברכים"],
    frequency: "כל יום",
    preferredHours: ["בוקר"],
    payment: "שכר קבוע",
    matchScore: 95,
  },
  {
    id: 2,
    contactName: "יעקב לוי",
    type: "קבוצה",
    city: "בני ברק",
    subjects: ["פרשת שבוע", "מוסר", "חסידות"],
    familyStyle: ["בעלי בתים - סגנון ספרדי", "מסורתיים"],
    frequency: "פעם בשבוע",
    preferredHours: ["ערב"],
    payment: "תשלום על כל שיעור",
    matchScore: 87,
  },
  {
    id: 3,
    contactName: "דוד ישראלי",
    type: "בית אבלים",
    city: "תל אביב",
    subjects: ["מוסר", "מחשבה והשקפה"],
    familyStyle: ["מסורתיים", "חילונים"],
    frequency: "חד פעמי",
    preferredHours: ["ערב", "לילה"],
    payment: "תשלום מזדמן",
    matchScore: 72,
  },
  {
    id: 4,
    contactName: "אברהם פרידמן",
    type: "בית כנסת",
    city: "חיפה",
    subjects: ["משנה ברורה", "הלכות פסוקות"],
    familyStyle: ["דתיים לאומיים", "חרד\"לים"],
    frequency: "פעמיים בשבוע",
    preferredHours: ["לפנות בוקר", "בוקר"],
    payment: "שכר קבוע",
    matchScore: 82,
  },
];

const TeacherDashboard = () => {
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
            צפייה בבקשות שיעורים שמתאימות לפרופיל שלך
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, label: "בקשות מתאימות", value: "12", color: "text-accent" },
              { icon: Star, label: "התאמה גבוהה", value: "4", color: "text-gold" },
              { icon: BookOpen, label: "שיעורים פעילים", value: "3", color: "text-navy" },
              { icon: Eye, label: "צפיות בפרופיל", value: "156", color: "text-muted-foreground" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-5 shadow-elegant">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="font-display text-2xl font-bold text-card-foreground">{stat.value}</p>
                <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Seeker cards */}
          <h2 className="font-display text-xl font-bold text-foreground mb-4">מחפשי שיעורים שמתאימים לך</h2>
          <div className="space-y-4">
            {mockSeekers.map((seeker, i) => (
              <motion.div
                key={seeker.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border p-6 shadow-elegant hover:border-gold/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-display text-lg font-bold text-card-foreground">{seeker.contactName}</h3>
                      <Badge variant="outline" className="font-body">{seeker.type}</Badge>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold font-body ${
                        seeker.matchScore >= 90 ? "bg-green-100 text-green-700" :
                        seeker.matchScore >= 80 ? "bg-gold-light text-gold-dark" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        התאמה {seeker.matchScore}%
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm font-body text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {seeker.city}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {seeker.frequency}</span>
                      <span className="flex items-center gap-1">{seeker.preferredHours.join(", ")}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {seeker.subjects.map((s) => (
                        <span key={s} className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-body">{s}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {seeker.familyStyle.map((s) => (
                        <span key={s} className="px-2 py-1 rounded-md bg-navy/10 text-navy text-xs font-body">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mr-4">
                    <Button size="sm" className="bg-gradient-gold text-primary font-semibold hover:opacity-90">
                      <Phone className="w-3.5 h-3.5 ml-1" />
                      יצירת קשר
                    </Button>
                    <Button size="sm" variant="outline">
                      פרטים נוספים
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
