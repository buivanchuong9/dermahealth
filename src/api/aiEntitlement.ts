import { http } from "./http";

export interface AiPlan {
  code: string;
  name: string;
  annualPriceVnd: number;
  monthlyIncludedCredits: number | null;
  extraCreditUnitPriceVnd: number;
  description: string;
  features: string[];
}

export interface AiUsageActivity {
  id: string;
  caseId: string;
  occurredAt: string;
  bodyRegion: string;
  resultStatus: string;
  modelVersion: string;
  allowanceKind: "included" | "purchased";
}

export interface AiCommercialRequest {
  id: string;
  type: "credit_purchase" | "plan_change";
  status: string;
  credits?: number;
  planCode?: string;
  totalPriceVnd: number;
  createdAt: string;
}

export interface AiEntitlement {
  plan: AiPlan;
  availablePlans: AiPlan[];
  periodStart: string;
  periodEnd: string;
  includedQuota: number | null;
  includedUsed: number;
  extraCreditBalance: number;
  remainingCredits: number | null;
  usagePercent: number;
  purchaseMinCredits: number;
  purchaseMaxCredits: number;
  purchaseUnitPriceVnd: number;
  usageHistory: AiUsageActivity[];
  pendingRequests: AiCommercialRequest[];
}

export function getMyAiEntitlement(): Promise<AiEntitlement> {
  return http.get<AiEntitlement>("/api/v1/patients/me/ai-entitlement");
}

export function createAiCreditPurchaseRequest(
  credits: number,
): Promise<AiCommercialRequest> {
  return http.post<AiCommercialRequest>(
    "/api/v1/patients/me/ai-entitlement/credit-purchase-requests",
    { credits },
  );
}

export function createAiPlanChangeRequest(
  planCode: string,
): Promise<AiCommercialRequest> {
  return http.post<AiCommercialRequest>(
    "/api/v1/patients/me/ai-entitlement/plan-change-requests",
    { planCode },
  );
}
