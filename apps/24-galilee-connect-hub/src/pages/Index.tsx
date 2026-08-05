import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Settings, Phone, BookOpen, Droplets, Scale, Heart, FileText, Star,
  ChevronDown, MapPin, Scroll, Users, Gavel, HeartHandshake, Baby,
  Megaphone, Send, MessageSquare
} from 'lucide-react';
import HeroSection from '@/components/HeroSection';
import ZmanimTicker from '@/components/ZmanimTicker';
import PrayersTicker from '@/components/PrayersTicker';
import SynagogueCarousel from '@/components/SynagogueCarousel';
import AdBannersStrip from '@/components/AdBannersStrip';
import AskRabbiSection from '@/components/AskRabbiSection';
import GallerySection from '@/components/GallerySection';
import Footer from '@/components/Footer';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import { useSynagogues } from '@/hooks/useSynagogues';

/* ---- Unified service hub cards (info + contact in one) ----
 *
 * ⚠️ עד עכשיו לכל כרטיס היה gradient משלו: emerald→teal, sky→blue,
 * amber→orange, yellow→amber, slate→gray, indigo→purple, rose→pink,
 * teal→cyan. שמונה מדרגים רוויים ובלתי קשורים זה לזה, **כולם מפלטת ברירת
 * המחדל של Tailwind ואף אחד מהם לא מהטוקנים של האתר** — הכרטיסים התעלמו
 * מהמותג לגמרי.
 *
 * זו בדיוק החתימה שנמדדה ב-QA/platform/DESIGN_SAMENESS.md: לא צבע חסר אלא
 * ערכת רכיבים גנרית. קשת של מדרגי סטארט-אפ על אתר שירותי דת קהילתיים
 * בחצור הגלילית אינה "צבעוני", היא פשוט לא שייכת לנושא.
 *
 * הכיוון הוא הפחתה: צבע אחד, שהוא הצבע של האתר. ההבחנה בין הכרטיסים
 * נעשית על ידי השם והתיאור — כלומר על ידי מידע — ולא על ידי רעש.
 */
const serviceHub = [
  {
    id: 'kashrut', label: 'כשרות בחצור', Icon: Scale, link: '/kashrut',
    desc: 'מוסדות מהדרין ורגיל, משגיחים ופרטי קשר',
    requestType: 'kashrut',
  },
  {
    id: 'mikvaot', label: 'מקוואות', Icon: Droplets, link: '/mikvaot',
    desc: 'שעות, כתובות, רבני טהרה וייעוץ',
    requestType: 'mikveh',
  },
  {
    id: 'info', label: 'מידע דת וקהילה', Icon: BookOpen, link: '/info',
    desc: 'סת"ם, גמ"חים, בית דין, ייעוץ',
    requestType: 'other',
  },
  {
    id: 'halacha', label: 'הלכה יומית', Icon: Star, link: '/halacha',
    desc: 'הלכות יומיות והנחיות עונתיות מהרב',
    requestType: 'shiur_kavua',
  },
  {
    id: 'mourning', label: 'אבלות ואזכרות', Icon: Heart, link: '/mourning',
    desc: 'הלכות אבלות, בקשת אזכרה ותמיכה',
    requestType: 'azkara',
  },
  {
    id: 'newsletter', label: 'עלון מחוברים', Icon: FileText, link: '/newsletter',
    desc: 'העלון השבועי — צפייה והורדה',
    requestType: undefined,
  },
  {
    id: 'services', label: 'שירותי דת', Icon: Scroll, link: '/contact',
    desc: 'חזן, בעל קורא, בר מצווה, אירועים',
    requestType: 'event',
  },
  {
    id: 'contact', label: 'צור קשר', Icon: Phone, link: '/contact',
    desc: 'פניות, בקשות ותמיכה',
    requestType: 'other',
  },
];

/**
 * כותרת מקטע. הייתה משוכפלת מילה במילה בשני מקטעים — אותו div ממורכז, אותה
 * כותרת, אותה שורת משנה זעירה, ואותו קו זהב באורך קבוע. שכפול של אותו בלוק
 * הוא חלק ממה שגורם לעמוד להיראות מיוצר; מקום אחד גם מקטין את הקוד וגם
 * מבטיח שהמקטעים לא יתפצלו בעתיד.
 */
const SectionHead = ({ title, sub }: { title: string; sub: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-center mb-8"
  >
    <h2 className="text-2xl md:text-3xl font-display font-black text-foreground mb-2 tracking-tight">
      {title}
    </h2>
    <p className="text-muted-foreground text-xs">{sub}</p>
    <div className="h-1 bg-gradient-gold max-w-20 mx-auto rounded-full mt-3" />
  </motion.div>
);

const ServiceHubCard = ({ item, index }: { item: typeof serviceHub[0]; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <Link to={item.link}
        className={`block bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-elevated hover:border-primary/20 transition-all duration-300 group`}
      >
        <div className="p-4 flex items-start gap-3">
          {/* צ׳יפ אחד, בצבע האתר. הטוקנים מטפלים גם במצב הכהה — מדרג
              מקודד-קשיח לא היה משתנה שם ונשאר זוהר על רקע כהה. */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0 transition-colors group-hover:bg-primary/15">
            <item.Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-black text-foreground text-sm leading-tight">{item.label}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
          </div>
        </div>
      </Link>

      {/* Inline request button */}
      {item.requestType && (
        <div className="px-4 pb-3 -mt-1">
          <ServiceRequestForm defaultType={item.requestType} compact />
        </div>
      )}
    </motion.div>
  );
};

const Index = () => {
  const { synagogues, loading } = useSynagogues();

  return (
    <div className="min-h-screen relative">
      <div className="relative z-[2]">
        <HeroSection />

        {/* Synagogues section - compact */}
        <section className="container py-10" id="synagogues" aria-label="בתי הכנסת בחצור הגלילית">
          <SectionHead
            title="בתי הכנסת בחצור הגלילית"
            sub="לחצו על בית כנסת לפרטים מלאים"
          />

          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground font-semibold text-sm">טוען בתי כנסת...</p>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-4 h-[75vh]">
                  <ZmanimTicker />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <SynagogueCarousel synagogues={synagogues} />
              </div>

              <div className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-4 h-[75vh]">
                  <PrayersTicker />
                </div>
              </div>
            </div>
          )}

          <div className="lg:hidden grid grid-cols-2 gap-3 mt-6">
            <div className="h-72"><ZmanimTicker /></div>
            <div className="h-72"><PrayersTicker /></div>
          </div>
        </section>

        {/* Side + center ad banners */}
        <AdBannersStrip />

        {/* Ask the Rabbi */}
        <AskRabbiSection />

        {/* Unified Service Hub - replaces duplicated buttons */}
        <section className="py-10" id="services" aria-label="שירותי הקהילה">
          <div className="container">
            <SectionHead
              title="שירותי הקהילה"
              sub="כל השירותים הדתיים והקהילתיים במקום אחד"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {serviceHub.map((item, i) => (
                <ServiceHubCard key={item.id} item={item} index={i} />
              ))}
            </div>

            {/* Admin portal link */}
            <div className="flex justify-center mt-8">
              <Link to="/gabai"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-display font-bold text-sm hover:shadow-elevated transition-shadow">
                <Settings className="w-4 h-4" /> כניסה לפורטל גבאים
              </Link>
            </div>
          </div>
        </section>

        <GallerySection />

        <Footer />
      </div>
    </div>
  );
};

export default Index;
