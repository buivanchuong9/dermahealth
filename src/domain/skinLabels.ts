const SKIN_LABEL_VI: Record<string, string> = {
  // 31 Dermatology Condition Classes
  acne_conglobata: 'Mụn trứng cá cụm (Acne Conglobata)',
  acne_et_rosacea: 'Mụn trứng cá & Chứng đỏ da (Rosacea)',
  actinic_keratosis: 'Dày sừng quang hóa (Tiền ung thư da)',
  alopecia_disorders: 'Bệnh lý rụng tóc / Hói đầu',
  atopic_dermatitis: 'Viêm da cơ địa (Atopic Dermatitis)',
  bacterial_dermatosis: 'Bệnh da do vi khuẩn (Nhiễm trùng da)',
  basal_cell_carcinoma: 'Ung thư tế bào đáy (BCC)',
  cicatrix: 'Sẹo tổn thương (Cicatrix / Sẹo lồi, lõm)',
  comedonal_acne: 'Mụn trứng cá đầu đen / đầu trắng (Comedonal)',
  contact_dermatitis: 'Viêm da tiếp xúc (Dị ứng / Kích ứng)',
  cutaneous_vasculitis: 'Viêm mạch máu dưới da',
  cysts: 'Nang da (Cyst)',
  dermatofibroma: 'U chất xơ da lành tính (Dermatofibroma)',
  drug_induced_exanthema: 'Phát ban do phản ứng thuốc',
  eczema: 'Bệnh chàm / Eczema',
  forehead_lesions: 'Tổn thương vùng da mặt & trán',
  fungal_dermatosis: 'Bệnh nấm da (Hắc lào, Lang ben, Nấm thân)',
  healthy_skin: 'Da bình thường (Chưa thấy bất thường)',
  melanocytic_nevus: 'Nốt ruồi tế bào hắc tố (Nevus)',
  milia: 'Mụn kê / Mụn thịt (Milia)',
  nodules: 'Tổn thương dạng cục / Nốt sần lớn (Nodule)',
  onychomycosis: 'Nấm móng tay / móng chân',
  papules: 'Sẩn viêm dưới da (Papule)',
  pigmentation_disorders: 'Rối loạn sắc tố (Nám, Tàn nhang, Sạm da)',
  psoriasis_et_lichen_planus: 'Bệnh vảy nến & Lichen phẳng',
  pustules: 'Mụn mủ (Pustule)',
  sebaceous_hyperplasia: 'Tăng sinh tuyến bã nhờn',
  seborrheic_keratosis: 'Dày sừng tiết bã (Dày sừng lành tính)',
  urticaria: 'Bệnh mày đay / Nổi mề đay',
  vascular_lesions: 'Tổn thương mạch máu da (U máu, Giãn mạch)',
  viral_cutaneous_infections: 'Nhiễm trùng da do virus (Mụn cóc, Zona, Herpes)',

  // Aliases & Legacy keys
  acne_severe: 'Mụn trứng cá nặng',
  bkl: 'Dày sừng lành tính (BKL)',
  blackheads: 'Mụn đầu đen',
  carcinoma: 'Ung thư biểu mô da',
  cyst: 'Nang da',
  healthy: 'Da bình thường',
  inflammatory_acne: 'Mụn viêm',
  keloid: 'Sẹo lồi',
  mel: 'Nốt ruồi / U hắc tố',
  milium: 'Mụn kê',
  nv: 'Nốt ruồi (Nevus)',
  pustule: 'Mụn mủ',
  rosacea: 'Chứng đỏ da (Rosacea)',
  scar: 'Sẹo da',
  whiteheads: 'Mụn đầu trắng',
  tinea_corporis: 'Hắc lào (Nấm da thân)',
  hac_lao: 'Hắc lào (Nấm da thân)',
  tinea: 'Bệnh nấm da',
  fungal: 'Nấm da',
  dermatophytosis: 'Nấm da',
  psoriasis: 'Bệnh vảy nến',
  shingles: 'Zona thần kinh',
  herpes_zoster: 'Zona thần kinh',
  impetigo: 'Bệnh chốc',
  seborrheic_dermatitis: 'Viêm da dầu (Tiết bã)',
  vitiligo: 'Bệnh bạch biến',
  molluscum: 'U mềm lây',
  scabies: 'Bệnh ghẻ',
  wart: 'Mụn hạt cơm / Mụn cóc',
};

// Fallback label mapping by class index (0..30)
const CLASS_INDEX_VI: Record<number, string> = {
  0: 'Mụn trứng cá cụm (Acne Conglobata)',
  1: 'Mụn trứng cá & Chứng đỏ da (Rosacea)',
  2: 'Dày sừng quang hóa (Tiền ung thư da)',
  3: 'Bệnh lý rụng tóc / Hói đầu',
  4: 'Viêm da cơ địa',
  5: 'Bệnh da do vi khuẩn (Nhiễm trùng da)',
  6: 'Ung thư tế bào đáy (BCC)',
  7: 'Sẹo tổn thương (Cicatrix)',
  8: 'Mụn trứng cá đầu đen / đầu trắng',
  9: 'Viêm da tiếp xúc',
  10: 'Viêm mạch máu dưới da',
  11: 'Nang da (Cyst)',
  12: 'U chất xơ da lành tính',
  13: 'Phát ban do phản ứng thuốc',
  14: 'Bệnh chàm / Eczema',
  15: 'Tổn thương vùng da mặt & trán',
  16: 'Hắc lào / Bệnh nấm da',
  17: 'Da bình thường',
  18: 'Nốt ruồi tế bào hắc tố (Nevus)',
  19: 'Mụn kê / Mụn thịt (Milia)',
  20: 'Tổn thương dạng cục / Nốt sần lớn',
  21: 'Nấm móng tay / móng chân',
  22: 'Sẩn viêm dưới da (Papule)',
  23: 'Rối loạn sắc tố (Nám, Tàn nhang)',
  24: 'Bệnh vảy nến & Lichen phẳng',
  25: 'Mụn mủ (Pustule)',
  26: 'Tăng sinh tuyến bã nhờn',
  27: 'Dày sừng tiết bã (Lành tính)',
  28: 'Bệnh mày đay / Mề đay',
  29: 'Tổn thương mạch máu da',
  30: 'Nhiễm trùng da do virus (Mụn cóc, Zona)',
};

export function formatSkinLabel(label: string | undefined, classIndex?: number): string {
  if (label) {
    const trimmed = label.trim();
    const lower = trimmed.toLowerCase();
    if (SKIN_LABEL_VI[lower]) {
      return SKIN_LABEL_VI[lower];
    }
    // Handle numeric strings like "0", "1", "class_0", "class-1", "class 0"
    const match = /^(?:class[_\s-]?)?(\d+)$/i.exec(trimmed);
    if (match) {
      const idx = parseInt(match[1], 10);
      return CLASS_INDEX_VI[idx] ?? `Bệnh da liễu loại #${idx + 1}`;
    }
  }

  if (classIndex !== undefined) {
    return CLASS_INDEX_VI[classIndex] ?? `Bệnh da liễu loại #${classIndex + 1}`;
  }

  if (!label) return 'Hắc lào (Nấm da thân)';
  return label.replaceAll('_', ' ');
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
