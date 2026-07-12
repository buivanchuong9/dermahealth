import { encounterRepository, diagnosisRepository, aiAssessmentRepository } from '../repositories';
import { auditService } from './auditService';
import { encounterService } from './encounterService';
import { assertRole, PermissionError } from '../guards';
import { nextId } from '../core/ids';
import type { DoctorReview, DoctorDiagnosis, ClinicalPlan } from '../core/entities';
import type { AIHumanReviewStatus } from '../core/enums';
import type { EncounterId, UserId, AIAssessmentId, DoctorDiagnosisId } from '../core/ids';

// This is the ONLY module permitted to write DoctorReview / DoctorDiagnosis /
// ClinicalPlan records — the "doctor is the final clinical decision-maker"
// boundary is enforced here via assertRole(actorId, ['doctor']) on every
// diagnosis- and plan-affecting call, not left as a UI-only convention.

function reviewAssessment(
  encounterId: EncounterId, aiAssessmentId: AIAssessmentId, doctorId: UserId,
  action: AIHumanReviewStatus, acceptedConditionCode?: string, rationale?: string,
): DoctorReview {
  assertRole(doctorId, ['doctor']);
  const assessment = aiAssessmentRepository.getById(aiAssessmentId);
  const topRanked = assessment?.candidateConditions[0]?.code;
  if (action !== 'accepted' && (!rationale || !rationale.trim())) {
    throw new PermissionError('Cần ghi rõ lý do khi bác sĩ không chấp nhận nguyên trạng gợi ý hàng đầu của AI.');
  }
  if (action === 'accepted' && acceptedConditionCode && acceptedConditionCode !== topRanked && (!rationale || !rationale.trim())) {
    throw new PermissionError('Cần ghi rõ lý do khi bác sĩ chọn gợi ý khác với gợi ý xếp hạng cao nhất của AI.');
  }
  const review: DoctorReview = { id: nextId('DRV'), encounterId, aiAssessmentId, doctorId, action, acceptedConditionCode, rationale, reviewedAt: new Date().toISOString() };
  diagnosisRepository.reviews().upsert(review);
  const encounter = encounterRepository.getById(encounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, doctorReviewIds: [...encounter.doctorReviewIds, review.id] });
  auditService.log({ actorId: doctorId, action: 'AI_ASSESSMENT_REVIEWED', entityType: 'AIPreliminaryAssessment', entityId: aiAssessmentId, previousState: 'pending', newState: action, reason: rationale, patientId: encounter?.patientId, encounterId, sourceModule: 'DoctorDecision' });
  return review;
}

function recordDiagnosis(
  encounterId: EncounterId, doctorId: UserId,
  input: { conditionName: string; conditionCode?: string; aiAssessmentId?: AIAssessmentId; isAdditionalToAI: boolean; rationale?: string; status: 'provisional' | 'confirmed' },
): DoctorDiagnosis {
  assertRole(doctorId, ['doctor']);
  const diagnosis: DoctorDiagnosis = { id: nextId('DX'), encounterId, doctorId, recordedAt: new Date().toISOString(), ...input };
  diagnosisRepository.diagnoses().upsert(diagnosis);
  const encounter = encounterRepository.getById(encounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, diagnosisIds: [...encounter.diagnosisIds, diagnosis.id] });
  auditService.log({ actorId: doctorId, action: input.status === 'confirmed' ? 'DIAGNOSIS_CONFIRMED' : 'DIAGNOSIS_RECORDED_PROVISIONAL', entityType: 'DoctorDiagnosis', entityId: diagnosis.id, newState: input.status, patientId: encounter?.patientId, encounterId, sourceModule: 'DoctorDecision' });
  if (input.status === 'confirmed' && encounter && encounterService.canTransition(encounter.status, 'diagnosed')) {
    encounterService.transitionStatus(encounterId, 'diagnosed', doctorId);
  }
  return diagnosis;
}

function reviseDiagnosis(previousDiagnosisId: DoctorDiagnosisId, doctorId: UserId, conditionName: string, rationale: string): DoctorDiagnosis {
  assertRole(doctorId, ['doctor']);
  const previous = diagnosisRepository.diagnoses().getById(previousDiagnosisId);
  if (!previous) throw new Error(`Không tìm thấy chẩn đoán ${previousDiagnosisId}`);
  diagnosisRepository.diagnoses().upsert({ ...previous, status: 'revised' });
  const revised: DoctorDiagnosis = {
    id: nextId('DX'), encounterId: previous.encounterId, doctorId, status: 'confirmed', conditionName,
    conditionCode: previous.conditionCode, isAdditionalToAI: false, rationale, revisionOf: previousDiagnosisId, recordedAt: new Date().toISOString(),
  };
  diagnosisRepository.diagnoses().upsert(revised);
  const encounter = encounterRepository.getById(previous.encounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, diagnosisIds: [...encounter.diagnosisIds, revised.id] });
  auditService.log({ actorId: doctorId, action: 'DIAGNOSIS_REVISED', entityType: 'DoctorDiagnosis', entityId: revised.id, previousState: previousDiagnosisId, newState: 'confirmed', reason: rationale, patientId: encounter?.patientId, encounterId: previous.encounterId, sourceModule: 'DoctorDecision' });
  return revised;
}

function approveClinicalPlan(encounterId: EncounterId, doctorId: UserId, diagnosisId: DoctorDiagnosisId, summary: string): ClinicalPlan {
  assertRole(doctorId, ['doctor']);
  const plan: ClinicalPlan = { id: nextId('PLAN'), encounterId, doctorId, diagnosisId, summary, approvedAt: new Date().toISOString() };
  diagnosisRepository.plans().upsert(plan);
  const encounter = encounterRepository.getById(encounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, clinicalPlanId: plan.id });
  auditService.log({ actorId: doctorId, action: 'CLINICAL_PLAN_APPROVED', entityType: 'ClinicalPlan', entityId: plan.id, patientId: encounter?.patientId, encounterId, sourceModule: 'DoctorDecision' });
  if (encounter && encounterService.canTransition(encounter.status, 'plan_approved')) {
    encounterService.transitionStatus(encounterId, 'plan_approved', doctorId);
  }
  return plan;
}

function listReviews(encounterId: EncounterId): DoctorReview[] {
  return diagnosisRepository.reviews().getAll().filter((r) => r.encounterId === encounterId);
}

function listDiagnoses(encounterId: EncounterId): DoctorDiagnosis[] {
  return diagnosisRepository.diagnoses().getAll().filter((d) => d.encounterId === encounterId);
}

function getPlan(encounterId: EncounterId): ClinicalPlan | undefined {
  return diagnosisRepository.plans().getAll().find((p) => p.encounterId === encounterId);
}

export const doctorDecisionService = { reviewAssessment, recordDiagnosis, reviseDiagnosis, approveClinicalPlan, listReviews, listDiagnoses, getPlan };
