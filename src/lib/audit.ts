import { CREDEX_CREDIT_DISCOUNT_RATE, estimateListPrice, getPlan, getTool, isCustomPriced, isUsagePriced, roundMoney } from "./pricing";
import type { AuditInput, AuditResult, RecommendationSeverity, ToolRecommendation, UseCase } from "./types";

type Candidate = {
  recommendedMonthlySpend: number;
  action: string;
  reason: string;
  sourceUrls?: string[];
};

type MutableRecommendation = ToolRecommendation;

const apiToolIds = new Set(["anthropic_api", "openai_api"]);

export function auditSpend(input: AuditInput): AuditResult {
  const cleanInput = sanitizeAuditInput(input);
  const hasCursor = cleanInput.tools.some((tool) => tool.toolId === "cursor" && tool.monthlySpend > 0);
  const hasCopilot = cleanInput.tools.some((tool) => tool.toolId === "github_copilot" && tool.monthlySpend > 0);

  const recommendations = cleanInput.tools.map((selection) => {
    const tool = getTool(selection.toolId);
    const plan = getPlan(selection.toolId, selection.planId);
    const listPrice = estimateListPrice(selection.toolId, selection.planId, selection.seats);
    const currentMonthlySpend = roundMoney(selection.monthlySpend || listPrice);
    const base: MutableRecommendation = {
      toolId: selection.toolId,
      toolName: tool?.name ?? selection.toolId,
      planId: selection.planId,
      planName: plan?.name ?? selection.planId,
      seats: selection.seats,
      currentMonthlySpend,
      recommendedMonthlySpend: currentMonthlySpend,
      monthlySavings: 0,
      annualSavings: 0,
      action: "Keep current setup",
      reason: "Your entered spend is close to the defensible baseline for this plan and use case.",
      severity: "good",
      sourceUrls: plan?.sourceUrl ? [plan.sourceUrl] : [],
    };

    applyListPriceCheck(base, listPrice);
    applyPlanFitRules(base, selection.planId, cleanInput.teamSize, cleanInput.useCase);
    applyDuplicateToolRules(base, hasCursor, hasCopilot, cleanInput.useCase);
    applyCreditRules(base, selection.planId);
    finalizeRecommendation(base);
    return base;
  });

  const totalMonthlySpend = roundMoney(sum(recommendations.map((item) => item.currentMonthlySpend)));
  const totalRecommendedMonthlySpend = roundMoney(sum(recommendations.map((item) => item.recommendedMonthlySpend)));
  const totalMonthlySavings = roundMoney(sum(recommendations.map((item) => item.monthlySavings)));

  return {
    recommendations,
    totalMonthlySpend,
    totalRecommendedMonthlySpend,
    totalMonthlySavings,
    totalAnnualSavings: roundMoney(totalMonthlySavings * 12),
    credexEligible: totalMonthlySavings > 500 || recommendations.some((item) => item.action.includes("discounted credits")),
    spendingWell: totalMonthlySavings < 100,
    generatedAt: new Date().toISOString(),
  };
}

export function sanitizeAuditInput(input: AuditInput): AuditInput {
  const teamSize = clampInteger(input.teamSize, 1, 100000);
  const useCase = isUseCase(input.useCase) ? input.useCase : "mixed";
  const tools = input.tools
    .slice(0, 20)
    .map((tool, index) => {
      const catalogTool = getTool(tool.toolId);
      const firstPlan = catalogTool?.plans[0]?.id ?? tool.planId;
      const validPlan = catalogTool?.plans.some((plan) => plan.id === tool.planId);
      return {
        id: tool.id || `tool-${index + 1}`,
        toolId: catalogTool?.id ?? "chatgpt",
        planId: validPlan ? tool.planId : firstPlan,
        monthlySpend: Math.max(0, roundMoney(Number(tool.monthlySpend) || 0)),
        seats: clampInteger(tool.seats, 1, 100000),
      };
    })
    .filter((tool) => getTool(tool.toolId));

  return {
    teamSize,
    useCase,
    tools: tools.length ? tools : [{ id: "tool-1", toolId: "chatgpt", planId: "plus", monthlySpend: 20, seats: 1 }],
  };
}

function applyListPriceCheck(base: MutableRecommendation, listPrice: number) {
  if (listPrice <= 0 || isUsagePriced(base.toolId, base.planId) || isCustomPriced(base.toolId, base.planId)) {
    return;
  }

  if (base.currentMonthlySpend > listPrice * 1.15) {
    applyCandidate(base, {
      recommendedMonthlySpend: listPrice,
      action: "Reconcile seats and billing to public list price",
      reason: `The entered spend is materially above the current list price for ${base.planName}; review inactive seats, add-ons, or annual/monthly billing differences.`,
    });
  }
}

