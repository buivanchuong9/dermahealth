import type { EncounterStatus } from './core/enums';

/** Groups the fine-grained EncounterStatus values into patient/staff-readable
 * milestones for the journey timeline — several statuses collapse into one
 * visible step so the tracker doesn't read like a raw state-machine dump. */
export interface Milestone {
  key: string;
  label: string;
  statuses: EncounterStatus[];
}

export const MILESTONES: Milestone[] = [
  { key: 'intake', label: 'Đăng ký & khai báo triệu chứng', statuses: ['registered', 'intake_in_progress', 'intake_complete'] },
  { key: 'ai', label: 'AI đánh giá sơ bộ', statuses: ['ai_assessed'] },
  { key: 'routing', label: 'Xếp lịch / điều hướng & check-in', statuses: ['routed', 'checked_in'] },
  { key: 'review', label: 'Bác sĩ thăm khám', statuses: ['under_doctor_review', 'awaiting_results'] },
  { key: 'diagnosis', label: 'Chẩn đoán', statuses: ['diagnosed'] },
  { key: 'plan', label: 'Duyệt phác đồ điều trị', statuses: ['plan_approved'] },
  { key: 'workflow', label: 'Thực hiện quy trình vận hành', statuses: ['workflow_active', 'in_progress', 'results_complete', 'final_review'] },
  { key: 'discharge', label: 'Hoàn tất hồ sơ & ký xác nhận', statuses: ['discharge_ready', 'record_signed'] },
  { key: 'closed', label: 'Đóng lượt khám', statuses: ['closed'] },
  { key: 'post_visit', label: 'Theo dõi sau khám', statuses: ['post_visit_monitoring', 'follow_up_linked'] },
];

export function milestoneIndexForStatus(status: EncounterStatus): number {
  if (status === 'escalated') return -1;
  const idx = MILESTONES.findIndex((m) => m.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export function overallProgressPct(status: EncounterStatus): number {
  const idx = milestoneIndexForStatus(status);
  if (idx < 0) return 50; // escalated — indeterminate, shown with a dedicated banner instead
  return Math.round(((idx + 1) / MILESTONES.length) * 100);
}
