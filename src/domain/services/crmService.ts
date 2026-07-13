import { carePlanRepository, patientRepository, userRepository } from '../repositories';
import { auditService } from './auditService';
import { encounterService } from './encounterService';
import { notificationService } from './notificationService';
import { assertRole, PermissionError } from '../guards';
import { nextId } from '../core/ids';
import type { CRMCarePlan, FollowUpActivity, ClinicalAlert, EncounterCreationRequest } from '../core/entities';
import type { FollowUpActivityStatus, AlertSeverity, EncounterCreationRequestStatus } from '../core/enums';
import type { PatientId, CarePlanId, ClinicalAlertId, EncounterCreationRequestId, UserId, EncounterId } from '../core/ids';

// CRM boundary (Task 1 + Task 7): this module can create reminders, activities
// and alerts, and can *request* a new encounter — it can never write a
// DoctorDiagnosis, a Prescription, or touch a MedicalRecord, and the only path
// from an alert to a real MedicalEncounter runs through
// decideEncounterCreationRequest(), which hard-requires a doctor or
// medical_administrator actor. There is no other function anywhere in this
// service that calls encounterService.createEncounter.

export type EscalationTrigger =
  | 'worsening_symptoms' | 'new_red_flag_symptom' | 'medication_side_effect' | 'medication_non_adherence'
  | 'missed_follow_up' | 'treatment_failure' | 'urgent_contact_request' | 'abnormal_home_monitoring' | 'no_response';

interface EscalationRule {
  trigger: EscalationTrigger;
  label: string;
  severity: AlertSeverity;
  responsibleActor: string;
  responseDeadlineHours: number;
  requiresLinkedEncounter: boolean;
}

export const ESCALATION_RULES: Record<EscalationTrigger, EscalationRule> = {
  new_red_flag_symptom: { trigger: 'new_red_flag_symptom', label: 'Triệu chứng cờ đỏ mới xuất hiện', severity: 'critical', responsibleActor: 'Bác sĩ trực / Cấp cứu', responseDeadlineHours: 1, requiresLinkedEncounter: true },
  worsening_symptoms: { trigger: 'worsening_symptoms', label: 'Triệu chứng nặng hơn', severity: 'high', responsibleActor: 'Điều phối viên chăm sóc', responseDeadlineHours: 4, requiresLinkedEncounter: true },
  treatment_failure: { trigger: 'treatment_failure', label: 'Điều trị không hiệu quả', severity: 'high', responsibleActor: 'Điều phối viên chăm sóc → Quản trị viên y tế', responseDeadlineHours: 24, requiresLinkedEncounter: true },
  urgent_contact_request: { trigger: 'urgent_contact_request', label: 'Bệnh nhân yêu cầu liên hệ gấp', severity: 'high', responsibleActor: 'Điều phối viên chăm sóc', responseDeadlineHours: 2, requiresLinkedEncounter: false },
  abnormal_home_monitoring: { trigger: 'abnormal_home_monitoring', label: 'Chỉ số theo dõi tại nhà bất thường', severity: 'medium', responsibleActor: 'Điều phối viên chăm sóc', responseDeadlineHours: 6, requiresLinkedEncounter: true },
  medication_side_effect: { trigger: 'medication_side_effect', label: 'Tác dụng phụ của thuốc', severity: 'medium', responsibleActor: 'Dược sĩ → Bác sĩ', responseDeadlineHours: 12, requiresLinkedEncounter: false },
  missed_follow_up: { trigger: 'missed_follow_up', label: 'Lỡ hẹn tái khám', severity: 'medium', responsibleActor: 'Nhân viên chăm sóc khách hàng', responseDeadlineHours: 24, requiresLinkedEncounter: false },
  medication_non_adherence: { trigger: 'medication_non_adherence', label: 'Không tuân thủ dùng thuốc', severity: 'low', responsibleActor: 'Điều phối viên chăm sóc', responseDeadlineHours: 48, requiresLinkedEncounter: false },
  no_response: { trigger: 'no_response', label: 'Bệnh nhân không phản hồi', severity: 'medium', responsibleActor: 'Nhân viên chăm sóc khách hàng', responseDeadlineHours: 24, requiresLinkedEncounter: false },
};

export const CRM_PROHIBITED_ACTIONS = [
  'Thay đổi chẩn đoán', 'Thay đổi đơn thuốc', 'Kê đơn thuốc mới',
  'Chỉnh sửa hồ sơ bệnh án đã ký', 'Tự tạo lượt khám mới không qua phê duyệt',
  'Tự đóng cảnh báo lâm sàng mà không có xác nhận có thẩm quyền',
] as const;

function getCarePlan(patientId: PatientId): CRMCarePlan | undefined {
  return carePlanRepository.plans().getAll().find((p) => p.patientId === patientId);
}

