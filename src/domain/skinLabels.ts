const SKIN_LABEL_VI: Record<string, string> = {
  acne_severe: 'Mụn trứng cá nặng',
  bkl: 'Tổn thương sừng hóa lành tính',
  blackheads: 'Mụn đầu đen',
  carcinoma: 'Tổn thương nghi ung thư biểu mô',
  cyst: 'Nang da',
  healthy: 'Da chưa thấy bất thường',
  inflammatory_acne: 'Mụn viêm',
  keloid: 'Sẹo lồi',
  mel: 'Tổn thương nghi hắc tố',
  milium: 'Mụn kê',
  nv: 'Nốt ruồi / nevus',
  pustule: 'Mụn mủ',
  rosacea: 'Trứng cá đỏ',
  scar: 'Sẹo',
  whiteheads: 'Mụn đầu trắng',
};

export function formatSkinLabel(label: string | undefined): string {
  if (!label) return 'Chưa xác định';
  if (/^class(?:[_\s-]?\d+)$/i.test(label.trim())) return 'Chưa xác định';
  return SKIN_LABEL_VI[label] ?? label.replaceAll('_', ' ');
}

export function hasVietnameseSkinLabel(label: string | undefined): boolean {
  return Boolean(label && SKIN_LABEL_VI[label]);
}
