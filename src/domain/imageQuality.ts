export type ImageQualitySeverity = 'info' | 'warning' | 'blocking';
export type ImageQualityStatus = 'pass' | 'review' | 'blocked';

export interface ImageQualityIssue {
  code:
    | 'unsupported_format'
    | 'file_too_large'
    | 'decode_failed'
    | 'resolution_low'
    | 'resolution_excessive'
    | 'too_dark'
    | 'too_bright'
    | 'low_contrast'
    | 'possibly_blurred';
  severity: ImageQualitySeverity;
  message: string;
  guidance: string;
}

export interface ImageQualityMetrics {
  width: number;
  height: number;
  megapixels: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  darkPixelPercent: number;
  brightPixelPercent: number;
}

export interface ImageQualityReport {
  status: ImageQualityStatus;
  score: number;
  metrics?: ImageQualityMetrics;
  issues: ImageQualityIssue[];
  uploadFile?: File;
  privacy: {
    metadataRemoved: boolean;
    resized: boolean;
    outputFormat?: string;
  };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_SHORT_SIDE_BLOCKING = 200;
const MIN_SHORT_SIDE_WARNING = 640;
const MAX_DECODED_SIDE = 12_000;
const ANALYSIS_SIDE = 256;

const supportedImage = (file: File) =>
  ['image/jpeg', 'image/png'].includes(file.type.toLowerCase());

const issue = (
  code: ImageQualityIssue['code'],
  severity: ImageQualitySeverity,
  message: string,
  guidance: string,
): ImageQualityIssue => ({ code, severity, message, guidance });

function reportStatus(issues: ImageQualityIssue[]): ImageQualityStatus {
  if (issues.some((item) => item.severity === 'blocking')) return 'blocked';
  if (issues.some((item) => item.severity === 'warning')) return 'review';
  return 'pass';
}

export function evaluateImageQualityMetrics(
  metrics: ImageQualityMetrics,
): ImageQualityIssue[] {
  const issues: ImageQualityIssue[] = [];
  const shortSide = Math.min(metrics.width, metrics.height);
  const longSide = Math.max(metrics.width, metrics.height);

  // The inference model resizes every input to a small fixed size regardless
  // of upload resolution, so a mid-range short side is a soft warning, not a
  // hard block. Only reject images too small to carry any usable clinical
  // detail at all.
  if (shortSide < MIN_SHORT_SIDE_BLOCKING) {
    issues.push(issue(
      'resolution_low',
      'blocking',
      `Ảnh chỉ có ${metrics.width}×${metrics.height}px, quá nhỏ để xử lý.`,
      'Chụp lại gần hơn bằng camera chính, không dùng ảnh đã gửi qua ứng dụng chat.',
    ));
  } else if (shortSide < MIN_SHORT_SIDE_WARNING) {
    issues.push(issue(
      'resolution_low',
      'warning',
      `Ảnh chỉ có ${metrics.width}×${metrics.height}px, có thể thiếu chi tiết.`,
      'Nếu có thể, hãy chụp lại gần hơn bằng camera chính để bác sĩ nhìn rõ ranh giới tổn thương.',
    ));
  }
  if (longSide > MAX_DECODED_SIDE) {
    issues.push(issue(
      'resolution_excessive',
      'blocking',
      'Kích thước ảnh vượt ngưỡng xử lý an toàn.',
      'Dùng ảnh gốc từ điện thoại hoặc giảm kích thước xuống dưới 12.000px mỗi chiều.',
    ));
  }

  if (metrics.brightness < 28 || metrics.darkPixelPercent > 72) {
    issues.push(issue(
      'too_dark',
      'blocking',
      'Ảnh quá tối nên màu sắc và ranh giới tổn thương không đáng tin cậy.',
      'Chụp dưới ánh sáng trắng đều, tránh che nguồn sáng bằng tay hoặc điện thoại.',
    ));
  } else if (metrics.brightness < 55 || metrics.darkPixelPercent > 48) {
    issues.push(issue(
      'too_dark',
      'warning',
      'Ảnh hơi tối.',
      'Nếu có thể, hãy tăng ánh sáng trắng và chụp lại để bác sĩ đánh giá màu da tốt hơn.',
    ));
  }

  if (metrics.brightness > 235 || metrics.brightPixelPercent > 72) {
    issues.push(issue(
      'too_bright',
      'blocking',
      'Ảnh bị cháy sáng, làm mất chi tiết vùng da.',
      'Tắt flash trực tiếp và tránh ánh nắng gắt phản chiếu trên da.',
    ));
  } else if (metrics.brightness > 210 || metrics.brightPixelPercent > 48) {
    issues.push(issue(
      'too_bright',
      'warning',
      'Một phần ảnh có thể bị dư sáng.',
      'Chụp ở nơi có ánh sáng tản đều và tránh dùng flash ở khoảng cách gần.',
    ));
  }

  if (metrics.contrast < 12) {
    issues.push(issue(
      'low_contrast',
      'blocking',
      'Ảnh gần như không có đủ tương phản để nhận diện vùng da.',
      'Lau sạch ống kính, lấy nét vào tổn thương và chụp lại dưới ánh sáng đều.',
    ));
  } else if (metrics.contrast < 20) {
    issues.push(issue(
      'low_contrast',
      'warning',
      'Độ tương phản ảnh thấp.',
      'Chạm vào vùng tổn thương trên màn hình để camera lấy nét trước khi chụp.',
    ));
  }

  // Skin can naturally be low-texture, so blur is deliberately a warning
  // unless it is extreme. A clinician can still decide whether the image is
  // usable; the client must not reject a valid smooth-skin close-up blindly.
  if (metrics.sharpness < 18) {
    issues.push(issue(
      'possibly_blurred',
      'blocking',
      'Ảnh có dấu hiệu mất nét nghiêm trọng.',
      'Giữ điện thoại ổn định, chạm lấy nét và chụp lại bằng camera sau.',
    ));
  } else if (metrics.sharpness < 45) {
    issues.push(issue(
      'possibly_blurred',
      'warning',
      'Ảnh có thể hơi mờ.',
      'Phóng to kiểm tra; nếu không nhìn rõ ranh giới tổn thương, hãy chụp lại.',
    ));
  }

  return issues;
}

function calculateMetrics(
  rgba: Uint8ClampedArray,
  sampleWidth: number,
  sampleHeight: number,
  originalWidth: number,
  originalHeight: number,
): ImageQualityMetrics {
  const pixelCount = sampleWidth * sampleHeight;
  const grayscale = new Float32Array(pixelCount);
  let sum = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const value = (0.2126 * rgba[offset]) + (0.7152 * rgba[offset + 1]) + (0.0722 * rgba[offset + 2]);
    grayscale[pixel] = value;
    sum += value;
    if (value < 35) darkPixels += 1;
    if (value > 225) brightPixels += 1;
  }

