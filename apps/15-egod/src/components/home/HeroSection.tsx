import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Search } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground py-20 lg:py-32">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/30 rounded-full px-5 py-2 mb-8">
              <BookOpen className="w-4 h-4 text-secondary dark:text-[hsl(var(--gold-light))]" />
              <span className="text-sm font-medium text-secondary dark:text-[hsl(var(--gold-light))]">בסיוע איגוד השיעורים</span>
            </div>
            {/* ⚠️ הכותרת אמרה "תחת קורת גג אחת", הפסקה שמתחתיה "הכל בפלטפורמה
                אחת", וכותרת המשנה בהמשך העמוד "במקום אחד" — שלוש דרכים לומר
                את אותו דבר בעמוד אחד, ואף אחת מהן לא אומרת מה המערכת עושה.
                זו החתימה שהתלוננו עליה ב-§6: לא צבע ולא גופן אלא ניסוח.
                הוחלף במה שהמוצר באמת נותן, לפי כרטיסי היתרונות של האתר עצמו. */}
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              לשיעור שלך מגיע
              <br />
              <span className="text-secondary">דף משלו</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              נושא, זמנים, מיקום ופרטי קשר — כדי שמי שמחפש שיעור ימצא את שלך. ובצד:
              רשימת משתתפים, לוח הספק לימודי וחומרי עזר מוכנים להדפסה.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" asChild className="bg-secondary text-primary hover:bg-gold-dark hover:text-primary text-lg px-8 py-6 rounded-xl shadow-lg font-semibold">
              <Link to="/join" className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                אני רוצה להצטרף כמגיד שיעור
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent border-2 border-primary-foreground/60 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground text-lg px-8 py-6 rounded-xl">
              <Link to="/find-lesson" className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                אני מחפש שיעור באזורי
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(228, 33%, 97%)" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;