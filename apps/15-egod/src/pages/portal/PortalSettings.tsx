import { useState, useEffect, useRef } from "react";
import { Settings, Save, Upload, Image as ImageIcon, Trash2, ExternalLink, Copy, Plus, LayoutList, Globe, Facebook, Instagram, Youtube, Send as TelegramIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BACKGROUND_PRESETS, PORTAL_LANGUAGES } from "@/types/portalDesign";
import { buildRabbiUrl } from "@/lib/site";
import {
  AGE_GROUPS, backgroundOptions, teachingStyleOptions, speakingStyleOptions,
  audienceOptions, locationOptions, frequencyOptions, dayOptions, hourOptions,
  paymentOptions,
} from "@/types/questionnaire";
import MultiSelect from "@/components/questionnaire/MultiSelect";
import RadioSelect from "@/components/questionnaire/RadioSelect";

type SocialLinks = { facebook?: string; instagram?: string; youtube?: string; telegram?: string };

const AUDIENCE_GENDER_OPTIONS = ["נשים", "גברים", "מעורב"];

type Profile = {
  id?: string;
  full_name: string; phone: string; email: string; city: string; neighborhood: string; street: string;
  bio: string; about_text: string;
  contact_whatsapp: string; contact_fax: string; contact_mailing_address: string;
  donation_link: string; lesson_download_url: string; website_url: string;
  rabbi_photo_url: string; logo_url: string; custom_background_url: string;
  background_preset: string; font_color: string; portal_language: string;
  years_teaching: string; gender: string;
  background: string[]; teaching_style: string[]; speaking_style: string[];
  target_audience: string[]; lesson_locations: string[]; frequency: string;
  available_days: string[]; available_hours: string[]; payment: string;
  public_token?: string;
};

type Photo = { id: string; image_url: string; caption: string | null };
type CustomSection = { id: string; title: string; content: string };

const empty: Profile = {
  full_name: "", phone: "", email: "", city: "", neighborhood: "", street: "",
  bio: "", about_text: "",
  contact_whatsapp: "", contact_fax: "", contact_mailing_address: "",
  donation_link: "", lesson_download_url: "", website_url: "",
  rabbi_photo_url: "", logo_url: "", custom_background_url: "",
  background_preset: "preset-1", font_color: "light", portal_language: "עברית",
  years_teaching: "", gender: "",
  background: [], teaching_style: [], speaking_style: [],
  target_audience: [], lesson_locations: [], frequency: "",
  available_days: [], available_hours: [], payment: "",
};

const emptySocial: SocialLinks = { facebook: "", instagram: "", youtube: "", telegram: "" };