function ensureCarePlan(patientId: PatientId, encounterId: EncounterId): CRMCarePlan {
  const existing = getCarePlan(patientId);
  if (existing) return existing;
  const plan: CRMCarePlan = { id: nextId('CP'), patientId, encounterId, status: 'active', createdAt: new Date().toISOString() };
  carePlanRepository.plans().upsert(plan);
  return plan;
}

function listActivities(carePlanId: CarePlanId): FollowUpActivity[] {
  return carePlanRepository.activities().getAll().filter((a) => a.carePlanId === carePlanId);
}

function addActivity(carePlanId: CarePlanId, input: Omit<FollowUpActivity, 'id' | 'carePlanId'>): FollowUpActivity {
  const activity: FollowUpActivity = { id: nextId('FUA'), carePlanId, ...input };
  return carePlanRepository.activities().upsert(activity);
}

const ALLOWED_ACTIVITY_TRANSITIONS: Record<FollowUpActivityStatus, FollowUpActivityStatus[]> = {
  scheduled: ['due', 'cancelled', 'escalated'],
  due: ['completed', 'cancelled', 'escalated'],
  completed: [],
  escalated: [],
  cancelled: [],
};

function canTransitionActivity(from: FollowUpActivityStatus, to: FollowUpActivityStatus): boolean {
  return ALLOWED_ACTIVITY_TRANSITIONS[from]?.includes(to) ?? false;
}

function advanceActivity(activityId: string, to: FollowUpActivityStatus): FollowUpActivity {
  const activity = carePlanRepository.activities().getById(activityId);
  if (!activity) throw new Error(`Không tìm thấy hoạt động ${activityId}`);
  if (!canTransitionActivity(activity.status, to)) throw new PermissionError(`Không thể chuyển hoạt động từ "${activity.status}" sang "${to}".`);
  return carePlanRepository.activities().upsert({ ...activity, status: to });
}

function runAutomation(patientId: PatientId, actorId: UserId): { processed: number; notifications: number } {
  const plan = getCarePlan(patientId);
  if (!plan) throw new Error('Bệnh nhân chưa có kế hoạch chăm sóc sau khám.');
  const patient = patientRepository.getById(patientId);
  const recipient = userRepository.getAll().find((u) => u.role === 'patient' && u.name === patient?.name);
  if (!recipient) throw new Error('Không tìm thấy tài khoản nhận thông báo của bệnh nhân.');
  const automaticTypes: FollowUpActivity['type'][] = ['medication_reminder', 'lifestyle_guidance', 'patient_education', 'symptom_questionnaire', 'satisfaction_survey', 'adherence_check'];
  const candidates = listActivities(plan.id).filter((a) => automaticTypes.includes(a.type) && ['scheduled', 'due'].includes(a.status));
  const now = new Date().toISOString();
  candidates.forEach((activity) => {
    const action = activity.type.includes('questionnaire') || activity.type.includes('survey') || activity.type === 'adherence_check' ? 'Gửi bảng hỏi và tự động chấm điểm' : activity.type === 'medication_reminder' ? 'Gửi nhắc dùng thuốc tự động' : 'Gửi nội dung hướng dẫn tự động';
    notificationService.send({ event: 'crm_automation', recipientId: recipient.id, recipientRole: 'patient', channel: 'in_app', message: `${activity.title}: ${activity.description || action}`, relatedPatientId: patientId, relatedEncounterId: plan.encounterId });
    carePlanRepository.activities().upsert({ ...activity, automationMode: 'automatic', automationAction: action, lastAutomatedAt: now, automationRunCount: (activity.automationRunCount ?? 0) + 1, status: activity.status === 'due' ? 'completed' : activity.status });
  });
  auditService.log({ actorId, action: 'CRM_AUTOMATION_RUN', entityType: 'CRMCarePlan', entityId: plan.id, patientId, encounterId: plan.encounterId, newState: `${candidates.length} hoạt động đã xử lý`, sourceModule: 'CRM' });
  return { processed: candidates.length, notifications: candidates.length };
}

function confirmPatientActivity(activityId: string, actorId: UserId): FollowUpActivity {
  const activity = carePlanRepository.activities().getById(activityId);
  if (!activity) throw new Error('Không tìm thấy hoạt động cần xác nhận.');
  if (activity.status === 'scheduled') advanceActivity(activityId, 'due');
  const updated = advanceActivity(activityId, 'completed');
  auditService.log({ actorId, action: 'FOLLOW_UP_CONFIRMED_BY_PATIENT', entityType: 'FollowUpActivity', entityId: activityId, newState: 'completed', sourceModule: 'CRM' });
  return updated;
}

