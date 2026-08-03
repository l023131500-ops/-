import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSynagogues } from '@/hooks/useSynagogues';

interface ImageAnnouncement {
  id: string;
  content: string;
  image_url?: string;
  synagogue_id: string;
}

const AnnouncementsSection = () => {
  const { synagogues } = useSynagogues();

  const allTextAnnouncements = synagogues.flatMap(syn =>
    syn.announcements.map(a => ({ text: a.content, synagogue: syn.name }))
  );

  if (allTextAnnouncements.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3 tracking-tight flex items-center justify-center gap-3">
            <Megaphone className="w-7 h-7 text-accent" />
            מודעות והודעות
          </h2>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full" />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {allTextAnnouncements.map((ann, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, type: 'spring', bounce: 0.3 }}
              whileHover={{ x: -6, boxShadow: '0 8px 25px -5px hsl(174 50% 25% / 0.15)' }}
              className="bg-card rounded-xl shadow-card p-5 border-r-4 border-accent transition-all duration-300">
              <p className="text-foreground font-semibold mb-2">{ann.text}</p>
              <span className="text-xs text-muted-foreground">{ann.synagogue}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnnouncementsSection;