const PortalSettings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(empty);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptySocial);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) fetchAll(); }, [user]);

  const fetchAll = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setProfile({ ...empty, ...Object.fromEntries(Object.entries(data).map(([k,v]) => [k, v ?? (empty as any)[k] ?? ""])) } as Profile);
      setCustomSections(Array.isArray(data.custom_sections) ? data.custom_sections as CustomSection[] : []);
      setAgeGroups(Array.isArray((data as any).preferred_age_groups) ? (data as any).preferred_age_groups as string[] : []);
      setSocialLinks({ ...emptySocial, ...(data.social_links && typeof data.social_links === "object" && !Array.isArray(data.social_links) ? data.social_links as SocialLinks : {}) });
      const { data: ph } = await supabase.from("portal_photos").select("*").eq("teacher_id", data.id).order("created_at", { ascending: false });
      setPhotos(ph || []);
    }
  };

  const toggleAgeGroup = (v: string) => setAgeGroups(g => g.includes(v) ? g.filter(x => x !== v) : [...g, v]);
  const toggleArr = (k: keyof Profile, v: string) => setProfile(p => {
    const current = (p[k] as unknown as string[]) || [];
    return { ...p, [k]: current.includes(v) ? current.filter(x => x !== v) : [...current, v] };
  });

  const addSection = () => setCustomSections(s => [...s, { id: crypto.randomUUID(), title: "", content: "" }]);
  const updateSection = (id: string, k: "title" | "content", v: string) =>
    setCustomSections(s => s.map(sec => sec.id === id ? { ...sec, [k]: v } : sec));
  const removeSection = (id: string) => setCustomSections(s => s.filter(sec => sec.id !== id));

  const update = (k: keyof Profile, v: string) => setProfile(p => ({ ...p, [k]: v }));
  const updateSocial = (k: keyof SocialLinks, v: string) => setSocialLinks(s => ({ ...s, [k]: v }));

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portal-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("שגיאה בהעלאה: " + error.message); return null; }
    const { data } = supabase.storage.from("portal-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileChange = (field: "rabbi_photo_url" | "logo_url" | "custom_background_url") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, field);
    if (url) {
      update(field, url);
      toast.success("הקובץ הועלה");
    }
  };

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.id) return;
    const url = await uploadFile(file, "gallery");
    if (!url) return;
    const { data, error } = await supabase.from("portal_photos").insert({ teacher_id: profile.id, image_url: url }).select().single();
    if (error) { toast.error("שגיאה"); return; }
    setPhotos(p => [data, ...p]);
    toast.success("התמונה נוספה לגלריה");
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from("portal_photos").delete().eq("id", id);
    if (error) { toast.error("שגיאה"); return; }
    setPhotos(p => p.filter(x => x.id !== id));
  };

  const updatePhotoCaption = async (id: string, caption: string) => {
    const trimmed = caption.trim();
    const { error } = await supabase.from("portal_photos").update({ caption: trimmed || null }).eq("id", id);
    if (error) { toast.error("שגיאה בשמירת הכיתוב"); return; }
    setPhotos(p => p.map(x => x.id === id ? { ...x, caption: trimmed || null } : x));
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, public_token, years_teaching, ...payload } = profile;
    const cleanedSocial = Object.fromEntries(Object.entries(socialLinks).filter(([, v]) => !!v && String(v).trim() !== ""));
    const yearsTeachingValue = years_teaching === "" || years_teaching === null ? null : Number(years_teaching);
    const { error } = await supabase.from("profiles").update({
      ...payload,
      years_teaching: Number.isFinite(yearsTeachingValue as number) ? yearsTeachingValue : null,
      preferred_age_groups: ageGroups,
      custom_sections: customSections,
      social_links: cleanedSocial,
    }).eq("user_id", user!.id);
    setSaving(false);
    if (error) { toast.error("שגיאה בשמירה"); return; }
    toast.success("ההגדרות נשמרו בהצלחה!");
  };

  const publicUrl = profile.public_token
    ? buildRabbiUrl(profile.public_token)
    : profile.id
      ? buildRabbiUrl(profile.id)
      : "";

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-secondary" />הגדרות פורטל
            </h1>
            <p className="text-sm text-muted-foreground mt-1">עיצוב הדף הציבורי שלך, פרטי קשר וגלריה</p>
          </div>
          {publicUrl && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("הקישור הועתק"); }}>
                <Copy className="w-4 h-4 ml-1" />העתק קישור
              </Button>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline"><ExternalLink className="w-4 h-4 ml-1" />צפה בדף</Button>
              </a>
            </div>
          )}
        </div>

        <Tabs defaultValue="profile" dir="rtl">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="profile">פרטי הרב</TabsTrigger>
            <TabsTrigger value="design">עיצוב</TabsTrigger>
            <TabsTrigger value="contact">פרטי קשר</TabsTrigger>
            <TabsTrigger value="gallery">גלריה</TabsTrigger>
            <TabsTrigger value="sections">מקטעים</TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">שם מלא</label>
                  <Input value={profile.full_name} onChange={(e) => update("full_name", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">טלפון</label>
                  <Input value={profile.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">מייל</label>
                  <Input value={profile.email} onChange={(e) => update("email", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">שפת פורטל</label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={profile.portal_language} onChange={(e) => update("portal_language", e.target.value)}>
                    {PORTAL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">עיר</label>
                  <Input value={profile.city} onChange={(e) => update("city", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">שכונה</label>
                  <Input value={profile.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">רחוב</label>
                  <Input value={profile.street} onChange={(e) => update("street", e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">שנות ניסיון בהוראה</label>
                  <Input type="number" min={0} value={profile.years_teaching} onChange={(e) => update("years_teaching", e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">תיאור קצר (יופיע בתפריט)</label>
                <Input value={profile.bio} onChange={(e) => update("bio", e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">אודות (טקסט מלא לדף הציבורי)</label>
                <Textarea value={profile.about_text} onChange={(e) => update("about_text", e.target.value)} rows={5} /></div>
              <RadioSelect label="מגדר הקהל" options={AUDIENCE_GENDER_OPTIONS} selected={profile.gender} onSelect={(v) => update("gender", v)} />
              <MultiSelect label="קבוצות גיל (ניתן לסמן כמה)" options={AGE_GROUPS} selected={ageGroups} onToggle={toggleAgeGroup} />
              <div className="pt-4 border-t border-border space-y-4">
                <p className="text-sm font-semibold text-foreground">העדפות התאמה (משמש את הצוות בהתאמת שיעורים ומוצג בדף הציבורי)</p>
                <MultiSelect label="רקע (ניתן לסמן כמה)" options={backgroundOptions} selected={profile.background} onToggle={(v) => toggleArr("background", v)} />
                <MultiSelect label="סגנון השיעור (ניתן לסמן כמה)" options={teachingStyleOptions} selected={profile.teaching_style} onToggle={(v) => toggleArr("teaching_style", v)} />
                <MultiSelect label="סגנון דיבור (ניתן לסמן כמה)" options={speakingStyleOptions} selected={profile.speaking_style} onToggle={(v) => toggleArr("speaking_style", v)} />
                <MultiSelect label="קהל יעד (ניתן לסמן כמה)" options={audienceOptions} selected={profile.target_audience} onToggle={(v) => toggleArr("target_audience", v)} />
                <MultiSelect label="היכן אתה מעביר שיעורים (ניתן לסמן כמה)" options={locationOptions} selected={profile.lesson_locations} onToggle={(v) => toggleArr("lesson_locations", v)} />
                <RadioSelect label="קביעות השיעור" options={frequencyOptions} selected={profile.frequency} onSelect={(v) => update("frequency", v)} />
                <MultiSelect label="ימים מועדפים (ניתן לסמן כמה)" options={dayOptions} selected={profile.available_days} onToggle={(v) => toggleArr("available_days", v)} />
                <MultiSelect label="שעות מועדפות (ניתן לסמן כמה)" options={hourOptions} selected={profile.available_hours} onToggle={(v) => toggleArr("available_hours", v)} />
                <RadioSelect label="ציפיות לגבי תשלום" options={paymentOptions} selected={profile.payment} onSelect={(v) => update("payment", v)} />
              </div>
            </div>
          </TabsContent>

          {/* DESIGN */}
          <TabsContent value="design" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
              {/* Photo + Logo */}
              <div className="grid grid-cols-2 gap-4">
                <ImageUploader label="תמונת הרב" url={profile.rabbi_photo_url} onChange={handleFileChange("rabbi_photo_url")} onClear={() => update("rabbi_photo_url", "")} />
                <ImageUploader label="לוגו" url={profile.logo_url} onChange={handleFileChange("logo_url")} onClear={() => update("logo_url", "")} />
              </div>

              {/* Background presets */}
              <div>
                <label className="text-sm font-medium mb-2 block">בחר רקע לדף הציבורי</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {BACKGROUND_PRESETS.map(bg => (
                    <button key={bg.id} type="button" onClick={() => { update("background_preset", bg.id); update("custom_background_url", ""); }}
                      className={`aspect-square rounded-lg border-2 transition-all ${profile.background_preset === bg.id && !profile.custom_background_url ? "border-secondary ring-2 ring-secondary/50" : "border-border hover:border-muted-foreground"}`}
                      style={{ background: bg.css }}
                      title={bg.label} />
                  ))}
                </div>
              </div>

              {/* Custom background */}
              <div>
                <ImageUploader label="או העלה רקע מותאם אישית" url={profile.custom_background_url} onChange={handleFileChange("custom_background_url")} onClear={() => update("custom_background_url", "")} />
              </div>

              {/* Font color */}
              <div>
                <label className="text-sm font-medium mb-2 block">צבע גופן בדף הציבורי</label>
                <div className="flex gap-2">
                  {[{ v: "light", l: "בהיר" }, { v: "dark", l: "כהה" }].map(o => (
                    <button key={o.v} type="button" onClick={() => update("font_color", o.v)}
                      className={`px-4 py-2 rounded-lg border text-sm ${profile.font_color === o.v ? "border-secondary bg-secondary/10 text-secondary" : "border-border"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CONTACT */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">וואטסאפ</label>
                  <Input value={profile.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} placeholder="972501234567" /></div>
                <div><label className="text-sm font-medium mb-1 block">פקס</label>
                  <Input value={profile.contact_fax} onChange={(e) => update("contact_fax", e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">כתובת למשלוח דואר</label>
                <Input value={profile.contact_mailing_address} onChange={(e) => update("contact_mailing_address", e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">קישור לתרומה</label>
                <Input value={profile.donation_link} onChange={(e) => update("donation_link", e.target.value)} placeholder="https://..." /></div>
              <div><label className="text-sm font-medium mb-1 block">קישור להורדת שיעורים</label>
                <Input value={profile.lesson_download_url} onChange={(e) => update("lesson_download_url", e.target.value)} placeholder="https://..." /></div>
              <div><label className="text-sm font-medium mb-1 block flex items-center gap-1.5"><Globe className="w-4 h-4" />אתר אינטרנט</label>
                <Input value={profile.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://..." dir="ltr" /></div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium mb-3">רשתות חברתיות</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" />פייסבוק</label>
                    <Input value={socialLinks.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} placeholder="https://facebook.com/..." dir="ltr" /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" />אינסטגרם</label>
                    <Input value={socialLinks.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} placeholder="https://instagram.com/..." dir="ltr" /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5" />יוטיוב</label>
                    <Input value={socialLinks.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} placeholder="https://youtube.com/..." dir="ltr" /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><TelegramIcon className="w-3.5 h-3.5" />טלגרם</label>
                    <Input value={socialLinks.telegram || ""} onChange={(e) => updateSocial("telegram", e.target.value)} placeholder="https://t.me/..." dir="ltr" /></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">גלריית תמונות</h3>
                <input type="file" accept="image/*" hidden ref={photoInput} onChange={addPhoto} />
                <Button size="sm" onClick={() => photoInput.current?.click()}>
                  <Upload className="w-4 h-4 ml-1" />הוסף תמונה
                </Button>
              </div>
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין תמונות עדיין</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map(p => (
                    <div key={p.id} className="space-y-1.5">
                      <div className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={p.image_url} alt={p.caption || ""} className="w-full h-full object-cover" />
                        <button onClick={() => deletePhoto(p.id)}
                          className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        value={p.caption ?? ""}
                        onChange={(e) => setPhotos(ph => ph.map(x => x.id === p.id ? { ...x, caption: e.target.value } : x))}
                        onBlur={(e) => updatePhotoCaption(p.id, e.target.value)}
                        placeholder="כיתוב לתמונה (אופציונלי)"
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* CUSTOM SECTIONS */}
          <TabsContent value="sections" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium flex items-center gap-2"><LayoutList className="w-4 h-4 text-secondary" />מקטעים מותאמים אישית</h3>
                  <p className="text-xs text-muted-foreground mt-1">הוסף בלוקים נוספים (למשל: שאלות נפוצות, מסלול לימוד, המלצות) שיוצגו בדף הציבורי שלך</p>
                </div>
                <Button size="sm" onClick={addSection}><Plus className="w-4 h-4 ml-1" />הוסף מקטע</Button>
              </div>
              {customSections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין מקטעים מותאמים אישית עדיין</p>
              ) : (
                <div className="space-y-3">
                  {customSections.map(sec => (
                    <div key={sec.id} className="bg-muted/30 rounded-xl border border-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input value={sec.title} onChange={(e) => updateSection(sec.id, "title", e.target.value)} placeholder="כותרת המקטע" className="flex-1" />
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(sec.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea value={sec.content} onChange={(e) => updateSection(sec.id, "content", e.target.value)} placeholder="תוכן המקטע" rows={4} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-secondary text-secondary-foreground hover:bg-gold-dark shadow-lg">
            <Save className="w-4 h-4 ml-2" />{saving ? "שומר..." : "שמור את כל ההגדרות"}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
};

const ImageUploader = ({ label, url, onChange, onClear }: {
  label: string; url: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
          {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-col gap-1">
          <input type="file" accept="image/*" hidden ref={ref} onChange={onChange} />
          <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()}>
            <Upload className="w-3.5 h-3.5 ml-1" />העלה
          </Button>
          {url && <Button type="button" size="sm" variant="ghost" onClick={onClear}>הסר</Button>}
        </div>
      </div>
    </div>
  );
};

export default PortalSettings;