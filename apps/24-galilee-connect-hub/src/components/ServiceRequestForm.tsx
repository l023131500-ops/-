import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Phone, User, MessageSquare, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const serviceTypes = [
  { id: 'shiur_kavua', label: 'בקשת שיעור קבוע' },
  { id: 'chazan', label: 'הזמנת חזן' },
  { id: 'baal_koreh', label: 'בעל קורא' },
  { id: 'azkara', label: 'אזכרה / בית אבל' },
  { id: 'stam', label: 'שירותי סת"ם' },
  { id: 'barmitzvah', label: 'לימוד בר מצווה' },
  { id: 'event', label: 'אירוע / שמחה' },
  { id: 'other', label: 'בקשה אחרת' },
];

interface ServiceRequestFormProps {
  defaultType?: string;
  compact?: boolean;
}

const ServiceRequestForm = ({ defaultType, compact }: ServiceRequestFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [leadType, setLeadType] = useState(defaultType || 'other');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    await supabase.from('community_leads').insert({
      name: name.trim(),
      phone: phone.trim(),
      lead_type: leadType,
      message: message.trim() || serviceTypes.find(s => s.id === leadType)?.label || '',
    });
    setSending(false);
    setSent(true);
    setName(''); setPhone(''); setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  if (compact) {
    return (
      <div className="mt-3">
        <button onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/15 transition-colors border border-primary/20">
          <Send className="w-3.5 h-3.5" /> פנייה
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown className="w-3 h-3" /></motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="pt-3 space-y-2">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא" className="text-xs h-9" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="טלפון" dir="ltr" className="text-xs h-9" />
                <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="פרטים נוספים (אופציונלי)" className="text-xs h-9" />
                {sent ? (
                  <p className="text-center text-primary font-bold text-xs py-2">✅ הבקשה נשלחה!</p>
                ) : (
                  <Button onClick={handleSubmit} disabled={!name.trim() || !phone.trim() || sending}
                    size="sm" className="w-full gap-2 font-bold text-xs bg-gradient-hero text-primary-foreground">
                    <Send className="w-3.5 h-3.5" /> שלח פנייה
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-6 space-y-4" dir="rtl">
      <h3 className="font-display font-black text-foreground text-lg flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> פנייה לגבאי
      </h3>

      <div className="flex flex-wrap gap-2">
        {serviceTypes.map(s => (
          <button key={s.id} onClick={() => setLeadType(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              leadType === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1"><User className="w-3 h-3 inline ml-1" />שם מלא</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="ישראל כהן" />
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1"><Phone className="w-3 h-3 inline ml-1" />טלפון</label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-foreground mb-1">פרטים נוספים</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="תאר את הבקשה..."
          rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {sent ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-primary font-bold text-sm py-3">
          ✅ הבקשה נשלחה בהצלחה! ניצור איתך קשר בהקדם
        </motion.p>
      ) : (
        <Button onClick={handleSubmit} disabled={!name.trim() || !phone.trim() || sending}
          className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground py-6">
          <Send className="w-5 h-5" /> שלח בקשה
        </Button>
      )}
    </div>
  );
};

export default ServiceRequestForm;
