import { describe, expect, it } from "vitest";
import { auditSpend } from "./audit";
import type { AuditInput } from "./types";

describe("auditSpend", () => {
  it("downgrades Cursor Business for a two-person team", () => {
    const result = auditSpend({
      teamSize: 2,
      useCase: "coding",
      tools: [{ id: "1", toolId: "cursor", planId: "business", seats: 2, monthlySpend: 80 }],
    });

    expect(result.recommendations[0].action).toContain("Cursor Pro");
    expect(result.recommendations[0].monthlySavings).toBe(40);
  });

  it("applies discounted credits for high API spend", () => {
    const result = auditSpend({
      teamSize: 12,
      useCase: "mixed",
      tools: [{ id: "1", toolId: "openai_api", planId: "frontier", seats: 1, monthlySpend: 1000 }],
    });

    expect(result.recommendations[0].action).toContain("discounted credits");
    expect(result.recommendations[0].monthlySavings).toBe(350);
  });

  it("is honest when spend is already efficient", () => {
    const result = auditSpend({
      teamSize: 1,
      useCase: "coding",
      tools: [{ id: "1", toolId: "github_copilot", planId: "individual", seats: 1, monthlySpend: 10 }],
    });

    expect(result.spendingWell).toBe(true);
    expect(result.totalMonthlySavings).toBe(0);
    expect(result.recommendations[0].severity).toBe("good");
  });

  it("totals annual savings from monthly recommendations", () => {
    const result = auditSpend({
      teamSize: 1,
      useCase: "writing",
      tools: [{ id: "1", toolId: "chatgpt", planId: "pro", seats: 1, monthlySpend: 200 }],
    });

    expect(result.totalMonthlySavings).toBe(180);
    expect(result.totalAnnualSavings).toBe(2160);
  });

  it("flags duplicated Cursor and Copilot coding spend", () => {
    const input: AuditInput = {
      teamSize: 6,
      useCase: "coding",
      tools: [
        { id: "1", toolId: "cursor", planId: "pro", seats: 6, monthlySpend: 120 },
        { id: "2", toolId: "github_copilot", planId: "business", seats: 6, monthlySpend: 114 },
      ],
    };

    const result = auditSpend(input);
    const copilot = result.recommendations.find((item) => item.toolId === "github_copilot");

    expect(copilot?.action).toContain("Consolidate");
    expect(copilot?.recommendedMonthlySpend).toBe(60);
  });

  it("marks very large savings as Credex eligible", () => {
    const result = auditSpend({
      teamSize: 50,
      useCase: "data",
      tools: [{ id: "1", toolId: "anthropic_api", planId: "opus", seats: 1, monthlySpend: 2000 }],
    });

    expect(result.credexEligible).toBe(true);
    expect(result.totalMonthlySavings).toBe(700);
  });
});
