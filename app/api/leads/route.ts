import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requestKey } from "@/src/lib/rate-limit";
import { sendAuditEmail } from "@/src/lib/email";
import { getPublicAudit, saveLead } from "@/src/lib/storage";
import type { LeadPayload } from "@/src/lib/types";

export async function POST(request: NextRequest) {
  const key = requestKey(request.headers);
  if (!checkRateLimit(`lead:${key}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many lead submissions from this IP. Please try again later." }, { status: 429 });
  }

  const payload = (await request.json()) as LeadPayload;

  if (payload.website) {
    return NextResponse.json({ ok: true, suppressed: true });
  }

  if (!payload.publicId || !isEmail(payload.email)) {
    return NextResponse.json({ error: "A valid email and audit id are required." }, { status: 400 });
  }

  const report = await getPublicAudit(payload.publicId);
  await saveLead(payload, report?.result);
  const email = await sendAuditEmail(payload, report?.result);

  return NextResponse.json({ ok: true, email });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
