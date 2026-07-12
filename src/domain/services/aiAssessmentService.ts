import { encounterRepository, aiAssessmentRepository } from '../repositories';
import { auditService } from './auditService';
import { encounterService } from './encounterService';
import { nextId } from '../core/ids';
import type { AIPreliminaryAssessment, CandidateCondition, ClinicalRedFlag, SymptomIntake } from '../core/entities';
import type { EncounterId, UserId } from '../core/ids';

// This module may only ever WRITE to the AI-assessment repository. It must
// never construct a DoctorDiagnosis, a Prescription, or a signed MedicalRecord,
// and it never calls encounterService.closeEncounter — that is the doctor/EMR
// boundary (Task boundary: "AI may not confirm a final diagnosis / prescribe /
// close an encounter / modify a signed record / override a doctor").

export type SymptomKey = 'itching' | 'pain' | 'pus' | 'fever' | 'rapid_spreading' | 'bleeding' | 'scaling';

export const SYMPTOM_OPTIONS: { key: SymptomKey; label: string }[] = [
  { key: 'itching', label: 'Ngứa' },
  { key: 'pain', label: 'Đau rát' },
  { key: 'pus', label: 'Có mủ' },
  { key: 'scaling', label: 'Bong vảy' },
  { key: 'rapid_spreading', label: 'Lan nhanh trong vài ngày' },
  { key: 'fever', label: 'Sốt' },
  { key: 'bleeding', label: 'Chảy máu' },
];

interface ConditionProfile {
  code: string;
  name: string;
  baseScore: number;
  symptomWeight: Partial<Record<SymptomKey, number>>;
  severityWeight: number;
  rationaleTemplate: string;
}

const CONDITION_LIBRARY: ConditionProfile[] = [
  { code: 'FOLL', name: 'Viêm nang lông', baseScore: 15, symptomWeight: { pus: 30, pain: 20, itching: 5 }, severityWeight: 7, rationaleTemplate: 'Viêm do vi khuẩn ở nang lông; thường có mủ và đau rát tại chỗ.' },
  { code: 'ACNE', name: 'Mụn trứng cá', baseScore: 25, symptomWeight: { pus: 15, pain: 10, itching: 5 }, severityWeight: 5, rationaleTemplate: 'Viêm nang lông do tắc nghẽn bã nhờn, phổ biến ở vùng mặt/lưng.' },
  { code: 'SEB', name: 'Viêm da tiết bã', baseScore: 15, symptomWeight: { scaling: 30, itching: 20 }, severityWeight: 3, rationaleTemplate: 'Da bong vảy đỏ, thường ở vùng nhiều tuyến bã (da đầu, mặt).' },
  { code: 'ACD', name: 'Viêm da tiếp xúc dị ứng', baseScore: 10, symptomWeight: { itching: 30, rapid_spreading: 20 }, severityWeight: 4, rationaleTemplate: 'Phản ứng dị ứng với chất tiếp xúc; ngứa và lan nhanh là dấu hiệu điển hình.' },
  { code: 'TINEA', name: 'Nhiễm nấm da', baseScore: 10, symptomWeight: { scaling: 25, itching: 25, rapid_spreading: 10 }, severityWeight: 3, rationaleTemplate: 'Nhiễm nấm ngoài da; tổn thương dạng vòng, bong vảy, lan dần ra rìa.' },
];

function scoreToBand(score: number): 'low' | 'moderate' | 'high' {
  if (score >= 72) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

export interface IntakeDraft {
  chiefComplaint: string;
  severity: number | null;
  durationDays: number | null;
  symptoms: SymptomKey[];
  history: string[];
  currentMedication: string[];
}

export function validateIntake(input: IntakeDraft): string[] {
  const errors: string[] = [];
  if (!input.chiefComplaint.trim()) errors.push('Vui lòng nhập lý do khám / triệu chứng chính.');
  if (input.severity === null) errors.push('Vui lòng chọn mức độ nghiêm trọng.');
  if (input.durationDays === null) errors.push('Vui lòng nhập số ngày xuất hiện triệu chứng.');
  if (input.durationDays !== null && input.durationDays < 0) errors.push('Số ngày không hợp lệ.');
  return errors;
}

export function evaluateRedFlag(input: IntakeDraft): ClinicalRedFlag {
  const { severity, symptoms } = input;
  const reasons: string[] = [];
  if (severity !== null && severity >= 4 && (symptoms.includes('fever') || symptoms.includes('bleeding'))) {
    if (symptoms.includes('fever')) reasons.push('Mức độ nghiêm trọng cao kèm sốt');
    if (symptoms.includes('bleeding')) reasons.push('Mức độ nghiêm trọng cao kèm chảy máu');
    return { triggered: true, urgency: 'emergency', reasons };
  }
  if (severity !== null && severity >= 3 && symptoms.includes('rapid_spreading')) {
    return { triggered: true, urgency: 'urgent', reasons: ['Tổn thương lan nhanh trong thời gian ngắn'] };
  }
  if (severity !== null && severity >= 5) {
    return { triggered: true, urgency: 'urgent', reasons: ['Mức độ nghiêm trọng ở ngưỡng cao nhất'] };
  }
  return { triggered: false, urgency: 'routine', reasons: [] };
}

function isDataSufficient(input: IntakeDraft): boolean {
  return input.symptoms.length > 0;
}

function scoreConditions(input: IntakeDraft): CandidateCondition[] {
  const scored = CONDITION_LIBRARY.map((c) => {
    let score = c.baseScore;
    for (const s of input.symptoms) score += c.symptomWeight[s] ?? 0;
    score += (input.severity ?? 0) * c.severityWeight;
    score = Math.min(97, score);
    const supportingEvidence: string[] = [];
    const conflictingEvidence: string[] = [];
    for (const opt of SYMPTOM_OPTIONS) {
      const weight = c.symptomWeight[opt.key];
      if (weight && input.symptoms.includes(opt.key)) supportingEvidence.push(opt.label);
      else if (weight && !input.symptoms.includes(opt.key)) conflictingEvidence.push(`Không ghi nhận: ${opt.label.toLowerCase()}`);
    }
    if ((input.severity ?? 0) >= 4) supportingEvidence.push(`Mức độ nghiêm trọng ${input.severity}/5`);
    if (input.durationDays !== null) supportingEvidence.push(`Xuất hiện ${input.durationDays} ngày`);
    return { profile: c, score, supportingEvidence, conflictingEvidence };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ profile, score, supportingEvidence, conflictingEvidence }): CandidateCondition => ({
    code: profile.code,
    name: profile.name,
    confidenceScore: Math.round(score),
    confidenceBand: scoreToBand(score),
    supportingEvidence: supportingEvidence.length ? supportingEvidence : ['Dữ liệu triệu chứng hạn chế'],
    conflictingEvidence,
    rationale: profile.rationaleTemplate,
  }));
}

