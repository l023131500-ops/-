import { NextRequest, NextResponse } from "next/server";
import { setOverride } from "@/lib/overrides";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9_-]{6,}$/;

const REASON_MSG: Record<string, string> = {
  unconfigured: "השמירה אינה זמינה — חסר SUPABASE_ANON_KEY בסביבת השרת.",
  write: "השמירה נכשלה — נסו שוב.",
};

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

  // `"reason" in result`, not `!result.ok` — same reason `/api/catalog` and
  // `/api/admin/delete` use the same check (see ai-generate/route.ts comment):
  // strict:false in this tsconfig turns off boolean-field type narrowing.
  const result = await setOverride(fileId, { hidden, hiddenPages });
  if ("reason" in result) {
    const status = result.reason === "unconfigured" ? 503 : 500;
    return NextResponse.json({ error: REASON_MSG[result.reason] }, { status });
  }
  return NextResponse.json({ ok: true, override: result.override });
}
