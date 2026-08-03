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

/* ---- Unified service hub cards (info + contact in one) ---- */
const serviceHub = [
  {
    id: 'kashrut', label: 'כשרות בחצור', Icon: Scale, link: '/kashrut',
    desc: 'מוסדות מהדרין ורגיל, משגיחים ופרטי קשר',
    gradient: 'from-emerald-500 to-teal-600', requestType: 'kashrut',
  },
  {
    id: 'mikvaot', label: 'מקוואות', Icon: Droplets, link: '/mikvaot',
    desc: 'שעות, כתובות, רבני טהרה וייעוץ',
    gradient: 'from-sky-500 to-blue-600', requestType: 'mikveh',
  },
  {
    id: 'info', label: 'מידע דת וקהילה', Icon: BookOpen, link: '/info',
    desc: 'סת"ם, גמ"חים, בית דין, ייעוץ',
    gradient: 'from-amber-500 to-orange-600', requestType: 'other',
  },
  {
    id: 'halacha', label: 'הלכה יומית', Icon: Star, link: '/halacha',
    desc: 'הלכות יומיות והנחיות עונתיות מהרב',
    gradient: 'from-yellow-500 to-amber-600', requestType: 'shiur_kavua',
  },
  {
    id: 'mourning', label: 'אבלות ואזכרות', Icon: Heart, link: '/mourning',
    desc: 'הלכות אבלות, בקשת אזכרה ותמיכה',
    gradient: 'from-slate-500 to-gray-600', requestType: 'azkara',
  },
  {
    id: 'newsletter', label: 'עלון מחוברים', Icon: FileText, link: '/newsletter',
    desc: 'העלון השבועי — צפייה והורדה',
    gradient: 'from-indigo-500 to-purple-600', requestType: undefined,
  },
  {
    id: 'services', label: 'שירותי דת', Icon: Scroll, link: '/contact',
    desc: 'חזן, בעל קורא, בר מצווה, אירועים',
    gradient: 'from-rose-500 to-pink-600', requestType: 'event',
  },
  {
    id: 'contact', label: 'צור קשר', Icon: Phone, link: '/contact',
    desc: 'פניות, בקשות ותמיכה',
    gradient: 'from-teal-500 to-cyan-600', requestType: 'other',
  },
];

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
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${item.gradient} text-white shadow-sm shrink-0`}>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-display font-black text-foreground mb-2 tracking-tight">
              בתי הכנסת בחצור הגלילית
            </h2>
            <p className="text-muted-foreground text-xs">לחצו על בית כנסת לפרטים מלאים</p>
            <div className="h-1 bg-gradient-gold max-w-20 mx-auto rounded-full mt-3" />
          </motion.div>

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-display font-black text-foreground mb-2 tracking-tight">
                שירותי הקהילה
              </h2>
              <p className="text-muted-foreground text-xs">כל השירותים הדתיים והקהילתיים במקום אחד</p>
              <div className="h-1 bg-gradient-gold max-w-20 mx-auto rounded-full mt-3" />
            </motion.div>

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
