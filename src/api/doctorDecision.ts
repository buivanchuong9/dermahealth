import { http } from './http';
import type {
  AIAssessmentId,
  ClinicalPlanId,
  ClinicalPlanRevisionId,
  DoctorDiagnosisId,
  DoctorReviewId,
  EncounterId,
  UserId,
  WorkflowTemplateId,
  WorkflowTemplateVersionId,
} from '../domain/core/ids';
import type {
  ClinicalPlan,
  ClinicalPlanRevision,
  DoctorDiagnosis,
  DoctorReview,
} from '../domain/core/entities';
import type { AIHumanReviewStatus, DiagnosisStatus } from '../domain/core/enums';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

interface DoctorReviewDto {
  id: string;
  encounterId: string;
  aiAssessmentId?: unknown;
  doctorId: string;
  action: AIHumanReviewStatus;
  acceptedConditionCode?: unknown;
  rationale?: unknown;
  reviewedAt: string;
}

interface DoctorDiagnosisDto {
  id: string;
  encounterId: string;
  doctorId: string;
  status: DiagnosisStatus;
  conditionName: string;
  conditionCode?: unknown;
  aiAssessmentId?: unknown;
  isAdditionalToAI: boolean;
  rationale?: unknown;
  revisionOfId?: unknown;
  revisionOf?: unknown;
  version?: number;
  recordedAt: string;
}

interface ClinicalPlanDto {
  id: string;
  encounterId: string;
  doctorId: string;
  diagnosisId: string;
  problemOrDiagnosisId?: string;
  summary: string;
  measurableGoals?: string[];
  protocolRef?: {
    templateId: string;
    templateVersionId: string;
  } | null;
  milestones?: ClinicalPlan['milestones'];
  monitoringMetrics?: string[];
  stopOrChangeCriteria?: string;
  contraindications?: string[];
  prerequisites?: string[];
  responsibleProviderId?: string;
  orderRefs?: ClinicalPlan['orderRefs'];
  orders?: ClinicalPlan['orders'];
  deviationFromProtocol?: ClinicalPlan['deviationFromProtocol'] | null;
  outcome?: unknown;
  currentStage?: ClinicalPlan['currentStage'];
  signedBy?: unknown;
  signedAt?: unknown;
  signature?: { providerId: string; signedAt: string } | null;
  version?: number;
  approvedAt: string;
  createdAt?: string;
  updatedAt?: string;
  autoActivatedWorkflowInstanceId?: unknown;
}

interface ClinicalPlanRevisionDto {
  id: string;
  planId: string;
  version: number;
  action: string;
  snapshot: Record<string, unknown>;
  actorId: string;
  occurredAt: string;
}

export interface SubmitAssessmentReviewRequest {
  action: AIHumanReviewStatus;
  acceptedConditionCode?: string;
  rationale?: string;
}

export interface CreateDiagnosisRequest {
  conditionName: string;
  conditionCode?: string;
  aiAssessmentId?: string;
  isAdditionalToAI: boolean;
  rationale?: string;
  status: DiagnosisStatus;
}

export interface ReviseDiagnosisRequest {
  conditionName: string;
  rationale: string;
}

export interface CreateClinicalPlanRequest {
  diagnosisId: string;
  summary: string;
  measurableGoals?: string[];
  protocolRef?: {
    templateId: string;
    templateVersionId: string;
  };
  milestones?: ClinicalPlan['milestones'];
  monitoringMetrics?: string[];
  stopOrChangeCriteria?: string;
  contraindications?: string[];
  prerequisites?: string[];
  deviationFromProtocol?: { reason: string };
  outcome?: string;
  currentStage?: ClinicalPlan['currentStage'];
}

export type ReviseClinicalPlanRequest = Partial<
  Omit<CreateClinicalPlanRequest, 'diagnosisId'>
> & {
  version: number;
  reason: string;
};

const mapReview = (dto: DoctorReviewDto): DoctorReview => ({
  id: dto.id as DoctorReviewId,
  encounterId: dto.encounterId as EncounterId,
  aiAssessmentId: optionalString(dto.aiAssessmentId) as AIAssessmentId | undefined,
  doctorId: dto.doctorId as UserId,
  action: dto.action,
  acceptedConditionCode: optionalString(dto.acceptedConditionCode),
  rationale: optionalString(dto.rationale),
  reviewedAt: dto.reviewedAt,
});

const mapDiagnosis = (dto: DoctorDiagnosisDto): DoctorDiagnosis => ({
  id: dto.id as DoctorDiagnosisId,
  encounterId: dto.encounterId as EncounterId,
  doctorId: dto.doctorId as UserId,
  status: dto.status,
  conditionName: dto.conditionName,
  conditionCode: optionalString(dto.conditionCode),
  aiAssessmentId: optionalString(dto.aiAssessmentId) as AIAssessmentId | undefined,
  isAdditionalToAI: dto.isAdditionalToAI,
  rationale: optionalString(dto.rationale),
  revisionOf: optionalString(dto.revisionOfId ?? dto.revisionOf) as DoctorDiagnosisId | undefined,
  recordedAt: dto.recordedAt,
});

