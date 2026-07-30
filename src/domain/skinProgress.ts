export interface SkinFrameMetrics {
  redness: number;
  rednessCoverage: number;
  luminance: number;
  texture: number;
}

export interface SkinVisualChange {
  baseline: SkinFrameMetrics;
  current: SkinFrameMetrics;
  comparable: boolean;
  comparabilityReasons: string[];
  rednessChangePercent: number;
  rednessCoverageDelta: number;
  textureChangePercent: number;
  pixelDifferencePercent: number;
}

const ANALYSIS_SIZE = 224;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc ảnh để so sánh màu sắc.'));
    };
    image.src = url;
  });

async function readPixels(file: File): Promise<Uint8ClampedArray> {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = ANALYSIS_SIZE;
  canvas.height = ANALYSIS_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Trình duyệt không hỗ trợ phân tích ảnh.');

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    ANALYSIS_SIZE,
    ANALYSIS_SIZE,
  );
  return context.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;
}

function metricsFromPixels(pixels: Uint8ClampedArray): SkinFrameMetrics {
  const pixelCount = ANALYSIS_SIZE * ANALYSIS_SIZE;
  const grayscale = new Float32Array(pixelCount);
  let rednessSum = 0;
  let rednessPixels = 0;
  let luminanceSum = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const total = Math.max(1, red + green + blue);
    const redness = Math.max(0, (red - ((green + blue) / 2)) / total);
    rednessSum += redness;
    if (red - green > 12 && red > blue * 1.04) rednessPixels += 1;
    const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    grayscale[pixel] = luminance;
    luminanceSum += luminance;
  }

  let textureSum = 0;
  let textureSamples = 0;
  for (let y = 1; y < ANALYSIS_SIZE - 1; y += 1) {
    for (let x = 1; x < ANALYSIS_SIZE - 1; x += 1) {
      const index = (y * ANALYSIS_SIZE) + x;
      textureSum += Math.abs(grayscale[index] - grayscale[index - 1]);
      textureSum += Math.abs(grayscale[index] - grayscale[index - ANALYSIS_SIZE]);
      textureSamples += 2;
    }
  }

  return {
    redness: rednessSum / pixelCount,
    rednessCoverage: (rednessPixels / pixelCount) * 100,
    luminance: luminanceSum / pixelCount,
    texture: textureSamples ? textureSum / textureSamples : 0,
  };
}

export async function compareSkinFrames(
  baselineFile: File,
  currentFile: File,
): Promise<SkinVisualChange> {
  const [baselinePixels, currentPixels] = await Promise.all([
    readPixels(baselineFile),
    readPixels(currentFile),
  ]);
  const baseline = metricsFromPixels(baselinePixels);
  const current = metricsFromPixels(currentPixels);

  let pixelDifference = 0;
  for (let offset = 0; offset < baselinePixels.length; offset += 4) {
    pixelDifference += Math.abs(baselinePixels[offset] - currentPixels[offset]);
    pixelDifference += Math.abs(baselinePixels[offset + 1] - currentPixels[offset + 1]);
    pixelDifference += Math.abs(baselinePixels[offset + 2] - currentPixels[offset + 2]);
  }
  const pixelDifferencePercent =
    (pixelDifference / (ANALYSIS_SIZE * ANALYSIS_SIZE * 3 * 255)) * 100;

  const comparabilityReasons: string[] = [];
  if (Math.abs(current.luminance - baseline.luminance) > 35) {
    comparabilityReasons.push('Ánh sáng giữa hai ảnh chênh lệch quá nhiều.');
  }
  if (pixelDifferencePercent > 38) {
    comparabilityReasons.push('Góc chụp hoặc vùng ảnh có thể không trùng khớp.');
  }

  return {
    baseline,
    current,
    comparable: comparabilityReasons.length === 0,
    comparabilityReasons,
    rednessChangePercent: clamp(
      ((current.redness - baseline.redness) / Math.max(baseline.redness, 0.015)) * 100,
      -200,
      200,
    ),
    rednessCoverageDelta: current.rednessCoverage - baseline.rednessCoverage,
    textureChangePercent: clamp(
      ((current.texture - baseline.texture) / Math.max(baseline.texture, 1)) * 100,
      -200,
      200,
    ),
    pixelDifferencePercent,
  };
}
