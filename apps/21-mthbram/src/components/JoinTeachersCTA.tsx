import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mic, BookOpen, UserPlus, ArrowLeft } from "lucide-react";

const JoinTeachersCTA = () => {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* animated gradient background */}
      <div className="absolute inset-0 bg-gradient-finale" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 30% 30%, hsl(var(--gold) / 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--teal-light) / 0.3) 0%, transparent 45%)"
      }} />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/50 backdrop-blur-sm">
            <Mic className="w-3.5 h-3.5 text-gold-cream" />
            <span className="font-body text-xs font-bold text-gold-cream">הצטרפות למגידי השיעורים</span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-black text-gold-cream mb-3">
            מעוניינים להצטרף למערכת <span className="text-gradient-gold">מגידי השיעורים?</span>
          </h2>
          <p className="font-body text-sm md:text-base text-gold-cream/80">
            שתי אפשרויות פשוטות, לפי המצב שלכם
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Existing lesson */}
          <Link to="/update-lesson">
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="group h-full bg-navy/60 backdrop-blur-md border-2 border-gold/40 hover:border-gold/70 rounded-2xl p-6 md:p-7 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4 shadow-gold-ring">
                <BookOpen className="w-6 h-6 text-navy" />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-gold-cream mb-2">
                יש לי שיעור קיים
              </h3>
              <p className="font-body text-sm text-gold-cream/70 mb-4">
                אני מוסר שיעור באופן קבוע — מילוי פרטי השיעור והוספתו למאגר
              </p>
              <div className="flex items-center gap-1 text-gold text-sm font-body font-bold group-hover:gap-2 transition-all">
                מילוי פרטי השיעור
                <ArrowLeft className="w-4 h-4" />
              </div>
            </motion.div>
          </Link>

          {/* Want to start a lesson */}
          <Link to="/teachers">
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="group h-full bg-navy/60 backdrop-blur-md border-2 border-gold/40 hover:border-gold/70 rounded-2xl p-6 md:p-7 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4 shadow-gold-ring">
                <Mic className="w-6 h-6 text-navy" />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-gold-cream mb-2">
                מעוניין להקים שיעור
              </h3>
              <p className="font-body text-sm text-gold-cream/70 mb-4">
                אני רוצה להתחיל למסור שיעור חדש — פתיחת הטופס להקמת שיעור
              </p>
              <div className="flex items-center gap-1 text-gold text-sm font-body font-bold group-hover:gap-2 transition-all">
                הקמת שיעור חדש
                <ArrowLeft className="w-4 h-4" />
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Third — seeker */}
        <div className="max-w-4xl mx-auto mt-4">
          <Link to="/request-lesson">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="group flex items-center justify-between gap-3 bg-gold/15 hover:bg-gold/25 backdrop-blur-sm border border-gold/50 rounded-2xl px-6 py-4 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-gold-cream" />
                </div>
                <div>
                  <h4 className="font-display text-base md:text-lg font-bold text-gold-cream">
                    מעוניין במגיד שיעור — להקמת שיעור חדש
                  </h4>
                  <p className="font-body text-xs text-gold-cream/70">
                    מחפשים רב שיבוא ללמד? מלאו טופס בקשה
                  </p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 text-gold-cream group-hover:-translate-x-1 transition-transform" />
            </motion.div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default JoinTeachersCTA;
