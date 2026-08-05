import { http } from "./http";
import type {
  AIPreliminaryAssessment,
  CandidateCondition,
  SymptomIntake,
} from "../domain/core/entities";
import type {
  AIAssessmentId,
  EncounterId,
  SymptomIntakeId,
} from "../domain/core/ids";
import type { Urgency } from "../domain/core/enums";

export interface SubmitIntakeRequest {
  chiefComplaint: string;
  severity: number;
  durationDays: number;
  symptoms: string[];
  history: string[];
  currentMedication: string[];
  images: string[];
}

interface ApiSymptomIntake {
  id: string;
  encounterId: string;
  chiefComplaint: string;
  severity: number;
  durationDays: number;
  symptoms: string[];
  history: string[];
  currentMedication: string[];
  images: string[];
  submittedAt: string;
}

interface ApiAssessment {
  id: string;
  encounterId: string;
  intakeId: string;
  status: AIPreliminaryAssessment["status"];
  candidateConditions: CandidateCondition[];
  candidateConditionsUnavailableReason?: string | null;
  redFlagTriggered: boolean;
  redFlagUrgency: Urgency;
  redFlagReasons: string[];
  suggestedSpecialty?: unknown;
  suggestedNextActions: string[];
  modelVersion: string;
  missingDataHints: string[];
  supersededById?: unknown;
  generatedAt: string;
}

interface ApiIntakeAssessmentResult {
  intake: ApiSymptomIntake;
  assessment: ApiAssessment;
}

export interface IntakeAssessmentResult {
  intake: SymptomIntake;
  assessment: AIPreliminaryAssessment;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

function mapIntake(row: ApiSymptomIntake): SymptomIntake {
  return {
    ...row,
    id: row.id as SymptomIntakeId,
    encounterId: row.encounterId as EncounterId,
  };
}

function mapAssessment(row: ApiAssessment): AIPreliminaryAssessment {
  return {
    id: row.id as AIAssessmentId,
    encounterId: row.encounterId as EncounterId,
    status: row.status,
    candidateConditions: row.candidateConditions ?? [],
    candidateConditionsUnavailableReason: row.candidateConditionsUnavailableReason ?? null,
    redFlag: {
      triggered: row.redFlagTriggered,
      urgency: row.redFlagUrgency ?? "routine",
      reasons: row.redFlagReasons ?? [],
    },
    suggestedSpecialty: optionalString(row.suggestedSpecialty),
    suggestedNextActions: row.suggestedNextActions ?? [],
    modelVersion: row.modelVersion,
    inputSnapshotId: row.intakeId,
    generatedAt: row.generatedAt,
    missingDataHints: row.missingDataHints ?? [],
    supersededBy: optionalString(row.supersededById) as
      | AIAssessmentId
      | undefined,
  };
}

export async function submitEncounterIntake(
  encounterId: string,
  payload: SubmitIntakeRequest,
): Promise<IntakeAssessmentResult> {
  const result = await http.post<ApiIntakeAssessmentResult>(
    `/api/v1/encounters/${encodeURIComponent(encounterId)}/intake`,
    payload,
  );

  return {
    intake: mapIntake(result.intake),
    assessment: mapAssessment(result.assessment),
  };
}

export async function getEncounterAIAssessments(
  encounterId: string,
): Promise<AIPreliminaryAssessment[]> {
  const rows = await http.get<ApiAssessment[]>(
    `/api/v1/encounters/${encodeURIComponent(encounterId)}/ai-assessments`,
  );

  return (rows ?? []).map(mapAssessment);
}

export async function reassessEncounter(
  encounterId: string,
  payload: SubmitIntakeRequest,
): Promise<IntakeAssessmentResult> {
  const result = await http.post<ApiIntakeAssessmentResult>(
    `/api/v1/encounters/${encodeURIComponent(encounterId)}/ai-assessments/reassessments`,
    payload,
  );

  return {
    intake: mapIntake(result.intake),
    assessment: mapAssessment(result.assessment),
  };
}

export async function reassessEncounterAssessment(
  encounterId: string,
  payload: SubmitIntakeRequest,
): Promise<AIPreliminaryAssessment> {
  const result = await http.post<ApiAssessment>(
    `/api/v1/encounters/${encodeURIComponent(encounterId)}/ai-assessments/reassess`,
    payload,
  );

  return mapAssessment(result);
}

export async function getAIAssessment(
  assessmentId: string,
): Promise<AIPreliminaryAssessment> {
  const result = await http.get<ApiAssessment>(
    `/api/v1/ai-assessments/${encodeURIComponent(assessmentId)}`,
  );

  return mapAssessment(result);
}
