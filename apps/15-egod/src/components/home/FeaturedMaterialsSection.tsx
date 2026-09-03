import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, PlayCircle, Music, Download, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration } from "@/lib/utils";

type Material = {
  id: string;
  title: string;
  description: string | null;
  media_kind: string | null;
  file_url: string;
  uploader_id: string;
  duration_seconds: number | null;
  profiles: { full_name: string } | null;
};

const FeaturedMaterialsSection = () => {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    supabase.from("materials")
      .select("id,title,description,media_kind,file_url,uploader_id,duration_seconds,profiles(full_name)")
      .eq("status", "approved").eq("featured_on_homepage", true)
      .order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setMaterials(data as any); });
  }, []);

  if (materials.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center bg-secondary/10 text-secondary rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
            תכנים נבחרים
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            חומרי עזר שאצרנו עבורכם
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {materials.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2">
                {m.media_kind === "video" ? <PlayCircle className="w-4 h-4 text-secondary shrink-0" />
                  : m.media_kind === "audio" ? <Music className="w-4 h-4 text-secondary shrink-0" />
                  : <FileText className="w-4 h-4 text-secondary shrink-0" />}
                <h3 className="font-heading font-bold text-foreground">{m.title}</h3>
                {m.duration_seconds && m.duration_seconds > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">{formatDuration(m.duration_seconds)}</span>
                )}
              </div>
              {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
              {m.media_kind === "video" ? (
                <video controls src={m.file_url} className="w-full rounded-lg max-h-48" />
              ) : m.media_kind === "audio" ? (
                <audio controls src={m.file_url} className="w-full" />
              ) : m.media_kind === "image" ? (
                <img src={m.file_url} alt={m.title} className="w-full rounded-lg max-h-48 object-cover" />
              ) : (
                <a href={m.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary text-sm font-medium">
                  <Download className="w-3 h-3" />הורדה / צפייה
                </a>
              )}
              {m.profiles?.full_name && (
                <Link to={`/rabbi/${m.uploader_id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary">
                  <User className="w-3 h-3" />מאת {m.profiles.full_name}
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedMaterialsSection;
