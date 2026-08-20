import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Upload, ArrowLeft, Sparkles, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import agudLogo from "@/assets/agud-logo.webp";

const teal = "hsl(180 45% 30%)";

export default function StudyDayUpload() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [form, setForm] = useState({
    synagogue_name: "",
    city: "",
    neighborhood: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    contact_whatsapp: "",
    contact_address: "",
    about_text: "",
    logo_url: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `synagogue-portal/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("lesson-logos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("lesson-logos").getPublicUrl(path);
      set("logo_url", data.publicUrl);
      toast.success("הלוגו הועלה");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהעלאת לוגו");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.synagogue_name.trim()) { toast.error("שם בית הכנסת הוא שדה חובה"); return; }
    if (!form.city.trim()) { toast.error("עיר היא שדה חובה"); return; }
    if (!form.contact_phone.trim()) { toast.error("טלפון לקשר הוא שדה חובה"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("synagogue_portals")
        .insert({
          synagogue_name: form.synagogue_name.trim(),
          city: form.city.trim(),
          neighborhood: form.neighborhood.trim(),
          contact_name: form.contact_name.trim(),
          contact_phone: form.contact_phone.trim(),
          contact_email: form.contact_email.trim(),
          contact_whatsapp: form.contact_whatsapp.trim(),
          contact_address: form.contact_address.trim(),
          about_text: form.about_text.trim(),
          logo_url: form.logo_url,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("הפורטל לבית הכנסת נוצר בהצלחה!");
      navigate(`/shul/${data.access_token}`);
    } catch (e: any) {
      console.error(e);
      toast.error("שגיאה ביצירת הפורטל");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#fdf8f0] font-assistant"
      dir="rtl"
      style={{
        ['--background' as string]: '0 0% 100%',
        ['--foreground' as string]: '225 30% 15%',
        ['--muted-foreground' as string]: '225 15% 35%',
        ['--border' as string]: '225 15% 80%',
        ['--input' as string]: '225 15% 80%',
        ['--card' as string]: '0 0% 100%',
        ['--card-foreground' as string]: '225 30% 15%',
        ['--popover' as string]: '0 0% 100%',
        ['--popover-foreground' as string]: '225 30% 15%',
        color: 'hsl(225 30% 15%)',
      } as React.CSSProperties}
    >
      <header className="bg-white/70 backdrop-blur border-b" style={{ borderColor: 'hsl(180 45% 30% / 0.15)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: teal }}>
            <ArrowLeft className="w-4 h-4" /> חזרה לאיגוד השיעורים
          </a>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <img src={agudLogo} alt="" className="h-10 w-auto" />
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(180_45%_45%)] to-[hsl(180_45%_25%)] text-white shadow-lg mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight" style={{ color: teal }}>
            יצירת פורטל בית כנסת
          </h1>
          <p className="text-base text-foreground/70 mt-2 max-w-xl mx-auto">
            צרו את הפורטל של בית הכנסת שלכם וקבלו קישור פרטי לניהול שיעורים + קישור הפצה למתפללים
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[hsl(40_80%_92%)] text-[hsl(40_80%_30%)] text-xs font-bold">
            <Sparkles className="w-3 h-3" /> חינם לחלוטין • ללא הרשמה
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border shadow-sm p-6 md:p-8 space-y-5"
          style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-foreground/15 flex items-center justify-center overflow-hidden bg-foreground/5">
              {form.logo_url ? (
                <img src={form.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-foreground/30" />
              )}
            </div>
            <div className="flex-1">
              <Label className="text-sm font-bold">לוגו בית הכנסת (אופציונלי)</Label>
              <div className="mt-2">
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => document.getElementById("logo-input")?.click()}
                  className="gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoUploading ? "מעלה..." : "העלאת לוגו"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold">שם בית הכנסת <span className="text-destructive">*</span></Label>
              <Input
                value={form.synagogue_name}
                onChange={(e) => set("synagogue_name", e.target.value)}
                placeholder="לדוגמה: בית כנסת היכל יעקב"
                className="h-11 border-foreground/15"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">עיר <span className="text-destructive">*</span></Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-11 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">שכונה</Label>
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} className="h-11 border-foreground/15" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />כתובת מלאה</Label>
              <Input value={form.contact_address} onChange={(e) => set("contact_address", e.target.value)} placeholder="רחוב + מספר" className="h-11 border-foreground/15" />
            </div>
          </div>

          <div className="border-t pt-5" style={{ borderColor: 'hsl(180 45% 30% / 0.15)' }}>
            <div className="text-xs font-bold text-foreground/60 mb-3">פרטי הגבאי / איש קשר</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">שם איש קשר</Label>
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="h-11 border-foreground/15" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />טלפון <span className="text-destructive">*</span></Label>
                <Input dir="ltr" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="h-11 border-foreground/15" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />אימייל</Label>
                <Input dir="ltr" type="email" inputMode="email" autoComplete="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} className="h-11 border-foreground/15" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">וואטסאפ</Label>
                <Input dir="ltr" value={form.contact_whatsapp} onChange={(e) => set("contact_whatsapp", e.target.value)} className="h-11 border-foreground/15" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">משהו על בית הכנסת (אופציונלי)</Label>
            <Textarea
              value={form.about_text}
              onChange={(e) => set("about_text", e.target.value)}
              rows={3}
              placeholder="היסטוריה, מנהגים, שיעורים מיוחדים..."
              className="border-foreground/15 resize-none"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={submitting}
            size="lg"
            className="w-full text-white font-bold gap-2 h-12 text-base"
            style={{ backgroundColor: teal }}
          >
            <ExternalLink className="w-4 h-4" />
            {submitting ? "יוצר פורטל..." : "צור את הפורטל שלי"}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            לאחר היצירה תועברו לדף הניהול הפרטי ותקבלו 2 קישורים: אחד להפצה למתפללים ואחד להזמין בתי כנסת נוספים.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
