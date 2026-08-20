import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronLeft, ChevronRight, Camera, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage, deleteStorageFile } from '@/lib/supabaseStorage';

interface ActivitySlide {
  id: string;
  image_url: string;
  caption: string;
}

const ActivitySlideshow = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [slides, setSlides] = useState<ActivitySlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSlides = async () => {
    const { data } = await supabase.from('activity_slides').select('*').order('created_at', { ascending: false });
    if (data) setSlides(data as any);
  };

  useEffect(() => { fetchSlides(); }, []);

  const totalItems = slides.length;

  useEffect(() => {
    if (totalItems <= 1) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % totalItems), 4000);
    return () => clearInterval(timer);
  }, [totalItems]);

  useEffect(() => {
    if (current >= totalItems && totalItems > 0) setCurrent(0);
  }, [totalItems, current]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const caption = prompt('הוסף כיתוב לתמונה (מה מוצג בתמונה?)') || '';
    const url = await uploadImage(file, 'activities');
    if (url) {
      const { error } = await supabase.from('activity_slides').insert({ image_url: url, caption });
      if (error) {
        alert('שמירת התמונה נכשלה, נסה שוב');
      } else {
        await fetchSlides();
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (slide: ActivitySlide) => {
    await deleteStorageFile(slide.image_url);
    const { error } = await supabase.from('activity_slides').delete().eq('id', slide.id);
    if (error) {
      alert('מחיקת התמונה נכשלה, נסה שוב');
      return;
    }
    await fetchSlides();
  };

  if (!isAdmin && slides.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-black text-foreground mb-2 tracking-tight flex items-center justify-center gap-3">
            <Users className="w-6 h-6 text-accent" />
            פעילות תורנית בחצור הגלילית
          </h2>
          <div className="h-1 bg-gradient-gold max-w-20 mx-auto rounded-full" />
        </motion.div>

        {isAdmin && (
          <div className="mb-6 text-center">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 bg-gradient-gold text-foreground px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50">
              <Camera className="w-5 h-5" /> {uploading ? 'מעלה...' : 'העלה תמונת פעילות'}
            </motion.button>
          </div>
        )}

        {slides.length > 0 && (
          <div className="relative max-w-3xl mx-auto">
            <div className="bg-card rounded-2xl shadow-card ornament-border overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={`slide-${current}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.5 }} className="relative">
                  <div className="aspect-video relative overflow-hidden">
                    <img src={slides[current]?.image_url} alt={slides[current]?.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-6 pt-16">
                      <p className="text-primary-foreground font-display font-black text-lg md:text-xl text-center drop-shadow-lg">
                        {slides[current]?.caption || 'פעילות תורנית'}
                      </p>
                    </div>
                    {isAdmin && slides[current] && (
                      <button onClick={() => handleDelete(slides[current])}
                        className="absolute top-3 left-3 w-9 h-9 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {totalItems > 1 && (
              <div className="flex justify-center items-center gap-3 mt-4">
                <button onClick={() => setCurrent((current - 1 + totalItems) % totalItems)}
                  className="w-8 h-8 rounded-full bg-card shadow-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalItems }).map((_, i) => (
                    <button key={i} onClick={() => setCurrent(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-5' : 'bg-border'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrent((current + 1) % totalItems)}
                  className="w-8 h-8 rounded-full bg-card shadow-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ActivitySlideshow;
