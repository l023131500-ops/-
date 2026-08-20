import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Phone, Clock, Send, Mail, MessageCircle, ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { QuestionDestination } from '@/lib/rabbiQuestionsStore';

const contactMethods = [
  { id: 'email' as const, label: 'מייל', icon: Mail, placeholder: 'your@email.com' },
  { id: 'phone' as const, label: 'טלפון', icon: Phone, placeholder: '050-0000000' },
  { id: 'whatsapp' as const, label: 'וואטסאפ', icon: MessageCircle, placeholder: '050-0000000' },
];

const destinations = [
  { id: 'beit_horaa' as QuestionDestination, label: 'בית ההוראה' },
  { id: 'rabbi' as QuestionDestination, label: 'הרב עוזיאל דיעי שליט"א' },
];

const AskRabbiSection = () => {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'whatsapp'>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [destination, setDestination] = useState<QuestionDestination>('beit_horaa');
  const [urgent, setUrgent] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!question.trim() || !name.trim() || !contactValue.trim()) return;
    setSending(true);
    setErrorMsg('');
    const { error } = await supabase.from('rabbi_questions').insert({
      name: name.trim(),
      question: question.trim(),
      contact_method: contactMethod,
      contact_value: contactValue.trim(),
      destination,
      urgent,
    });
    setSending(false);
    if (error) {
      setErrorMsg('השאלה לא נשלחה עקב תקלה. אפשר לנסות שוב או להתקשר 054-203-0901.');
      return;
    }
    setSent(true);
    setQuestion(''); setName(''); setContactValue(''); setUrgent(false);
    setTimeout(() => setSent(false), 4000);
  };

  const selectedMethod = contactMethods.find(m => m.id === contactMethod)!;

  return (
    <section className="py-10" id="ask-rabbi">
      <div className="container max-w-2xl">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center justify-center gap-3 py-5 px-8 rounded-[2rem] font-display font-black text-lg transition-all duration-500 shadow-elevated ${
            isOpen
              ? 'bg-primary text-primary-foreground'
              : 'bg-gradient-to-l from-primary via-accent to-primary text-primary-foreground hover:shadow-[0_8px_40px_hsl(24_80%_48%/0.3)]'
          }`}
        >
          <HelpCircle className="w-6 h-6" />
          שאל את הרב — הרב עוזיאל דיעי שליט"א
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-card rounded-b-[2rem] shadow-elevated border border-t-0 border-border p-6 space-y-4 mt-[-4px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-teal-surface rounded-2xl p-3 text-center">
                    <Phone className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">טלפון</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">04-XXXXXXX</p>
                  </div>
                  <div className="bg-teal-surface rounded-2xl p-3 text-center">
                    <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">קבלת קהל</p>
                    <p className="text-xs text-muted-foreground">א'-ה' 09:00-12:00</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">השאלה מיועדת ל:</label>
                  <div className="flex gap-2">
                    {destinations.map(d => (
                      <button key={d.id} onClick={() => setDestination(d.id)}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                          destination === d.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-card'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="ask-rabbi-name" className="block text-sm font-bold text-foreground mb-1.5">שם מלא</label>
                  <input id="ask-rabbi-name" value={name} onChange={e => setName(e.target.value)} placeholder="הזן את שמך..." autoComplete="name"
                    className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div>
                  <label htmlFor="ask-rabbi-question" className="block text-sm font-bold text-foreground mb-1.5">שאלתך</label>
                  <textarea id="ask-rabbi-question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="כתוב את שאלתך כאן..."
                    rows={3} className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">כיצד לקבל תשובה?</label>
                  <div className="flex gap-2 mb-3">
                    {contactMethods.map(m => (
                      <button key={m.id} onClick={() => setContactMethod(m.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                          contactMethod === m.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-card'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}>
                        <m.icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <input value={contactValue} onChange={e => setContactValue(e.target.value)}
                    placeholder={selectedMethod.placeholder} dir="ltr"
                    type={contactMethod === 'email' ? 'email' : 'tel'}
                    inputMode={contactMethod === 'email' ? 'email' : 'tel'}
                    className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono" />
                </div>

                <button onClick={() => setUrgent(!urgent)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    urgent
                      ? 'bg-destructive text-destructive-foreground border-destructive shadow-card'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}>
                  <AlertTriangle className="w-4 h-4" />
                  {urgent ? '⚡ סומן כדחוף' : 'סמן כפנייה דחופה'}
                </button>

                {sent ? (
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center text-primary font-bold text-sm py-3" role="status" aria-live="polite">
                    ✅ השאלה נשלחה בהצלחה! התשובה תגיע אליך ב{selectedMethod.label}
                  </motion.p>
                ) : (
                  <button onClick={handleSend} disabled={!question.trim() || !name.trim() || !contactValue.trim() || sending}
                    className="w-full bg-gradient-gold text-foreground font-display font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-40">
                    <Send className="w-4 h-4" /> {sending ? 'שולח...' : 'שלח שאלה'}
                  </button>
                )}
                {errorMsg && (
                  <p role="alert" className="text-center text-sm font-bold text-destructive bg-destructive/10 rounded-lg py-3 px-4">
                    {errorMsg}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AskRabbiSection;
