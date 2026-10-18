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

/** Plain-language guidance shown to the patient for each milestone. It is
 * static explanatory copy (what the step is and what the patient should do);
 * the live facts — current status, queue number, room, pending tasks, orders —
 * always come from the encounter API and are rendered next to it. */
export interface MilestoneGuide {
  summary: string;
  whatHappens: string;
  /** Generic location hint; the real department/room is added from encounter data. */
  where: string;
  patientActions: string[];
}

export const MILESTONE_GUIDE: Record<string, MilestoneGuide> = {
  intake: {
    where: 'Ngay trên ứng dụng, hoặc tại quầy lễ tân nếu bạn đang ở phòng khám.',
    summary: 'Cung cấp thông tin và mô tả tình trạng da',
    whatHappens:
      'Phòng khám ghi nhận thông tin cá nhân và các triệu chứng da liễu bạn đang gặp để bác sĩ nắm tình trạng của bạn trước khi khám.',
    patientActions: [
      'Kiểm tra lại họ tên, ngày sinh, số điện thoại cho đúng',
      'Mô tả triệu chứng: vị trí trên cơ thể, thời điểm bắt đầu, có ngứa/đau/rát không',
      'Ghi rõ thuốc đang dùng và các dị ứng đã biết (nếu có)',
    ],
  },
  ai: {
    where: 'Hệ thống tự xử lý, bạn không cần đến phòng nào.',
    summary: 'Hệ thống phân tích thông tin bạn đã cung cấp',
    whatHappens:
      'Hệ thống AI xem xét thông tin và hình ảnh bạn gửi để đưa ra đánh giá tham khảo ban đầu. Đây chỉ là gợi ý hỗ trợ, bác sĩ mới là người đưa ra chẩn đoán.',
    patientActions: [
      'Bạn không cần thao tác gì thêm, chỉ cần chờ hệ thống xử lý',
      'Nếu được yêu cầu bổ sung ảnh, hãy chụp nơi đủ sáng, rõ nét, thấy rõ vùng da cần khám',
    ],
  },
  routing: {
    where: 'Quầy lễ tân hoặc máy check-in tại sảnh phòng khám.',
    summary: 'Được xếp lịch và có mặt tại phòng khám',
    whatHappens:
      'Phòng khám xếp lịch hoặc điều hướng bạn đến đúng khoa, sau đó xác nhận bạn đã có mặt (check-in) để vào hàng chờ.',
    patientActions: [
      'Đến đúng giờ hẹn và check-in bằng mã QR hoặc tại quầy lễ tân',
      'Mang theo CMND/CCCD và thẻ bảo hiểm (nếu có)',
      'Theo dõi số thứ tự và thời gian chờ ở bên phải màn hình',
    ],
  },
  review: {
    where: 'Phòng khám của bác sĩ phụ trách bạn.',
    summary: 'Bác sĩ trực tiếp thăm khám cho bạn',
    whatHappens:
      'Bác sĩ hỏi bệnh, quan sát vùng da, xem lại thông tin bạn đã cung cấp và có thể chỉ định xét nghiệm hoặc chẩn đoán hình ảnh nếu cần.',
    patientActions: [
      'Trình bày rõ triệu chứng và những gì bạn lo lắng',
      'Cho bác sĩ biết thuốc và mỹ phẩm bạn đang dùng',
      'Nếu có chỉ định xét nghiệm, hãy thực hiện đúng theo hướng dẫn và chờ kết quả',
    ],
  },
  diagnosis: {
    where: 'Phòng khám của bác sĩ phụ trách bạn.',
    summary: 'Bác sĩ đưa ra chẩn đoán',
    whatHappens:
      'Dựa trên thăm khám và kết quả (nếu có), bác sĩ xác định tình trạng da của bạn và giải thích cho bạn.',
    patientActions: [
      'Hỏi bác sĩ nếu chưa hiểu về chẩn đoán',
      'Hỏi về nguyên nhân và những điều cần tránh để da không nặng thêm',
    ],
  },
  plan: {
    where: 'Phòng khám của bác sĩ phụ trách bạn.',
    summary: 'Bác sĩ duyệt phác đồ điều trị',
    whatHappens:
      'Bác sĩ xác nhận hướng điều trị phù hợp với bạn, gồm thuốc, cách chăm sóc da và lịch theo dõi.',
    patientActions: [
      'Nghe và ghi lại cách dùng thuốc, thời gian dùng',
      'Hỏi về tác dụng không mong muốn cần lưu ý',
      'Xác nhận bạn hiểu rõ lịch tái khám (nếu có)',
    ],
  },
  workflow: {
    where: 'Các quầy hoặc phòng thực hiện theo từng việc, xem danh sách bên dưới.',
    summary: 'Thực hiện các bước điều trị theo quy trình',
    whatHappens:
      'Nhân viên phòng khám thực hiện các việc theo phác đồ như thủ thuật, lấy thuốc, hướng dẫn chăm sóc. Mục “Yêu cầu còn thiếu” bên dưới cho biết việc nào còn chờ xử lý.',
    patientActions: [
      'Làm theo hướng dẫn của nhân viên tại từng quầy hoặc phòng',
      'Theo dõi mục “Yêu cầu còn thiếu” để biết việc cần hoàn tất',
      'Báo ngay cho nhân viên nếu bạn thấy khó chịu bất thường',
    ],
  },
  discharge: {
    where: 'Quầy lễ tân hoặc phòng khám, nhân viên sẽ hướng dẫn.',
    summary: 'Hoàn tất hồ sơ và ký xác nhận',
    whatHappens:
      'Phòng khám hoàn thiện hồ sơ bệnh án của lượt khám này và xin bạn xác nhận trước khi kết thúc.',
    patientActions: [
      'Kiểm tra lại thông tin trong hồ sơ',
      'Ký xác nhận khi nhân viên yêu cầu',
    ],
  },
  closed: {
    where: 'Bạn không cần đến phòng nào thêm.',
    summary: 'Lượt khám kết thúc',
    whatHappens:
      'Lượt khám đã được đóng. Toàn bộ thông tin được lưu trong bệnh án của bạn để xem lại bất cứ lúc nào.',
    patientActions: [
      'Giữ lại đơn thuốc và hướng dẫn chăm sóc',
      'Xem lại kết quả tại mục “Bệnh án trọn đời”',
    ],
  },
  post_visit: {
    where: 'Tại nhà, theo dõi và báo cáo qua ứng dụng.',
    summary: 'Theo dõi tình trạng da sau khám',
    whatHappens:
      'Phòng khám tiếp tục theo dõi diễn tiến của bạn sau khám và có thể liên hệ hoặc nhắc lịch tái khám.',
    patientActions: [
      'Dùng thuốc và chăm sóc da đúng hướng dẫn',
      'Chụp ảnh tiến triển theo lịch để bác sĩ theo dõi',
      'Liên hệ phòng khám ngay nếu da có dấu hiệu nặng hơn',
    ],
  },
};

export type StepState = 'done' | 'current' | 'upcoming';

/** `currentIndex < 0` means no milestone is active (e.g. escalated): every step reads as upcoming. */
export function stepStateOf(index: number, currentIndex: number): StepState {
  if (currentIndex < 0) return 'upcoming';
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'current' : 'upcoming';
}

/** Very short names for labels placed around the circular tracker. */
export const MILESTONE_SHORT: Record<string, string> = {
  intake: 'Đăng ký',
  ai: 'AI sơ bộ',
  routing: 'Check-in',
  review: 'Thăm khám',
  diagnosis: 'Chẩn đoán',
  plan: 'Phác đồ',
  workflow: 'Điều trị',
  discharge: 'Ký hồ sơ',
  closed: 'Đóng lượt',
  post_visit: 'Theo dõi',
};
