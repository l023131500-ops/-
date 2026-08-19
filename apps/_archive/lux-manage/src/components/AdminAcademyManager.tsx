import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Save, Play, Lightbulb, Trash2, Upload, Link, Film } from "lucide-react";
import { useAdminAcademy } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const topicOptions = [
  { value: "general", label: "כללי" },
  { value: "wedding", label: "💒 חתונה" },
  { value: "apartment", label: "🏠 דירה" },
  { value: "renovation", label: "🔨 שיפוצים" },
  { value: "savings", label: "💰 חיסכון" },
  { value: "business", label: "💼 עסקים" },
  { value: "rights", label: "⚖️ זכויות" },
  { value: "family", label: "👨‍👩‍👧‍👦 משפחה" },
];

export default function AdminAcademyManager() {
  const { content: academyContent, addContent: addAcademyContent, removeContent: removeAcademyContent } = useAdminAcademy();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"video" | "tip">("tip");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState("");
  const [icon, setIcon] = useState("💡");
  const [targetTopic, setTargetTopic] = useState("general");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("video/")) {
      toast.error("ניתן להעלות רק קבצי וידאו");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 50MB)");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("academy-videos").upload(path, file);
    if (error) {
      toast.error("שגיאה בהעלאה: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("academy-videos").getPublicUrl(path);
    setVideoUrl(urlData.publicUrl);
    toast.success("הסרטון הועלה בהצלחה!");
    setUploading(false);
  };

  const handleSave = () => {
    if (!title.trim() || (!content.trim() && !videoUrl)) return;
    addAcademyContent({
      title, type, category: category || "כללי", content,
      duration: type === "video" ? duration : "",
      icon,
    });
    // Reset
    setTitle(""); setContent(""); setCategory(""); setDuration("");
    setVideoUrl(""); setTargetTopic("general");
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div variants={item}>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-accent" />
          ניהול אקדמיה
        </h1>
        <p className="text-sm text-muted-foreground mt-1">הוסיפו סרטונים, טיפים וכרטיסי מומחה לגלריית הלמידה</p>
      </motion.div>

      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground">תוכן חדש</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">כותרת</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת התוכן..."
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">סוג</label>
              <select value={type} onChange={e => setType(e.target.value as "video" | "tip")}
                className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none">
                <option value="tip">טיפ מומחה</option>
                <option value="video">סרטון</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">קטגוריה</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="חיסכון, תקציב..."
                className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Target Topic */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">נושא יעד (הטיפ יקפוץ ללקוחות לפי נושא)</label>
          <div className="flex flex-wrap gap-2">
            {topicOptions.map(t => (
              <button key={t.value} onClick={() => setTargetTopic(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  targetTopic === t.value ? "bg-accent text-accent-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === "video" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">משך</label>
                <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="8:30"
                  className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">אייקון</label>
                <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🎬"
                  className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
              </div>
            </div>

            {/* Video Upload */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">העלאת סרטון</label>
              <div className="flex gap-3">
                <input type="file" ref={fileRef} accept="video/*" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 flex-1">
                  <Upload className="w-4 h-4" />
                  {uploading ? "מעלה..." : "העלה קובץ וידאו"}
                </Button>
                <span className="text-[10px] text-muted-foreground self-center">או</span>
                <div className="flex-1 relative">
                  <Link className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    placeholder="הדבק קישור YouTube / Vimeo..."
                    className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 pr-10 pl-3 text-sm text-foreground focus:outline-none" dir="ltr" />
                </div>
              </div>
              {videoUrl && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 text-accent text-xs">
                  <Film className="w-4 h-4" />
                  <span className="truncate flex-1" dir="ltr">{videoUrl}</span>
                  <button onClick={() => setVideoUrl("")} className="text-destructive hover:underline text-[10px]">הסר</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">תוכן / תיאור</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="תוכן הטיפ..." rows={3}
            className="w-full rounded-xl bg-secondary/50 border border-border/50 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
        </div>

        <button onClick={handleSave} disabled={!title.trim() || (!content.trim() && !videoUrl)}
          className="btn-clay-gold px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none">
          <Save className="w-4 h-4" /> שמור תוכן
        </button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">תכנים קיימים ({academyContent.length})</h2>
        {academyContent.length === 0 ? (
          <div className="glass-card-gold rounded-xl p-8 text-center">
            <p className="text-xs text-muted-foreground">עדיין לא נוסף תוכן לאקדמיה</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {academyContent.map(c => (
              <motion.div key={c.id} layout className="glass-card-gold rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.type === "video" ? <Play className="w-4 h-4 text-accent" /> : <Lightbulb className="w-4 h-4 text-accent" />}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">{c.category}</span>
                  </div>
                  <button onClick={() => removeAcademyContent(c.id)} className="text-destructive/50 hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
                {c.duration && <span className="text-[10px] text-muted-foreground/60">{c.duration}</span>}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
