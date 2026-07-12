export const mockPatient = {
  id: 'PT-1029',
  name: 'Nguyễn Văn A',
  age: 28,
  gender: 'Nam',
  avatar: 'A',
  healthScore: 85,
  treatmentProgress: 72,
  riskLevel: 'Thấp',
  phone: '0912 345 678',
  email: 'nguyenvana@gmail.com',
  address: 'Q. Bình Thạnh, TP.HCM',
  dob: '15/03/1995',
  bloodType: 'O+',
  doctor: 'Bs. Nguyễn Thị An',
  doctorSpec: 'Chuyên khoa Da liễu',
  startDate: '15/09/2023',
  diagnosis: 'Mụn trứng cá độ III (Acne Vulgaris)',
};

export const mockAppointments = [
  {
    id: 'APP-1', day: '15', month: '10', type: 'Da liễu', time: '09:00',
    doctor: 'Bs. Nguyễn Thị An', status: 'upcoming', mode: 'Video'
  },
  {
    id: 'APP-2', day: '22', month: '10', type: 'Tái khám', time: '14:00',
    doctor: 'Bs. Trần Văn Nam', status: 'upcoming', mode: 'Trực tiếp'
  },
  {
    id: 'APP-3', day: '01', month: '10', type: 'Khám định kỳ', time: '09:00',
    doctor: 'Bs. Nguyễn Thị An', status: 'done', mode: 'Video'
  },
  {
    id: 'APP-4', day: '15', month: '09', type: 'Khám lần đầu', time: '10:00',
    doctor: 'Bs. Nguyễn Thị An', status: 'done', mode: 'Trực tiếp'
  },
];

export const mockProgressData = [
  { week: 'T1', score: 42, inflammation: 80, pigment: 75, moisture: 45 },
  { week: 'T2', score: 52, inflammation: 70, pigment: 68, moisture: 52 },
  { week: 'T3', score: 61, inflammation: 58, pigment: 60, moisture: 60 },
  { week: 'T4', score: 65, inflammation: 50, pigment: 54, moisture: 63 },
  { week: 'T5', score: 70, inflammation: 42, pigment: 47, moisture: 66 },
  { week: 'T6', score: 74, inflammation: 35, pigment: 40, moisture: 68 },
  { week: 'T7', score: 79, inflammation: 28, pigment: 35, moisture: 70 },
  { week: 'T8', score: 85, inflammation: 22, pigment: 30, moisture: 68 },
];

export const mockPrescriptions = [
  {
    id: 'RX-001',
    date: '10/10/2023',
    doctor: 'Bs. Nguyễn Thị An',
    status: 'active',
    medicines: [
      { name: 'Tretinoin 0.05% Cream', dose: 'Bôi tối, 1 lần/ngày', duration: '3 tháng', remaining: '65 ngày', type: 'Bôi ngoài da' },
      { name: 'Omega-3 1000mg', dose: 'Sau bữa ăn, 1 viên/ngày', duration: '30 ngày', remaining: '12 ngày', type: 'Uống' },
      { name: 'Kem chống nắng SPF50+', dose: 'Sáng trước khi ra ngoài', duration: '1 tháng', remaining: '18 ngày', type: 'Bôi ngoài da' },
    ],
    note: 'Tránh ánh nắng trực tiếp, sử dụng kem chống nắng mỗi ngày.',
  },
  {
    id: 'RX-002',
    date: '25/09/2023',
    doctor: 'Bs. Nguyễn Thị An',
    status: 'completed',
    medicines: [
      { name: 'Doxycycline 100mg', dose: 'Uống sáng, 1 viên/ngày', duration: '7 ngày', remaining: '0 ngày', type: 'Uống' },
      { name: 'Nước muối sinh lý 0.9%', dose: 'Rửa mặt 2 lần/ngày', duration: '7 ngày', remaining: '0 ngày', type: 'Bôi ngoài da' },
    ],
    note: 'Hoàn thành đủ liệu trình kháng sinh.',
  },
];

export const mockMedicineReminders = [
  { id: 1, name: 'Tretinoin 0.05%', time: '22:00', type: 'Bôi', taken: false, color: '#1677FF' },
  { id: 2, name: 'Omega-3 1000mg', time: '07:30', type: 'Uống', taken: true, color: '#52C41A' },
  { id: 3, name: 'Kem chống nắng SPF50+', time: '07:00', type: 'Bôi', taken: true, color: '#FAAD14' },
];

export const mockProgressPhotos = [
  { week: 'Tuần 1', date: '15/09/2023', score: 42, url: null, note: 'Tình trạng ban đầu, nhiều mụn viêm vùng má' },
  { week: 'Tuần 2', date: '22/09/2023', score: 52, url: null, note: 'Bắt đầu giảm viêm sau kháng sinh' },
  { week: 'Tuần 3', date: '29/09/2023', score: 61, url: null, note: 'Mụn giảm rõ, da bắt đầu đều màu hơn' },
  { week: 'Tuần 4', date: '06/10/2023', score: 65, url: null, note: 'Tretinoin bắt đầu phát huy tác dụng' },
  { week: 'Tuần 5', date: '13/10/2023', score: 70, url: null, note: 'Cải thiện tốt, ít mụn mới' },
  { week: 'Tuần 8', date: '03/11/2023', score: 85, url: null, note: 'Kết quả rất tốt, da sáng đều màu' },
];

export const mockCareItems = [
  {
    id: 1, category: 'Nhắc nhở', title: 'Tái khám định kỳ', desc: 'Khám da liễu vào ngày 22/10/2023 với Bs. Trần Văn Nam.',
    date: '22/10/2023', priority: 'high', status: 'pending',
  },
  {
    id: 2, category: 'Chăm sóc', title: 'Uống đủ 2 lít nước mỗi ngày', desc: 'Hydrat hóa từ bên trong giúp da phục hồi nhanh hơn.',
    date: 'Hàng ngày', priority: 'medium', status: 'ongoing',
  },
  {
    id: 3, category: 'Xét nghiệm', title: 'Kết quả xét nghiệm máu', desc: 'Xét nghiệm ngày 28/09/2023 – Kết quả bình thường.',
    date: '28/09/2023', priority: 'low', status: 'done',
  },
  {
    id: 4, category: 'Tư vấn', title: 'Tư vấn chế độ ăn trị mụn', desc: 'Hạn chế đường, sữa, thực phẩm chế biến sẵn.',
    date: '10/10/2023', priority: 'medium', status: 'done',
  },
  {
    id: 5, category: 'AI Cảnh báo', title: 'AI phát hiện nguy cơ tái phát', desc: 'Cần theo dõi vùng trán – AI phát hiện tín hiệu sớm.',
    date: 'Hôm nay', priority: 'high', status: 'pending',
  },
];

export const mockTimeline = [
  { date: '10/10/2023', title: 'Bác sĩ điều chỉnh liều Tretinoin', type: 'Cập nhật phác đồ', color: '#1677FF' },
  { date: '01/10/2023', title: 'Khám định kỳ lần 2', type: 'Lịch hẹn', color: '#4096ff' },
  { date: '28/09/2023', title: 'Xét nghiệm máu – Kết quả bình thường', type: 'Xét nghiệm', color: '#52C41A' },
  { date: '25/09/2023', title: 'Bắt đầu liệu trình kháng sinh Doxycycline', type: 'Đơn thuốc', color: '#FAAD14' },
  { date: '15/09/2023', title: 'Bắt đầu điều trị mụn trứng cá độ III', type: 'Bắt đầu phác đồ', color: '#FF4D4F' },
];
