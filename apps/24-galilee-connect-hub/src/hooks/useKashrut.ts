import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KashrutEstablishment {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  kashrut_level: 'mehadrin' | 'regular' | 'none';
  certifying_body?: string;
  mashgiach_name?: string;
  mashgiach_phone?: string;
  opening_hours?: string;
  notes?: string;
  is_active: boolean;
}

export function useKashrut() {
  const [establishments, setEstablishments] = useState<KashrutEstablishment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('kashrut_establishments')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setEstablishments(data.map(d => ({
        ...d,
        phone: d.phone || undefined,
        kashrut_level: d.kashrut_level as 'mehadrin' | 'regular' | 'none',
        certifying_body: d.certifying_body || undefined,
        mashgiach_name: d.mashgiach_name || undefined,
        mashgiach_phone: d.mashgiach_phone || undefined,
        opening_hours: d.opening_hours || undefined,
        notes: d.notes || undefined,
        is_active: d.is_active ?? true,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return { establishments, loading, refetch: fetchData };
}
