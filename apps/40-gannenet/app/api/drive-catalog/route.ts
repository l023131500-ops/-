import { NextResponse } from "next/server";
import { driveItems } from "@/lib/drive-catalog";
import { readOverrides, applyOverrides } from "@/lib/overrides";

// Must be dynamic — overrides are read at request time from storage so admin
// edits (hide file / trim pages) take effect without a redeploy.
export const dynamic = "force-dynamic";

export async function GET() {
  const map = await readOverrides();
  const items = applyOverrides(driveItems, map);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}