  const brightness = sum / pixelCount;
  let varianceSum = 0;
  grayscale.forEach((value) => {
    varianceSum += (value - brightness) ** 2;
  });

  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const center = (y * sampleWidth) + x;
      const laplacian =
        (4 * grayscale[center]) -
        grayscale[center - 1] -
        grayscale[center + 1] -
        grayscale[center - sampleWidth] -
        grayscale[center + sampleWidth];
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian ** 2;
      laplacianCount += 1;
    }
  }
  const laplacianMean = laplacianCount ? laplacianSum / laplacianCount : 0;
  const sharpness = laplacianCount
    ? (laplacianSquaredSum / laplacianCount) - (laplacianMean ** 2)
    : 0;

  return {
    width: originalWidth,
    height: originalHeight,
    megapixels: Number(((originalWidth * originalHeight) / 1_000_000).toFixed(2)),
    brightness: Math.round(brightness),
    contrast: Math.round(Math.sqrt(varianceSum / pixelCount)),
    sharpness: Math.round(sharpness),
    darkPixelPercent: Math.round((darkPixels / pixelCount) * 100),
    brightPixelPercent: Math.round((brightPixels / pixelCount) * 100),
  };
}

function safeUploadName(bodyRegion: string, viewType: string, extension: string) {
  const normalizedRegion = bodyRegion.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const normalizedView = viewType.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `derma-${normalizedRegion}-${normalizedView}-${Date.now()}.${extension}`;
}

function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('JPEG không có marker mở đầu hợp lệ.');
  }
  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff || offset + 1 >= bytes.length) {
      throw new Error('JPEG có cấu trúc marker không hợp lệ.');
    }
    const marker = bytes[offset + 1];
    // Start of Scan: compressed pixels continue to EOI and must remain byte-for-byte.
    if (marker === 0xda) {
      parts.push(bytes.slice(offset));
      break;
    }
    if (marker === 0xd9) {
      parts.push(bytes.slice(offset, offset + 2));
      break;
    }
    // Restart/TEM markers have no payload.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (offset + 3 >= bytes.length) throw new Error('JPEG bị cắt giữa segment.');
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2) throw new Error('JPEG có segment length không hợp lệ.');
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentEnd > bytes.length) throw new Error('JPEG có segment vượt quá kích thước tệp.');

    // APP1 carries EXIF/XMP (including GPS), APP13 carries IPTC, and COM is
    // free-form metadata. Keep APP2/ICC color profiles so clinical colors are
    // not altered; compressed pixels are never decoded/re-encoded here.
    const isSensitiveMetadata = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!isSensitiveMetadata) parts.push(bytes.slice(offset, segmentEnd));
    offset = segmentEnd;
  }

  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let writeOffset = 0;
  parts.forEach((part) => {
    output.set(part, writeOffset);
    writeOffset += part.length;
  });
  return output;
}

