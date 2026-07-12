import { encounterService } from './services/encounterService';
import { clinicalOrderService } from './services/clinicalOrderService';
import { medicalRecordService } from './services/medicalRecordService';
import type { EncounterId, UserId } from './core/ids';

// Demo-only helper: each scenario nudges a real, existing seeded encounter
// through the actual services (so every guard rule still applies — an
// illegal transition still throws) rather than fabricating new fixtures.
// This is what backs Journey.tsx's "selectable scenario presets".

export type ScenarioKey =
  | 'standard' | 'emergency_red_flag' | 'additional_testing' | 'patient_refusal'
  | 'patient_left' | 'referral' | 'follow_up_visit' | 'late_result_after_closure' | 'critical_result_during_workflow';

export const SCENARIO_LABEL: Record<ScenarioKey, string> = {
  standard: 'Ca khám da liễu tiêu chuẩn',
  emergency_red_flag: 'Cấp cứu — cờ đỏ',
  additional_testing: 'Cần xét nghiệm bổ sung',
  patient_refusal: 'Bệnh nhân từ chối thực hiện',
  patient_left: 'Bệnh nhân rời đi trước khi hoàn tất',
  referral: 'Chuyển tuyến chuyên khoa khác',
  follow_up_visit: 'Xem lượt tái khám liên kết',
  late_result_after_closure: 'Kết quả đến muộn sau khi đóng hồ sơ',
  critical_result_during_workflow: 'Kết quả bất thường giữa quy trình',
};

export function applyScenario(scenario: ScenarioKey, encounterId: EncounterId, actorId: UserId): { message: string } {
  const encounter = encounterService.getEncounter(encounterId);
  if (!encounter) throw new Error(`Không tìm thấy lượt khám ${encounterId}`);

  switch (scenario) {
    case 'standard':
      encounterService.addEvent(encounter, 'Xem lại theo kịch bản: Ca khám tiêu chuẩn', 'info');
      return { message: 'Đây là luồng khám da liễu tiêu chuẩn, không có bất thường.' };

    case 'emergency_red_flag':
      encounterService.transitionStatus(encounterId, 'escalated', actorId, {
        reason: 'Mô phỏng cờ đỏ khẩn cấp', blockingCondition: 'Cờ đỏ lâm sàng — cần bác sĩ trực đánh giá ngay',
      });
      return { message: 'Đã chuyển lượt khám sang trạng thái khẩn cấp (escalated) — bỏ qua hàng đợi thông thường.' };

    case 'additional_testing':
      clinicalOrderService.createOrder(encounterId, actorId, {
        type: 'imaging', justification: 'Nghi ngờ tổn thương sâu, cần chẩn đoán hình ảnh bổ sung theo kịch bản demo', assignedRole: 'imaging_technician',
      });
      return { message: 'Đã tạo thêm chỉ định chẩn đoán hình ảnh — lượt khám chờ thêm kết quả.' };

    case 'patient_refusal':
      encounterService.setBlockingCondition(encounterId, 'Bệnh nhân từ chối thực hiện chỉ định đã đưa ra');
      encounterService.addEvent(encounter, 'Bệnh nhân từ chối thực hiện xét nghiệm/thủ thuật được chỉ định', 'warning');
      return { message: 'Đã ghi nhận việc bệnh nhân từ chối — bác sĩ cần quyết định hướng xử lý tiếp theo.' };

    case 'patient_left':
      encounterService.setBlockingCondition(encounterId, 'Bệnh nhân rời cơ sở trước khi hoàn tất lượt khám');
      encounterService.addEvent(encounter, 'Bệnh nhân rời đi trước khi hoàn tất — lượt khám chưa thể đóng', 'danger');
      return { message: 'Lượt khám bị đánh dấu chưa hoàn tất do bệnh nhân rời đi sớm.' };

    case 'referral':
      encounterService.setBlockingCondition(encounterId, 'Chờ hoàn tất chuyển tuyến sang cơ sở/chuyên khoa khác');
      encounterService.addEvent(encounter, 'Bác sĩ quyết định chuyển tuyến sang chuyên khoa khác', 'info');
      return { message: 'Lượt khám được đánh dấu chờ chuyển tuyến.' };

    case 'follow_up_visit':
      encounterService.addEvent(encounter, 'Xem lại theo kịch bản: lượt tái khám liên kết (ENC-1002)', 'info');
      return { message: 'Hãy chọn ENC-1002 trong danh sách lượt khám để xem lượt tái khám đã liên kết với ENC-1000.' };

    case 'late_result_after_closure': {
      if (!encounter.medicalRecordId) throw new Error('Lượt khám này chưa có hồ sơ bệnh án.');
      const record = medicalRecordService.flagLateResult(encounter.medicalRecordId, actorId, 'Kết quả xét nghiệm bổ sung về sau khi hồ sơ đã đóng/ký');
      return {
        message: record.status === 'signed'
          ? 'Hồ sơ đã ký vẫn được giữ nguyên (immutable) — kết quả muộn chỉ tạo cảnh báo, không tự động sửa hồ sơ.'
          : 'Hồ sơ chưa ký được đánh dấu "cần bổ sung" do kết quả đến muộn.',
      };
    }

    case 'critical_result_during_workflow': {
      const orders = clinicalOrderService.listForEncounter(encounterId);
      const order = orders[0];
      if (!order) throw new Error('Lượt khám này chưa có chỉ định cận lâm sàng nào để mô phỏng kết quả bất thường.');
      clinicalOrderService.completeOrder(order.id, actorId, 'Chỉ số CRP tăng cao bất thường so với ngưỡng bình thường', true);
      encounterService.addEvent(encounter, 'Phát hiện kết quả bất thường trong khi quy trình đang chạy', 'danger');
      return { message: 'Đã ghi nhận kết quả bất thường — cần bác sĩ xem xét lại trước khi tiếp tục quy trình.' };
    }

    default:
      return { message: 'Không có thay đổi.' };
  }
}
