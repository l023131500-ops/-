import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SynagogueGabbai {
  id: string;
  name: string;
  phone: string;
}

export interface SynagoguePrayerTime {
  id: string;
  name: string;
  time: string;
  day: 'weekday' | 'shabbat' | 'holiday';
  no_minyan: boolean;
}

export interface SynagogueLesson {
  id: string;
  subject: string;
  teacher: string;
  day: string;
  time: string;
  audience?: string;
  location?: string;
}

export interface SynagogueAnnouncement {
  id: string;
  content: string;
  image_url?: string;
  is_active: boolean;
}

export interface SynagogueDB {
  id: string;
  name: string;
  neighborhood: string;
  nusach: string;
  rabbi?: string;
  address: string;
  logo_url?: string;
  background_preset: number;
  donation_link?: string;
  gabaiim: SynagogueGabbai[];
  prayerTimes: SynagoguePrayerTime[];
  lessons: SynagogueLesson[];
  announcements: SynagogueAnnouncement[];
}

export function useSynagogues() {
  const [synagogues, setSynagogues] = useState<SynagogueDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSynagogues = async () => {
    try {
      const [synRes, gabRes, prayerRes, lessonRes, annRes] = await Promise.all([
        supabase.from('synagogues').select('*').order('name'),
        supabase.from('synagogue_gabbaim').select('*'),
        supabase.from('synagogue_prayer_times').select('*'),
        supabase.from('synagogue_lessons').select('*'),
        supabase.from('synagogue_announcements').select('*').eq('is_active', true),
      ]);

      if (synRes.error) throw synRes.error;

      const assembled: SynagogueDB[] = (synRes.data || []).map(syn => ({
        id: syn.id,
        name: syn.name,
        neighborhood: syn.neighborhood,
        nusach: syn.nusach,
        rabbi: syn.rabbi || undefined,
        address: syn.address,
        logo_url: syn.logo_url || undefined,
        background_preset: syn.background_preset || 1,
        donation_link: syn.donation_link || undefined,
        gabaiim: (gabRes.data || []).filter(g => g.synagogue_id === syn.id).map(g => ({ id: g.id, name: g.name, phone: g.phone })),
        prayerTimes: (prayerRes.data || []).filter(p => p.synagogue_id === syn.id).map(p => ({
          id: p.id, name: p.name, time: p.time, day: p.day as 'weekday' | 'shabbat' | 'holiday', no_minyan: p.no_minyan || false,
        })),
        lessons: (lessonRes.data || []).filter(l => l.synagogue_id === syn.id).map(l => ({
          id: l.id, subject: l.subject, teacher: l.teacher, day: l.day, time: l.time,
          audience: l.audience || undefined, location: l.location || undefined,
        })),
        announcements: (annRes.data || []).filter(a => a.synagogue_id === syn.id).map(a => ({
          id: a.id, content: a.content, image_url: a.image_url || undefined, is_active: a.is_active ?? true,
        })),
      }));

      setSynagogues(assembled);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSynagogues();
  }, []);

  return { synagogues, loading, error, refetch: fetchSynagogues };
}

export function useSynagogue(id: string | undefined) {
  const { synagogues, loading, error, refetch } = useSynagogues();
  const synagogue = synagogues.find(s => s.id === id) || null;
  return { synagogue, loading, error, refetch };
}