function applyPlanFitRules(base: MutableRecommendation, planId: string, teamSize: number, useCase: UseCase) {
  if (base.toolId === "cursor") {
    if ((planId === "business" || planId === "enterprise") && base.seats <= 2) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Downgrade small team to Cursor Pro",
        reason: "For one or two users, Cursor Pro usually captures the coding value without team billing, analytics, and admin overhead.",
      });
    }

    if (planId === "enterprise" && teamSize < 25) {
      applyCandidate(base, {
        recommendedMonthlySpend: 40 * base.seats,
        action: "Use Cursor Business before Enterprise",
        reason: "A sub-25 person team rarely needs enterprise procurement controls before it has centralized team billing and usage visibility in place.",
      });
    }
  }

  if (base.toolId === "github_copilot") {
    if (planId === "enterprise" && teamSize < 50) {
      applyCandidate(base, {
        recommendedMonthlySpend: 19 * base.seats,
        action: "Use Copilot Business instead of Enterprise",
        reason: "Copilot Business covers most organization controls; Enterprise is easier to justify once knowledge-base and premium-request needs are clear.",
      });
    }

    if (planId === "business" && base.seats <= 2) {
      applyCandidate(base, {
        recommendedMonthlySpend: 10 * base.seats,
        action: "Use individual Copilot seats",
        reason: "For one or two developers without org policy requirements, individual seats avoid business-plan overhead.",
      });
    }
  }

  if (base.toolId === "claude") {
    if ((planId === "team" || planId === "team_premium") && base.seats < 5) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Use Claude Pro until the team reaches 5 seats",
        reason: "Claude Team is positioned for teams of 5 to 150; smaller groups can usually start with Pro seats and revisit admin needs later.",
      });
    }

    if (planId === "max" && !["coding", "research", "data"].includes(useCase)) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Use Claude Pro instead of Max",
        reason: "Max is priced for heavy sessions; writing or mixed light usage usually starts with Pro before a power-user upgrade.",
      });
    }
  }

  if (base.toolId === "chatgpt") {
    if (planId === "team" && base.seats <= 2) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Use ChatGPT Plus until collaboration controls matter",
        reason: "A one or two person team can often avoid business-workspace pricing until shared connectors, admin controls, or compliance needs appear.",
      });
    }

    if (planId === "pro" && !["research", "data"].includes(useCase)) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Downgrade routine usage to ChatGPT Plus",
        reason: "Pro is a power-user tier; routine writing, coding support, or mixed usage should prove Plus is insufficient before paying the 10x premium.",
      });
    }
  }

  if (base.toolId === "gemini" && planId === "ultra" && useCase !== "research") {
    applyCandidate(base, {
      recommendedMonthlySpend: 19.99 * base.seats,
      action: "Use Google AI Pro before Ultra",
      reason: "Ultra is strongest when the highest limits are actually used; Pro is the cheaper baseline for most startup productivity and coding workflows.",
    });
  }

  if (base.toolId === "v0") {
    if ((planId === "team" || planId === "business") && base.seats <= 2) {
      applyCandidate(base, {
        recommendedMonthlySpend: 20 * base.seats,
        action: "Use v0 Premium for a tiny team",
        reason: "For one or two builders, Premium captures the core v0 workflow without shared billing and team controls.",
      });
    }

    if (planId === "business" && teamSize < 20) {
      applyCandidate(base, {
        recommendedMonthlySpend: 30 * base.seats,
        action: "Use v0 Team before Business",
        reason: "Business privacy controls are valuable, but smaller teams should prove they need them before paying the higher per-seat rate.",
      });
    }
  }
}

function applyDuplicateToolRules(base: MutableRecommendation, hasCursor: boolean, hasCopilot: boolean, useCase: UseCase) {
  if (useCase !== "coding" || !hasCursor || !hasCopilot || base.toolId !== "github_copilot") {
    return;
  }

  const lightCopilotSeatCost = Math.min(10 * base.seats, base.currentMonthlySpend);
  applyCandidate(base, {
    recommendedMonthlySpend: lightCopilotSeatCost,
    action: "Consolidate overlapping coding assistants",
    reason: "Using Cursor and Copilot for the same developers often double-pays for coding assistance; keep one primary agentic tool and retain Copilot only where GitHub-native features are needed.",
  });
}

function applyCreditRules(base: MutableRecommendation, planId: string) {
  const eligibleForCredits =
    apiToolIds.has(base.toolId) ||
    isUsagePriced(base.toolId, planId) ||
    (isCustomPriced(base.toolId, planId) && base.currentMonthlySpend >= 500);

  if (!eligibleForCredits || base.currentMonthlySpend < 500) {
    return;
  }

  applyCandidate(base, {
    recommendedMonthlySpend: base.currentMonthlySpend * (1 - CREDEX_CREDIT_DISCOUNT_RATE),
    action: "Route eligible usage through discounted credits",
    reason: `At this spend level, a ${Math.round(CREDEX_CREDIT_DISCOUNT_RATE * 100)}% infrastructure-credit discount is more valuable than plan tinkering, assuming workload eligibility and vendor coverage.`,
  });
}

function applyCandidate(base: MutableRecommendation, candidate: Candidate) {
  const recommendedMonthlySpend = roundMoney(Math.max(0, candidate.recommendedMonthlySpend));
  const candidateSavings = base.currentMonthlySpend - recommendedMonthlySpend;
  const currentSavings = base.currentMonthlySpend - base.recommendedMonthlySpend;

  if (candidateSavings > currentSavings + 1) {
    base.recommendedMonthlySpend = recommendedMonthlySpend;
    base.action = candidate.action;
    base.reason = candidate.reason;
    base.sourceUrls = Array.from(new Set([...base.sourceUrls, ...(candidate.sourceUrls ?? [])]));
  }
}

function finalizeRecommendation(base: MutableRecommendation) {
  base.monthlySavings = roundMoney(Math.max(0, base.currentMonthlySpend - base.recommendedMonthlySpend));
  base.annualSavings = roundMoney(base.monthlySavings * 12);
  base.severity = severityForSavings(base.monthlySavings);
}

function severityForSavings(monthlySavings: number): RecommendationSeverity {
  if (monthlySavings >= 500) return "high";
  if (monthlySavings >= 100) return "medium";
  if (monthlySavings > 0) return "low";
  return "good";
}

function isUseCase(value: string): value is UseCase {
  return ["coding", "writing", "data", "research", "mixed"].includes(value);
}

function clampInteger(value: number, min: number, max: number) {
  const parsed = Math.trunc(Number(value) || min);
  return Math.min(max, Math.max(min, parsed));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

