/**
 * Shared types for the more30 project registry.
 *
 * The registry here is the build-time source of truth for routing (basePath).
 * The runtime source of truth for admin/portal is the `core.projects` table in
 * Supabase, which mirrors these fields. Keep the two in sync (see
 * supabase/seed/core_projects_seed.sql).
 */

export type Category =
  | "hub"
  | "transcription"
  | "advertising"
  | "torah"
  | "finance"
  | "health"
  | "commerce"
  | "rights"
  | "marketing"
  | "realestate"
  | "events"
  | "crm"
  | "other";

/**
 * Lifecycle stage of a system.
 *
 * `idea` was missing here while `core.projects` already held two rows carrying
 * it (37, 38) — the union was written before those rows existed, and nothing
 * checks one against the other. Added 10/08 so the two lists can hold the same
 * value; it means scoped but not started, one step earlier than `wip`.
 */
export type Stage = "idea" | "live" | "beta" | "wip" | "archived" | "protected";

/** Where the system is deployed. */
export type DeployTarget = "railway" | "vercel" | "netlify" | "lovable" | "unknown";

/** Business department (Phase 1 grouping). Distinct from the finer `category`. */
export type Department =
  | "torah"       // עורך תורני (תמלול, מודעות, עימוד, הגהה, HUB)
  | "finance"     // פיננסי
  | "realestate"  // נדל"ן
  | "health"      // בריאות וקופות
  | "rights"      // זכויות
  | "community"   // קהילה ואזורי
  | "bkalut"      // מותג בקלות (מוגן)
  | "misc";       // שונות / מסחר

export interface ProjectEntry {
  /** Two-digit registry number, e.g. "01". Drives the URL basePath. */
  number: string;
  /** Stable slug used for the folder name and route. */
  slug: string;
  /** GitHub repo name under l023131500-ops (may differ from slug). */
  repo: string;
  /** Human-facing name. */
  name: string;
  /** Business department (Phase 1 grouping). */
  department: Department;
  category: Category;
  stage: Stage;
  /** Is the system currently live/serving users? */
  live: boolean;
  /** Is the system deployed anywhere (vercel/railway/...)? */
  isDeployed?: boolean;
  /** Public URL if live/deployed. */
  liveUrl?: string | null;
  /** Admin-login URL for the system, if known. */
  adminUrl?: string | null;
  /**
   * Supabase project ref this system uses. Systems are NOT all on one project —
   * verified: igud-transcribe is on its own project. undefined = not yet verified.
   */
  supabaseProject?: string | null;
  /**
   * Supabase schema this system reads/writes. null = not yet verified against
   * the repo.
   */
  supabaseSchema: string | null;
  deployTarget: DeployTarget;
  /** true = protected, never modify (bkalut-app, bkalot-admin, zr_* schema). */
  protected: boolean;
  /** Short note: known bugs, missing tokens, etc. */
  note?: string;
}
