// Display vocabulary for CRM follow-up activity types. The state machine,
// escalation rules, and encounter-creation-request flow that used to live in
// this file now live in `domain/services/crmService.ts` (operating on the
// shared `FollowUpActivity`/`ClinicalAlert` entities) — this file only keeps
// the label map Care.tsx still needs for `FollowUpActivity.type`.

export type CarePlanItemType =
  | 'medication_reminder'
  | 'adherence_check'
  | 'follow_up_appointment'
  | 'follow_up_test'
  | 'patient_education'
  | 'lifestyle_guidance'
  | 'symptom_questionnaire'
  | 'adverse_effect_monitoring'
  | 'coordinator_call'
  | 'satisfaction_survey'
  | 'chronic_monitoring'
  | 'missed_appointment_followup'
  | 're_engagement';

export const ITEM_TYPE_LABEL: Record<CarePlanItemType, string> = {
  medication_reminder: 'Nhắc uống thuốc',
  adherence_check: 'Kiểm tra tuân thủ điều trị',
  follow_up_appointment: 'Lịch tái khám',
  follow_up_test: 'Xét nghiệm theo dõi',
  patient_education: 'Giáo dục sức khỏe',
  lifestyle_guidance: 'Tư vấn lối sống',
  symptom_questionnaire: 'Khảo sát triệu chứng',
  adverse_effect_monitoring: 'Theo dõi tác dụng phụ',
  coordinator_call: 'Gọi điện từ điều phối viên',
  satisfaction_survey: 'Khảo sát hài lòng',
  chronic_monitoring: 'Theo dõi bệnh mạn tính',
  missed_appointment_followup: 'Liên hệ lại do lỡ hẹn',
  re_engagement: 'Tái kết nối chăm sóc',
};
