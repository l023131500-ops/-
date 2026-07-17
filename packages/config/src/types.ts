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

/** Lifecycle stage of a system. */
export type Stage = "live" | "beta" | "wip" | "archived" | "protected";

/** Where the system is deployed. */
export type DeployTarget = "railway" | "vercel" | "netlify" | "lovable" | "unknown";

export interface ProjectEntry {
  /** Two-digit registry number, e.g. "01". Drives the URL basePath. */
  number: string;
  /** Stable slug used for the folder name and route. */
  slug: string;
  /** GitHub repo name under l023131500-ops (may differ from slug). */
  repo: string;
  /** Human-facing name. */
  name: string;
  category: Category;
  stage: Stage;
  /** Is the system currently live/serving users? */
  live: boolean;
  /**
   * Supabase schema this system reads/writes. All systems share ONE project
   * (see @more30/db). null = not yet verified against the repo.
   */
  supabaseSchema: string | null;
  deployTarget: DeployTarget;
  /** true = protected, never modify (bkalut-app, bkalot-admin, zr_* schema). */
  protected: boolean;
  /** Short note: known bugs, missing tokens, etc. */
  note?: string;
}
