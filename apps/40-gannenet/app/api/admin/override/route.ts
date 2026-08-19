import { NextRequest, NextResponse } from "next/server";
import { setOverride } from "@/lib/overrides";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{6,}$/;

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return new NextResponse("unauthorized", { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("bad body", { status: 400 });
  }
  const fileId = String(body?.fileId || "");
  if (!ID_RE.test(fileId)) return new NextResponse("bad id", { status: 400 });

  const hidden = Boolean(body?.hidden);
  const rawPages: any[] = Array.isArray(body?.hiddenPages) ? body.hiddenPages : [];
  const nums: number[] = rawPages
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  const hiddenPages: number[] = Array.from(new Set<number>(nums)).sort((a, b) => a - b);

  const map = await setOverride(fileId, { hidden, hiddenPages });
  return NextResponse.json({ ok: true, override: map[fileId] || {} });
}
