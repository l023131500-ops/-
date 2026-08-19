import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Send, User, Phone, Mail, MessageSquare,
  Heart, BookOpen, Users, Sparkles, Check, MapPin, Clock, MessageCircle, Printer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import logoHazor from '@/assets/logo-mechubarim.png';
import logoMechubarim from '@/assets/logo-mechubarim.png';
import Footer from '@/components/Footer';

const requestTypes = [
  { id: 'stam', label: 'שירותי סת"ם', icon: BookOpen, description: 'בדיקת מזוזות, תפילין וספרי תורה' },
  { id: 'azkarot', label: 'אזכרות', icon: Heart, description: 'ארגון אזכרה ולוויה' },
  { id: 'barmitzvah', label: 'לימוד לבר מצווה', icon: Sparkles, description: 'הכנה ולימוד לבר מצווה' },
  { id: 'donation', label: 'תרומה', icon: Users, description: 'רוצה לתרום לבית הכנסת' },
  { id: 'event', label: 'אירוע / שמחה', icon: Clock, description: 'ארגון אירוע בבית הכנסת' },
  { id: 'other', label: 'פנייה אחרת', icon: MessageSquare, description: 'פנייה כללית' },
];

const ContactPage = () => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    address: 'המועצה הדתית חצור הגלילית, רח׳ הרצל 1',
    phone: '054-203-0901',
    email: 'M0542060903@GMAIL.COM',
    whatsapp: '972542030901',
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      const { data } = await supabase.from('knowledge_base').select('*').eq('category', 'פרטי_יצירת_קשר').eq('is_active', true);
      if (data && data.length > 0) {
        const info = data[0];
        try {
          const parsed = JSON.parse(info.content);
          setContactInfo(parsed);
        } catch {}
      }
    };
    fetchContactInfo();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !selectedType) return;
    setSending(true);
    await supabase.from('community_leads').insert({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      lead_type: selectedType,
      message: message.trim() || requestTypes.find(r => r.id === selectedType)?.label || '',
    });
    setSending(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          className="text-center p-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', bounce: 0.6 }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="text-3xl font-display font-black text-foreground mb-3">הפנייה נשלחה בהצלחה!</h2>
          <p className="text-muted-foreground text-lg mb-8">תודה רבה, {name}. הגבאי ייצור איתך קשר בהקדם.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gradient-hero text-primary-foreground px-8 py-4 rounded-xl font-display font-bold text-lg hover:shadow-elevated transition-all">
            <ArrowRight className="w-5 h-5" /> חזרה לאתר הראשי
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5a55a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="container relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-6">
            <ArrowRight className="w-5 h-5" />
            <span className="font-display font-bold">חזרה לאתר</span>
          </Link>
          <div className="flex items-center justify-center gap-6 mb-6">
            <img src={logoHazor} alt="לוגו" className="h-16 drop-shadow-lg" />
            <img src={logoMechubarim} alt="מחוברים" className="h-16 rounded-xl drop-shadow-lg" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-black text-primary-foreground text-center mb-2"
          >
            צור קשר
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-primary-foreground/60 text-center text-lg"
          >
            נשמח לעמוד לשירותכם בכל פנייה
          </motion.p>
        </div>
      </header>

      <div className="container py-12 max-w-3xl">
        {/* Request type selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
          <h2 className="text-xl font-display font-black text-foreground mb-5 text-center">במה נוכל לעזור?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {requestTypes.map((type, i) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08, type: 'spring', bounce: 0.3 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedType(type.id)}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-center ${
                  selectedType === type.id
                    ? 'border-primary bg-primary/5 shadow-elevated'
                    : 'border-border bg-card hover:border-primary/30 shadow-card hover:shadow-elevated'
                }`}
              >
                <type.icon className={`w-8 h-8 mx-auto mb-3 transition-colors ${selectedType === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`font-black text-sm mb-1 transition-colors ${selectedType === type.id ? 'text-primary' : 'text-foreground'}`}>{type.label}</div>
                <div className="text-xs text-muted-foreground">{type.description}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Contact form */}
        <AnimatePresence>
          {selectedType && (
            <motion.div
              initial={{ opacity: 0, y: 30, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="bg-card rounded-2xl shadow-elevated ornament-border p-8 space-y-5">
                <h3 className="text-lg font-display font-black text-foreground flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  פרטי הפנייה — {requestTypes.find(r => r.id === selectedType)?.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">שם מלא *</label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך" className="pr-10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">טלפון *</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" className="pr-10" dir="ltr" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">אימייל (אופציונלי)</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="pr-10" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">הודעה</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="ספר/י לנו במה מדובר..."
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleSubmit}
                    disabled={!name.trim() || !phone.trim() || sending}
                    className="w-full bg-gradient-hero text-primary-foreground font-black py-6 text-base gap-2 rounded-xl disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" /> {sending ? 'שולח...' : 'שלח פנייה'}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }}
            className="bg-card rounded-2xl shadow-card ornament-border p-6 text-center transition-all duration-300">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-display font-black text-foreground mb-2">כתובת</h3>
            <p className="text-muted-foreground text-sm">{contactInfo.address}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }}
            className="bg-card rounded-2xl shadow-card ornament-border p-6 text-center transition-all duration-300">
            <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-display font-black text-foreground mb-2">טלפון</h3>
            <a href={`tel:${contactInfo.phone.replace(/-/g, '')}`} className="text-accent font-mono font-bold hover:underline transition-colors" dir="ltr">{contactInfo.phone}</a>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }}
            className="bg-card rounded-2xl shadow-card ornament-border p-6 text-center transition-all duration-300">
            <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-display font-black text-foreground mb-2">אימייל</h3>
            <a href={`mailto:${contactInfo.email}`} className="text-accent font-bold hover:underline transition-colors text-sm" dir="ltr">{contactInfo.email}</a>
          </motion.div>
          <a href={`https://wa.me/${contactInfo.whatsapp}`} target="_blank" rel="noreferrer">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }}
              className="bg-emerald-50 rounded-2xl shadow-card ornament-border p-6 text-center transition-all duration-300 hover:shadow-elevated h-full">
              <MessageCircle className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-display font-black text-foreground mb-2">וואטסאפ</h3>
              <p className="text-emerald-600 font-bold text-sm">התחברו אלינו בוואטסאפ ←</p>
            </motion.div>
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;
