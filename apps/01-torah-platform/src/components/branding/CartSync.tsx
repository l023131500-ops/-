import { useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useCart } from "@/hooks/useCart";

/** Syncs the cart's tenant scope with the current resolved tenant — clears items when tenant changes. */
export function CartSync() {
  const { tenant } = useTenant();
  const setTenant = useCart((s) => s.setTenant);
  useEffect(() => {
    if (tenant?.id) setTenant(tenant.id);
  }, [tenant?.id, setTenant]);
  return null;
}
