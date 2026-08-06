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
  idempotencyKey?: string,
): Promise<AiCommercialRequest> {
  return http.post<AiCommercialRequest>(
    "/api/v1/patients/me/ai-entitlement/plan-change-requests",
    { planCode },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}

export interface AiDecisionResult {
  id: string;
  status: "approved" | "rejected";
}

/** Staff-only (super_administrator/system_administrator/medical_administrator).
 * Only decides on a request that already exists — there is no endpoint for
 * staff to create a plan-change request on another patient's behalf; only
 * the patient's own "/me" session can create one (see createAiPlanChangeRequest). */
export function decideAiPlanChange(
  requestId: string,
  decision: "approved" | "rejected",
  idempotencyKey?: string,
): Promise<AiDecisionResult> {
  return http.post<AiDecisionResult>(
    `/api/v1/ai-commercial-requests/plan-changes/${encodeURIComponent(requestId)}/decision`,
    { decision },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}
