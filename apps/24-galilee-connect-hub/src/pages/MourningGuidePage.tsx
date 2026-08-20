import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Phone, Send, ArrowRight, BookOpen, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';

const abelutSections = [
  {
    title: 'שבעה',
    content: 'ימי האבלות הראשונים נמשכים שבעה ימים מיום הקבורה. בימים אלה האבל יושב על הארץ או על כיסא נמוך, אינו נועל נעלי עור, אינו מתרחץ לתענוג, אינו מסתפר ואינו עוסק במלאכה. מקובל שקרובים ושכנים מביאים מזון לבית האבל.',
  },
  {
    title: 'שלושים',
    content: 'תקופת השלושים נמשכת 30 יום מיום הקבורה. בתקופה זו ממשיכים חלק מדיני האבלות: אין להסתפר, אין ללבוש בגדים חדשים ואין להשתתף בשמחות.',
  },
  {
    title: 'שנים עשר חודש',
    content: 'על אב ואם מתאבלים שנים עשר חודש. בתקופה זו אומרים קדיש ונמנעים מהשתתפות בשמחות ומסיבות.',
  },
  {
    title: 'אזכרה ויארצייט',
    content: 'מדי שנה ביום פטירת הנפטר מדליקים נר נשמה, אומרים קדיש ועולים לבית הקברות. נהוג גם ללמוד משניות לעילוי נשמת הנפטר.',
  },
];

const MourningGuidePage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [requestType, setRequestType] = useState('azkara');
  const [dateRequested, setDateRequested] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !deceasedName.trim()) return;
    setSending(true);
    const { error } = await supabase.from('azkarot_requests').insert({
      name, phone, deceased_name: deceasedName,
      request_type: requestType,
      date_requested: dateRequested || null,
      notes: notes || null,
    });
    setSending(false);
    if (!error) {
      toast({ title: '✅ הבקשה נשלחה בהצלחה', description: 'ניצור עמך קשר בהקדם' });
      setName(''); setPhone(''); setDeceasedName(''); setNotes(''); setDateRequested('');
    } else {
      toast({ title: '❌ שגיאה', description: 'אנא נסו שוב מאוחר יותר', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10 max-w-4xl" dir="rtl">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-sm mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" aria-hidden="true" /> חזרה לדף הבית
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <Heart className="w-4 h-4" /> תמיכה וליווי
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">מדריך אבלות ואזכרות</h1>
          <p className="text-muted-foreground">הלכות אבלות, וטופס בקשה לליווי בית אבל ואזכרות</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Abelut Laws */}
        <div className="space-y-4 mb-12">
          <h2 className="text-xl font-display font-black text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> הלכות אבלות בקצרה
          </h2>
          {abelutSections.map((section, i) => (
            <motion.div key={section.title} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-5 shadow-card border-r-4 border-primary/30">
              <h3 className="font-display font-black text-foreground mb-2">{section.title}</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>

        {/* Request Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card ornament-border overflow-hidden">
          <div className="bg-gradient-hero p-5">
            <h2 className="text-xl font-display font-black text-primary-foreground flex items-center gap-2">
              <Heart className="w-5 h-5" /> בקשת תמיכה — אזכרה / בית אבל
            </h2>
            <p className="text-primary-foreground/70 text-sm mt-1">מלאו את הטופס ונחזור אליכם בהקדם</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mourning-name" className="block text-sm font-bold text-foreground mb-1.5">שם מלא *</label>
                <Input id="mourning-name" value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא" />
              </div>
              <div>
                <label htmlFor="mourning-phone" className="block text-sm font-bold text-foreground mb-1.5">טלפון *</label>
                <Input id="mourning-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" dir="ltr" />
              </div>
            </div>
            <div>
              <label htmlFor="mourning-deceased-name" className="block text-sm font-bold text-foreground mb-1.5">שם הנפטר/ת *</label>
              <Input id="mourning-deceased-name" value={deceasedName} onChange={e => setDeceasedName(e.target.value)} placeholder="שם הנפטר/ת" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mourning-request-type" className="block text-sm font-bold text-foreground mb-1.5">סוג הבקשה</label>
                <select id="mourning-request-type" value={requestType} onChange={e => setRequestType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="azkara">אזכרה</option>
                  <option value="beit_avel">בית אבל</option>
                  <option value="kaddish">אמירת קדיש</option>
                  <option value="mishnayot">לימוד משניות</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <div>
                <label htmlFor="mourning-date-requested" className="block text-sm font-bold text-foreground mb-1.5">תאריך מבוקש</label>
                <Input id="mourning-date-requested" type="date" value={dateRequested} onChange={e => setDateRequested(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div>
              <label htmlFor="mourning-notes" className="block text-sm font-bold text-foreground mb-1.5">הערות</label>
              <Textarea id="mourning-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="פרטים נוספים..." rows={3} />
            </div>
            <Button onClick={handleSubmit} disabled={sending || !name.trim() || !phone.trim() || !deceasedName.trim()}
              className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground py-6 text-base">
              {sending ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'שולח...' : 'שלח בקשה'}
            </Button>
          </div>
        </motion.div>

        {/* Emergency contact */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 bg-muted/50 rounded-xl p-5 text-center">
          <p className="text-foreground font-bold mb-2">לסיוע מיידי ניתן לפנות לרב העיר:</p>
          <a href="tel:04-6808808" className="inline-flex items-center gap-2 text-primary font-bold text-lg hover:text-primary/80 transition-colors" dir="ltr">
            <Phone className="w-5 h-5" /> 04-680-8808
          </a>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default MourningGuidePage;