function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error('PNG không có signature hợp lệ.');
  }
  const metadataChunks = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  let offset = 8;
  let foundEnd = false;

  while (offset + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const dataLength = view.getUint32(0);
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.length) throw new Error('PNG có chunk vượt quá kích thước tệp.');
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (!metadataChunks.has(type)) parts.push(bytes.slice(offset, chunkEnd));
    offset = chunkEnd;
    if (type === 'IEND') {
      foundEnd = true;
      break;
    }
  }
  if (!foundEnd) throw new Error('PNG thiếu chunk kết thúc.');

  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let writeOffset = 0;
  parts.forEach((part) => {
    output.set(part, writeOffset);
    writeOffset += part.length;
  });
  return output;
}

async function createPrivacySafeUpload(
  file: File,
  context: { bodyRegion: string; viewType: string },
): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/jpeg') {
    const stripped = stripJpegMetadata(bytes);
    const safeBytes = Uint8Array.from(stripped);
    return new File(
      [safeBytes.buffer],
      safeUploadName(context.bodyRegion, context.viewType, 'jpg'),
      { type: file.type, lastModified: Date.now() },
    );
  }
  if (file.type === 'image/png') {
    const stripped = stripPngMetadata(bytes);
    const safeBytes = Uint8Array.from(stripped);
    return new File(
      [safeBytes.buffer],
      safeUploadName(context.bodyRegion, context.viewType, 'png'),
      { type: file.type, lastModified: Date.now() },
    );
  }
  throw new Error('Định dạng chưa hỗ trợ loại metadata mà không đổi pixel.');
}

export async function analyzeDermatologyImage(
  file: File,
  context: { bodyRegion: string; viewType: string },
): Promise<ImageQualityReport> {
  const initialIssues: ImageQualityIssue[] = [];
  if (!supportedImage(file)) {
    initialIssues.push(issue(
      'unsupported_format',
      'blocking',
      'Định dạng ảnh chưa được hỗ trợ để kiểm tra chất lượng.',
      'Vui lòng dùng JPG hoặc PNG. Ảnh chụp trực tiếp trên điện thoại thường được chuyển sang JPG.',
    ));
  }
  if (file.size > MAX_FILE_BYTES) {
    initialIssues.push(issue(
      'file_too_large',
      'blocking',
      'Ảnh vượt quá dung lượng tối đa 5MB.',
      'Giảm kích thước ảnh hoặc chụp lại bằng chế độ ảnh tiêu chuẩn.',
    ));
  }
  if (initialIssues.length > 0) {
    return {
      status: 'blocked',
      score: 0,
      issues: initialIssues,
      privacy: { metadataRemoved: false, resized: false },
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      status: 'blocked',
      score: 0,
      issues: [issue(
        'decode_failed',
        'blocking',
        'Trình duyệt không đọc được ảnh này.',
        'Hãy mở ảnh trên thiết bị, xuất thành JPG rồi thử lại.',
      )],
      privacy: { metadataRemoved: false, resized: false },
    };
  }

  try {
    const sampleScale = Math.min(1, ANALYSIS_SIDE / Math.max(bitmap.width, bitmap.height));
    const sampleWidth = Math.max(1, Math.round(bitmap.width * sampleScale));
    const sampleHeight = Math.max(1, Math.round(bitmap.height * sampleScale));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleContext) throw new Error('Trình duyệt không hỗ trợ kiểm tra ảnh.');
    sampleContext.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const metrics = calculateMetrics(
      pixels,
      sampleWidth,
      sampleHeight,
      bitmap.width,
      bitmap.height,
    );
    const issues = evaluateImageQualityMetrics(metrics);

    if (issues.some((item) => item.severity === 'blocking')) {
      return {
        status: 'blocked',
        score: Math.max(0, 100 - issues.reduce((total, item) => total + (item.severity === 'blocking' ? 35 : 12), 0)),
        metrics,
        issues,
        privacy: { metadataRemoved: false, resized: false },
      };
    }

    const uploadFile = await createPrivacySafeUpload(file, context);
    const status = reportStatus(issues);
    const penalty = issues.reduce((total, item) => total + (item.severity === 'warning' ? 12 : 0), 0);
    return {
      status,
      score: Math.max(0, 100 - penalty),
      metrics,
      issues,
      uploadFile,
      privacy: {
        metadataRemoved: true,
        resized: false,
        outputFormat: file.type,
      },
    };
  } catch {
    return {
      status: 'blocked',
      score: 0,
      issues: [issue(
        'decode_failed',
        'blocking',
        'Không thể hoàn tất kiểm tra chất lượng ảnh.',
        'Vui lòng chụp lại hoặc chọn một ảnh JPG khác.',
      )],
      privacy: { metadataRemoved: false, resized: false },
    };
  } finally {
    bitmap.close();
  }
}