function raiseAlert(carePlanId: CarePlanId, patientId: PatientId, trigger: EscalationTrigger, note: string, actorId: UserId): ClinicalAlert {
  const rule = ESCALATION_RULES[trigger];
  const alert: ClinicalAlert = {
    id: nextId('ALRT'), carePlanId, patientId, trigger, severity: rule.severity, responsibleActor: rule.responsibleActor,
    responseDeadlineHours: rule.responseDeadlineHours, requiresLinkedEncounter: rule.requiresLinkedEncounter,
    status: rule.requiresLinkedEncounter ? 'encounter_requested' : 'open', note, detectedAt: new Date().toISOString(),
  };
  carePlanRepository.alerts().upsert(alert);
  auditService.log({ actorId, action: 'ESCALATION_TRIGGERED', entityType: 'ClinicalAlert', entityId: alert.id, patientId, sourceModule: 'CRM', severity: rule.severity === 'critical' || rule.severity === 'high' ? 'critical' : 'warning' });
  if (rule.requiresLinkedEncounter) {
    requestEncounterCreation(patientId, 'care_coordinator', `${rule.label}: ${note}`, alert.id);
  }
  return alert;
}

function listAlerts(patientId: PatientId): ClinicalAlert[] {
  return carePlanRepository.alerts().getAll().filter((a) => a.patientId === patientId);
}

function listOpenAlerts(): ClinicalAlert[] {
  return carePlanRepository.alerts().getAll().filter((a) => a.status !== 'resolved');
}

/** BR: CRM cannot close a clinical alert without authorized review. */
function closeAlert(alertId: ClinicalAlertId, actorId: UserId): ClinicalAlert {
  assertRole(actorId, ['doctor', 'medical_administrator', 'care_coordinator']);
  const alert = carePlanRepository.alerts().getById(alertId);
  if (!alert) throw new Error(`Không tìm thấy cảnh báo ${alertId}`);
  const updated = carePlanRepository.alerts().upsert({ ...alert, status: 'resolved', closedBy: actorId, closedAt: new Date().toISOString() });
  auditService.log({ actorId, action: 'ALERT_RESOLVED', entityType: 'ClinicalAlert', entityId: alertId, newState: 'resolved', patientId: alert.patientId, sourceModule: 'CRM' });
  return updated;
}

function requestEncounterCreation(patientId: PatientId, requestedByRole: EncounterCreationRequest['requestedByRole'], reason: string, sourceAlertId?: ClinicalAlertId): EncounterCreationRequest {
  const request: EncounterCreationRequest = { id: nextId('ECR'), patientId, sourceAlertId, requestedByRole, reason, status: 'requested', requestedAt: new Date().toISOString() };
  carePlanRepository.encounterRequests().upsert(request);
  if (sourceAlertId) {
    const alert = carePlanRepository.alerts().getById(sourceAlertId);
    if (alert) carePlanRepository.alerts().upsert({ ...alert, status: 'encounter_requested' });
  }
  return request;
}

function listEncounterRequests(): EncounterCreationRequest[] {
  return carePlanRepository.encounterRequests().getAll();
}

/** The single, guarded gate from a CRM request to a real MedicalEncounter. */
function decideEncounterCreationRequest(requestId: EncounterCreationRequestId, decision: 'approve' | 'reject', decidedByUserId: UserId, department = 'Khoa Da liễu'): EncounterCreationRequest {
  assertRole(decidedByUserId, ['medical_administrator', 'doctor']);
  const request = carePlanRepository.encounterRequests().getById(requestId);
  if (!request) throw new Error(`Không tìm thấy yêu cầu ${requestId}`);

  if (decision === 'reject') {
    const rejected: EncounterCreationRequestStatus = 'rejected';
    const updated = carePlanRepository.encounterRequests().upsert({ ...request, status: rejected, decidedBy: decidedByUserId, decidedAt: new Date().toISOString() });
    auditService.log({ actorId: decidedByUserId, action: 'ENCOUNTER_CREATION_REQUEST_REJECTED', entityType: 'EncounterCreationRequest', entityId: requestId, newState: rejected, patientId: request.patientId, sourceModule: 'CRM' });
    return updated;
  }

  const patient = patientRepository.getById(request.patientId);
  const parentEncounterId = patient ? encounterService.listForPatient(patient.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id : undefined;
  const encounter = encounterService.createEncounter(
    { patientId: request.patientId, type: 'follow_up', origin: 'follow_up_request', department, parentEncounterId },
    decidedByUserId,
  );
  const approved = carePlanRepository.encounterRequests().upsert({ ...request, status: 'encounter_created', decidedBy: decidedByUserId, decidedAt: new Date().toISOString(), createdEncounterId: encounter.id });
  auditService.log({ actorId: decidedByUserId, action: 'ENCOUNTER_CREATION_REQUEST_APPROVED', entityType: 'EncounterCreationRequest', entityId: requestId, newState: 'approved', patientId: request.patientId, encounterId: encounter.id, sourceModule: 'CRM' });
  return approved;
}

function getUser(id: UserId) {
  return userRepository.getById(id);
}

export const crmService = {
  ESCALATION_RULES, CRM_PROHIBITED_ACTIONS, getCarePlan, ensureCarePlan, listActivities, addActivity,
  canTransitionActivity, advanceActivity, runAutomation, confirmPatientActivity, raiseAlert, listAlerts, listOpenAlerts, closeAlert,
  requestEncounterCreation, listEncounterRequests, decideEncounterCreationRequest, getUser,
};
