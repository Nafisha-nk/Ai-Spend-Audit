import type { ToolCatalogEntry, ToolId } from "./types";

export const PRICING_VERIFIED_AT = "2026-05-07";
export const CREDEX_CREDIT_DISCOUNT_RATE = 0.35;

export const pricingSources = {
  cursor: "https://cursor.com/en-US/pricing",
  githubCopilotPlans: "https://github.com/features/copilot/plans",
  githubCopilotDocs: "https://docs.github.com/en/copilot/get-started/plans",
  claude: "https://claude.com/pricing",
  claudeMax: "https://claude.com/pricing/max",
  chatgpt: "https://openai.com/chatgpt/pricing/",
  openaiApi: "https://platform.openai.com/docs/pricing",
  anthropicApi: "https://claude.com/pricing",
  geminiSubscriptions: "https://gemini.google/us/subscriptions/",
  geminiApi: "https://ai.google.dev/gemini-api/docs/pricing",
  v0: "https://v0.dev/docs/pricing",
} as const;

export const toolCatalog: ToolCatalogEntry[] = [
  {
    id: "cursor",
    name: "Cursor",
    category: "coding",
    plans: [
      { id: "hobby", name: "Hobby", priceKind: "free", monthlyUsd: 0, sourceUrl: pricingSources.cursor },
      { id: "pro", name: "Pro", priceKind: "flat", monthlyUsd: 20, sourceUrl: pricingSources.cursor },
      { id: "business", name: "Business", priceKind: "perSeat", monthlyUsd: 40, sourceUrl: pricingSources.cursor },
      { id: "enterprise", name: "Enterprise", priceKind: "custom", sourceUrl: pricingSources.cursor },
    ],
  },
  {
    id: "github_copilot",
    name: "GitHub Copilot",
    category: "coding",
    plans: [
      { id: "individual", name: "Individual / Pro", priceKind: "perSeat", monthlyUsd: 10, sourceUrl: pricingSources.githubCopilotPlans },
      { id: "business", name: "Business", priceKind: "perSeat", monthlyUsd: 19, sourceUrl: pricingSources.githubCopilotDocs },
      { id: "enterprise", name: "Enterprise", priceKind: "perSeat", monthlyUsd: 39, sourceUrl: pricingSources.githubCopilotDocs },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    category: "assistant",
    plans: [
      { id: "free", name: "Free", priceKind: "free", monthlyUsd: 0, sourceUrl: pricingSources.claude },
      { id: "pro", name: "Pro", priceKind: "flat", monthlyUsd: 20, sourceUrl: pricingSources.claude },
      { id: "max", name: "Max", priceKind: "flat", monthlyUsd: 100, sourceUrl: pricingSources.claudeMax, notes: "Official page lists Max from $100/month; users should enter actual spend for 20x usage." },
      { id: "team", name: "Team standard", priceKind: "perSeat", monthlyUsd: 25, sourceUrl: pricingSources.claude },
      { id: "team_premium", name: "Team premium", priceKind: "perSeat", monthlyUsd: 125, sourceUrl: pricingSources.claude },
      { id: "enterprise", name: "Enterprise", priceKind: "custom", sourceUrl: pricingSources.claude },
      { id: "api", name: "API direct", priceKind: "usage", sourceUrl: pricingSources.anthropicApi },
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "assistant",
    plans: [
      { id: "plus", name: "Plus", priceKind: "flat", monthlyUsd: 20, sourceUrl: pricingSources.chatgpt },
      { id: "pro", name: "Pro", priceKind: "flat", monthlyUsd: 200, sourceUrl: pricingSources.chatgpt },
      { id: "team", name: "Team / Business", priceKind: "perSeat", monthlyUsd: 30, sourceUrl: pricingSources.chatgpt, notes: "Monthly billing; annual billing is lower." },
      { id: "enterprise", name: "Enterprise", priceKind: "custom", sourceUrl: pricingSources.chatgpt },
      { id: "api", name: "API direct", priceKind: "usage", sourceUrl: pricingSources.openaiApi },
    ],
  },
  {
    id: "anthropic_api",
    name: "Anthropic API direct",
    category: "api",
    plans: [
      { id: "opus", name: "Opus API", priceKind: "usage", sourceUrl: pricingSources.anthropicApi },
      { id: "sonnet", name: "Sonnet API", priceKind: "usage", sourceUrl: pricingSources.anthropicApi },
      { id: "haiku", name: "Haiku API", priceKind: "usage", sourceUrl: pricingSources.anthropicApi },
    ],
  },
  {
    id: "openai_api",
    name: "OpenAI API direct",
    category: "api",
    plans: [
      { id: "frontier", name: "Frontier models", priceKind: "usage", sourceUrl: pricingSources.openaiApi },
      { id: "mini", name: "Mini models", priceKind: "usage", sourceUrl: pricingSources.openaiApi },
      { id: "batch", name: "Batch API", priceKind: "usage", sourceUrl: pricingSources.openaiApi },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    category: "assistant",
    plans: [
      { id: "free", name: "Free", priceKind: "free", monthlyUsd: 0, sourceUrl: pricingSources.geminiSubscriptions },
      { id: "pro", name: "Google AI Pro", priceKind: "flat", monthlyUsd: 19.99, sourceUrl: pricingSources.geminiSubscriptions },
      { id: "ultra", name: "Google AI Ultra", priceKind: "flat", monthlyUsd: 249.99, sourceUrl: pricingSources.geminiSubscriptions },
      { id: "api", name: "Gemini API", priceKind: "usage", sourceUrl: pricingSources.geminiApi },
    ],
  },
  {
    id: "v0",
    name: "v0",
    category: "builder",
    plans: [
      { id: "free", name: "Free", priceKind: "free", monthlyUsd: 0, sourceUrl: pricingSources.v0 },
      { id: "premium", name: "Premium", priceKind: "flat", monthlyUsd: 20, sourceUrl: pricingSources.v0 },
      { id: "team", name: "Team", priceKind: "perSeat", monthlyUsd: 30, sourceUrl: pricingSources.v0 },
      { id: "business", name: "Business", priceKind: "perSeat", monthlyUsd: 100, sourceUrl: pricingSources.v0 },
      { id: "enterprise", name: "Enterprise", priceKind: "custom", sourceUrl: pricingSources.v0 },
    ],
  },
];

export function getTool(toolId: ToolId) {
  return toolCatalog.find((tool) => tool.id === toolId);
}

export function getPlan(toolId: ToolId, planId: string) {
  return getTool(toolId)?.plans.find((plan) => plan.id === planId);
}

export function estimateListPrice(toolId: ToolId, planId: string, seats: number) {
  const plan = getPlan(toolId, planId);
  if (!plan || plan.monthlyUsd === undefined) {
    return 0;
  }

  if (plan.priceKind === "perSeat") {
    return roundMoney(plan.monthlyUsd * Math.max(1, seats));
  }

  if (plan.priceKind === "flat") {
    return roundMoney(plan.monthlyUsd * Math.max(1, seats));
  }

  return roundMoney(plan.monthlyUsd);
}

export function isUsagePriced(toolId: ToolId, planId: string) {
  const plan = getPlan(toolId, planId);
  return plan?.priceKind === "usage";
}

export function isCustomPriced(toolId: ToolId, planId: string) {
  const plan = getPlan(toolId, planId);
  return plan?.priceKind === "custom";
}

export function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}
