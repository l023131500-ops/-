import { Outlet } from "react-router-dom";
import { useSuperAdminGate } from "@/hooks/useSuperAdmin";

/* A pathless route element for admin screens that carry no layout of their own.
 * The legacy consoles are mounted standalone by design — they came from another
 * codebase and bring their own chrome — so they cannot inherit AdminLayout's
 * gate the way /admin/* does. This wraps them without wrapping them in a
 * layout. See useSuperAdminGate for what is checked and why. */
export function RequireSuperAdmin() {
  return useSuperAdminGate() ?? <Outlet />;
}
