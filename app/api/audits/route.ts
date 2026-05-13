import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auditSpend, sanitizeAuditInput } from "@/src/lib/audit";
import { buildPublicReport } from "@/src/lib/public-report";
import { checkRateLimit, requestKey } from "@/src/lib/rate-limit";
import { saveAudit } from "@/src/lib/storage";
import { generatePersonalizedSummary } from "@/src/lib/summary";
import type { AuditInput } from "@/src/lib/types";

export async function POST(request: NextRequest) {
  const key = requestKey(request.headers);
  if (!checkRateLimit(`audit:${key}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many audits from this IP. Please try again later." }, { status: 429 });
  }

  try {
    const raw = (await request.json()) as AuditInput;
    const input = sanitizeAuditInput(raw);
    const result = auditSpend(input);
    const summary = await generatePersonalizedSummary(input, result);
    const publicId = randomUUID().split("-")[0];
    const publicReport = buildPublicReport(publicId, input, result, summary);

    await saveAudit({
      public_id: publicId,
      input,
      result,
      public_report: publicReport,
      summary,
      created_at: publicReport.createdAt,
    });

    const shareUrl = new URL(`/a/${publicId}`, process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    return NextResponse.json({ publicId, shareUrl, result, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown audit error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
