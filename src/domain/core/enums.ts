// Canonical status vocabularies shared by every page and service. Using
// string-literal unions (not `enum`, which isn't erasable syntax) so these
// stay plain data — easy to persist to localStorage and to satisfy
// exhaustiveness checks in switch statements.

export type UserRole =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'lab_technician'
  | 'imaging_technician'
  | 'pharmacist'
  | 'care_coordinator'
  | 'customer_care_employee'
  | 'medical_administrator'
  | 'system_administrator'
  | 'clinical_process_designer';

export const ROLE_LABEL: Record<UserRole, string> = {
  patient: 'Bệnh nhân',
  doctor: 'Bác sĩ',
  nurse: 'Điều dưỡng',
  receptionist: 'Lễ tân',
  lab_technician: 'Kỹ thuật viên xét nghiệm',
  imaging_technician: 'Kỹ thuật viên chẩn đoán hình ảnh',
  pharmacist: 'Dược sĩ',
  care_coordinator: 'Điều phối viên chăm sóc',
  customer_care_employee: 'Nhân viên chăm sóc khách hàng',
  medical_administrator: 'Quản trị viên y tế',
  system_administrator: 'Quản trị viên hệ thống',
  clinical_process_designer: 'Chuyên viên thiết kế quy trình',
};

export type EncounterStatus =
  | 'registered'
  | 'intake_in_progress'
  | 'intake_complete'
  | 'ai_assessed'
  | 'routed'
  | 'checked_in'
  | 'under_doctor_review'
  | 'awaiting_results'
  | 'diagnosed'
  | 'plan_approved'
  | 'workflow_active'
  | 'in_progress'
  | 'results_complete'
  | 'final_review'
  | 'discharge_ready'
  | 'record_signed'
  | 'closed'
  | 'post_visit_monitoring'
  | 'escalated'
  | 'follow_up_linked';

export const ENCOUNTER_STATUS_LABEL: Record<EncounterStatus, string> = {
  registered: 'Đã đăng ký',
  intake_in_progress: 'Đang khai báo triệu chứng',
  intake_complete: 'Đã hoàn thành khai báo',
  ai_assessed: 'AI đã đánh giá sơ bộ',
  routed: 'Đã xếp lịch/điều hướng',
  checked_in: 'Đã check-in',
  under_doctor_review: 'Bác sĩ đang thăm khám',
  awaiting_results: 'Chờ kết quả cận lâm sàng',
  diagnosed: 'Đã có chẩn đoán',
  plan_approved: 'Đã duyệt phác đồ',
  workflow_active: 'Quy trình đang chạy',
  in_progress: 'Đang thực hiện tác vụ',
  results_complete: 'Đã đủ kết quả',
  final_review: 'Bác sĩ xem lại lần cuối',
  discharge_ready: 'Sẵn sàng xuất viện',
  record_signed: 'Hồ sơ đã ký',
  closed: 'Đã đóng lượt khám',
  post_visit_monitoring: 'Đang theo dõi sau khám',
  escalated: 'Đang xử lý bất thường',
  follow_up_linked: 'Đã tạo lượt tái khám liên kết',
};

export type AIHumanReviewStatus = 'pending' | 'accepted' | 'partial' | 'rejected';

export type DiagnosisStatus = 'none' | 'provisional' | 'differential' | 'confirmed' | 'revised' | 'signed';

export type ClinicalOrderStatus =
  | 'requested'
  | 'in_progress'
  | 'invalid_sample'
  | 'result_ready'
  | 'completed'
  | 'cancelled';

export type WorkflowTemplateStatus = 'draft' | 'in_review' | 'published' | 'deprecated' | 'archived';

export type WorkflowInstanceStatus = 'created' | 'active' | 'suspended' | 'completed' | 'cancelled';

export type WorkflowTaskStatus =
  | 'pending'
  | 'blocked'
  | 'ready'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'waiting_for_patient'
  | 'waiting_for_result'
  | 'waiting_for_approval'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'redo_required'
  | 'skipped'
  | 'cancelled'
  | 'expired'
  | 'escalated';

export const TASK_STATUS_LABEL: Record<WorkflowTaskStatus, string> = {
  pending: 'Chưa bắt đầu',
  blocked: 'Bị chặn',
  ready: 'Sẵn sàng',
  assigned: 'Đã phân công',
  accepted: 'Đã nhận việc',
  in_progress: 'Đang thực hiện',
  waiting_for_patient: 'Chờ bệnh nhân',
  waiting_for_result: 'Chờ kết quả',
  waiting_for_approval: 'Chờ phê duyệt',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  rejected: 'Bị từ chối',
  redo_required: 'Cần làm lại',
  skipped: 'Đã bỏ qua',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  escalated: 'Đã báo cáo bất thường',
};

export type MedicalRecordStatus =
  | 'draft'
  | 'in_review'
  | 'awaiting_completion'
  | 'awaiting_signature'
  | 'signed'
  | 'addendum_required'
  | 'amended'
  | 'reopened';

export const RECORD_STATUS_LABEL: Record<MedicalRecordStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang xem xét',
  awaiting_completion: 'Chờ bổ sung',
  awaiting_signature: 'Chờ ký',
  signed: 'Đã ký',
  addendum_required: 'Cần bổ sung ghi chú',
  amended: 'Đã sửa đổi',
  reopened: 'Đã mở lại',
};

export type CarePlanStatus = 'not_started' | 'active' | 'completed' | 'suspended';

export type FollowUpActivityStatus = 'scheduled' | 'due' | 'completed' | 'escalated' | 'cancelled';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'open' | 'acknowledged' | 'encounter_requested' | 'resolved';

export type EncounterCreationRequestStatus = 'requested' | 'approved' | 'rejected' | 'encounter_created';

export type NotificationChannel = 'in_app' | 'sms' | 'email' | 'push';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'retrying';

export type IntegrationStatus = 'healthy' | 'degraded' | 'down';

export type Priority = 'low' | 'medium' | 'high';

export type Urgency = 'routine' | 'urgent' | 'emergency';
