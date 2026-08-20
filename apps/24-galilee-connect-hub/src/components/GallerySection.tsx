import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage, deleteStorageFile } from '@/lib/supabaseStorage';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

const GallerySection = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    const { data } = await supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
    if (data) setImages(data as any);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const caption = prompt('הוסף כיתוב לתמונה (אופציונלי)') || '';
    const url = await uploadImage(file, 'gallery');
    if (url) {
      const { error } = await supabase.from('gallery_images').insert({ image_url: url, caption });
      if (error) {
        alert('שמירת התמונה נכשלה, נסה שוב');
      } else {
        await fetchImages();
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (img: GalleryImage) => {
    await deleteStorageFile(img.image_url);
    const { error } = await supabase.from('gallery_images').delete().eq('id', img.id);
    if (error) {
      alert('מחיקת התמונה נכשלה, נסה שוב');
      return;
    }
    setImages(prev => prev.filter(i => i.id !== img.id));
  };

  if (!isAdmin && images.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3 tracking-tight flex items-center justify-center gap-3">
            <Camera className="w-7 h-7 text-accent" />
            גלריית פעילויות ואירועים
          </h2>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full" />
        </motion.div>

        {isAdmin && (
          <div className="mb-6 text-center">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 bg-gradient-gold text-foreground px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50">
              <Camera className="w-5 h-5" /> {uploading ? 'מעלה...' : 'העלה תמונה חדשה'}
            </motion.button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, i) => (
            <motion.div key={img.id} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06, type: 'spring', bounce: 0.3 }}
              whileHover={{ y: -6, boxShadow: '0 15px 40px -10px hsl(var(--primary) / 0.25)' }}
              className="relative rounded-2xl overflow-hidden shadow-card group cursor-pointer aspect-square"
              onClick={() => setLightbox(img.image_url)}>
              <img src={img.image_url} alt={img.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3">
                <p className="text-primary-foreground text-sm font-bold">{img.caption}</p>
              </div>
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); handleDelete(img); }}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center p-4">
            <button onClick={() => setLightbox(null)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/20 text-primary-foreground flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
            <img src={lightbox} alt="" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default GallerySection;
