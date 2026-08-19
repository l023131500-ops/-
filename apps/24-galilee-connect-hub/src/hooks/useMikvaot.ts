import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Mikveh {
  id: string;
  name: string;
  type: 'men' | 'women';
  address: string;
  phone?: string;
  manager_name?: string;
  manager_phone?: string;
  rabbi_tahara_name?: string;
  rabbi_tahara_phone?: string;
  opening_hours?: string;
  bride_groom_counselor_name?: string;
  bride_groom_counselor_phone?: string;
  notes?: string;
  is_active: boolean;
}

export function useMikvaot() {
  const [mikvaot, setMikvaot] = useState<Mikveh[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('mikvaot')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setMikvaot(data.map(d => ({
        ...d,
        type: d.type as 'men' | 'women',
        phone: d.phone || undefined,
        manager_name: d.manager_name || undefined,
        manager_phone: d.manager_phone || undefined,
        rabbi_tahara_name: d.rabbi_tahara_name || undefined,
        rabbi_tahara_phone: d.rabbi_tahara_phone || undefined,
        opening_hours: d.opening_hours || undefined,
        bride_groom_counselor_name: d.bride_groom_counselor_name || undefined,
        bride_groom_counselor_phone: d.bride_groom_counselor_phone || undefined,
        notes: d.notes || undefined,
        is_active: d.is_active ?? true,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return { mikvaot, loading, refetch: fetchData };
}
