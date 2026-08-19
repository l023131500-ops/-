import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Replit injects the dev server origin over the "__PORT_5000__" token; outside
// Replit it stays a literal and resolves to "" (same-origin).
const INJECTED_ORIGIN = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// When the app is served under a path prefix (more30.com/chizukim), the API
// lives at "<prefix>/api/...". Set VITE_API_BASE=/chizukim at build time.
// Unset -> unchanged same-origin behaviour, so existing deployments are safe.
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) || INJECTED_ORIGIN;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
