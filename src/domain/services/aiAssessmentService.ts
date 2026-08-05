import type { ClinicalRedFlag } from '../core/entities';

// This module holds only the confirmed-real, deterministic parts of AI
// symptom intake: input validation and red-flag triage rules. It must never
// fabricate a differential-diagnosis scorer (candidate conditions with a
// confidence score) — that comes from the backend, which likewise never
// fabricates one; see be/src/modules/ai-assessment/ai-scoring.util.ts.

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

export const aiAssessmentService = { evaluateRedFlag, validateIntake };
