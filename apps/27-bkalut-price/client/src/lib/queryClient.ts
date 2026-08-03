import { QueryClient, QueryFunction } from "@tanstack/react-query";

// VITE_API_BASE lets the same bundle be served under a path prefix (e.g. the
// more30.com/mechiron deployment sets it to "/mechiron"). Unset = current
// behaviour: same-origin, root-relative /api calls.
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__");

// In-memory only — survives navigation while the SPA is mounted. Refreshing the page logs out.
// This is intentional: we avoid localStorage/sessionStorage/cookies in the sandbox.
let adminToken: string | null = null;
let userToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();
const userTokenListeners = new Set<(token: string | null) => void>();

export function getAdminToken() {
  return adminToken;
}

export function setAdminToken(token: string | null) {
  adminToken = token;
  notifyListeners(token);
}

export function subscribeAdminToken(listener: (token: string | null) => void) {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function getUserToken() {
  return userToken;
}
export function setUserToken(token: string | null) {
  userToken = token;
  userTokenListeners.forEach((l) => { try { l(token); } catch {} });
}
export function subscribeUserToken(listener: (token: string | null) => void) {
  userTokenListeners.add(listener);
  return () => { userTokenListeners.delete(listener); };
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  // Admin token takes precedence for /api/admin/* and admin-restricted routes.
  // User token is used otherwise (e.g. /api/me/*).
  if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
  else if (userToken) headers["Authorization"] = `Bearer ${userToken}`;
  return headers;
}

// downlevel-friendly iteration of listeners — avoids ES2015+ iteration requirement.
function notifyListeners(token: string | null) {
  tokenListeners.forEach((l) => {
    try { l(token); } catch { /* ignore */ }
  });
}

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
    headers: buildHeaders(Boolean(data)),
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
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
      headers: buildHeaders(false),
    });

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
