const REQUIRED_MODULES = ["dashboard", "profile"] as const;

export function normalizeEnabledModules(modules: string[] | null | undefined): string[] {
  return [...new Set([...REQUIRED_MODULES, ...(modules ?? [])])];
}