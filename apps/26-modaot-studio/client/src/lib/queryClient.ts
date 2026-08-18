import { QueryClient, QueryFunction } from "@tanstack/react-query";

// The bundle ships under a path prefix (more30.com/studio), where root-relative
// /api calls reach the portal instead of the studio server and come back 404.
// Vite's BASE_URL is exactly the mount the bundle was built for — "/studio/" in
// production, "/" in dev — so deriving the prefix from it keeps the two in step
// without a build-time env var. VITE_API_BASE still wins when the API lives
// somewhere else entirely.
const MOUNT = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  ("__PORT_5000__".startsWith("__") ? MOUNT : "__PORT_5000__");

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * טוקן ה-session המשותף של הכפתור הראשי (auth-button.js), אם קיים ותקף.
 * more30.com/studio חולק origin עם שאר המערכות, ולכן localStorage['more30-auth']
 * זמין כאן בדיוק כמו בכל אתר אחר — בלי חיבור נוסף ל-supabase-js בלקוח.
 * אין session / פג תוקף → undefined, והבקשה ממשיכה בלי הכותרת (אנונימי, כמו היום).
 */
function authToken(): string | undefined {
  try {
    const raw = localStorage.getItem("more30-auth");
    if (!raw) return undefined;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s?.user) return undefined;
    if (s.expires_at && s.expires_at * 1000 <= Date.now()) return undefined;
    return s.access_token as string;
  } catch {
    return undefined;
  }
}

function authHeaders(): Record<string, string> {
  const token = authToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...authHeaders() },
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
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, { headers: authHeaders() });

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