const mapClinicalPlan = (dto: ClinicalPlanDto): ClinicalPlan => ({
  id: dto.id as ClinicalPlanId,
  encounterId: dto.encounterId as EncounterId,
  doctorId: dto.doctorId as UserId,
  diagnosisId: dto.diagnosisId as DoctorDiagnosisId,
  problemOrDiagnosisId: (dto.problemOrDiagnosisId ?? dto.diagnosisId) as DoctorDiagnosisId,
  summary: dto.summary,
  measurableGoals: dto.measurableGoals ?? [dto.summary],
  protocolRef: dto.protocolRef
    ? {
        templateId: dto.protocolRef.templateId as WorkflowTemplateId,
        templateVersionId: dto.protocolRef.templateVersionId as WorkflowTemplateVersionId,
      }
    : undefined,
  milestones: dto.milestones ?? [],
  monitoringMetrics: dto.monitoringMetrics ?? [],
  stopOrChangeCriteria: dto.stopOrChangeCriteria ?? '',
  contraindications: dto.contraindications ?? [],
  prerequisites: dto.prerequisites ?? [],
  responsibleProviderId: (dto.responsibleProviderId ?? dto.doctorId) as UserId,
  orders: dto.orders ?? dto.orderRefs ?? [],
  orderRefs: dto.orderRefs ?? dto.orders ?? [],
  deviationFromProtocol: dto.deviationFromProtocol ?? undefined,
  outcome: optionalString(dto.outcome),
  currentStage: dto.currentStage ?? 'induction',
  signedBy: optionalString(dto.signedBy) as UserId | undefined,
  signedAt: optionalString(dto.signedAt),
  signature: dto.signature
    ? {
        providerId: dto.signature.providerId as UserId,
        signedAt: dto.signature.signedAt,
      }
    : optionalString(dto.signedBy) && optionalString(dto.signedAt)
      ? {
          providerId: optionalString(dto.signedBy) as UserId,
          signedAt: optionalString(dto.signedAt)!,
        }
      : undefined,
  version: dto.version ?? 1,
  approvedAt: dto.approvedAt,
  createdAt: dto.createdAt ?? dto.approvedAt,
  updatedAt: dto.updatedAt ?? dto.approvedAt,
});

const mapClinicalPlanRevision = (
  dto: ClinicalPlanRevisionDto,
): ClinicalPlanRevision => ({
  id: dto.id as ClinicalPlanRevisionId,
  planId: dto.planId as ClinicalPlanId,
  version: dto.version,
  action: dto.action,
  snapshot: dto.snapshot,
  actorId: dto.actorId as UserId,
  occurredAt: dto.occurredAt,
});

const assessmentPath = (encounterId: string, assessmentId: string) =>
  `/api/v1/encounters/${encodeURIComponent(encounterId)}/ai-assessments/${encodeURIComponent(assessmentId)}`;

export const submitAssessmentReview = async (
  encounterId: string,
  assessmentId: string,
  body: SubmitAssessmentReviewRequest,
) => mapReview(await http.post<DoctorReviewDto>(`${assessmentPath(encounterId, assessmentId)}/reviews`, body));

export const submitAssessmentReviewLegacy = (
  encounterId: string,
  assessmentId: string,
  body: SubmitAssessmentReviewRequest,
) => http.post<string>(`${assessmentPath(encounterId, assessmentId)}/review`, body);

export const getEncounterReviews = async (encounterId: string) =>
  (await http.get<DoctorReviewDto[]>(`/api/v1/encounters/${encodeURIComponent(encounterId)}/reviews`)).map(mapReview);

export const createEncounterDiagnosis = async (encounterId: string, body: CreateDiagnosisRequest) =>
  mapDiagnosis(await http.post<DoctorDiagnosisDto>(`/api/v1/encounters/${encodeURIComponent(encounterId)}/diagnoses`, body));

export const getEncounterDiagnoses = async (encounterId: string) =>
  (await http.get<DoctorDiagnosisDto[]>(`/api/v1/encounters/${encodeURIComponent(encounterId)}/diagnoses`)).map(mapDiagnosis);

export const reviseEncounterDiagnosis = async (diagnosisId: string, body: ReviseDiagnosisRequest) =>
  mapDiagnosis(await http.post<DoctorDiagnosisDto>(`/api/v1/diagnoses/${encodeURIComponent(diagnosisId)}/revisions`, body));

export const reviseDiagnosisLegacy = (diagnosisId: string, body: ReviseDiagnosisRequest) =>
  http.post<string>(`/api/v1/diagnoses/${encodeURIComponent(diagnosisId)}/revise`, body);

export const createEncounterClinicalPlan = async (encounterId: string, body: CreateClinicalPlanRequest) =>
  mapClinicalPlan(await http.post<ClinicalPlanDto>(`/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-plan`, body));

export const getEncounterClinicalPlan = async (encounterId: string) =>
  mapClinicalPlan(await http.get<ClinicalPlanDto>(`/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-plan`));

export const reviseEncounterClinicalPlan = async (
  encounterId: string,
  body: ReviseClinicalPlanRequest,
) =>
  mapClinicalPlan(
    await http.patch<ClinicalPlanDto>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-plan`,
      body,
    ),
  );

export const getEncounterClinicalPlanRevisions = async (encounterId: string) =>
  (
    await http.get<ClinicalPlanRevisionDto[]>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/clinical-plan/revisions`,
    )
  ).map(mapClinicalPlanRevision);
