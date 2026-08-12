import { queryOptions } from "@tanstack/react-query";
import { getClientDashboard, getClientConsents } from "@/lib/client.functions";

export const clientDashboardQueryOptions = queryOptions({
  queryKey: ["clientDashboard"],
  queryFn: () => getClientDashboard(),
});

export const clientConsentsQueryOptions = queryOptions({
  queryKey: ["clientConsents"],
  queryFn: () => getClientConsents(),
});
