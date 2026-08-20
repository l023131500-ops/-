import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Camera, Check, Clock, Copy, Image as ImageIcon, KeyRound, Megaphone, Plus, RefreshCw, Save, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { deleteStorageFile, uploadImage } from '@/lib/supabaseStorage';
import { getPublicOrigin } from '@/lib/utils';

type ManagerMode = 'admin' | 'gabai';
type PrayerDay = 'weekday' | 'shabbat' | 'holiday';

type EditableSynagogue = {
  name: string;
  neighborhood: string;
  nusach: string;
  rabbi: string;
  address: string;
  donation_link: string;
  logo_url: string;
  background_preset: number;
};

type EditableGabai = { clientId: string; name: string; phone: string };
type EditablePrayer = { clientId: string; name: string; time: string; day: PrayerDay; no_minyan: boolean };
type EditableLesson = { clientId: string; subject: string; teacher: string; day: string; time: string; audience: string; location: string };
type EditableAnnouncement = { clientId: string; content: string; image_url: string | null; imageFile: File | null; previewUrl: string | null; is_active: boolean };
type EditableAccess = { id?: string; username: string; password: string; display_name: string; is_active: boolean };

const makeId = () => Math.random().toString(36).slice(2, 10);

const createDemoGabbaim = (): EditableGabai[] => [{ clientId: makeId(), name: 'גבאי ראשי לדוגמה', phone: '050-0000000' }];
const createDemoPrayers = (): EditablePrayer[] => [
  { clientId: makeId(), name: 'שחרית', time: '06:15', day: 'weekday', no_minyan: false },
  { clientId: makeId(), name: 'מנחה', time: '17:30', day: 'weekday', no_minyan: false },
  { clientId: makeId(), name: 'ערבית', time: '19:45', day: 'weekday', no_minyan: false },
  { clientId: makeId(), name: 'שחרית שבת', time: '08:00', day: 'shabbat', no_minyan: false },
];
const createDemoLessons = (): EditableLesson[] => [{ clientId: makeId(), subject: 'הלכה יומית', teacher: 'הרב לדוגמה', day: 'ראשון', time: '20:00', audience: 'כללי', location: 'בית הכנסת' }];
const createDemoAnnouncements = (name?: string): EditableAnnouncement[] => [{ clientId: makeId(), content: `מודעה לדוגמה עבור ${name || 'בית הכנסת'} — אפשר לערוך או למחוק.`, image_url: null, imageFile: null, previewUrl: null, is_active: true }];

const dayOptions: Array<{ value: PrayerDay; label: string }> = [
  { value: 'weekday', label: 'חול' },
  { value: 'shabbat', label: 'שבת' },
  { value: 'holiday', label: 'חג' },
];

interface SynagogueDetailsManagerProps {
  synagogueId: string;
  mode?: ManagerMode;
  synagogueName?: string;
  onSaved?: () => void;
}

