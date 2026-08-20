import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Image, Trash2, Plus, Palette, Phone, Mail, MapPin, MessageSquare, FileText, X, Sun, Moon, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BACKGROUND_PRESETS = [
  { id: "navy-gold", label: "כחול-זהב", css: "bg-gradient-to-br from-[hsl(220,40%,13%)] via-[hsl(220,35%,18%)] to-[hsl(40,60%,20%)]" },
  { id: "dark-teal", label: "כהה-טורקיז", css: "bg-gradient-to-br from-[hsl(200,30%,10%)] via-[hsl(180,25%,15%)] to-[hsl(170,30%,12%)]" },
  { id: "warm-brown", label: "חום חם", css: "bg-gradient-to-br from-[hsl(25,30%,12%)] via-[hsl(30,25%,16%)] to-[hsl(35,20%,10%)]" },
  { id: "deep-purple", label: "סגול עמוק", css: "bg-gradient-to-br from-[hsl(270,30%,12%)] via-[hsl(260,25%,18%)] to-[hsl(280,20%,10%)]" },
  { id: "forest-green", label: "ירוק יער", css: "bg-gradient-to-br from-[hsl(140,25%,10%)] via-[hsl(150,20%,15%)] to-[hsl(160,25%,12%)]" },
  { id: "midnight-blue", label: "כחול חצות", css: "bg-gradient-to-br from-[hsl(230,35%,10%)] via-[hsl(240,30%,16%)] to-[hsl(220,25%,12%)]" },
  { id: "burgundy", label: "בורדו", css: "bg-gradient-to-br from-[hsl(350,30%,12%)] via-[hsl(340,25%,16%)] to-[hsl(355,20%,10%)]" },
  { id: "charcoal", label: "פחם", css: "bg-gradient-to-br from-[hsl(0,0%,10%)] via-[hsl(0,0%,15%)] to-[hsl(0,0%,8%)]" },
  { id: "ocean-deep", label: "אוקיינוס", css: "bg-gradient-to-br from-[hsl(210,40%,12%)] via-[hsl(195,35%,16%)] to-[hsl(220,30%,10%)]" },
  { id: "royal-gold", label: "זהב מלכותי", css: "bg-gradient-to-br from-[hsl(40,40%,12%)] via-[hsl(35,35%,18%)] to-[hsl(45,30%,10%)]" },
  { id: "olive-sage", label: "זית-מרווה", css: "bg-gradient-to-br from-[hsl(80,20%,12%)] via-[hsl(90,18%,16%)] to-[hsl(100,15%,10%)]" },
  { id: "plum", label: "שזיף", css: "bg-gradient-to-br from-[hsl(300,25%,12%)] via-[hsl(310,20%,16%)] to-[hsl(290,22%,10%)]" },
  { id: "slate-steel", label: "פלדה", css: "bg-gradient-to-br from-[hsl(210,15%,14%)] via-[hsl(200,12%,20%)] to-[hsl(220,10%,12%)]" },
  { id: "copper", label: "נחושת", css: "bg-gradient-to-br from-[hsl(20,35%,14%)] via-[hsl(15,30%,18%)] to-[hsl(25,25%,10%)]" },
  { id: "emerald-night", label: "אמרלד לילה", css: "bg-gradient-to-br from-[hsl(160,30%,10%)] via-[hsl(170,25%,14%)] to-[hsl(150,20%,8%)]" },
  { id: "indigo-dark", label: "אינדיגו", css: "bg-gradient-to-br from-[hsl(250,30%,12%)] via-[hsl(240,25%,18%)] to-[hsl(260,20%,10%)]" },
  // Light backgrounds
  { id: "cream-warm", label: "קרם חם", css: "bg-gradient-to-br from-[hsl(40,40%,92%)] via-[hsl(35,35%,88%)] to-[hsl(45,30%,85%)]" },
  { id: "sky-light", label: "שמיים בהיר", css: "bg-gradient-to-br from-[hsl(200,40%,92%)] via-[hsl(210,35%,88%)] to-[hsl(195,30%,85%)]" },
  { id: "sage-light", label: "מרווה בהיר", css: "bg-gradient-to-br from-[hsl(140,25%,90%)] via-[hsl(150,20%,87%)] to-[hsl(130,22%,84%)]" },
  { id: "lavender-light", label: "לבנדר", css: "bg-gradient-to-br from-[hsl(260,30%,92%)] via-[hsl(270,25%,88%)] to-[hsl(250,28%,85%)]" },
  { id: "rose-light", label: "ורוד עדין", css: "bg-gradient-to-br from-[hsl(350,30%,92%)] via-[hsl(340,25%,89%)] to-[hsl(355,28%,86%)]" },
  { id: "pearl-white", label: "לבן פנינה", css: "bg-gradient-to-br from-[hsl(0,0%,97%)] via-[hsl(40,15%,94%)] to-[hsl(0,0%,91%)]" },
  { id: "sand-beige", label: "חול בז'", css: "bg-gradient-to-br from-[hsl(35,30%,88%)] via-[hsl(30,25%,84%)] to-[hsl(40,20%,80%)]" },
  { id: "mint-fresh", label: "מנטה רענן", css: "bg-gradient-to-br from-[hsl(165,30%,90%)] via-[hsl(170,25%,86%)] to-[hsl(160,28%,83%)]" },
];

