// ==== ׳×׳•׳¨ ׳”׳‘׳§׳©׳•׳× ׳‘׳ ׳™׳”׳•׳: ׳¨׳©׳™׳׳”, ׳”׳₪׳§׳” ׳•׳©׳׳™׳—׳” ׳׳׳™׳™׳ ====
//
// ׳–׳”׳• ׳”׳¦׳™׳ ׳•׳¨ ׳©׳”׳׳₪׳¨׳˜ ׳׳×׳׳¨: ׳‘׳§׳©׳” ג†’ ׳”׳×׳¨׳׳” ׳‘׳ ׳™׳”׳•׳ ג†’ ׳¢׳™׳‘׳•׳“ ג†’ ׳©׳׳™׳—׳” ׳‘-Resend.
// ׳”׳”׳₪׳§׳” ׳•׳”׳©׳׳™׳—׳” ׳”׳ ׳₪׳¢׳•׳׳” ׳׳—׳× ׳׳›׳•׳•׳ ׳×: ׳“׳•׳— ׳©׳”׳•׳₪׳§ ׳•׳׳ ׳ ׳©׳׳— ׳”׳•׳ ׳¢׳‘׳•׳“׳” ׳©׳ ׳©׳¨׳₪׳”,
// ׳•׳“׳•׳— ׳©׳ ׳©׳׳— ׳‘׳׳™ ׳©׳”׳•׳₪׳§ ׳׳™׳ ׳• ׳§׳™׳™׳.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import { buildReport } from '@/lib/buildreport';
import { emailConfigured, sendEmail } from '@/lib/email';
import { reportEmailHtml, reportEmailText } from '@/lib/reporthtml';
import {
  claimForProcessing,
  getReportRequest,
  listReportRequests,
  markFailed,
  markSent,
  pendingCount,
  resetToPending,
  tabuForProperty,
  type RequestStatus,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// ׳”׳₪׳§׳× ׳“׳•׳— ׳׳§׳™׳£ ׳׳•׳§׳—׳× ׳¢׳©׳¨׳•׳× ׳©׳ ׳™׳•׳×, ׳•׳׳—׳¨׳™׳” ׳©׳׳™׳—׳× ׳׳™׳™׳. 60 ׳©׳ ׳™׳•׳× ׳ ׳—׳×׳›׳• ׳‘׳׳׳¦׳¢.
export const maxDuration = 300;

const STATUSES: RequestStatus[] = ['pending', 'processing', 'sent', 'failed'];

/** ׳›׳×׳•׳‘׳× ׳”׳‘׳¡׳™׳¡ ׳”׳¦׳™׳‘׳•׳¨׳™׳× ג€” ׳׳×׳׳•׳ ׳•׳× ׳•׳׳§׳™׳©׳•׳¨׳™׳ ׳‘׳×׳•׳ ׳”׳׳™׳™׳. */
function publicBaseUrl(req: NextRequest): string {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}${basePath}`.replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const statusParam = req.nextUrl.searchParams.get('status');
  const status = STATUSES.includes(statusParam as RequestStatus)
    ? (statusParam as RequestStatus)
    : undefined;

  try {
    const [requests, pending] = await Promise.all([
      listReportRequests({ status, limit: 200 }),
      pendingCount(),
    ]);
    return NextResponse.json({
      requests,
      pending,
      emailConfigured: emailConfigured(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '׳©׳’׳™׳׳” ׳‘׳§׳¨׳™׳׳× ׳”׳‘׳§׳©׳•׳×' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '׳’׳•׳£ ׳‘׳§׳©׳” ׳׳ ׳×׳§׳™׳' }, { status: 400 });
  }

  const id = Number(body?.id);
  const action = String(body?.action ?? 'process');
  if (!Number.isFinite(id)) return NextResponse.json({ error: '׳—׳¡׳¨ ׳׳–׳”׳” ׳‘׳§׳©׳”' }, { status: 400 });

  if (action === 'retry') {
    try {
      await resetToPending(id);
      return NextResponse.json({ ok: true, status: 'pending' });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? '׳©׳’׳™׳׳”' }, { status: 500 });
    }
  }

  if (action !== 'process') {
    return NextResponse.json({ error: '׳₪׳¢׳•׳׳” ׳׳ ׳׳•׳›׳¨׳×' }, { status: 400 });
  }

  // ג ן¸ ׳‘׳׳™ ׳¡׳₪׳§ ׳׳™׳™׳ ׳׳™׳ ׳׳”׳×׳—׳™׳: ׳”׳₪׳§׳” ׳¢׳•׳׳” ׳›׳¡׳£ ׳׳׳™׳×׳™ (Places, Apify), ׳•׳׳
  // ׳‘׳¡׳•׳₪׳” ׳׳™׳ ׳“׳¨׳ ׳׳©׳׳•׳— ג€” ׳©׳¨׳₪׳ ׳• ׳׳× ׳”׳¢׳׳•׳× ׳•׳”׳׳§׳•׳— ׳׳ ׳§׳™׳‘׳ ׳›׳׳•׳.
  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error:
          '׳©׳׳™׳—׳× ׳׳™׳™׳ ׳׳™׳ ׳” ׳׳•׳’׳“׳¨׳× (RESEND_API_KEY ׳•-RESEND_FROM). ׳”׳‘׳§׳©׳” ׳׳ ׳¢׳•׳‘׳“׳”, ׳›׳“׳™ ׳׳ ׳׳©׳¨׳•׳£ ׳¢׳׳•׳× ׳”׳₪׳§׳” ׳‘׳׳™ ׳™׳›׳•׳׳× ׳׳©׳׳•׳—.',
      },
      { status: 503 },
    );
  }

  const claimed = await claimForProcessing(id).catch(() => null);
  if (!claimed) {
    const current = await getReportRequest(id).catch(() => null);
    return NextResponse.json(
      {
        error: current
          ? `׳”׳‘׳§׳©׳” ׳׳™׳ ׳” ׳‘׳׳¦׳‘ "׳׳׳×׳™׳" ׳׳׳ "${current.status}". ׳׳ ׳”׳™׳ ׳ ׳›׳©׳׳” ג€” ׳׳₪׳©׳¨ ׳׳”׳—׳–׳™׳¨ ׳׳•׳×׳” ׳׳×׳•׳¨.`
          : '׳”׳‘׳§׳©׳” ׳׳ ׳ ׳׳¦׳׳”.',
      },
      { status: 409 },
    );
  }

  try {
    const report = await buildReport(claimed.query, claimed.tier, {
      entrance: claimed.entrance,
      floor: claimed.floor,
      rooms: claimed.rooms,
    });

    // ׳ ׳¡׳—׳™ ׳˜׳׳‘׳• ׳©׳”׳•׳¢׳׳• ׳•׳ ׳•׳×׳—׳• ׳‘׳ ׳™׳”׳•׳, ׳׳©׳•׳™׳›׳™׳ ׳׳ ׳›׳¡ ׳׳₪׳™ ׳“׳™׳¨׳”/׳›׳ ׳™׳¡׳”/׳‘׳ ׳™׳™׳.
    const tabuDocs = await tabuForProperty({
      gush: report.title.gush,
      helka: report.building.registeredHelka ?? report.title.helka,
      tatHelka: report.unit?.tatHelka ?? null,
      entrance: claimed.entrance,
    }).catch(() => []);

    const baseUrl = publicBaseUrl(req);
    const html = reportEmailHtml(report, {
      baseUrl,
      tabuDocs,
      customerName: claimed.full_name,
    });

    const sent = await sendEmail({
      to: claimed.email,
      subject: `׳“׳•׳— ׳ ׳“׳"׳ ג€” ${report.title.headline}`,
      html,
      text: reportEmailText(report),
    });

    if (!sent.ok) {
      await markFailed(id, sent.error ?? '׳©׳׳™׳—׳× ׳”׳׳™׳™׳ ׳ ׳›׳©׳׳”');
      return NextResponse.json({ error: sent.error, reportProduced: true }, { status: 502 });
    }

    await markSent(id, {
      providerId: sent.id,
      costUsd: report.costUsd,
      // ׳×׳¦׳׳•׳ ׳”׳“׳•׳— ׳©׳ ׳©׳׳— ג€” ׳›׳“׳™ ׳©׳׳₪׳©׳¨ ׳™׳”׳™׳” ׳׳¨׳׳•׳× ׳‘׳“׳™׳•׳§ ׳׳” ׳”׳׳§׳•׳— ׳§׳™׳‘׳.
      snapshot: report,
    });

    return NextResponse.json({
      ok: true,
      status: 'sent',
      emailId: sent.id,
      costUsd: report.costUsd,
      headline: report.title.headline,
      tabuAttached: tabuDocs.length,
      warnings: report.warnings.length,
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await markFailed(id, msg);
    return NextResponse.json({ error: `׳”׳₪׳§׳× ׳”׳“׳•׳— ׳ ׳›׳©׳׳”: ${msg}` }, { status: 500 });
  }
}
