import { motion } from "framer-motion";
import { GraduationCap, Play, Lightbulb, TrendingUp, BookOpen, ExternalLink, Briefcase, Rocket, Target, Star } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAdminAcademy } from "@/hooks/useAdminData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const householdVideos = [
  { title: "איך לחסוך 1,000 ש\"ח בחודש רק על עמלות וביטוחים?", duration: "14:20", category: "חיסכון", thumbnail: "💰" },
  { title: "תכנון תקציב לבר-מצווה/חתונה ללא חובות", duration: "18:45", category: "תכנון", thumbnail: "🎉" },
  { title: "המדריך המלא לניהול תקציב משפחתי ב-2026", duration: "22:10", category: "תקציב", thumbnail: "📊" },
  { title: "זכויות שלא ידעתם עליהן — מדריך מעודכן", duration: "10:45", category: "זכויות", thumbnail: "📋" },
  { title: "ביטוחים: מה באמת צריך ומה מיותר?", duration: "15:00", category: "ביטוח", thumbnail: "🛡️" },
  { title: "חינוך פיננסי לילדים — גם בגיל 5", duration: "9:20", category: "חינוך", thumbnail: "👨‍👩‍👧‍👦" },
];

const householdTips = [
  { title: "עמלות בנק מיותרות", desc: "בדקו את דף חשבונכם — רוב הישראלים משלמים ₪80-150 בחודש על עמלות שניתן לבטל בשיחת טלפון אחת", icon: "🏦" },
  { title: "כלל 50/30/20", desc: "50% לצרכים, 30% לרצונות, 20% לחיסכון — נוסחה פשוטה שמשנה את התמונה הפיננסית תוך 3 חודשים", icon: "📊" },
  { title: "ביטוח כפול", desc: "37% מהישראלים משלמים על ביטוח כפול (בריאות + חיים). בדקו ובטלו כפילויות — חיסכון של ₪200+ בחודש", icon: "🎯" },
  { title: "קרן חירום", desc: "שמרו 3-6 חודשי הוצאות כרשת ביטחון. התחילו עם ₪500 בחודש — תוך שנה יש לכם כרית ₪6,000", icon: "🛟" },
  { title: "חיסכון על חשמל", desc: "מעבר לתעריף דו-שלבי בחברת החשמל יכול לחסוך ₪70-120 בחודש ללא שינוי בהרגלים", icon: "⚡" },
];

const businessSteps = [
  { step: 1, title: "פתיחת תיק במע\"מ", desc: "רישום כעוסק מורשה או פטור — בהתאם למחזור הצפוי. חובה לפני הפקת חשבונית ראשונה", checked: false },
  { step: 2, title: "פתיחת תיק במס הכנסה", desc: "דיווח על פתיחת עסק תוך 30 יום. קביעת שיעור מקדמות מס חודשי", checked: false },
  { step: 3, title: "פתיחת תיק בביטוח לאומי", desc: "חובה לדווח כעצמאי — תשלום חודשי על פי הכנסה. כולל ביטוח פגיעה בעבודה", checked: false },
  { step: 4, title: "הקמת מערכת חשבוניות", desc: "השתמש במערכת החשבוניות המובנית שלנו — תואמת דרישות רשות המסים לחשבוניות דיגיטליות", checked: false },
  { step: 5, title: "פתיחת חשבון בנק עסקי", desc: "הפרדה בין חשבון אישי לעסקי — חובה לניהול תקין ולדיווח מס", checked: false },
];

const businessTips = [
  { title: "ניהול תזרים מזומנים", desc: "עקבו אחרי תזרים המזומנים מדי שבוע — לא רק ברווח והפסד. 60% מהעסקים נסגרים בגלל תזרים", icon: Target },
  { title: "הפרדת חשבונות", desc: "חשבון בנק נפרד לעסק הוא חובה — לא מותרות. מקל על דיווח מס ומונע בעיות עם רשות המסים", icon: Briefcase },
  { title: "מקדמות מס", desc: "שלמו מקדמות מס באופן שוטף כדי להימנע מהפתעות בסוף השנה. אפשר לבקש הקטנת מקדמות אם ההכנסות ירדו", icon: TrendingUp },
];

