import { queryOptions } from "@tanstack/react-query";
import { getClientDashboard, getClientConsents, getClientMessages } from "@/lib/client.functions";

export const clientDashboardQueryOptions = queryOptions({
  queryKey: ["clientDashboard"],
  queryFn: () => getClientDashboard(),
});

export const clientConsentsQueryOptions = queryOptions({
  queryKey: ["clientConsents"],
  queryFn: () => getClientConsents(),
});

export const clientMessagesQueryOptions = queryOptions({
  queryKey: ["clientMessages"],
  queryFn: () => getClientMessages(),
});