interface PortalSettingsTabProps {
  portalId: string;
  portalType: "rabbi" | "org";
  portalData: any;
  onUpdate: (data: any) => void;
}

const PortalSettingsTab = ({ portalId, portalType, portalData, onUpdate }: PortalSettingsTabProps) => {
  const [aboutText, setAboutText] = useState(portalData.about_text || "");
  const [selectedPreset, setSelectedPreset] = useState(portalData.background_preset || "");
  const [fontColor, setFontColor] = useState(portalData.font_color || "light");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const rabbiPhotoRef = useRef<HTMLInputElement>(null);

  // Contact info
  const [contactPhone, setContactPhone] = useState(portalData.contact_phone || "");
  const [contactEmail, setContactEmail] = useState(portalData.contact_email || "");
  const [contactAddress, setContactAddress] = useState(portalData.contact_address || "");
  const [contactWhatsapp, setContactWhatsapp] = useState(portalData.contact_whatsapp || "");
  const [contactFax, setContactFax] = useState(portalData.contact_fax || "");
  const [contactMailingAddress, setContactMailingAddress] = useState(portalData.contact_mailing_address || "");

  // Rabbi-specific: donation + download
  const [donationLink, setDonationLink] = useState(portalData.donation_link || "");
  const [lessonDownloadUrl, setLessonDownloadUrl] = useState(portalData.lesson_download_url || "");

  // Custom sections
  const [customSections, setCustomSections] = useState<{ title: string; content: string }[]>(
    Array.isArray(portalData.custom_sections) ? portalData.custom_sections : []
  );

  // Load photos on mount
  useState(() => {
    (async () => {
      const { data } = await supabase
        .from("portal_photos")
        .select("*")
        .eq("portal_type", portalType)
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false });
      setPhotos(data || []);
      setLoadingPhotos(false);
    })();
  });

  const tableName = portalType === "rabbi" ? "rabbi_portals" : "org_portals";

  const saveAbout = async () => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.from(tableName).update({ about_text: aboutText }).eq("id", portalId);
    setSaving(false);
    if (!error) {
      toast.success("טקסט אודות נשמר!");
      onUpdate({ ...portalData, about_text: aboutText });
    } else toast.error("שגיאה בשמירה");
  };

  const saveContactInfo = async () => {
    if (saving) return;
    setSaving(true);
    const updates = {
      contact_phone: contactPhone,
      contact_email: contactEmail,
      contact_address: contactAddress,
      contact_whatsapp: contactWhatsapp,
      contact_fax: contactFax,
      contact_mailing_address: contactMailingAddress,
    };
    const { error } = await supabase.from(tableName).update(updates).eq("id", portalId);
    setSaving(false);
    if (!error) {
      toast.success("פרטי קשר נשמרו!");
      onUpdate({ ...portalData, ...updates });
    } else toast.error("שגיאה בשמירה");
  };

  const saveCustomSections = async () => {
    if (saving) return;
    setSaving(true);
    const filtered = customSections.filter(s => s.title.trim() || s.content.trim());
    const { error } = await supabase.from(tableName).update({ custom_sections: filtered }).eq("id", portalId);
    setSaving(false);
    if (!error) {
      toast.success("קטגוריות נשמרו!");
      onUpdate({ ...portalData, custom_sections: filtered });
    } else toast.error("שגיאה בשמירה");
  };

  const addSection = () => setCustomSections(prev => [...prev, { title: "", content: "" }]);
  const removeSection = (idx: number) => setCustomSections(prev => prev.filter((_, i) => i !== idx));
  const updateSection = (idx: number, field: "title" | "content", val: string) => {
    setCustomSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const selectPreset = async (presetId: string) => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.from(tableName).update({ background_preset: presetId, custom_background_url: "" }).eq("id", portalId);
    setSaving(false);
    if (!error) {
      setSelectedPreset(presetId);
      toast.success("רקע נבחר!");
      onUpdate({ ...portalData, background_preset: presetId, custom_background_url: "" });
    }
  };

  const saveFontColor = async (color: string) => {
    if (saving) return;
    setSaving(true);
    setFontColor(color);
    const { error } = await supabase.from(tableName).update({ font_color: color }).eq("id", portalId);
    setSaving(false);
    if (!error) {
      toast.success(color === "light" ? "גופן בהיר נבחר" : "גופן כהה נבחר");
      onUpdate({ ...portalData, font_color: color });
    }
  };

  const saveDonationSettings = async () => {
    if (saving) return;
    setSaving(true);
    const updates: any = { donation_link: donationLink };
    if (portalType === "rabbi") updates.lesson_download_url = lessonDownloadUrl;
    const { error } = await supabase.from(tableName).update(updates).eq("id", portalId);
    setSaving(false);
    if (!error) {
      toast.success("קישורים נשמרו!");
      onUpdate({ ...portalData, ...updates });
    } else toast.error("שגיאה בשמירה");
  };

  const uploadCustomBg = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `backgrounds/${portalType}-${portalId}.${ext}`;
      await supabase.storage.from("portal-assets").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("portal-assets").getPublicUrl(path);
      await supabase.from(tableName).update({ custom_background_url: urlData.publicUrl, background_preset: "" }).eq("id", portalId);
      setSelectedPreset("");
      toast.success("רקע מותאם הועלה!");
      onUpdate({ ...portalData, custom_background_url: urlData.publicUrl, background_preset: "" });
    } catch { toast.error("שגיאה בהעלאה"); }
    setUploading(false);
  };

  const uploadRabbiPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `rabbi-photos/${portalId}.${ext}`;
      await supabase.storage.from("portal-assets").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("portal-assets").getPublicUrl(path);
      await supabase.from("rabbi_portals").update({ rabbi_photo_url: urlData.publicUrl }).eq("id", portalId);
      toast.success("תמונת הרב הועלתה!");
      onUpdate({ ...portalData, rabbi_photo_url: urlData.publicUrl });
    } catch { toast.error("שגיאה בהעלאה"); }
    setUploading(false);
  };

  const uploadActivityPhoto = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `activity/${portalType}-${portalId}-${Date.now()}.${ext}`;
      await supabase.storage.from("portal-assets").upload(path, file);
      const { data: urlData } = supabase.storage.from("portal-assets").getPublicUrl(path);
      const { data, error } = await supabase.from("portal_photos").insert({
        portal_type: portalType, portal_id: portalId, image_url: urlData.publicUrl, caption: newCaption,
      }).select().single();
      if (!error && data) {
        setPhotos(prev => [data, ...prev]);
        setNewCaption("");
        toast.success("תמונה נוספה!");
      }
    } catch { toast.error("שגיאה בהעלאה"); }
    setUploading(false);
  };

  const deletePhoto = async (photoId: string) => {
    const { error } = await supabase.from("portal_photos").delete().eq("id", photoId);
    if (!error) {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success("תמונה נמחקה");
    }
  };

  return (
    <div className="space-y-8">
      {/* Rabbi Photo (only for rabbis) */}
      {portalType === "rabbi" && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-gold" /> תמונת הרב
          </h3>
          <input ref={rabbiPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadRabbiPhoto(e.target.files[0]); }} />
          <div className="flex items-center gap-4">
            {portalData.rabbi_photo_url ? (
              <img src={portalData.rabbi_photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-gold/20" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <Button variant="outline" onClick={() => rabbiPhotoRef.current?.click()} disabled={uploading} className="gap-2 border-gold/30 text-gold hover:bg-gold/10 font-body">
              <Upload className="w-4 h-4" /> {portalData.rabbi_photo_url ? "החלף תמונה" : "העלה תמונה"}
            </Button>
          </div>
        </div>
      )}

      {/* Background Selection */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-teal" /> רקע לדף הציבורי
        </h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {BACKGROUND_PRESETS.map(preset => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectPreset(preset.id)}
              disabled={saving}
              className={`h-20 rounded-xl ${preset.css} border-2 transition-all flex items-center justify-center ${
                selectedPreset === preset.id ? "border-gold ring-2 ring-gold/30" : "border-border/50 hover:border-gold/30"
              }`}
            >
              <span className="font-body text-xs text-white/80 font-bold drop-shadow">{preset.label}</span>
            </motion.button>
          ))}
        </div>
        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadCustomBg(e.target.files[0]); }} />
        <Button variant="outline" onClick={() => bgInputRef.current?.click()} disabled={uploading} className="gap-2 font-body border-border">
          <Upload className="w-4 h-4" /> העלאת רקע מותאם אישית
        </Button>
        {portalData.custom_background_url && (
          <p className="font-body text-xs text-muted-foreground mt-2">✓ רקע מותאם אישית מוגדר</p>
        )}
      </div>

      {/* Font Color Picker */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-gold" /> צבע גופן בדף הציבורי
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-3">בחרו צבע גופן שיתאים לרקע שנבחר</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => saveFontColor("light")}
            disabled={saving}
            className={`flex-1 py-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-body font-bold ${
              fontColor === "light" ? "border-gold ring-2 ring-gold/30 bg-gray-900 text-white" : "border-border bg-gray-800 text-white/70 hover:border-gold/30"
            }`}>
            <Sun className="w-4 h-4" /> בהיר (לרקע כהה)
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => saveFontColor("dark")}
            disabled={saving}
            className={`flex-1 py-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-body font-bold ${
              fontColor === "dark" ? "border-gold ring-2 ring-gold/30 bg-white text-gray-900" : "border-border bg-gray-100 text-gray-600 hover:border-gold/30"
            }`}>
            <Moon className="w-4 h-4" /> כהה (לרקע בהיר)
          </motion.button>
        </div>
      </div>

      {/* Donation & Download Links (Rabbi only) */}
      {portalType === "rabbi" && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-magenta" /> קישורים מיוחדים
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="portal-settings-donation-link" className="font-body text-xs font-medium text-muted-foreground mb-1 block">קישור לתרומה</label>
              <Input id="portal-settings-donation-link" value={donationLink} onChange={e => setDonationLink(e.target.value)} placeholder="https://donate.example.com/..." className="border-gold/20 focus:border-gold/50" />
            </div>
            <div>
              <label htmlFor="portal-settings-lesson-download-url" className="font-body text-xs font-medium text-muted-foreground mb-1 block">קישור להורדת שיעור</label>
              <Input id="portal-settings-lesson-download-url" value={lessonDownloadUrl} onChange={e => setLessonDownloadUrl(e.target.value)} placeholder="https://drive.google.com/..." className="border-gold/20 focus:border-gold/50" />
            </div>
          </div>
          <Button onClick={saveDonationSettings} disabled={saving} className="mt-4 bg-gradient-teal text-primary-foreground font-body font-bold gap-2">
            שמור קישורים
          </Button>
        </div>
      )}

      {/* About Text */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4">אודות</h3>
        <Textarea
          value={aboutText}
          onChange={e => setAboutText(e.target.value)}
          placeholder={portalType === "rabbi" ? "ספר על עצמך ועל השיעורים שלך..." : "ספר על הארגון ופעילותו..."}
          rows={4}
          className="border-gold/20 focus:border-gold/50 mb-3"
        />
        <Button onClick={saveAbout} disabled={saving} className="bg-gradient-teal text-primary-foreground font-body font-bold gap-2">
          שמור אודות
        </Button>
      </div>

      {/* Contact Info */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-teal" /> פרטי קשר (יוצגו בדף הציבורי)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="portal-settings-contact-phone" className="font-body text-xs font-medium text-muted-foreground mb-1 block">טלפון</label>
            <Input id="portal-settings-contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="03-1234567" className="border-gold/20 focus:border-gold/50" />
          </div>
          <div>
            <label htmlFor="portal-settings-contact-whatsapp" className="font-body text-xs font-medium text-muted-foreground mb-1 block">וואטסאפ</label>
            <Input id="portal-settings-contact-whatsapp" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="0501234567" className="border-gold/20 focus:border-gold/50" />
          </div>
          <div>
            <label htmlFor="portal-settings-contact-email" className="font-body text-xs font-medium text-muted-foreground mb-1 block">אימייל</label>
            <Input id="portal-settings-contact-email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="info@org.com" className="border-gold/20 focus:border-gold/50" />
          </div>
          <div>
            <label htmlFor="portal-settings-contact-fax" className="font-body text-xs font-medium text-muted-foreground mb-1 block">פקס</label>
            <Input id="portal-settings-contact-fax" value={contactFax} onChange={e => setContactFax(e.target.value)} placeholder="03-1234568" className="border-gold/20 focus:border-gold/50" />
          </div>
          <div className="col-span-2">
            <label htmlFor="portal-settings-contact-address" className="font-body text-xs font-medium text-muted-foreground mb-1 block">כתובת</label>
            <Input id="portal-settings-contact-address" value={contactAddress} onChange={e => setContactAddress(e.target.value)} placeholder="רחוב, עיר" className="border-gold/20 focus:border-gold/50" />
          </div>
          <div className="col-span-2">
            <label htmlFor="portal-settings-contact-mailing-address" className="font-body text-xs font-medium text-muted-foreground mb-1 block">כתובת מען (דואר)</label>
            <Input id="portal-settings-contact-mailing-address" value={contactMailingAddress} onChange={e => setContactMailingAddress(e.target.value)} placeholder="ת.ד. ..." className="border-gold/20 focus:border-gold/50" />
          </div>
        </div>
        <Button onClick={saveContactInfo} disabled={saving} className="mt-4 bg-gradient-teal text-primary-foreground font-body font-bold gap-2">
          שמור פרטי קשר
        </Button>
      </div>

      {/* Custom Sections */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gold" /> קטגוריות תצוגה מותאמות
        </h3>
        <p className="font-body text-xs text-muted-foreground mb-4">הוסיפו קטגוריות מידע נוספות שיוצגו בדף הציבורי (למשל: שעות פעילות, מידע על הארגון, הנחיות וכו')</p>
        <div className="space-y-4">
          {customSections.map((section, idx) => (
            <div key={idx} className="bg-muted/30 rounded-xl p-4 border border-border/50 relative">
              <button onClick={() => removeSection(idx)} className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive" aria-label="הסרת קטגוריה">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="space-y-2">
                <Input
                  value={section.title}
                  onChange={e => updateSection(idx, "title", e.target.value)}
                  placeholder="כותרת הקטגוריה..."
                  className="border-gold/20 focus:border-gold/50 font-display font-bold"
                />
                <Textarea
                  value={section.content}
                  onChange={e => updateSection(idx, "content", e.target.value)}
                  placeholder="תוכן..."
                  rows={3}
                  className="border-gold/20 focus:border-gold/50"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={addSection} className="gap-2 border-gold/30 text-gold hover:bg-gold/10 font-body">
            <Plus className="w-4 h-4" /> הוסף קטגוריה
          </Button>
          {customSections.length > 0 && (
            <Button onClick={saveCustomSections} disabled={saving} className="bg-gradient-gold text-navy font-body font-bold gap-2">
              שמור קטגוריות
            </Button>
          )}
        </div>
      </div>

      {/* Activity Photos */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-gold" /> תמונות פעילות
        </h3>
        <div className="flex gap-3 mb-4">
          <Input
            value={newCaption}
            onChange={e => setNewCaption(e.target.value)}
            placeholder="כיתוב לתמונה..."
            className="flex-1 border-gold/20 focus:border-gold/50"
          />
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadActivityPhoto(e.target.files[0]); }} />
          <Button onClick={() => photoInputRef.current?.click()} disabled={uploading} className="bg-gradient-gold text-navy font-body font-bold gap-2">
            <Plus className="w-4 h-4" /> הוסף תמונה
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border">
              <img src={photo.image_url} alt={photo.caption || ""} className="w-full h-32 object-cover" />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-navy/80 px-2 py-1">
                  <p className="font-body text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {photos.length === 0 && !loadingPhotos && (
            <p className="col-span-3 text-center font-body text-sm text-muted-foreground py-8">טרם הועלו תמונות</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalSettingsTab;
