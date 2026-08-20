import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Plus, Trash2, Copy, Check, Building2, Clock,
  BookOpen, Phone, Megaphone, Upload, Users, Link2, Send, Shield,
  MessageSquare, Mail, User, Calendar, Eye, EyeOff, Star, Inbox, Bell,
  LogOut, ChevronLeft, Sparkles, Lock, KeyRound, Image, HelpCircle, MessageCircle,
  Download, FileSpreadsheet, Scale, RefreshCw, Edit3, Save, X, MapPin,
  FileText, Heart
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import logoHazor from '@/assets/logo-mechubarim.png';
import logoMechubarim from '@/assets/logo-mechubarim.png';
import type { KnowledgeItem } from '@/lib/knowledgeStore';
import type { RabbiQuestion } from '@/lib/rabbiQuestionsStore';
import { uploadImage, deleteStorageFile } from '@/lib/supabaseStorage';
import GallerySection from '@/components/GallerySection';
import ActivitySlideshow from '@/components/ActivitySlideshow';

// ---- Contact leads (from Supabase community_leads) ----

const requestTypeLabels: Record<string, string> = {
  general: 'פנייה כללית',
  synagogue: 'רישום בית כנסת',
  rabbi_question: 'שאלה לרב',
  gabbai_support: 'תמיכת גבאי',
  stam: 'שירותי סת"ם',
  azkarot: 'אזכרות',
  barmitzvah: 'בר מצווה',
  donation: 'תרומה',
  event: 'אירוע / שמחה',
  other: 'פנייה אחרת',
};

// =============================================
// SYNAGOGUE CRUD MANAGER (100% Database)
// =============================================
interface SynagogueFormData {
  id?: string;
  name: string;
  neighborhood: string;
  nusach: string;
  rabbi: string;
  address: string;
  donation_link: string;
  logo_url: string;
  background_preset: number;
}

const emptySynForm: SynagogueFormData = {
  name: '', neighborhood: '', nusach: 'עדות המזרח', rabbi: '', address: '', donation_link: '', logo_url: '', background_preset: 1,
};

