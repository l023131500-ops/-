import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getVisitorId } from "./visitorId";

// בפריסה תחת more30.com/imud ה-API יושב תחת אותה קידומת נתיב. הקידומת נקבעה
// בזמן build ב-VITE_API_BASE — משתנה שצריך להיעשות בכל בנייה, ובבנייה שהגיעה
// לייצור הוא לא נקבע, ולכן מה שנשלח היה דווקא ברירת המחדל: בסיס ריק, ומכאן
// fetch("/api/books") שפונה לפורטל ומקבל 404. BASE_URL של Vite הוא בדיוק
// ההרכבה שעבורה נבנתה החבילה ("/imud/" מ-vite.config.ts, "/" בפיתוח), ולכן
// גזירה ממנו מחזיקה את השניים מסונכרנים בלי להישען על משתנה סביבה.
// VITE_API_BASE עדיין גובר, למקרה שה-API יושב במקום אחר לגמרי.
const MOUNT = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const ENV_BASE = (import.meta as any).env?.VITE_API_BASE as string | undefined;
export const API_BASE =
  ENV_BASE && ENV_BASE.trim()
    ? ENV_BASE.trim().replace(/\/$/, "")
    : "__PORT_5000__".startsWith("__")
      ? MOUNT
      : "__PORT_5000__";

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
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "X-Visitor-Id": getVisitorId(),
    },
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
      headers: { "X-Visitor-Id": getVisitorId() },
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
