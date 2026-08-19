import { motion, useScroll, useTransform } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useDecorativeMotion } from "@/hooks/use-decorative-motion";

const HeroSection = () => {
  const particles = useDecorativeMotion();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 400], [0, -60]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  /*
    ⚠️ ל-<section> לא היה רקע כלל: התצלום והגרדיאנט מרחפים מעליו ב-absolute,
    ושניהם background-image ולא background-color. העין ראתה ירוק כהה;
    המדידה — וגם axe שמאחורי Lighthouse — טיפסה למעלה, מצאה את הלבן של body,
    וספרה את הכותרת הלבנה כ-1.04:1. וזה לא רק ציון: נטפרי מחליפה תצלומים
    במציין מקום, ואם התצלום או הגרדיאנט לא נצבעים — הטקסט הלבן באמת נעלם.
    bg-emerald-dark הוא הרקע האטום שהיה חסר. זו בדיוק אותה תבנית שנתפסה
    ב-01 /torah, ותחזור בכל hero בפלטפורמה.
  */
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-emerald-dark py-24 md:py-20">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img
          src={heroBg}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover scale-110"
        />
        {/*
          🔴 הגרדיאנט דהה אל ‎--background‎ — כלומר אל לבן — כבר באמצע הגובה,
          בעוד שרצועת יצירת הקשר שיושבת שם כתובה בלבן. בצילום המסך הטלפון
          והדוא"ל כמעט בלתי קריאים. זה לא ליקוי מדידה אלא ליקוי שרואים בעין.
          הדהייה נדחקה ל-12% התחתונים בלבד, מתחת לכל תוכן.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-dark/90 from-0% via-emerald-dark/80 via-88% to-background to-100%" />
      </motion.div>

      {/* Flowing particles — קישוט בלבד. ראה use-decorative-motion. */}
      {particles && [...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4 + (i % 3) * 4,
            height: 4 + (i % 3) * 4,
            left: `${8 + i * 7.5}%`,
            top: `${15 + (i % 4) * 20}%`,
            background: i % 2 === 0 
              ? "hsl(42, 85%, 55%)" 
              : "hsl(152, 45%, 50%)",
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, i % 2 === 0 ? 20 : -20, 0],
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.8, 1],
          }}
          transition={{
            duration: 5 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-6 text-center"
        style={{ y: textY, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* Logo text with cinematic reveal
              ⚠️ ‎leading-none‎ בתוך ‎overflow-hidden‎ חתך את ראשי האותיות:
              קופסת השורה בגובה הגופן בדיוק, ובעברית ב-96px זה גזר את הלמ"ד
              ואת התג של הקו"ף. נמדד בצילום המובייל. ‎leading-[1.15]‎ נותן
              לקופסה את האוויר שהיא צריכה, ו-‎text-7xl‎ במובייל מונע מהכותרת
              לדחוק את רצועת יצירת הקשר אל מחוץ למסך. */}
          <motion.div
            className="mb-8 overflow-hidden"
          >
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-7xl md:text-[10rem] font-black text-white tracking-tight leading-[1.15]"
            >
              בקלות
            </motion.h1>
          </motion.div>

          {/* Tagline with reveal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mb-3"
          >
            {/* ‎text-secondary‎ (זהב) על ‎bg-secondary/20‎ מעל הירוק הכהה נותן
                3.42:1 בגודל 14px — מתחת ל-4.5. ‎gold-on-dark‎ הוא אותה משפחת
                צבע בגוון בהיר, ובמכוון אינו מתהפך בערכה הכהה. */}
            {/* היה כאן ‎Sparkles‎. נמדד ב-‎icon-noise.mjs‎: ארבעה ניצוצות מרונדרים
                בעמוד — בתג הזה, בכותרת בפוטר ובשתי רצועות "עמדות נדרים פלוס" —
                בלי שאף אחד מהם אומר דבר שהטקסט לידו לא אומר. ניצוץ הוא הסמל
                שמופיע כשצריך אייקון ואין מה להגיד, וזו בדיוק החתימה ש-§6 מתלונן
                עליה. התג אומר "מיזם חברתי למיצוי זכויות" והוא מספיק. */}
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary/20 border border-secondary/40 text-gold-on-dark text-sm font-semibold">
              מיזם חברתי למיצוי זכויות
            </span>
          </motion.div>

          <motion.div className="overflow-hidden mb-4">
            <motion.p
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl md:text-5xl font-bold text-white leading-tight"
            >
              הזכות שלך, האחריות שלנו
            </motion.p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            {/* ⚠️ היה: "אלפי ישראלים מפסידים עשרות אלפי שקלים בשנה — פשוט כי
                הם לא יודעים שמגיע להם. אנחנו כאן כדי לשנות את זה."

                שני דברים. הראשון הוא נתון מכומת בלי מקור — כמה אלפים, כמה
                שקלים, לפי מי — באתר שהכלל שלו הוא נתוני אמת בלבד. השני,
                "אנחנו כאן כדי לשנות את זה", הוא סיומת גנרית.

                מה שנשאר הוא מה שנכון בלי מקור חיצוני: זכויות קיימות, קשה למצוא
                אותן, וכאן הן מרוכזות במקום אחד עם התנאים וההסבר איך מגישים. */}
            זכויות רבות פשוט לא ידועות למי שזכאי להן — הן פזורות בין ביטוח לאומי,
            רשויות המס, הבנקים והקופות. כאן הן מרוכזות, עם התנאים ואיך מגישים.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="#service-bot"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-5 rounded-2xl bg-secondary text-secondary-foreground font-extrabold text-lg shadow-2xl glow-gold relative overflow-hidden group"
            >
              {/* DESIGN_STANDARD §2: אין אמוג'ים בממשק, ואמוג'י בכפתור הוא
                  סימן שהקופי לא נכתב. הוסרו מכל הכפתורים והכותרות. */}
              <span className="relative z-10">גלו כמה כסף מחכה לכם</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.a>
            {/* ‎backdrop-blur‎ הוסר משלושת המשטחים בגיבור (הכפתור הזה ושתי רצועות
                יצירת הקשר). מה שהוא מטשטש כאן הוא גרדיאנט אחיד — כלומר הוא כמעט
                לא משנה פיקסל, ורק מוסיף את שכבת ה"זכוכית" שהיא אחד מארבעה סימני
                הקיט ב-DESIGN_SAMENESS. בסרגל הניווט הוא נשאר, שם הוא כן עושה
                עבודה: תוכן נגלל מתחתיו וצריך להישאר קריא. */}
            <motion.a
              href="https://nedar.im/F4064"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-5 rounded-2xl border-2 border-white/40 text-white font-bold text-lg hover:bg-white/10 transition-colors"
            >
              הצטרפו ללא עלות
            </motion.a>
          </motion.div>

          {/* Contact strip - prominent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            <motion.a
              href="tel:023131500"
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all"
            >
              <Phone className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-white font-bold text-sm" dir="ltr">02-3131500</p>
                <p className="text-white/85 text-xs">מערכת קולית 24/6</p>
              </div>
            </motion.a>
            <motion.a
              href="mailto:L023131500@gmail.com"
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all"
            >
              <Mail className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-white font-bold text-xs" dir="ltr">L023131500@gmail.com</p>
                <p className="text-white/85 text-xs">שלחו מייל</p>
              </div>
            </motion.a>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-secondary/20 border border-secondary/30 cursor-default"
            >
              {/* ‎MapPin‎ ולא ‎Sparkles‎: שתי הרצועות לידה הן ערוצי קשר ולכן קיבלו
                  טלפון ומעטפה, ולשלישית לא היה אייקון מתבקש — אז נשתל ניצוץ.
                  עמדות נדרים פלוס הן מקומות פיזיים "בכל הארץ", וסיכה על מפה
                  אומרת את זה. */}
              <MapPin className="w-5 h-5 text-secondary" />
              <div className="text-right">
                <p className="text-white font-bold text-sm">עמדות נדרים פלוס</p>
                <p className="text-white/85 text-xs">בכל הארץ</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-7 h-11 rounded-full border-2 border-white/40 flex items-start justify-center pt-2"
      >
        <motion.div
          className="w-1.5 h-3 rounded-full bg-secondary/70"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
