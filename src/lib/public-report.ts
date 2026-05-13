import type { AuditInput, AuditResult, PublicAuditReport } from "./types";

export function buildPublicReport(publicId: string, input: AuditInput, result: AuditResult, summary: string): PublicAuditReport {
  return {
    publicId,
    teamSize: input.teamSize,
    useCase: input.useCase,
    summary,
    result,
    createdAt: new Date().toISOString(),
  };
}