function requestAssessment(encounterId: EncounterId, intakeInput: IntakeDraft, actorId: UserId): { intake: SymptomIntake; assessment: AIPreliminaryAssessment } {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) throw new Error(`Không tìm thấy lượt khám ${encounterId}`);
  const errors = validateIntake(intakeInput);
  if (errors.length) throw new Error(errors.join(' '));

  const now = new Date().toISOString();
  const intake: SymptomIntake = {
    id: nextId('INTAKE'), encounterId, chiefComplaint: intakeInput.chiefComplaint, severity: intakeInput.severity ?? 0,
    durationDays: intakeInput.durationDays ?? 0, symptoms: intakeInput.symptoms, history: intakeInput.history,
    currentMedication: intakeInput.currentMedication, images: [], submittedAt: now,
  };
  encounterRepository.intakes().upsert(intake);

  const redFlag = evaluateRedFlag(intakeInput);
  const sufficient = isDataSufficient(intakeInput);
  const assessment: AIPreliminaryAssessment = {
    id: nextId('AIA'), encounterId, status: sufficient ? 'completed' : 'insufficient_data',
    candidateConditions: sufficient ? scoreConditions(intakeInput) : [],
    redFlag, suggestedSpecialty: 'Da liễu',
    suggestedNextActions: sufficient ? ['Bác sĩ xem xét đánh giá AI trước khi khám lâm sàng'] : [],
    modelVersion: 'derma-vision-2.4.0', inputSnapshotId: `SNAP-${intake.id}`, generatedAt: now,
    missingDataHints: sufficient ? [] : ['Chưa ghi nhận triệu chứng đi kèm nào (ngứa, đau, mủ, bong vảy...)', 'Thêm mô tả chi tiết vùng tổn thương'],
  };
  aiAssessmentRepository.upsert(assessment);

  const updatedEncounter = { ...encounter, symptomIntakeId: intake.id, aiAssessmentIds: [...encounter.aiAssessmentIds, assessment.id] };
  encounterRepository.upsert(updatedEncounter);
  auditService.log({ actorId, action: 'AI_ASSESSMENT_GENERATED', entityType: 'AIPreliminaryAssessment', entityId: assessment.id, patientId: encounter.patientId, encounterId, sourceModule: 'AIAssessment', newState: assessment.status });

  if (encounterService.canTransition(updatedEncounter.status, 'intake_complete')) {
    encounterService.transitionStatus(encounterId, 'intake_complete', actorId);
  }
  const current = encounterRepository.getById(encounterId)!;
  if (redFlag.triggered) {
    if (encounterService.canTransition(current.status, 'escalated')) {
      encounterService.transitionStatus(encounterId, 'escalated', actorId, { reason: redFlag.reasons.join('; '), blockingCondition: 'Cờ đỏ lâm sàng — cần bác sĩ đánh giá ngay' });
    }
  } else if (encounterService.canTransition(current.status, 'ai_assessed')) {
    encounterService.transitionStatus(encounterId, 'ai_assessed', actorId);
  }

  return { intake, assessment: aiAssessmentRepository.getById(assessment.id)! };
}

function requestReassessment(encounterId: EncounterId, intakeInput: IntakeDraft, actorId: UserId): { intake: SymptomIntake; assessment: AIPreliminaryAssessment } {
  const encounter = encounterRepository.getById(encounterId);
  const priorId = encounter?.aiAssessmentIds[encounter.aiAssessmentIds.length - 1];
  const result = requestAssessment(encounterId, intakeInput, actorId);
  if (priorId) {
    const prior = aiAssessmentRepository.getById(priorId);
    if (prior) aiAssessmentRepository.upsert({ ...prior, supersededBy: result.assessment.id });
  }
  return result;
}

function getLatestAssessment(encounterId: EncounterId): AIPreliminaryAssessment | undefined {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter || encounter.aiAssessmentIds.length === 0) return undefined;
  const id = encounter.aiAssessmentIds[encounter.aiAssessmentIds.length - 1];
  return aiAssessmentRepository.getById(id);
}

function listForEncounter(encounterId: EncounterId): AIPreliminaryAssessment[] {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) return [];
  return encounter.aiAssessmentIds.map((id) => aiAssessmentRepository.getById(id)).filter((a): a is AIPreliminaryAssessment => !!a);
}

export const aiAssessmentService = { requestAssessment, requestReassessment, getLatestAssessment, listForEncounter, evaluateRedFlag, validateIntake };
