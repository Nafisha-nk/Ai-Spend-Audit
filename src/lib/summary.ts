import { formatCurrency } from "./format";
import type { AuditInput, AuditResult } from "./types";

export function fallbackSummary(input: AuditInput, result: AuditResult) {
  const topRecommendation = [...result.recommendations].sort((a, b) => b.monthlySavings - a.monthlySavings)[0];

  if (result.spendingWell) {
    return `Your ${input.useCase} stack is already fairly disciplined. The audit found ${formatCurrency(result.totalMonthlySavings)} in likely monthly savings, which is below the threshold where a major procurement change is worth the switching cost. Keep reviewing seat counts monthly, watch for duplicate assistants as the team grows, and sign up for alerts when new vendor pricing or credit opportunities change the economics.`;
  }

  return `Your AI stack shows ${formatCurrency(result.totalMonthlySavings)} in likely monthly savings, or ${formatCurrency(result.totalAnnualSavings)} per year. The biggest lever is ${topRecommendation.toolName}: ${topRecommendation.action.toLowerCase()}. The recommendation is based on seats, use case, and current vendor pricing rather than a generic “cheapest tool wins” rule. ${result.credexEligible ? "Because the savings are material, discounted credits are worth exploring before renewing retail spend." : "The next step is to clean up plan fit before negotiating larger discounts."}`;
}

export async function generatePersonalizedSummary(input: AuditInput, result: AuditResult) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackSummary(input, result);
  }

  try {
    const prompt = buildSummaryPrompt(input, result);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 180,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return fallbackSummary(input, result);
    }

    const payload = (await response.json()) as { content?: Array<{ text?: string }> };
    const text = payload.content?.map((item) => item.text).filter(Boolean).join(" ").trim();
    return text || fallbackSummary(input, result);
  } catch {
    return fallbackSummary(input, result);
  }
}

export function buildSummaryPrompt(input: AuditInput, result: AuditResult) {
  const recommendationLines = result.recommendations
    .map((item) => `- ${item.toolName} ${item.planName}: current $${item.currentMonthlySpend}/mo, recommended $${item.recommendedMonthlySpend}/mo, action: ${item.action}, reason: ${item.reason}`)
    .join("\n");

  return `Write a clear, specific, finance-literate audit summary in about 100 words.

Rules:
- Do not invent tools, prices, users, sources, or guarantees.
- Be honest if savings are low.
- Mention Credex only if monthly savings exceed $500 or discounted credits are relevant.
- Use plain language for a startup founder or engineering manager.

Audit context:
Team size: ${input.teamSize}
Primary use case: ${input.useCase}
Total current spend: $${result.totalMonthlySpend}/mo
Total recommended spend: $${result.totalRecommendedMonthlySpend}/mo
Total savings: $${result.totalMonthlySavings}/mo, $${result.totalAnnualSavings}/yr
Credex eligible: ${result.credexEligible ? "yes" : "no"}

Recommendations:
${recommendationLines}`;
}
