// localStorage persistence layer — schema-ready for Supabase migration
const PREFIX = "fh_";

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // quota exceeded — silently fail
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// Schema reference for future Supabase migration:
// users: id, username, name, email, role, tier, created_at, last_login, business_enabled, onboarding_complete
// transactions: id, user_id, type, amount, category, description, date, is_recurring, is_installment, installment_details
// tasks: id, user_id, title, description, due_date, status, category, completion_note, completed_at
// task_history: id, task_id, user_id, completion_note, completed_at
// suppliers: id, user_id, name, category, phone, email, rating, total_paid, notes
// dynamic_questions: id, text, type, options, target_segment, condition_alerts, required, created_at
// benefits: id, title, description, eligibility, category, icon, status (not_started/in_progress/claimed)
// invoices: id, user_id, client_name, items, total, status, created_at
// academy_content: id, title, type (video/tip), category, content, created_by, created_at
