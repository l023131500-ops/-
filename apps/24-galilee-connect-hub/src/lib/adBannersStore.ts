// This store now uses Supabase - kept for type exports only
export interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link?: string;
  size: string;
  position: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}
