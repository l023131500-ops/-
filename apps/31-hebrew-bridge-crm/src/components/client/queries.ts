import { queryOptions } from "@tanstack/react-query";
import { getClientDashboard } from "@/lib/client.functions";

export const clientDashboardQueryOptions = queryOptions({
  queryKey: ["clientDashboard"],
  queryFn: () => getClientDashboard(),
});