const SynagogueDetailsManager = ({ synagogueId, mode = 'admin', synagogueName, onSaved }: SynagogueDetailsManagerProps) => {
  const [synagogue, setSynagogue] = useState<EditableSynagogue | null>(null);
  const [gabbaim, setGabbaim] = useState<EditableGabai[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<EditablePrayer[]>([]);
  const [lessons, setLessons] = useState<EditableLesson[]>([]);
  const [announcements, setAnnouncements] = useState<EditableAnnouncement[]>([]);
  const [access, setAccess] = useState<EditableAccess>({ username: '', password: '', display_name: '', is_active: true });
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
  const [originalAnnouncementUrls, setOriginalAnnouncementUrls] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const portalLink = useMemo(() => access.username.trim() ? `${getPublicOrigin()}/gabai?username=${encodeURIComponent(access.username.trim())}` : '', [access.username]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [synRes, gabRes, prayerRes, lessonRes, annRes, accountRes] = await Promise.all([
      supabase.from('synagogues').select('*').eq('id', synagogueId).maybeSingle(),
      supabase.from('synagogue_gabbaim').select('*').eq('synagogue_id', synagogueId).order('created_at'),
      supabase.from('synagogue_prayer_times').select('*').eq('synagogue_id', synagogueId).order('created_at'),
      supabase.from('synagogue_lessons').select('*').eq('synagogue_id', synagogueId).order('created_at'),
      supabase.from('synagogue_announcements').select('*').eq('synagogue_id', synagogueId).order('created_at'),
      supabase.from('gabai_accounts').select('*').eq('synagogue_id', synagogueId).eq('is_admin', false).order('created_at'),
    ]);

    const syn = synRes.data;
    if (syn) {
      setSynagogue({
        name: syn.name,
        neighborhood: syn.neighborhood,
        nusach: syn.nusach,
        rabbi: syn.rabbi || '',
        address: syn.address,
        donation_link: syn.donation_link || '',
        logo_url: syn.logo_url || '',
        background_preset: syn.background_preset || 1,
      });
      setOriginalLogoUrl(syn.logo_url || null);
      setLogoPreview(syn.logo_url || null);
    }

    const loadedGabbaim = (gabRes.data || []).map((item) => ({ clientId: makeId(), name: item.name, phone: item.phone }));
    setGabbaim(loadedGabbaim.length ? loadedGabbaim : createDemoGabbaim());

    const loadedPrayers = (prayerRes.data || []).map((item) => ({ clientId: makeId(), name: item.name, time: item.time, day: (item.day as PrayerDay) || 'weekday', no_minyan: item.no_minyan || false }));
    setPrayerTimes(loadedPrayers.length ? loadedPrayers : createDemoPrayers());

    const loadedLessons = (lessonRes.data || []).map((item) => ({ clientId: makeId(), subject: item.subject, teacher: item.teacher, day: item.day, time: item.time, audience: item.audience || '', location: item.location || '' }));
    setLessons(loadedLessons.length ? loadedLessons : createDemoLessons());

    const loadedAnnouncements = (annRes.data || []).map((item) => ({ clientId: makeId(), content: item.content, image_url: item.image_url || null, imageFile: null, previewUrl: item.image_url || null, is_active: item.is_active ?? true }));
    setAnnouncements(loadedAnnouncements.length ? loadedAnnouncements : createDemoAnnouncements(synagogueName || syn?.name));
    setOriginalAnnouncementUrls((annRes.data || []).map((item) => item.image_url).filter(Boolean) as string[]);

    const account = (accountRes.data || [])[0];
    setAccess({
      id: account?.id,
      username: account?.username || `gabai_${synagogueId.replace(/-/g, '').slice(-4)}`,
      password: account?.password_hash || '',
      display_name: account?.display_name || `גבאי ${syn?.name || synagogueName || ''}`.trim(),
      is_active: account?.is_active ?? true,
    });

    setLogoFile(null);
    setSaved(false);
    setLoading(false);
  }, [synagogueId, synagogueName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!synagogue) return;
    setSaving(true);
    setSaveError(false);
    let hasError = false;
    let nextLogoUrl = synagogue.logo_url || null;

    if (logoFile) {
      const uploadedLogo = await uploadImage(logoFile, 'logos');
      if (uploadedLogo) nextLogoUrl = uploadedLogo;
    }

    const { error: synagogueError } = await supabase.from('synagogues').update({
      name: synagogue.name.trim(),
      neighborhood: synagogue.neighborhood.trim(),
      nusach: synagogue.nusach.trim(),
      rabbi: synagogue.rabbi.trim() || null,
      address: synagogue.address.trim(),
      donation_link: synagogue.donation_link.trim() || null,
      logo_url: nextLogoUrl,
      background_preset: synagogue.background_preset || 1,
    }).eq('id', synagogueId);
    if (synagogueError) hasError = true;

    const cleanGabbaim = gabbaim.map((item) => ({ name: item.name.trim(), phone: item.phone.trim() })).filter((item) => item.name && item.phone);
    const cleanPrayers = prayerTimes.map((item) => ({ name: item.name.trim(), time: item.time.trim(), day: item.day, no_minyan: item.no_minyan })).filter((item) => item.name && (item.time || item.no_minyan));
    const cleanLessons = lessons.map((item) => ({ subject: item.subject.trim(), teacher: item.teacher.trim(), day: item.day.trim(), time: item.time.trim(), audience: item.audience.trim() || null, location: item.location.trim() || null })).filter((item) => item.subject && item.teacher && item.day && item.time);
    const cleanAnnouncements = (await Promise.all(announcements.map(async (item) => {
      if (!item.content.trim() && !item.image_url && !item.imageFile) return null;
      let imageUrl = item.image_url;
      if (item.imageFile) {
        const uploadedImage = await uploadImage(item.imageFile, 'announcements');
        imageUrl = uploadedImage || imageUrl;
      }
      return { content: item.content.trim() || 'מודעה חדשה', image_url: imageUrl || null, is_active: item.is_active };
    }))).filter(Boolean) as Array<{ content: string; image_url: string | null; is_active: boolean }>;

    const deleteResults = await Promise.all([
      supabase.from('synagogue_gabbaim').delete().eq('synagogue_id', synagogueId),
      supabase.from('synagogue_prayer_times').delete().eq('synagogue_id', synagogueId),
      supabase.from('synagogue_lessons').delete().eq('synagogue_id', synagogueId),
      supabase.from('synagogue_announcements').delete().eq('synagogue_id', synagogueId),
    ]);
    if (deleteResults.some((r) => r.error)) hasError = true;

    const insertResults = await Promise.all([
      cleanGabbaim.length ? supabase.from('synagogue_gabbaim').insert(cleanGabbaim.map((item) => ({ ...item, synagogue_id: synagogueId }))) : Promise.resolve(null),
      cleanPrayers.length ? supabase.from('synagogue_prayer_times').insert(cleanPrayers.map((item) => ({ ...item, synagogue_id: synagogueId }))) : Promise.resolve(null),
      cleanLessons.length ? supabase.from('synagogue_lessons').insert(cleanLessons.map((item) => ({ ...item, synagogue_id: synagogueId }))) : Promise.resolve(null),
      cleanAnnouncements.length ? supabase.from('synagogue_announcements').insert(cleanAnnouncements.map((item) => ({ ...item, synagogue_id: synagogueId }))) : Promise.resolve(null),
    ]);
    if (insertResults.some((r) => r?.error)) hasError = true;

    if (mode === 'admin') {
      const payload = {
        username: access.username.trim(),
        display_name: access.display_name.trim() || `גבאי ${synagogue.name.trim()}`,
        password_hash: access.password.trim(),
        synagogue_id: synagogueId,
        is_active: access.is_active,
        is_admin: false,
      };
      if (access.id) {
        const { error } = await supabase.from('gabai_accounts').update(payload).eq('id', access.id);
        if (error) hasError = true;
      } else if (payload.username && payload.password_hash) {
        const { error } = await supabase.from('gabai_accounts').insert(payload);
        if (error) hasError = true;
      }
    }

    const keptAnnouncementUrls = new Set(cleanAnnouncements.map((item) => item.image_url).filter(Boolean) as string[]);
    const removedAnnouncementUrls = originalAnnouncementUrls.filter((url) => !keptAnnouncementUrls.has(url));
    await Promise.all([
      ...removedAnnouncementUrls.map((url) => deleteStorageFile(url)),
      ...(originalLogoUrl && nextLogoUrl && originalLogoUrl !== nextLogoUrl ? [deleteStorageFile(originalLogoUrl)] : []),
    ]);

    if (hasError) {
      setSaveError(true);
    } else {
      setSaved(true);
    }
    await fetchData();
    if (!hasError) onSaved?.();
    setSaving(false);
  };

  if (loading || !synagogue) {
    return <div className="rounded-2xl border border-border/40 bg-card p-6 text-center text-sm font-semibold text-muted-foreground">טוען נתוני בית כנסת...</div>;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border/40 bg-card p-6 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-display font-black text-foreground">{mode === 'admin' ? `עריכה מלאה — ${synagogue.name}` : `עדכון פרטי ${synagogueName || synagogue.name}`}</h3>
          <p className="text-sm text-muted-foreground">השינויים נשמרים במסד הנתונים ומוצגים באתר מכל מכשיר.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2 font-bold"><RefreshCw className="w-4 h-4" /> רענן</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 font-bold bg-gradient-hero text-primary-foreground">{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'שומר...' : 'שמור הכל'}</Button>
        </div>
      </div>

      {saved && <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">השינויים נשמרו בהצלחה.</div>}
      {saveError && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive">חלק מהשינויים לא נשמרו עקב תקלה. נסה/י שוב.</div>}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label htmlFor="syn-name" className="mb-1 block text-sm font-bold text-foreground">שם בית הכנסת</label><Input id="syn-name" value={synagogue.name} onChange={(e) => setSynagogue({ ...synagogue, name: e.target.value })} /></div>
          <div><label htmlFor="syn-neighborhood" className="mb-1 block text-sm font-bold text-foreground">שכונה</label><Input id="syn-neighborhood" value={synagogue.neighborhood} onChange={(e) => setSynagogue({ ...synagogue, neighborhood: e.target.value })} /></div>
          <div><label htmlFor="syn-nusach" className="mb-1 block text-sm font-bold text-foreground">נוסח</label><Input id="syn-nusach" value={synagogue.nusach} onChange={(e) => setSynagogue({ ...synagogue, nusach: e.target.value })} /></div>
          <div><label htmlFor="syn-rabbi" className="mb-1 block text-sm font-bold text-foreground">רב בית הכנסת</label><Input id="syn-rabbi" value={synagogue.rabbi} onChange={(e) => setSynagogue({ ...synagogue, rabbi: e.target.value })} /></div>
          <div className="md:col-span-2"><label htmlFor="syn-address" className="mb-1 block text-sm font-bold text-foreground">כתובת</label><Input id="syn-address" value={synagogue.address} onChange={(e) => setSynagogue({ ...synagogue, address: e.target.value })} /></div>
          <div><label htmlFor="syn-donation-link" className="mb-1 block text-sm font-bold text-foreground">קישור תרומה</label><Input id="syn-donation-link" dir="ltr" value={synagogue.donation_link} onChange={(e) => setSynagogue({ ...synagogue, donation_link: e.target.value })} /></div>
          <div><label htmlFor="syn-background-preset" className="mb-1 block text-sm font-bold text-foreground">רקע (1-5)</label><Input id="syn-background-preset" type="number" min={1} max={5} value={synagogue.background_preset} onChange={(e) => setSynagogue({ ...synagogue, background_preset: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-foreground"><ImageIcon className="w-4 h-4 text-accent" /> לוגו</div>
          <div className="rounded-2xl border-2 border-dashed border-border bg-background p-4 text-center">
            {logoPreview ? <img src={logoPreview} alt={synagogue.name} className="mx-auto h-24 w-24 rounded-2xl bg-card p-2 object-contain shadow-card" /> : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-muted text-3xl font-display font-black text-muted-foreground">{synagogue.name.charAt(0)}</div>}
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"><Camera className="w-4 h-4" /> העלה לוגו<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }} /></label>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-foreground"><Users className="w-4 h-4 text-primary" /> גבאים</div><Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => setGabbaim((prev) => [...prev, { clientId: makeId(), name: '', phone: '' }])}><Plus className="w-4 h-4" /> הוסף</Button></div>
        {gabbaim.map((item) => <div key={item.clientId} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"><Input value={item.name} onChange={(e) => setGabbaim((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, name: e.target.value } : row))} placeholder="שם הגבאי" /><Input dir="ltr" value={item.phone} onChange={(e) => setGabbaim((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, phone: e.target.value } : row))} placeholder="050-0000000" /><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setGabbaim((prev) => prev.filter((row) => row.clientId !== item.clientId))}><Trash2 className="w-4 h-4" /></Button></div>)}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-foreground"><Clock className="w-4 h-4 text-primary" /> זמני תפילה</div><Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => setPrayerTimes((prev) => [...prev, { clientId: makeId(), name: '', time: '', day: 'weekday', no_minyan: false }])}><Plus className="w-4 h-4" /> הוסף</Button></div>
        {prayerTimes.map((item) => <div key={item.clientId} className="rounded-xl border border-border/40 bg-background/80 p-3 space-y-2"><div className="grid grid-cols-1 gap-2 md:grid-cols-4"><Input value={item.name} onChange={(e) => setPrayerTimes((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, name: e.target.value } : row))} placeholder="שם התפילה" /><Input dir="ltr" value={item.time} onChange={(e) => setPrayerTimes((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, time: e.target.value } : row))} placeholder="06:15" /><select value={item.day} onChange={(e) => setPrayerTimes((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, day: e.target.value as PrayerDay } : row))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{dayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><label className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-foreground"><span>אין מניין</span><input type="checkbox" checked={item.no_minyan} onChange={(e) => setPrayerTimes((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, no_minyan: e.target.checked } : row))} /></label></div><div className="flex justify-end"><Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setPrayerTimes((prev) => prev.filter((row) => row.clientId !== item.clientId))}><Trash2 className="w-4 h-4" /> מחק</Button></div></div>)}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-foreground"><BookOpen className="w-4 h-4 text-primary" /> שיעורים</div><Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => setLessons((prev) => [...prev, { clientId: makeId(), subject: '', teacher: '', day: '', time: '', audience: '', location: '' }])}><Plus className="w-4 h-4" /> הוסף</Button></div>
        {lessons.map((item) => <div key={item.clientId} className="rounded-xl border border-border/40 bg-background/80 p-3 space-y-2"><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"><Input value={item.subject} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, subject: e.target.value } : row))} placeholder="נושא" /><Input value={item.teacher} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, teacher: e.target.value } : row))} placeholder="שם הרב" /><Input value={item.day} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, day: e.target.value } : row))} placeholder="יום" /><Input dir="ltr" value={item.time} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, time: e.target.value } : row))} placeholder="20:00" /><Input value={item.audience} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, audience: e.target.value } : row))} placeholder="קהל יעד" /><Input value={item.location} onChange={(e) => setLessons((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, location: e.target.value } : row))} placeholder="מיקום" /></div><div className="flex justify-end"><Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setLessons((prev) => prev.filter((row) => row.clientId !== item.clientId))}><Trash2 className="w-4 h-4" /> מחק</Button></div></div>)}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-foreground"><Megaphone className="w-4 h-4 text-accent" /> מודעות</div><Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => setAnnouncements((prev) => [...prev, { clientId: makeId(), content: '', image_url: null, imageFile: null, previewUrl: null, is_active: true }])}><Plus className="w-4 h-4" /> הוסף</Button></div>
        {announcements.map((item) => <div key={item.clientId} className="rounded-xl border border-border/40 bg-background/80 p-3 space-y-3"><textarea value={item.content} onChange={(e) => setAnnouncements((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, content: e.target.value } : row))} rows={3} placeholder="תוכן המודעה" className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" /><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3">{(item.previewUrl || item.image_url) && <img src={item.previewUrl || item.image_url || ''} alt="מודעה" className="h-20 w-28 rounded-xl object-cover shadow-card" />}<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground hover:border-primary/30"><Camera className="w-4 h-4 text-primary" /> העלה תמונה<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setAnnouncements((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, imageFile: file, previewUrl: URL.createObjectURL(file) } : row)); }} /></label></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm font-bold text-foreground"><span>פעילה</span><input type="checkbox" checked={item.is_active} onChange={(e) => setAnnouncements((prev) => prev.map((row) => row.clientId === item.clientId ? { ...row, is_active: e.target.checked } : row))} /></label><Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => setAnnouncements((prev) => prev.filter((row) => row.clientId !== item.clientId))}><Trash2 className="w-4 h-4" /> מחק</Button></div></div></div>)}
      </div>

      {mode === 'admin' && <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm font-black text-foreground"><KeyRound className="w-4 h-4 text-primary" /> כניסת גבאי</div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"><div><label htmlFor="syn-access-display-name" className="mb-1 block text-sm font-bold text-foreground">שם תצוגה</label><Input id="syn-access-display-name" value={access.display_name} onChange={(e) => setAccess({ ...access, display_name: e.target.value })} /></div><div><label htmlFor="syn-access-username" className="mb-1 block text-sm font-bold text-foreground">שם משתמש</label><Input id="syn-access-username" dir="ltr" value={access.username} onChange={(e) => setAccess({ ...access, username: e.target.value })} /></div><div><label htmlFor="syn-access-password" className="mb-1 block text-sm font-bold text-foreground">סיסמה</label><Input id="syn-access-password" dir="ltr" value={access.password} onChange={(e) => setAccess({ ...access, password: e.target.value })} /></div><label className="flex items-end justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-foreground"><span>חשבון פעיל</span><input type="checkbox" checked={access.is_active} onChange={(e) => setAccess({ ...access, is_active: e.target.checked })} /></label></div>{portalLink && <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/80 p-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="mb-1 text-xs font-bold text-muted-foreground">קישור לפורטל הגבאי</p><p dir="ltr" className="truncate text-sm font-mono text-foreground">{portalLink}</p></div><Button variant="outline" className="gap-2 font-bold shrink-0" onClick={async () => { await navigator.clipboard.writeText(portalLink); setSaved(true); }}><Copy className="w-4 h-4" /> העתק קישור</Button></div>}</div>}
    </div>
  );
};

export default SynagogueDetailsManager;