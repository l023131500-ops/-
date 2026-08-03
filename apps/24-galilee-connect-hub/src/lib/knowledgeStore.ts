// This store now uses Supabase - kept for type exports only
export interface KnowledgeItem {
  id: string;
  category: string;
  subcategory?: string;
  title: string;
  content: string;
  phone?: string;
  address?: string;
  image_url?: string;
  contact_name?: string;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
}
