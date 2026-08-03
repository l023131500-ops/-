/**
 * proxyFetch — קריאות fetch מאומתות דרך פרוקסי ה-custom-cred של הפלטפורמה.
 *
 * מנגנון: הפלטפורמה מזריקה לכל מפתח (custom-cred) משתנה סביבה
 *   CUSTOM_CRED_<HOST>_TOKEN=agp_...  (וכן _URL).
 * כל טוקן כזה משמש כסיסמת פרוקסי אל agent-proxy.perplexity.ai, אך מאמת אך ורק
 * את ה-host שאליו שייך המפתח. לכן חייבים dispatcher (ProxyAgent) נפרד לכל host,
 * ולנתב כל בקשה לפי ה-hostname שלה.
 *
 * בסביבת bash/dev, HTTPS_PROXY כבר מוגדר עם טוקן אחד — נשתמש בו כברירת מחדל.
 *
 * הערה: Node global fetch (undici) מתעלם מ-HTTPS_PROXY אלא אם מעבירים dispatcher
 * מפורש, ובנוסף צריך את תעודת ה-CA של הפרוקסי כדי לסמוך על ה-MITM.
 */
import { ProxyAgent } from "undici";
import { readFileSync } from "node:fs";

const PROXY_ORIGIN = "agent-proxy.perplexity.ai";

function loadCa(): Buffer | undefined {
  const caPath = process.env.NODE_EXTRA_CA_CERTS || "/etc/ssl/certs/agent-proxy-ca-2.pem";
  try {
    return readFileSync(caPath);
  } catch {
    return undefined;
  }
}
const CA = loadCa();

/** בונה מפה: hostname יעד -> ProxyAgent עם הטוקן המתאים. */
function buildDispatchers(): Map<string, ProxyAgent> {
  const map = new Map<string, ProxyAgent>();
  const mkAgent = (token: string) =>
    new ProxyAgent({
      uri: `https://x:${token}@${PROXY_ORIGIN}`,
      requestTls: CA ? { ca: CA } : undefined,
    });

  // מנגנון start_server / publish: CUSTOM_CRED_<HOST>_TOKEN לכל מפתח.
  for (const [key, val] of Object.entries(process.env)) {
    if (!val) continue;
    const m = key.match(/^CUSTOM_CRED_(.+)_TOKEN$/);
    if (!m) continue;
    // CUSTOM_CRED_API_ANTHROPIC_COM_TOKEN -> api.anthropic.com
    const host = m[1].toLowerCase().replace(/_/g, ".");
    map.set(host, mkAgent(val));
  }
  return map;
}

const DISPATCHERS = buildDispatchers();

// fallback dispatcher מ-HTTPS_PROXY (סביבת bash/dev עם טוקן יחיד).
let FALLBACK: ProxyAgent | undefined;
const directProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (directProxy) {
  try {
    FALLBACK = new ProxyAgent({ uri: directProxy, requestTls: CA ? { ca: CA } : undefined });
  } catch {
    /* ignore */
  }
}

export function proxyStatus(): string {
  const hosts = Array.from(DISPATCHERS.keys());
  return hosts.length
    ? `[proxy] ${hosts.length} מפתחות custom-cred פעילים: ${hosts.join(", ")}`
    : FALLBACK
      ? "[proxy] פרוקסי HTTPS_PROXY יחיד פעיל (dev)"
      : "[proxy] אין פרוקסי — קריאות AI ייכשלו";
}

/** בוחר dispatcher לפי ה-hostname של ה-URL. */
function dispatcherFor(url: string): ProxyAgent | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return FALLBACK;
  }
  return DISPATCHERS.get(host) || FALLBACK;
}

/** fetch מאומת: מנתב אוטומטית ל-ProxyAgent הנכון לפי ה-host. */
export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const dispatcher = dispatcherFor(url);
  // @ts-expect-error — undici dispatcher נתמך ע"י Node fetch בזמן ריצה
  return fetch(url, dispatcher ? { ...init, dispatcher } : init);
}
