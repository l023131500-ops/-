import { NextResponse } from "next/server";
import { driveItems } from "@/lib/drive-catalog";

export const dynamic = "force-static";

// Serves the full Drive catalog to the shelf list (client fetches once, then
// filters/paginates locally). Cached aggressively — the catalog is build-time data.
export async function GET() {
  return NextResponse.json(
    { items: driveItems },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } }
  );
}
