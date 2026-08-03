import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoMechubarim from '@/assets/logo-mechubarim.png';

const defaultContact = {
  address: 'המועצה הדתית חצור הגלילית, רח׳ הרצל 1',
  phone: '054-203-0901',
  email: 'M0542060903@GMAIL.COM',
  whatsapp: '972542030901',
  fax: '04-693-4573',
};

const Footer = () => {
  const [contact, setContact] = useState(defaultContact);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('knowledge_base')
        .select('content')
        .eq('category', 'פרטי_יצירת_קשר')
        .eq('is_active', true)
        .limit(1);
      if (data?.[0]) {
        try {
          setContact({ ...defaultContact, ...JSON.parse(data[0].content) });
        } catch {}
      }
    };
    fetch();
  }, []);

  return (
    <footer className="relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-gradient-footer" />

      <div className="container relative z-10">
        <div className="flex items-center justify-center gap-6 mb-6">
          <motion.img
            src={logoMechubarim}
            alt="מחוברים"
            className="h-16 drop-shadow-lg rounded-lg animate-logo-pulse"
          />
        </div>

        <h3 className="text-foreground font-display font-black text-xl text-center mb-2">
          מחוברים — יהדות וקהילה
        </h3>
        <p className="text-muted-foreground text-sm text-center mb-1">
          בנשיאות הרב עוזיאל דיעי שליט"א
        </p>

        <div className="h-px bg-primary/15 max-w-xs mx-auto my-6" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-foreground text-sm font-bold">כתובת</div>
              <div className="text-muted-foreground text-xs">{contact.address}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <Phone className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-foreground text-sm font-bold">טלפון</div>
              <a href={`tel:${contact.phone.replace(/-/g, '')}`} className="text-primary text-xs font-mono font-bold hover:underline" dir="ltr">{contact.phone}</a>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <Mail className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-foreground text-sm font-bold">אימייל</div>
              <a href={`mailto:${contact.email}`} className="text-primary text-xs font-bold hover:underline" dir="ltr">{contact.email}</a>
            </div>
          </div>

          {contact.fax && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
              <Printer className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-foreground text-sm font-bold">פקס</div>
                <span className="text-muted-foreground text-xs font-mono" dir="ltr">{contact.fax}</span>
              </div>
            </div>
          )}

          <a
            href={`https://wa.me/${contact.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-accent/10 rounded-xl p-3 hover:bg-accent/15 transition-colors col-span-1 sm:col-span-2 lg:col-span-2"
          >
            <MessageCircle className="w-5 h-5 text-accent shrink-0" />
            <div>
              <div className="text-foreground text-sm font-bold">התחברו אלינו בוואטסאפ</div>
              <span className="text-accent text-xs font-bold">לחצו כאן לשיחה ישירה ←</span>
            </div>
          </a>
        </div>

        <p className="text-muted-foreground/60 text-xs text-center">
          © {new Date().getFullYear()} כל הזכויות שמורות | מחוברים — יהדות וקהילה
        </p>
      </div>
    </footer>
  );
};

export default Footer;