export default function GrowthAcademyPage() {
  const { mode } = useApp();
  const { content: academyContent } = useAdminAcademy();
  const isBusiness = mode === "business";

  // Merge admin-managed content with built-in
  const adminVideos = academyContent.filter(c => c.type === "video");
  const adminTips = academyContent.filter(c => c.type === "tip");

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          <GraduationCap className="w-7 h-7 inline-block me-2 gold-text" />
          {isBusiness ? "מרכז צמיחה עסקית" : "אקדמיית כלכלת הבית"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isBusiness ? "מדריכים מקצועיים, טיפים וכלים לצמיחה עסקית" : "סרטונים, טיפים וכלים לניהול כלכלי חכם"}
        </p>
      </motion.div>

      {/* Admin-managed Tips (shown for both modes) */}
      {adminTips.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            טיפים מהמומחים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminTips.map(tip => (
              <motion.div key={tip.id} variants={itemVariants}
                className="glass-card-gold rounded-xl p-5 flex items-start gap-4 hover:shadow-lg transition-shadow">
                <span className="text-2xl shrink-0">{tip.icon || "💡"}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground">{tip.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{tip.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Admin-managed Videos */}
      {adminVideos.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Play className="w-5 h-5 text-accent" />
            סרטונים חדשים
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminVideos.map(v => (
              <motion.div key={v.id} variants={itemVariants}
                className="glass-card-gold rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group">
                <div className="h-32 bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center relative">
                  <span className="text-4xl">{v.icon || "🎬"}</span>
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-card/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-accent ms-0.5" />
                    </div>
                  </div>
                  {v.duration && (
                    <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded bg-foreground/80 text-card text-[10px] font-medium">{v.duration}</span>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{v.category}</span>
                  <h3 className="text-sm font-bold text-foreground mt-2">{v.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {isBusiness ? (
        <>
          {/* Business Guide */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-500" />
              מדריך שלב-אחר-שלב: פתיחת עסק
            </h2>
            <div className="space-y-3">
              {businessSteps.map((s) => (
                <motion.div key={s.step} variants={itemVariants}
                  className="business-glass-card rounded-xl p-5 flex items-start gap-4 hover:shadow-lg transition-shadow">
                  <div className="w-10 h-10 rounded-full business-gradient flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-card">{s.step}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Business Tips */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              טיפים לניהול מקצועי
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {businessTips.map((tip) => (
                <motion.div key={tip.title} variants={itemVariants}
                  className="business-glass-card rounded-xl p-5 space-y-3 hover:shadow-lg transition-shadow">
                  <tip.icon className="w-6 h-6 text-blue-500" />
                  <h3 className="text-sm font-bold text-foreground">{tip.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Featured Tip Card */}
          <motion.div variants={itemVariants}
            className="business-glass-card rounded-xl p-6 space-y-3 border-s-4 border-amber-500">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-foreground">טיפ מומלץ: איך למקסם הוצאות מוכרות בעסק מהבית?</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              עובדים מהבית? אתם יכולים להכיר בחלק מהוצאות הדירה כהוצאה עסקית — חשמל, אינטרנט, ארנונה ואפילו שכר דירה (באופן יחסי לשטח העבודה). 
              זה יכול לחסוך לכם אלפי שקלים בשנה במס. קבלו את המדריך המלא בפלטפורמת מינוף.
            </p>
            <a href="https://manof.lovable.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl business-gradient text-card font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[0.98] active:scale-[0.96]">
              <span>למדריך המלא בפלטפורמת מינוף</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Manof Platform Link */}
          <motion.div variants={itemVariants}
            className="business-glass-card rounded-xl p-6 border-s-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">מינוף — פלטפורמת צמיחה עסקית</h3>
                <p className="text-sm text-muted-foreground">כלים מתקדמים, קורסים וליווי מקצועי לבעלי עסקים בישראל</p>
              </div>
              <a href="https://manof.lovable.app" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl business-gradient text-card font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[0.98] active:scale-[0.96]">
                <span>קישור למינוף</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </>
      ) : (
        <>
          {/* Video Gallery */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Play className="w-5 h-5 text-accent" />
              סרטונים מומלצים
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {householdVideos.map((v) => (
                <motion.div key={v.title} variants={itemVariants}
                  className="glass-card-gold rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group">
                  <div className="h-32 bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center relative">
                    <span className="text-4xl">{v.thumbnail}</span>
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/10 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-card/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-accent ms-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded bg-foreground/80 text-card text-[10px] font-medium">
                      {v.duration}
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{v.category}</span>
                    <h3 className="text-sm font-bold text-foreground mt-2">{v.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pro Tips */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              טיפים של מומחים
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {householdTips.map((tip) => (
                <motion.div key={tip.title} variants={itemVariants}
                  className="glass-card-gold rounded-xl p-5 flex items-start gap-4 hover:shadow-lg transition-shadow">
                  <span className="text-2xl shrink-0">{tip.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{tip.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
