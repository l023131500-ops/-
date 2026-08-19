// This store now uses Supabase - kept for type exports only
export type QuestionDestination = 'beit_horaa' | 'rabbi';

export interface RabbiQuestion {
  id: string;
  name: string;
  question: string;
  contact_method: string;
  contact_value: string;
  destination: string;
  urgent: boolean;
  created_at: string;
  is_read: boolean;
}
