import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @more30/db · core — typed data layer for the `core` registry schema.
 *
 * These helpers power the central admin console (map bugs, manage tasks, produce
 * fixes). They use the SAME Supabase project and the SAME `core` schema that the
 * migration created — no new connections, no new keys. Reads require an
 * authenticated session (RLS); writes require a super admin (RLS policy on
 * public.super_admins). See supabase/migrations/0001_core_schema.sql.
 *
 * Pass a client bound to the `core` schema — e.g. createCoreClient().
 */

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugStatus = "open" | "in_progress" | "closed";
export type TaskStatus = "todo" | "doing" | "done";

export const BUG_STATUSES: BugStatus[] = ["open", "in_progress", "closed"];
export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const BUG_SEVERITIES: BugSeverity[] = ["low", "medium", "high", "critical"];

/** One row of core.project_overview (registry + open bug/task counts). */
export interface ProjectOverviewRow {
  number: string;
  slug: string;
  name: string;
  category: string;
  stage: string;
  live: boolean;
  deploy_target: string | null;
  is_protected: boolean;
  supabase_project: string | null;
  supabase_schema: string | null;
  note: string | null;
  open_bugs: number;
  open_tasks: number;
}

export interface BugRow {
  id: string;
  project_num: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  created_at: string;
}

export interface TaskRow {
  id: string;
  project_num: string;
  title: string;
  status: TaskStatus;
  created_at: string;
}

/** Registry overview, ordered by number (the view already orders). */
export async function listProjectOverview(client: SupabaseClient): Promise<ProjectOverviewRow[]> {
  const { data, error } = await client.from("project_overview").select("*");
  if (error) throw error;
  return (data ?? []) as ProjectOverviewRow[];
}

/** Bugs for one project (or all when projectNum is omitted), newest first. */
export async function listBugs(client: SupabaseClient, projectNum?: string): Promise<BugRow[]> {
  let q = client.from("project_bugs").select("*").order("created_at", { ascending: false });
  if (projectNum) q = q.eq("project_num", projectNum);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BugRow[];
}

/** Tasks for one project (or all when projectNum is omitted), newest first. */
export async function listTasks(client: SupabaseClient, projectNum?: string): Promise<TaskRow[]> {
  let q = client.from("project_tasks").select("*").order("created_at", { ascending: false });
  if (projectNum) q = q.eq("project_num", projectNum);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export interface NewBug {
  project_num: string;
  title: string;
  severity?: BugSeverity;
}

/** Map a new bug against a system. */
export async function createBug(client: SupabaseClient, input: NewBug): Promise<BugRow> {
  const { data, error } = await client
    .from("project_bugs")
    .insert({ project_num: input.project_num, title: input.title, severity: input.severity ?? "medium", status: "open" })
    .select()
    .single();
  if (error) throw error;
  return data as BugRow;
}

export async function setBugStatus(client: SupabaseClient, id: string, status: BugStatus): Promise<void> {
  const { error } = await client.from("project_bugs").update({ status }).eq("id", id);
  if (error) throw error;
}

export interface NewTask {
  project_num: string;
  title: string;
}

/** Add a task (e.g. a planned fix) to a system. */
export async function createTask(client: SupabaseClient, input: NewTask): Promise<TaskRow> {
  const { data, error } = await client
    .from("project_tasks")
    .insert({ project_num: input.project_num, title: input.title, status: "todo" })
    .select()
    .single();
  if (error) throw error;
  return data as TaskRow;
}

export async function setTaskStatus(client: SupabaseClient, id: string, status: TaskStatus): Promise<void> {
  const { error } = await client.from("project_tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

/**
 * Produce a fix from a bug: create a linked "fix" task and move the bug into
 * `in_progress`. This is the map-bug → plan-fix workflow, atomic from the UI's
 * point of view (two writes; both must be permitted by RLS).
 */
export async function produceFixFromBug(client: SupabaseClient, bug: BugRow): Promise<TaskRow> {
  const task = await createTask(client, { project_num: bug.project_num, title: `תיקון: ${bug.title}` });
  await setBugStatus(client, bug.id, "in_progress");
  return task;
}
