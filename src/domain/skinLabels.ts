const SKIN_LABEL_VI: Record<string, string> = {
  acne_severe: 'Mụn trứng cá nặng',
  bkl: 'Dày sừng lành tính (BKL)',
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

// Order matters: most specific patterns first to avoid partial replacements.
const TECHNICAL_JARGON_MAP: [RegExp, string][] = [
  // --- Full-phrase measurement method strings (must come before partial replacements) ---
  [/Hiệu chỉnh bằng thẻ chuẩn (ArUco|CareFollow|DermaHealth) phát hiện trong ảnh \(aruco-calibration\/v1\)/gi, 'Đo diện tích thực tế qua thẻ đo DermaHealth'],
  [/Không phát hiện được thẻ chuẩn (CareFollow|DermaHealth) trong một hoặc cả hai ảnh\./gi, 'Không tìm thấy thẻ đo DermaHealth trong ảnh — chưa tính được diện tích thực.'],
  [/Đếm pixel trong mask sau [Căn chỉnh góc chụp|đăng ký ảnh].+?= 100%/gi, 'So sánh % thay đổi kích thước vùng tổn thương giữa 2 lần chụp'],
  [/Đếm pixel trong mask sau đăng ký ảnh; mốc ban đầu = 100%/gi, 'So sánh % thay đổi kích thước vùng tổn thương giữa 2 lần chụp'],
  [/Đếm pixel trong mask sau Căn chỉnh góc chụp; mốc ban đầu = 100%/gi, 'So sánh % thay đổi kích thước vùng tổn thương giữa 2 lần chụp'],
  [/Ảnh chưa đủ tương đồng hoặc mask chưa đủ tin cậy để tính diện tích\./gi, 'Hai ảnh chưa đủ điều kiện để so sánh kích thước vùng tổn thương.'],
  // --- Legacy brand & measurement normalization ---
  [/CareFollow/gi, 'DermaHealth'],
  [/ArUco/gi, 'DermaHealth'],
  // --- AI label codes ---
  [/["']?inflammatory_acne["']?/gi, '"Mụn viêm"'],
  [/["']?bkl["']?/gi, '"Dày sừng lành tính (BKL)"'],
  [/["']?acne_severe["']?/gi, '"Mụn trứng cá nặng"'],
  [/["']?blackheads["']?/gi, '"Mụn đầu đen"'],
  [/["']?carcinoma["']?/gi, '"Nghi ung thư biểu mô"'],
  [/["']?mel["']?/gi, '"Nghi u hắc tố"'],
  [/["']?rosacea["']?/gi, '"Trứng cá đỏ"'],
  [/["']?whiteheads["']?/gi, '"Mụn đầu trắng"'],
  [/["']?pustule["']?/gi, '"Mụn mủ"'],
  [/["']?healthy["']?/gi, '"Da bình thường"'],
  // --- Generic technical terms ---
  [/bán tự động/gi, 'AI đề xuất'],
  [/Đăng ký ảnh/gi, 'Căn chỉnh góc chụp'],
  [/đăng ký ảnh/gi, 'căn chỉnh góc chụp'],
  [/vật chuẩn kích thước/gi, 'thẻ đo tiêu chuẩn'],
  [/pipeline căn chỉnh/gi, 'quy trình xử lý ảnh'],
  [/mask/gi, 'vùng tổn thương được xác định'],
];

export function humanizeClinicalText(text: string | null | undefined): string {
  if (!text) return '';
  let result = text;
  for (const [pattern, replacement] of TECHNICAL_JARGON_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/""/g, '"');
}
