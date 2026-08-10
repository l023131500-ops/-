import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/**
 * Streams a public ("anyone with the link") Google Drive file through our own origin,
 * so the browser can embed / extract pages from it without cross-origin restrictions.
 * Handles Drive's large-file "virus scan" confirm interstitial.
 */
async function fetchDrive(id: string): Promise<Response> {
  const base = "https://drive.usercontent.google.com/download";
  const first = await fetch(`${base}?id=${id}&export=download`, {
    redirect: "follow",
  });

  const ct = first.headers.get("content-type") || "";
  // Small files come back directly as binary.
  if (!ct.includes("text/html")) return first;

  // Large file → HTML interstitial with a confirm form. Extract hidden inputs.
  const html = await first.text();
  const params: Record<string, string> = {};
  const re = /name="([^"]+)"\s+value="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) params[m[1]] = m[2];

  const confirm = params["confirm"] || "t";
  const uuid = params["uuid"] || "";
  const qs = new URLSearchParams({ id, export: "download", confirm, ...(uuid ? { uuid } : {}) });
  return await fetch(`${base}?${qs.toString()}`, { redirect: "follow" });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!ID_RE.test(id)) {
    return new Response("bad id", { status: 400 });
  }

  try {
    const upstream = await fetchDrive(id);
    if (!upstream.ok || !upstream.body) {
      return new Response("upstream error", { status: 502 });
    }

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const len = upstream.headers.get("content-length");
    const dl = req.nextUrl.searchParams.get("dl") === "1";

    const headers = new Headers();
    headers.set("Content-Type", type);
    if (len) headers.set("Content-Length", len);
    headers.set("Content-Disposition", dl ? "attachment" : "inline");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    return new Response("fetch failed", { status: 500 });
  }
}
