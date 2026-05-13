import { formatCurrency } from "./format";
import type { AuditResult, LeadPayload } from "./types";

type EmailResult = {
  sent: boolean;
  skippedReason?: string;
};

export async function sendAuditEmail(lead: LeadPayload, result?: AuditResult): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, skippedReason: "RESEND_API_KEY not configured" };
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/a/${lead.publicId}`;
  const savingsLine = result
    ? `Your audit found ${formatCurrency(result.totalMonthlySavings)} in likely monthly savings (${formatCurrency(result.totalAnnualSavings)} annually).`
    : "Your audit report is ready.";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "AI Spend Audit <audit@example.com>",
      to: [lead.email],
      subject: "Your AI spend audit is ready",
      text: [
        "Thanks for using AI Spend Audit.",
        "",
        savingsLine,
        `Public report: ${shareUrl}`,
        "",
        result?.credexEligible
          ? "Your savings are large enough that Credex-style discounted credits may be worth a consultation."
          : "Your stack looks reasonably efficient; we will notify you when new optimizations apply.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    return { sent: false, skippedReason: `Resend returned ${response.status}` };
  }

  return { sent: true };
}