const SynagogueManager = () => {
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SynagogueFormData | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState(0);

  const fetchSynagogues = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('synagogues').select('*').order('name');
    setSynagogues(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSynagogues(); }, [fetchSynagogues]);

  const handleSave = async () => {
    if (!editing || !editing.name.trim() || !editing.address.trim()) return;
    setSaving(true);
    setSaveError(false);
    const payload = {
      name: editing.name,
      neighborhood: editing.neighborhood,
      nusach: editing.nusach,
      rabbi: editing.rabbi || null,
      address: editing.address,
      donation_link: editing.donation_link || null,
      logo_url: editing.logo_url || null,
      background_preset: editing.background_preset,
    };

    const { error } = isNew
      ? await supabase.from('synagogues').insert(payload)
      : editing.id
        ? await supabase.from('synagogues').update(payload).eq('id', editing.id)
        : { error: null };
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    setEditing(null);
    setIsNew(false);
    await fetchSynagogues();
  };

  const handleDelete = async (id: string) => {
    setDeleteError(false);
    // Delete related data first
    const relatedResults = await Promise.all([
      supabase.from('synagogue_prayer_times').delete().eq('synagogue_id', id),
      supabase.from('synagogue_lessons').delete().eq('synagogue_id', id),
      supabase.from('synagogue_gabbaim').delete().eq('synagogue_id', id),
      supabase.from('synagogue_announcements').delete().eq('synagogue_id', id),
    ]);
    if (relatedResults.some(r => r.error)) {
      setDeleteError(true);
      return;
    }
    const { error } = await supabase.from('synagogues').delete().eq('id', id);
    if (error) {
      setDeleteError(true);
      return;
    }
    setConfirmDelete(null);
    await fetchSynagogues();
  };

  const downloadTemplate = () => {
    const headers = ['name', 'neighborhood', 'nusach', 'rabbi', 'address', 'donation_link', 'background_preset'];
    const example = ['בית הכנסת החדש', 'שכונת הגפן', 'עדות המזרח', 'הרב ישראל כהן', 'רחוב הדקל 5, חצור הגלילית', 'https://nedarimplus.co.il', '1'];
    const csv = '\uFEFF' + headers.join(',') + '\n' + example.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'synagogues_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { setImporting(false); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    }).filter(r => r.name);

    let failedRows = 0;
    for (const row of rows) {
      const { error } = await supabase.from('synagogues').insert({
        name: row.name,
        neighborhood: row.neighborhood || '',
        nusach: row.nusach || 'עדות המזרח',
        rabbi: row.rabbi || null,
        address: row.address || '',
        donation_link: row.donation_link || null,
        background_preset: parseInt(row.background_preset) || 1,
      });
      if (error) failedRows += 1;
    }
    setImportErrors(failedRows);
    await fetchSynagogues();
    setImporting(false);
    if (csvRef.current) csvRef.current.value = '';
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" /> ניהול בתי כנסת
        <span className="text-sm font-normal text-muted-foreground mr-2">({synagogues.length})</span>
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-5">
        {/* Data Sync */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <h3 className="font-display font-black text-foreground flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-accent" /> סנכרון נתונים
          </h3>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={downloadTemplate} variant="outline" size="sm" className="gap-2 font-bold">
              <Download className="w-4 h-4" /> הורד תבנית CSV
            </Button>
            <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
            <Button onClick={() => csvRef.current?.click()} disabled={importing} size="sm" className="gap-2 font-bold bg-gradient-hero text-primary-foreground">
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'מייבא...' : 'ייבא CSV'}
            </Button>
            <Button onClick={() => { setEditing({ ...emptySynForm }); setIsNew(true); }} size="sm" className="gap-2 font-bold mr-auto">
              <Plus className="w-4 h-4" /> הוסף בית כנסת
            </Button>
          </div>
          {importErrors > 0 && <p className="text-sm text-destructive font-bold">{importErrors} שורות לא יובאו עקב שגיאה.</p>}
          {deleteError && <p className="text-sm text-destructive font-bold">המחיקה נכשלה עקב תקלה. נסו שוב.</p>}
        </div>

        {/* Edit/Add Form */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-primary/5 rounded-xl p-5 border border-primary/15 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-foreground text-base">
                  {isNew ? '➕ בית כנסת חדש' : `✏️ עריכת ${editing.name}`}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(null); setIsNew(false); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">שם בית הכנסת *</label>
                  <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="בית הכנסת הגדול" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">שכונה *</label>
                  <Input value={editing.neighborhood} onChange={e => setEditing({ ...editing, neighborhood: e.target.value })} placeholder="מרכז העיר" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">נוסח *</label>
                  <Input value={editing.nusach} onChange={e => setEditing({ ...editing, nusach: e.target.value })} placeholder="עדות המזרח / אשכנז / ספרדי" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">רב בית הכנסת</label>
                  <Input value={editing.rabbi} onChange={e => setEditing({ ...editing, rabbi: e.target.value })} placeholder="הרב ..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-foreground mb-1">כתובת *</label>
                  <Input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="רחוב, מספר, חצור הגלילית" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">קישור תרומה</label>
                  <Input value={editing.donation_link} onChange={e => setEditing({ ...editing, donation_link: e.target.value })} placeholder="https://..." dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">תבנית רקע (1-5)</label>
                  <Input type="number" min={1} max={5} value={editing.background_preset} onChange={e => setEditing({ ...editing, background_preset: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving || !editing.name.trim() || !editing.address.trim()}
                className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isNew ? 'הוסף בית כנסת' : 'שמור שינויים'}
              </Button>
              {saveError && <p className="text-sm text-destructive font-bold">השמירה נכשלה עקב תקלה. נסו שוב.</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synagogue List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">טוען...</p>
          </div>
        ) : synagogues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold">אין בתי כנסת. הוסף ידנית או ייבא CSV</p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="רשימת בתי כנסת">
            {synagogues.map((syn) => (
              <div key={syn.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/40" role="listitem">
                <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm truncate">{syn.name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                    <MapPin className="w-3 h-3 shrink-0" />{syn.neighborhood} • {syn.nusach}
                    {syn.rabbi && <span>• רב: {syn.rabbi}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditing({
                      id: syn.id,
                      name: syn.name,
                      neighborhood: syn.neighborhood,
                      nusach: syn.nusach,
                      rabbi: syn.rabbi || '',
                      address: syn.address,
                      donation_link: syn.donation_link || '',
                      logo_url: syn.logo_url || '',
                      background_preset: syn.background_preset || 1,
                    });
                    setIsNew(false);
                  }} className="text-primary" aria-label={`ערוך ${syn.name}`}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  {confirmDelete === syn.id ? (
                    <div className="flex gap-1">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(syn.id)} className="text-xs font-bold px-2">
                        אישור מחיקה
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)} className="text-xs">
                        ביטול
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(syn.id)} className="text-destructive" aria-label={`מחק ${syn.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={fetchSynagogues} className="gap-1 text-xs font-bold w-full">
          <RefreshCw className="w-3.5 h-3.5" /> רענן רשימה
        </Button>
      </div>
    </div>
  );
};

// ---- Gabai Personal Area ----
const GabaiPersonalArea = ({ synagogueName, synagogueId }: { synagogueName: string; synagogueId: string }) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'announcements'>('leads');
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('community_leads').select('*').eq('synagogue_id', synagogueId).order('created_at', { ascending: false });
      if (data) setLeads(data);
    };
    fetch();
  }, [synagogueId]);
  const [announcements, setAnnouncements] = useState<string[]>(['שיעור מיוחד השבוע']);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const addAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    setAnnouncements([newAnnouncement, ...announcements]);
    setNewAnnouncement('');
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-hero rounded-2xl p-6 text-primary-foreground">
        <h2 className="text-2xl font-display font-black mb-1">שלום, גבאי {synagogueName}</h2>
        <p className="text-primary-foreground/70">כאן תוכל לנהל לידים, הודעות ומודעות לבית הכנסת שלך</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'לידים חדשים', value: leads.filter(l => !l.read).length, icon: Inbox, color: 'text-destructive' },
          { label: 'סה"כ פניות', value: leads.length, icon: MessageSquare, color: 'text-primary' },
          { label: 'מודעות פעילות', value: announcements.length, icon: Bell, color: 'text-accent' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="bg-card rounded-2xl p-5 shadow-card ornament-border text-center">
            <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
            <div className="text-3xl font-black text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground font-semibold">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 bg-muted rounded-xl p-1.5">
        <button onClick={() => setActiveTab('leads')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'leads' ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Inbox className="w-4 h-4" /> לידים והודעות
        </button>
        <button onClick={() => setActiveTab('announcements')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'announcements' ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Megaphone className="w-4 h-4" /> מודעות
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'leads' && (
          <motion.div key="leads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            {leads.length === 0 ? (
              <div className="bg-card rounded-2xl p-10 text-center shadow-card">
                <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-semibold">אין פניות חדשות</p>
              </div>
            ) : leads.map((lead, i) => (
              <motion.div key={lead.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`bg-card rounded-xl p-5 shadow-card border-r-[4px] transition-all ${!lead.is_read ? 'border-destructive' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!lead.is_read ? 'bg-destructive/10' : 'bg-muted'}`}>
                      <User className={`w-5 h-5 ${!lead.is_read ? 'text-destructive' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="font-black text-foreground flex items-center gap-2">
                        {lead.name}
                        {!lead.is_read && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-gentle" />}
                      </div>
                      <a href={`tel:${lead.phone}`} className="text-sm text-accent font-mono font-bold hover:text-gold-dark transition-colors" dir="ltr">{lead.phone}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />{new Date(lead.created_at).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground">
                  <MessageSquare className="w-3.5 h-3.5 inline-block ml-1.5 text-muted-foreground" />{lead.message}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold"><Phone className="w-3.5 h-3.5" /> חייג</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold"><Eye className="w-3.5 h-3.5" /> סמן כנקרא</Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        {activeTab === 'announcements' && (
          <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex gap-3">
              <Input value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="הוסף מודעה חדשה..."
                className="flex-1" onKeyDown={e => e.key === 'Enter' && addAnnouncement()} />
              <Button onClick={addAnnouncement} className="gap-2 font-bold shrink-0"><Plus className="w-4 h-4" /> הוסף</Button>
            </div>
            {announcements.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between border-r-[3px] border-accent">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-semibold text-foreground">{a}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAnnouncements(announcements.filter((_, idx) => idx !== i))} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---- Admin Password Manager ----
const AdminPasswordManager = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editPass, setEditPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchAccounts = useCallback(async () => {
    const { data } = await supabase.from('gabai_accounts').select('*').eq('is_admin', true).order('created_at');
    if (data) setAccounts(data);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAdmin = async () => {
    if (!newPass.trim() || newPass.trim().length < 4) return;
    setLoading(true);
    setActionError('');
    const { error } = await supabase.from('gabai_accounts').insert({
      username: newName.trim() || `admin_${Date.now()}`,
      display_name: newName.trim() || 'מנהל נוסף',
      password_hash: newPass.trim(),
      is_admin: true,
      is_active: true,
    });
    setLoading(false);
    if (error) {
      setActionError('הוספת המנהל נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    setNewPass(''); setNewName('');
    await fetchAccounts();
  };

  const updatePassword = async (id: string) => {
    if (!editPass.trim() || editPass.trim().length < 4) return;
    setLoading(true);
    setActionError('');
    const { error } = await supabase.from('gabai_accounts').update({ password_hash: editPass.trim() }).eq('id', id);
    setLoading(false);
    if (error) {
      setActionError('עדכון הסיסמה נכשל עקב תקלה. נסו שוב.');
      return;
    }
    setEditId(null); setEditPass('');
    await fetchAccounts();
  };

  const deleteAdmin = async (id: string) => {
    if (accounts.length <= 1) return; // keep at least one
    setLoading(true);
    setActionError('');
    const { error } = await supabase.from('gabai_accounts').delete().eq('id', id);
    setLoading(false);
    if (error) {
      setActionError('מחיקת המנהל נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    await fetchAccounts();
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" /> ניהול סיסמאות מנהל
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        {/* Existing admins */}
        {accounts.map(acc => (
          <div key={acc.id} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground text-sm">{acc.display_name}</div>
              <div className="text-xs text-muted-foreground font-mono" dir="ltr">סיסמה: {acc.password_hash}</div>
            </div>
            {editId === acc.id ? (
              <div className="flex items-center gap-2">
                <Input value={editPass} onChange={e => setEditPass(e.target.value)} placeholder="סיסמה חדשה" className="w-32 text-sm" dir="ltr" />
                <Button size="sm" onClick={() => updatePassword(acc.id)} disabled={loading} className="gap-1"><Save className="w-3 h-3" /> שמור</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X className="w-3 h-3" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => { setEditId(acc.id); setEditPass(acc.password_hash); }} className="gap-1">
                  <Edit3 className="w-3 h-3" /> שנה
                </Button>
                {accounts.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => deleteAdmin(acc.id)} className="text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add new admin */}
        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-bold text-foreground">הוסף מנהל חדש</h4>
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם המנהל" className="flex-1 text-sm" />
            <Input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="סיסמה (מינ׳ 4 תווים)" className="flex-1 text-sm" dir="ltr" />
          </div>
          <Button onClick={addAdmin} disabled={loading || !newPass.trim()} className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground">
            <Plus className="w-4 h-4" /> הוסף מנהל
          </Button>
          {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}
        </div>
      </div>
    </div>
  );
};

// ---- Contact Info Manager ----
const ContactInfoManager = () => {
  const [address, setAddress] = useState('המועצה הדתית חצור הגלילית, רח׳ הרצל 1');
  const [contactPhone, setContactPhone] = useState('054-203-0901');
  const [contactEmail, setContactEmail] = useState('M0542060903@GMAIL.COM');
  const [whatsapp, setWhatsapp] = useState('972542030901');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [cleanupWarning, setCleanupWarning] = useState(false);

  const fetchInfo = useCallback(async () => {
    const { data } = await supabase.from('knowledge_base').select('*').eq('category', 'פרטי_יצירת_קשר').eq('is_active', true);
    if (data && data.length > 0) {
      try {
        const parsed = JSON.parse(data[0].content);
        setAddress(parsed.address || '');
        setContactPhone(parsed.phone || '');
        setContactEmail(parsed.email || '');
        setWhatsapp(parsed.whatsapp || '');
      } catch {}
    }
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    setCleanupWarning(false);
    const content = JSON.stringify({ address, phone: contactPhone, email: contactEmail, whatsapp });
    // Upsert via insert-then-cleanup (not delete-then-insert): if the insert fails,
    // the old row is never removed, so the public contact page/footer can never go blank.
    const { data: inserted, error: insertError } = await supabase.from('knowledge_base').insert({
      category: 'פרטי_יצירת_קשר',
      title: 'פרטי יצירת קשר',
      content,
      is_active: true,
    }).select('id').single();
    if (insertError || !inserted) {
      setSaving(false);
      setSaveError(true);
      return;
    }
    const { error: cleanupError } = await supabase.from('knowledge_base').delete().eq('category', 'פרטי_יצירת_קשר').neq('id', inserted.id);
    if (cleanupError) {
      console.error('ContactInfoManager: cleanup of stale rows failed', cleanupError);
      setCleanupWarning(true);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-primary" /> ניהול פרטי יצירת קשר
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">כתובת</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="כתובת..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">טלפון</label>
            <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="054-000-0000" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">אימייל</label>
            <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="email@example.com" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">וואטסאפ (מספר בינלאומי)</label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="972540000000" dir="ltr" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '✅ נשמר!' : 'שמור פרטי קשר'}
        </Button>
        {saveError && <p className="text-sm text-destructive font-bold">שגיאה בשמירה — הפרטים הקודמים לא נמחקו, נסו שוב.</p>}
        {cleanupWarning && <p className="text-sm text-amber-600 font-bold">הפרטים נשמרו, אך נותרה גרסה כפולה ישנה שלא נמחקה — פנו לתמיכה אם הבעיה חוזרת.</p>}
      </div>
    </div>
  );
};

// ---- Admin Dashboard ----
const AdminDashboard = () => {
  return (
    <div className="space-y-8">
      <SynagogueManager />
      <ContactInfoManager />
      <HalachaManager />
      <NewsletterManager />
      <KashrutManager />
      <AdBannerManager />
      <KnowledgeManager />
      <ContactLeadsManager />
      <RabbiQuestionsManager />
      <AdminPasswordManager />
      <ActivitySlideshow isAdmin />
      <GallerySection isAdmin />
    </div>
  );
};

// ---- Halacha Manager ----
const HalachaManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hebrewDate, setHebrewDate] = useState('');
  const [category, setCategory] = useState('הלכה יומית');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('daily_halacha').select('*').order('display_date', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setActionError('');
    const { error } = await supabase.from('daily_halacha').insert({
      title, content, hebrew_date: hebrewDate || null, category, is_seasonal: isSeasonal,
    });
    setSaving(false);
    if (error) {
      setActionError('הוספת ההלכה נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    setTitle(''); setContent(''); setHebrewDate('');
    await fetchItems();
  };

  const handleDelete = async (id: string) => {
    setActionError('');
    const { error } = await supabase.from('daily_halacha').delete().eq('id', id);
    if (error) {
      setActionError('המחיקה נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" /> ניהול הלכה יומית
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">כותרת *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="נושא ההלכה" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">תאריך עברי</label>
            <Input value={hebrewDate} onChange={e => setHebrewDate(e.target.value)} placeholder={'י"ב אדר ב\' תשפ"ו'} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">תוכן ההלכה *</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="תוכן ההלכה..."
            rows={4} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
            <input type="checkbox" checked={isSeasonal} onChange={e => setIsSeasonal(e.target.checked)}
              className="rounded border-input" />
            הוראה עונתית מהרב
          </label>
        </div>
        <Button onClick={handleAdd} disabled={saving || !title.trim() || !content.trim()}
          className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'שומר...' : 'הוסף הלכה'}
        </Button>
        {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}

        {loading ? (
          <div className="text-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : items.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <h4 className="text-sm font-bold text-muted-foreground">הלכות קיימות ({items.length})</h4>
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/40">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm truncate flex items-center gap-2">
                    {item.is_seasonal && <Star className="w-3.5 h-3.5 text-accent shrink-0" />}
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{item.content.substring(0, 60)}...</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Newsletter Manager ----
const NewsletterManager = () => {
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchNewsletters = async () => {
    setLoading(true);
    const { data } = await supabase.from('newsletters').select('*').order('issue_date', { ascending: false });
    if (data) setNewsletters(data);
    setLoading(false);
  };

  useEffect(() => { fetchNewsletters(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !title.trim()) return;
    setUploading(true);
    setActionError('');

    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('newsletters')
      .upload(fileName, file, { contentType: 'application/pdf' });

    if (uploadError) {
      setUploading(false);
      setActionError('העלאת הקובץ נכשלה עקב תקלה. נסו שוב.');
      return;
    }

    const { data: urlData } = supabase.storage.from('newsletters').getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from('newsletters').insert({
      title, description: description || null, pdf_url: pdfUrl,
    });
    setUploading(false);
    if (insertError) {
      setActionError('שמירת הגיליון נכשלה עקב תקלה. נסו שוב.');
      return;
    }

    setTitle(''); setDescription('');
    if (fileRef.current) fileRef.current.value = '';
    await fetchNewsletters();
  };

  const handleDelete = async (item: any) => {
    setActionError('');
    // Delete from storage
    const fileName = item.pdf_url.split('/').pop();
    if (fileName) await supabase.storage.from('newsletters').remove([fileName]);
    const { error } = await supabase.from('newsletters').delete().eq('id', item.id);
    if (error) {
      setActionError('מחיקת הגיליון נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    setNewsletters(prev => prev.filter(n => n.id !== item.id));
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-accent" /> ניהול עלון "מחוברים"
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">כותרת הגיליון *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="גיליון מס' 12 - פרשת..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">תיאור</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="תיאור קצר..." />
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button onClick={() => { if (!title.trim()) return; fileRef.current?.click(); }}
            disabled={uploading || !title.trim()}
            className="w-full gap-2 font-bold bg-gradient-gold text-foreground disabled:opacity-50">
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'מעלה...' : 'העלה קובץ PDF'}
          </Button>
          {!title.trim() && <p className="text-xs text-muted-foreground mt-1">יש למלא כותרת לפני ההעלאה</p>}
          {actionError && <p className="text-sm text-destructive font-bold mt-1">{actionError}</p>}
        </div>

        {loading ? (
          <div className="text-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : newsletters.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <h4 className="text-sm font-bold text-muted-foreground">גיליונות שהועלו ({newsletters.length})</h4>
            {newsletters.map(nl => (
              <div key={nl.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/40">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm truncate">{nl.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(nl.issue_date).toLocaleDateString('he-IL')}</div>
                </div>
                <a href={nl.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                  <Download className="w-4 h-4" />
                </a>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(nl)} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Kashrut Manager ----
const KashrutManager = () => {
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState(0);
  const [actionError, setActionError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchEstablishments = async () => {
    setLoading(true);
    const { data } = await supabase.from('kashrut_establishments').select('*').order('name');
    if (data) setEstablishments(data);
    setLoading(false);
  };

  useEffect(() => { fetchEstablishments(); }, []);

  const downloadTemplate = () => {
    const headers = ['name', 'category', 'address', 'phone', 'kashrut_level', 'certifying_body', 'mashgiach_name', 'mashgiach_phone', 'opening_hours', 'notes'];
    const exampleRow = ['מאפיית הגליל', 'מאפייה', 'רחוב הרצל 5, חצור הגלילית', '04-1234567', 'mehadrin', 'הרבנות המקומית', 'ישראל כהן', '050-1234567', '06:00-22:00', 'סגור בשבת'];
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + exampleRow.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kashrut_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { setImporting(false); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    }).filter(r => r.name);

    let failedRows = 0;
    for (const row of rows) {
      const { error } = await supabase.from('kashrut_establishments').upsert({
        name: row.name,
        category: row.category || 'כללי',
        address: row.address || '',
        phone: row.phone || null,
        kashrut_level: row.kashrut_level || 'regular',
        certifying_body: row.certifying_body || null,
        mashgiach_name: row.mashgiach_name || null,
        mashgiach_phone: row.mashgiach_phone || null,
        opening_hours: row.opening_hours || null,
        notes: row.notes || null,
        is_active: true,
      }, { onConflict: 'id' });
      if (error) failedRows += 1;
    }
    setImportErrors(failedRows);
    await fetchEstablishments();
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const updateLevel = async (id: string, level: string) => {
    setActionError('');
    const { error } = await supabase.from('kashrut_establishments').update({ kashrut_level: level }).eq('id', id);
    if (error) {
      setActionError('עדכון רמת הכשרות נכשל עקב תקלה. נסו שוב.');
      return;
    }
    setEstablishments(prev => prev.map(e => e.id === id ? { ...e, kashrut_level: level } : e));
  };

  const levelButtons = [
    { value: 'mehadrin', label: '🏅 מהדרין', activeClass: 'bg-primary text-primary-foreground shadow-card' },
    { value: 'regular', label: '✅ רגיל', activeClass: 'bg-accent text-accent-foreground shadow-card' },
    { value: 'none', label: '❌ לא ידוע', activeClass: 'bg-muted-foreground text-background shadow-card' },
  ];

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <Scale className="w-5 h-5 text-primary" /> ניהול כשרות
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-5">
        <div className="bg-muted/50 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-black text-foreground flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-5 h-5 text-accent" /> סנכרון נתונים
          </h3>
          <p className="text-sm text-muted-foreground">הורד תבנית CSV, מלא את הנתונים וייבא בחזרה למסד הנתונים</p>
          <div className="flex gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="gap-2 font-bold">
              <Download className="w-4 h-4" /> הורד תבנית CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
            <Button onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2 font-bold bg-gradient-hero text-primary-foreground">
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'מייבא...' : 'ייבא קובץ CSV'}
            </Button>
          </div>
          {importErrors > 0 && <p className="text-sm text-destructive font-bold">{importErrors} שורות לא יובאו עקב שגיאה.</p>}
          {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-black text-foreground text-base">מוסדות ({establishments.length})</h3>
            <Button variant="ghost" size="sm" onClick={fetchEstablishments} className="gap-1 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5" /> רענן
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">טוען...</p>
            </div>
          ) : establishments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-semibold">אין מוסדות כשרות. ייבא קובץ CSV או הוסף ידנית</p>
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label="רשימת מוסדות כשרות">
              {establishments.map((est) => (
                <div key={est.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/40" role="listitem">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground text-sm truncate">{est.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{est.category} • {est.address}</div>
                  </div>
                  <div className="flex gap-1 shrink-0" role="radiogroup" aria-label={`רמת כשרות עבור ${est.name}`}>
                    {levelButtons.map(btn => (
                      <button
                        key={btn.value}
                        onClick={() => updateLevel(est.id, btn.value)}
                        aria-pressed={est.kashrut_level === btn.value}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          est.kashrut_level === btn.value ? btn.activeClass : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Ad Banner Manager (Supabase) ----
const AdBannerManager = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [size, setSize] = useState('medium');
  const [position, setPosition] = useState('center');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase.from('ad_banners').select('*').order('created_at', { ascending: false });
    if (data) setBanners(data);
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleSave = async () => {
    if (!imageFile) return;
    setSaving(true);
    setActionError('');
    const url = await uploadImage(imageFile, 'banners');
    if (url) {
      const { error } = await supabase.from('ad_banners').insert({ title, image_url: url, link: link || null, size, position });
      if (error) {
        setActionError('פרסום הבאנר נכשל עקב תקלה. נסו שוב.');
      } else {
        await fetchBanners();
        setTitle(''); setLink(''); setImageFile(null); setImagePreview(null);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (banner: any) => {
    setActionError('');
    await deleteStorageFile(banner.image_url);
    const { error } = await supabase.from('ad_banners').delete().eq('id', banner.id);
    if (error) {
      setActionError('מחיקת הבאנר נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    setBanners(prev => prev.filter(b => b.id !== banner.id));
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <Image className="w-5 h-5 text-accent" /> ניהול פרסומות (באנרים)
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-bold text-foreground mb-1">כותרת</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת הבאנר" /></div>
          <div><label className="block text-sm font-bold text-foreground mb-1">קישור (אופציונלי)</label>
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." dir="ltr" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-bold text-foreground mb-1">גודל</label>
            <select value={size} onChange={e => setSize(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="small">קטן</option><option value="medium">בינוני</option><option value="large">גדול</option>
            </select></div>
          <div><label className="block text-sm font-bold text-foreground mb-1">מיקום</label>
            <select value={position} onChange={e => setPosition(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="center">מרכזי</option><option value="side">צדדי</option>
            </select></div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
          }} />
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="העלאת תמונת באנר"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
          >
            {imagePreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={imagePreview} alt="באנר" className="max-h-32 rounded-lg object-contain" />
                <p className="text-sm text-primary font-bold">לחצו לשינוי</p>
              </div>
            ) : (<><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground font-semibold">העלאת תמונת באנר</p></>)}
          </div>
        </div>
        <Button onClick={handleSave} disabled={!imageFile || saving} className="w-full gap-2 font-bold bg-gradient-gold text-foreground disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {saving ? 'מעלה...' : 'פרסם באנר'}
        </Button>
        {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}
        {banners.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <h4 className="text-sm font-bold text-muted-foreground">באנרים קיימים ({banners.length})</h4>
            {banners.map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <img src={b.image_url} alt={b.title} className="w-20 h-12 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm truncate">{b.title || 'ללא כותרת'}</div>
                  <div className="text-xs text-muted-foreground">{b.size} • {b.position === 'side' ? 'צדדי' : 'מרכזי'}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(b)} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Knowledge Base Manager ----
const KnowledgeManager = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [kbPhone, setKbPhone] = useState('');
  const [kbAddress, setKbAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [kbImage, setKbImage] = useState<File | null>(null);
  const [kbImagePreview, setKbImagePreview] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const kbFileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('knowledge_base').select('*').eq('is_active', true).order('category');
    if (data) {
      setItems(data);
      setCategories([...new Set(data.map(d => d.category))]);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim() || !category.trim()) return;
    setActionError('');
    setSaving(true);
    let imageUrl: string | undefined;
    if (kbImage) {
      imageUrl = await uploadImage(kbImage, 'site-images') || undefined;
    }
    const { error } = await supabase.from('knowledge_base').insert({
      category, subcategory: subcategory || null, title, content,
      phone: kbPhone || null, address: kbAddress || null,
      contact_name: contactName || null, image_url: imageUrl || null,
    });
    if (error) {
      setActionError('הוספת הפריט נכשלה עקב תקלה. נסו שוב.');
      setSaving(false);
      return;
    }
    await fetchItems();
    setTitle(''); setContent(''); setKbPhone(''); setKbAddress(''); setContactName(''); setSubcategory(''); setKbImage(null); setKbImagePreview(null);
    setSaving(false);
  };

  const handleDelete = async (item: KnowledgeItem) => {
    setActionError('');
    if (item.image_url) await deleteStorageFile(item.image_url);
    const { error } = await supabase.from('knowledge_base').delete().eq('id', item.id);
    if (error) {
      setActionError('המחיקה נכשלה עקב תקלה. נסו שוב.');
      return;
    }
    await fetchItems();
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" /> ניהול מאגר מידע
      </h2>
      <div className="bg-card rounded-2xl p-6 shadow-card ornament-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">קטגוריה *</label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder='סת"ם, כשרות, גמ"חים...' list="kb-cats" />
            <datalist id="kb-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">תת-קטגוריה</label>
            <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="למשל: ציוד רפואי, מזון..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">כותרת *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת הפריט" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">שם איש קשר</label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="שם מלא" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">תוכן *</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="תיאור מפורט..."
            rows={3} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-bold text-foreground mb-1">טלפון</label>
            <Input value={kbPhone} onChange={e => setKbPhone(e.target.value)} placeholder="050-0000000" dir="ltr" /></div>
          <div><label className="block text-sm font-bold text-foreground mb-1">כתובת</label>
            <Input value={kbAddress} onChange={e => setKbAddress(e.target.value)} placeholder="כתובת (אופציונלי)" /></div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">תמונה (אופציונלי)</label>
          <input ref={kbFileRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            setKbImage(file);
            const reader = new FileReader();
            reader.onload = () => setKbImagePreview(reader.result as string);
            reader.readAsDataURL(file);
          }} />
          <div
            onClick={() => kbFileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="העלאת תמונה"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kbFileRef.current?.click(); } }}
          >
            {kbImagePreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={kbImagePreview} alt="תמונה" className="max-h-24 rounded-lg object-contain" />
                <p className="text-xs text-primary font-bold">לחצו לשינוי</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-semibold">📷 לחצו להעלאת תמונה</p>
            )}
          </div>
        </div>
        <Button onClick={handleAdd} disabled={saving || !title.trim() || !content.trim() || !category.trim()}
          className="w-full gap-2 font-bold bg-gradient-hero text-primary-foreground disabled:opacity-50">
          <Plus className="w-4 h-4" /> {saving ? 'מוסיף...' : 'הוסף למאגר'}
        </Button>
        {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}

        {categories.map(cat => {
          const catItems = items.filter(k => k.category === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} className="pt-3 border-t border-border">
              <h4 className="text-sm font-black text-muted-foreground mb-2">{cat} ({catItems.length})</h4>
              <div className="space-y-2">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    {item.image_url && <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground text-sm truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.subcategory && <span className="text-accent font-bold">[{item.subcategory}] </span>}
                        {item.content.substring(0, 50)}...
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Contact Leads Manager ----
const ContactLeadsManager = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase.from('community_leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
  }, []);

  useEffect(() => { fetchLeads(); const i = setInterval(fetchLeads, 5000); return () => clearInterval(i); }, [fetchLeads]);

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <Inbox className="w-5 h-5 text-accent" /> פניות צור קשר
        {leads.filter(l => !l.is_read).length > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs px-2.5 py-0.5 rounded-full font-black">
            {leads.filter(l => !l.is_read).length} חדשות
          </span>
        )}
      </h2>
      <div className="space-y-3">
        {leads.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-card ornament-border">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">אין פניות חדשות</p>
          </div>
        ) : leads.map((lead, i) => (
          <motion.div key={lead.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-xl p-5 shadow-card border-r-[4px] ${!lead.is_read ? 'border-destructive' : 'border-border'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!lead.is_read ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <User className={`w-5 h-5 ${!lead.is_read ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-black text-foreground flex items-center gap-2">
                    {lead.name}
                    {!lead.is_read && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-gentle" />}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono" dir="ltr">{lead.phone}</span>
                    {lead.email && <><Mail className="w-3.5 h-3.5 mr-2" /><span className="font-mono text-xs" dir="ltr">{lead.email}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />{new Date(lead.created_at).toLocaleDateString('he-IL')}
                </div>
                <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {requestTypeLabels[lead.lead_type] || lead.lead_type}
                </span>
              </div>
            </div>
            {lead.message && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground mb-3">
                <MessageSquare className="w-3.5 h-3.5 inline-block ml-1.5 text-muted-foreground" />{lead.message}
              </div>
            )}
            <div className="flex gap-2">
              {!lead.is_read && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold" disabled={processingId === lead.id} onClick={async () => {
                  if (processingId) return;
                  setProcessingId(lead.id);
                  setActionError('');
                  const { error } = await supabase.from('community_leads').update({ is_read: true }).eq('id', lead.id);
                  setProcessingId(null);
                  if (error) { setActionError('הפעולה נכשלה עקב תקלה. נסו שוב.'); return; }
                  fetchLeads();
                }}><Eye className="w-3.5 h-3.5" /> סמן כנקרא</Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-bold text-destructive" disabled={processingId === lead.id} onClick={async () => {
                if (processingId) return;
                setProcessingId(lead.id);
                setActionError('');
                const { error } = await supabase.from('community_leads').delete().eq('id', lead.id);
                setProcessingId(null);
                if (error) { setActionError('המחיקה נכשלה עקב תקלה. נסו שוב.'); return; }
                fetchLeads();
              }}><Trash2 className="w-3.5 h-3.5" /> מחק</Button>
            </div>
          </motion.div>
        ))}
        {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}
      </div>
    </div>
  );
};

// ---- Rabbi Questions Manager ----
const RabbiQuestionsManager = () => {
  const [questions, setQuestions] = useState<RabbiQuestion[]>([]);
  const [actionError, setActionError] = useState('');

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from('rabbi_questions').select('*').order('created_at', { ascending: false });
    if (data) setQuestions(data as RabbiQuestion[]);
  }, []);

  useEffect(() => { fetchQuestions(); const i = setInterval(fetchQuestions, 5000); return () => clearInterval(i); }, [fetchQuestions]);

  const contactMethodLabel = (m: string) => {
    switch (m) {
      case 'email': return 'מייל';
      case 'phone': return 'טלפון';
      case 'whatsapp': return 'וואטסאפ';
      default: return m;
    }
  };

  const destinationLabel = (d?: string) => {
    switch (d) {
      case 'rabbi': return 'הרב שליט"א';
      case 'beit_horaa': return 'בית ההוראה';
      default: return 'בית ההוראה';
    }
  };

  const ContactIcon = ({ method }: { method: string }) => {
    switch (method) {
      case 'email': return <Mail className="w-3.5 h-3.5" />;
      case 'phone': return <Phone className="w-3.5 h-3.5" />;
      case 'whatsapp': return <MessageCircle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-accent" /> שאלות לרב
        {questions.filter(q => !q.is_read).length > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs px-2.5 py-0.5 rounded-full font-black">
            {questions.filter(q => !q.is_read).length} חדשות
          </span>
        )}
      </h2>
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-card ornament-border">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">אין שאלות חדשות</p>
          </div>
        ) : questions.map((q, i) => (
          <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-xl p-5 shadow-card border-r-[4px] ${q.urgent ? 'border-destructive' : !q.is_read ? 'border-accent' : 'border-border'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!q.is_read ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <HelpCircle className={`w-5 h-5 ${!q.is_read ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-black text-foreground flex items-center gap-2">
                    {q.name}
                    {!q.is_read && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-gentle" />}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-accent font-bold">
                    <ContactIcon method={q.contact_method} />
                    <span>{contactMethodLabel(q.contact_method)}: </span>
                    <span className="font-mono" dir="ltr">{q.contact_value}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />{new Date(q.created_at).toLocaleDateString('he-IL')}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {destinationLabel(q.destination)}
                  </span>
                  {q.urgent && (
                    <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      ⚡ דחוף
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground mb-3">
              <MessageSquare className="w-3.5 h-3.5 inline-block ml-1.5 text-muted-foreground" />{q.question}
            </div>
            <div className="flex gap-2">
              {!q.is_read && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold" onClick={async () => {
                  setActionError('');
                  const { error } = await supabase.from('rabbi_questions').update({ is_read: true }).eq('id', q.id);
                  if (error) { setActionError('הפעולה נכשלה עקב תקלה. נסו שוב.'); return; }
                  fetchQuestions();
                }}><Eye className="w-3.5 h-3.5" /> סמן כנקרא</Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-bold text-destructive" onClick={async () => {
                setActionError('');
                const { error } = await supabase.from('rabbi_questions').delete().eq('id', q.id);
                if (error) { setActionError('המחיקה נכשלה עקב תקלה. נסו שוב.'); return; }
                fetchQuestions();
              }}><Trash2 className="w-3.5 h-3.5" /> מחק</Button>
            </div>
          </motion.div>
        ))}
        {actionError && <p className="text-sm text-destructive font-bold">{actionError}</p>}
      </div>
    </div>
  );
};

// ---- Main GabaiPortal ----
const GabaiPortal = () => {
  const searchParams = new URLSearchParams(window.location.search);
  // The admin gate. `?auto=admin` used to seed view='admin' directly, so the
  // public Navbar's "ניהול ⚡" link — and anyone who typed the URL — reached the
  // full management UI without ever entering a password. The query string now
  // only chooses which tab the login screen opens on; `view` always starts at
  // 'login' and only handleLogin can move it. `auto=admin` is still read so old
  // bookmarks keep landing on the admin tab instead of on the gabai one.
  const adminRequested = searchParams.get('login') === 'admin' || searchParams.get('auto') === 'admin';
  const [view, setView] = useState<'login' | 'admin' | 'gabai'>('login');
  const [loginType, setLoginType] = useState<'admin' | 'gabai'>(adminRequested ? 'admin' : 'gabai');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // priority §1א — "הצג סיסמה". Held next to `password` and not inside a shared
  // component: this is the only type="password" field in the system, and its
  // wrapper already carries a Lock icon, so a generic PasswordInput would have
  // had to be told about it anyway.
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loggedGabai, setLoggedGabai] = useState<{ name: string; id: string } | null>(null);

  const handleLogin = async () => {
    if (loginType === 'admin') {
      // Check admin from gabai_accounts table
      const { data, error: dbError } = await supabase.from('gabai_accounts').select('*').eq('is_admin', true).eq('is_active', true);
      // No console.log here. The line that was here printed
      // `{ data, dbError, passwordEntered: password }` — the password the user
      // just typed, plus every admin account row (password_hash included), into
      // the browser console of a live page. Measured on production 06/08/2026.
      if (dbError) {
        setError('שגיאת חיבור למסד הנתונים. נסה שוב.');
        return;
      }
      const admin = data?.find(a => a.password_hash === password.trim());
      if (admin) {
        setView('admin');
        setError('');
      } else {
        setError('סיסמת מנהל שגויה');
      }
    } else {
      // Check gabai from gabai_accounts table. Excludes is_admin accounts so an
      // admin's own credentials cannot also authenticate through the gabai tab
      // (mirrors the is_admin=false filter already used in
      // SynagogueDetailsManager.tsx for the same table).
      const { data, error: dbError } = await supabase.from('gabai_accounts').select('*, synagogues(name)').eq('username', username.trim()).eq('is_active', true).eq('is_admin', false);
      if (dbError) {
        setError('שגיאת חיבור למסד הנתונים. נסה שוב.');
        return;
      }
      const account = data?.find(a => a.password_hash === password.trim());
      if (account) {
        setLoggedGabai({ name: (account as any).synagogues?.name || account.display_name, id: account.synagogue_id || '' });
        setView('gabai');
        setError('');
      } else {
        setError('שם משתמש או סיסמה שגויים');
      }
    }
  };

  if (view === 'gabai' && loggedGabai) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-hero py-5">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <ArrowRight className="w-5 h-5" /><span className="font-display font-bold text-sm">לאתר</span>
              </Link>
              <button onClick={() => { setView('login'); setLoggedGabai(null); setUsername(''); setPassword(''); setShowPassword(false); }}
                className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-bold">
                <LogOut className="w-4 h-4" /> התנתק
              </button>
            </div>
            <div className="flex items-center gap-3">
              <img src={logoHazor} alt="לוגו" className="h-10" />
              <h1 className="font-display font-black text-primary-foreground text-lg">{loggedGabai.name}</h1>
            </div>
          </div>
        </header>
        <div className="container py-8 max-w-4xl">
          <GabaiPersonalArea synagogueName={loggedGabai.name} synagogueId={loggedGabai.id} />
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center relative overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full bg-gold/10"
            style={{ width: 100 + i * 40, height: 100 + i * 40, top: `${10 + i * 10}%`, right: `${5 + i * 8}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }} />
        ))}

        <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 bg-card rounded-3xl shadow-elevated p-10 max-w-lg w-full mx-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-gold px-8 py-2 rounded-full">
            <Sparkles className="w-5 h-5 text-foreground" />
          </div>

          <div className="flex items-center justify-center gap-5 mb-8 mt-4">
            <motion.img src={logoHazor} alt="לוגו" className="h-20 drop-shadow-lg" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} />
            <motion.img src={logoMechubarim} alt="מחוברים" className="h-20 rounded-xl drop-shadow-lg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} />
          </div>

          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-3xl font-display font-black text-foreground text-center mb-2">
            פורטל גבאים
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-muted-foreground text-center text-sm mb-8">
            מחוברים — יהדות וקהילה | חצור הגלילית
          </motion.p>

          <div className="flex gap-2 bg-muted rounded-xl p-1.5 mb-6">
            <button onClick={() => { setLoginType('gabai'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                loginType === 'gabai' ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'
              }`}>
              <User className="w-4 h-4" /> כניסת גבאי
            </button>
            <button onClick={() => { setLoginType('admin'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                loginType === 'admin' ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'
              }`}>
              <Shield className="w-4 h-4" /> כניסת מנהל
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={loginType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {loginType === 'gabai' && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5">שם משתמש</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                      placeholder="הזן שם משתמש" className="pr-10 text-base" dir="ltr" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">{loginType === 'admin' ? 'סיסמת מנהל' : 'סיסמה'}</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder={loginType === 'admin' ? 'הזן סיסמת מנהל' : 'הזן סיסמה'}
                    className="pr-10 pl-10 text-base" dir="ltr" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  {/* The eye sits on the LEFT, and that side is derived rather than
                      copied from the other systems. The page is RTL, but this field
                      carries dir="ltr" — computed direction ltr, text-align start —
                      so characters begin at the LEFT edge, which is normally where
                      the toggle would be wrong. The right edge is already taken by
                      the Lock above (pr-10), so the eye takes the left and pl-10
                      moves the first character clear of it. */}
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    aria-pressed={showPassword} aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                    title={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                    className="absolute left-1 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-destructive text-sm font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />{error}
                </motion.p>
              )}

              <Button onClick={handleLogin} className="w-full bg-gradient-hero text-primary-foreground font-black py-6 text-base gap-2 rounded-xl">
                {loginType === 'admin' ? <Shield className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
                {loginType === 'admin' ? 'כניסה לניהול' : 'כניסה לאזור אישי'}
              </Button>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold">
              <ArrowRight className="w-4 h-4" /> חזרה לאתר הראשי
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero py-5">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              <ArrowRight className="w-5 h-5" /><span className="font-display font-bold text-sm">לאתר</span>
            </Link>
            <button onClick={() => { setView('login'); setPassword(''); setShowPassword(false); }}
              className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-bold">
              <LogOut className="w-4 h-4" /> התנתק
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img src={logoHazor} alt="לוגו" className="h-10" />
            <h1 className="font-display font-black text-primary-foreground text-xl">ניהול בתי כנסת</h1>
          </div>
        </div>
      </header>
      <div className="container py-10 max-w-4xl">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default GabaiPortal;
