import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link: string | null;
  size: string;
  position: string;
  is_active: boolean;
}

const AdBannersStrip = () => {
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [centerIndex, setCenterIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('ad_banners')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('created_at', { ascending: false });
      if (data) setBanners(data as any);
    };
    fetch();
  }, []);

  const centerBanners = banners.filter(b => (b.position || 'center') === 'center');
  const sideBanners = banners.filter(b => b.position === 'side');

  useEffect(() => {
    if (centerBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCenterIndex(prev => (prev + 1) % centerBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [centerBanners.length]);

  if (banners.length === 0) return null;

  const sizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'h-24 md:h-32';
      case 'large': return 'h-52 md:h-72';
      default: return 'h-36 md:h-48';
    }
  };

  return (
    <section className="py-4">
      <div className="container">
        <div className="flex gap-4">
          {/* Left side banners */}
          {sideBanners.length > 0 && (
            <div className="hidden lg:flex flex-col gap-3 w-40 shrink-0">
              {sideBanners.slice(0, 2).map(b => (
                <BannerItem key={b.id} banner={b} className="h-36 rounded-xl" />
              ))}
            </div>
          )}

          {/* Center banners */}
          {centerBanners.length > 0 && (
            <div className="flex-1 min-w-0">
              <div className={`relative overflow-hidden rounded-2xl shadow-card border border-border bg-card ${sizeClass(centerBanners[centerIndex]?.size || 'medium')}`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={centerBanners[centerIndex]?.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <BannerItem banner={centerBanners[centerIndex]} className="w-full h-full" />
                  </motion.div>
                </AnimatePresence>

                {centerBanners.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {centerBanners.map((_, i) => (
                      <button key={i} onClick={() => setCenterIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === centerIndex ? 'bg-primary-foreground w-5' : 'bg-primary-foreground/40'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right side banners */}
          {sideBanners.length > 2 && (
            <div className="hidden lg:flex flex-col gap-3 w-40 shrink-0">
              {sideBanners.slice(2, 4).map(b => (
                <BannerItem key={b.id} banner={b} className="h-36 rounded-xl" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const BannerItem = ({ banner, className }: { banner: AdBanner; className?: string }) => {
  if (!banner) return null;
  const img = (
    <img src={banner.image_url} alt={banner.title} className={`object-cover ${className}`} />
  );

  return banner.link ? (
    <a href={banner.link} target="_blank" rel="noreferrer" className="block overflow-hidden">
      {img}
      {banner.title && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/60 to-transparent p-3">
          <p className="text-primary-foreground font-display font-bold text-sm">{banner.title}</p>
        </div>
      )}
    </a>
  ) : (
    <div className="relative overflow-hidden">
      {img}
    </div>
  );
};

export default AdBannersStrip;
