export const useCases = ["coding", "writing", "data", "research", "mixed"] as const;

export type UseCase = (typeof useCases)[number];

export type ToolId =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "v0";

export type PriceKind = "free" | "flat" | "perSeat" | "usage" | "custom";

export type ToolPlan = {
  id: string;
  name: string;
  priceKind: PriceKind;
  monthlyUsd?: number;
  sourceUrl: string;
  notes?: string;
};

export type ToolCatalogEntry = {
  id: ToolId;
  name: string;
  category: "coding" | "assistant" | "api" | "builder";
  plans: ToolPlan[];
};

export type ToolSelection = {
  id: string;
  toolId: ToolId;
  planId: string;
  monthlySpend: number;
  seats: number;
};

export type AuditInput = {
  teamSize: number;
  useCase: UseCase;
  tools: ToolSelection[];
};

export type RecommendationSeverity = "good" | "low" | "medium" | "high";

export type ToolRecommendation = {
  toolId: ToolId;
  toolName: string;
  planId: string;
  planName: string;
  seats: number;
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
  monthlySavings: number;
  annualSavings: number;
  action: string;
  reason: string;
  severity: RecommendationSeverity;
  sourceUrls: string[];
};

export type AuditResult = {
  recommendations: ToolRecommendation[];
  totalMonthlySpend: number;
  totalRecommendedMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  credexEligible: boolean;
  spendingWell: boolean;
  generatedAt: string;
};

export type PublicAuditReport = {
  publicId: string;
  teamSize: number;
  useCase: UseCase;
  summary: string;
  result: AuditResult;
  createdAt: string;
};

export type LeadPayload = {
  publicId: string;
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  website?: string;
};
