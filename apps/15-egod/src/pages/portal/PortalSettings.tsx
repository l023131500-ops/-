import { useState, useEffect, useRef } from "react";
import { Settings, Save, Upload, Image as ImageIcon, Trash2, ExternalLink, Copy } from "lucide-react";
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

type Profile = {
  id?: string;
  full_name: string; phone: string; email: string; city: string; neighborhood: string;
  bio: string; about_text: string;
  contact_whatsapp: string; contact_fax: string; contact_mailing_address: string;
  donation_link: string; lesson_download_url: string;
  rabbi_photo_url: string; logo_url: string; custom_background_url: string;
  background_preset: string; font_color: string; portal_language: string;
  public_token?: string;
};

type Photo = { id: string; image_url: string; caption: string | null };

const empty: Profile = {
  full_name: "", phone: "", email: "", city: "", neighborhood: "",
  bio: "", about_text: "",
  contact_whatsapp: "", contact_fax: "", contact_mailing_address: "",
  donation_link: "", lesson_download_url: "",
  rabbi_photo_url: "", logo_url: "", custom_background_url: "",
  background_preset: "preset-1", font_color: "light", portal_language: "עברית",
};

const PortalSettings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(empty);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) fetchAll(); }, [user]);

  const fetchAll = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setProfile({ ...empty, ...Object.fromEntries(Object.entries(data).map(([k,v]) => [k, v ?? (empty as any)[k] ?? ""])) } as Profile);
      const { data: ph } = await supabase.from("portal_photos").select("*").eq("teacher_id", data.id).order("created_at", { ascending: false });
      setPhotos(ph || []);
    }
  };

  const update = (k: keyof Profile, v: string) => setProfile(p => ({ ...p, [k]: v }));

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
    if (!file || !profile.id || photoBusy) return;
    setPhotoBusy(true);
    const url = await uploadFile(file, "gallery");
    if (!url) { setPhotoBusy(false); return; }
    const { data, error } = await supabase.from("portal_photos").insert({ teacher_id: profile.id, image_url: url }).select().single();
    setPhotoBusy(false);
    if (error) { toast.error("שגיאה"); return; }
    setPhotos(p => [data, ...p]);
    toast.success("התמונה נוספה לגלריה");
  };

  const deletePhoto = async (id: string) => {
    if (photoBusy) return;
    setPhotoBusy(true);
    const { error } = await supabase.from("portal_photos").delete().eq("id", id);
    setPhotoBusy(false);
    if (error) { toast.error("שגיאה"); return; }
    setPhotos(p => p.filter(x => x.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, public_token, ...payload } = profile;
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", user!.id);
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
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile">פרטי הרב</TabsTrigger>
            <TabsTrigger value="design">עיצוב</TabsTrigger>
            <TabsTrigger value="contact">פרטי קשר</TabsTrigger>
            <TabsTrigger value="gallery">גלריה</TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="portalsettings-fullname" className="text-sm font-medium mb-1 block">שם מלא</label>
                  <Input id="portalsettings-fullname" value={profile.full_name} onChange={(e) => update("full_name", e.target.value)} /></div>
                <div><label htmlFor="portalsettings-phone" className="text-sm font-medium mb-1 block">טלפון</label>
                  <Input id="portalsettings-phone" value={profile.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                <div><label htmlFor="portalsettings-email" className="text-sm font-medium mb-1 block">מייל</label>
                  <Input id="portalsettings-email" value={profile.email} onChange={(e) => update("email", e.target.value)} /></div>
                <div><label htmlFor="portalsettings-language" className="text-sm font-medium mb-1 block">שפת פורטל</label>
                  <select id="portalsettings-language" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={profile.portal_language} onChange={(e) => update("portal_language", e.target.value)}>
                    {PORTAL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div><label htmlFor="portalsettings-city" className="text-sm font-medium mb-1 block">עיר</label>
                  <Input id="portalsettings-city" value={profile.city} onChange={(e) => update("city", e.target.value)} /></div>
                <div><label htmlFor="portalsettings-neighborhood" className="text-sm font-medium mb-1 block">שכונה</label>
                  <Input id="portalsettings-neighborhood" value={profile.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} /></div>
              </div>
              <div><label htmlFor="portalsettings-bio" className="text-sm font-medium mb-1 block">תיאור קצר (יופיע בתפריט)</label>
                <Input id="portalsettings-bio" value={profile.bio} onChange={(e) => update("bio", e.target.value)} /></div>
              <div><label htmlFor="portalsettings-about" className="text-sm font-medium mb-1 block">אודות (טקסט מלא לדף הציבורי)</label>
                <Textarea id="portalsettings-about" value={profile.about_text} onChange={(e) => update("about_text", e.target.value)} rows={5} /></div>
            </div>
          </TabsContent>

          {/* DESIGN */}
          <TabsContent value="design" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
              {/* Photo + Logo */}
              <div className="grid grid-cols-2 gap-4">
                <ImageUploader id="portalsettings-rabbi-photo" label="תמונת הרב" url={profile.rabbi_photo_url} onChange={handleFileChange("rabbi_photo_url")} onClear={() => update("rabbi_photo_url", "")} />
                <ImageUploader id="portalsettings-logo" label="לוגו" url={profile.logo_url} onChange={handleFileChange("logo_url")} onClear={() => update("logo_url", "")} />
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
                <ImageUploader id="portalsettings-custom-bg" label="או העלה רקע מותאם אישית" url={profile.custom_background_url} onChange={handleFileChange("custom_background_url")} onClear={() => update("custom_background_url", "")} />
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
                <div><label htmlFor="portalsettings-whatsapp" className="text-sm font-medium mb-1 block">וואטסאפ</label>
                  <Input id="portalsettings-whatsapp" value={profile.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} placeholder="972501234567" /></div>
                <div><label htmlFor="portalsettings-fax" className="text-sm font-medium mb-1 block">פקס</label>
                  <Input id="portalsettings-fax" value={profile.contact_fax} onChange={(e) => update("contact_fax", e.target.value)} /></div>
              </div>
              <div><label htmlFor="portalsettings-mailing-address" className="text-sm font-medium mb-1 block">כתובת למשלוח דואר</label>
                <Input id="portalsettings-mailing-address" value={profile.contact_mailing_address} onChange={(e) => update("contact_mailing_address", e.target.value)} /></div>
              <div><label htmlFor="portalsettings-donation-link" className="text-sm font-medium mb-1 block">קישור לתרומה</label>
                <Input id="portalsettings-donation-link" value={profile.donation_link} onChange={(e) => update("donation_link", e.target.value)} placeholder="https://..." /></div>
              <div><label htmlFor="portalsettings-lesson-download" className="text-sm font-medium mb-1 block">קישור להורדת שיעורים</label>
                <Input id="portalsettings-lesson-download" value={profile.lesson_download_url} onChange={(e) => update("lesson_download_url", e.target.value)} placeholder="https://..." /></div>
            </div>
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery" className="space-y-4 mt-4">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">גלריית תמונות</h3>
                <input type="file" accept="image/*" hidden ref={photoInput} onChange={addPhoto} />
                <Button size="sm" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
                  <Upload className="w-4 h-4 ml-1" />{photoBusy ? "מעלה..." : "הוסף תמונה"}
                </Button>
              </div>
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין תמונות עדיין</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map(p => (
                    <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => deletePhoto(p.id)} disabled={photoBusy}
                        className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition disabled:opacity-50" aria-label="מחיקת תמונה">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

const ImageUploader = ({ id, label, url, onChange, onClear }: {
  id: string; label: string; url: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
          {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-col gap-1">
          <input id={id} type="file" accept="image/*" hidden ref={ref} onChange={onChange} />
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