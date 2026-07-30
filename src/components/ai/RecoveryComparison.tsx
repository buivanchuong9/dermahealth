import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  Activity,
  Camera,
  CheckCircle2,
  CircleAlert,
  Layers3,
  Ruler,
  ScanLine,
  Upload as UploadIcon,
} from 'lucide-react';
import {
  analyzeSkinCase,
  type SkinAnalysisCaseResult,
  type SkinCaseImageResult,
} from '../../api/skinAnalysis';
import {
  analyzeDermatologyImage,
  type ImageQualityReport,
} from '../../domain/imageQuality';
import { formatSkinLabel } from '../../domain/skinLabels';
import {
  compareSkinFrames,
  type SkinVisualChange,
} from '../../domain/skinProgress';
import styles from './RecoveryComparison.module.scss';

const { Title, Text } = Typography;

const BODY_REGIONS = [
  { value: 'face', label: 'Mặt' },
  { value: 'scalp', label: 'Da đầu' },
  { value: 'neck', label: 'Cổ' },
  { value: 'chest', label: 'Ngực' },
  { value: 'back', label: 'Lưng' },
  { value: 'arm-hand', label: 'Tay / bàn tay' },
  { value: 'leg-foot', label: 'Chân / bàn chân' },
  { value: 'other', label: 'Vùng khác' },
];

const CURRENT_SYMPTOMS = [
  { value: 'itching', label: 'Ngứa' },
  { value: 'pain', label: 'Đau rát' },
  { value: 'pus', label: 'Có mủ' },
  { value: 'scaling', label: 'Bong vảy' },
  { value: 'rapid_spreading', label: 'Lan nhanh' },
  { value: 'fever', label: 'Sốt' },
  { value: 'bleeding', label: 'Chảy máu' },
  { value: 'swelling', label: 'Sưng phù' },
  { value: 'hives', label: 'Nổi mề đay' },
  { value: 'blistering', label: 'Phồng rộp' },
  { value: 'breathing_difficulty', label: 'Khó thở' },
];

const RECENT_EXPOSURES = [
  { value: 'new_medication', label: 'Bắt đầu thuốc mới' },
  { value: 'dose_change', label: 'Vừa đổi liều thuốc' },
  { value: 'new_skin_product', label: 'Dùng mỹ phẩm/sản phẩm mới' },
];

const CHANGE_OBSERVATIONS = [
  { value: 'less_redness', label: 'Bớt đỏ' },
  { value: 'smaller', label: 'Vùng tổn thương nhỏ hơn' },
  { value: 'less_itching', label: 'Đỡ ngứa' },
  { value: 'less_pain', label: 'Đỡ đau' },
  { value: 'drier', label: 'Khô/se mặt' },
  { value: 'more_redness', label: 'Đỏ hơn' },
  { value: 'larger', label: 'To hơn' },
  { value: 'new_rash', label: 'Xuất hiện ban mới' },
];

const TRIAGE_LABEL: Record<SkinAnalysisCaseResult['triage']['level'], string> = {
  emergency: 'Cấp cứu',
  urgent: 'Khẩn trong ngày',
  soon: 'Khám trong 24–48 giờ',
  routine: 'Theo dõi thường quy',
};

const TRIAGE_COLOR: Record<SkinAnalysisCaseResult['triage']['level'], string> = {
  emergency: 'red',
  urgent: 'volcano',
  soon: 'gold',
  routine: 'green',
};

type CaptureKey = 'baseline' | 'current';
type ViewerMode = 'original' | 'heatmap';

interface CaptureState {
  file: File | null;
  previewUrl?: string;
  report: ImageQualityReport | null;
  checking: boolean;
  date: string;
}

interface RecoveryComparisonProps {
  patientId: string;
  clinicalMode: boolean;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const initialCapture = (daysAgo: number): CaptureState => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    file: null,
    report: null,
    checking: false,
    date: isoDate(date),
  };
};

const getCloseup = (result: SkinAnalysisCaseResult): SkinCaseImageResult | undefined =>
  result.images.find((image) => image.role === 'closeup') ?? result.images[0];

const topPrediction = (result: SkinAnalysisCaseResult) =>
  [...result.aggregate.predictions].sort((a, b) => b.probability - a.probability)[0]
  ?? getCloseup(result)?.predictions[0];

const rankedPredictions = (result: SkinAnalysisCaseResult) => {
  const predictions = result.aggregate.predictions.length
    ? result.aggregate.predictions
    : getCloseup(result)?.predictions ?? [];
  return [...predictions].sort((a, b) => b.probability - a.probability).slice(0, 3);
};

const formatSigned = (value: number, suffix = '%') =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function RecoveryComparison({ patientId, clinicalMode }: RecoveryComparisonProps) {
  const [bodyRegion, setBodyRegion] = useState<string>();
  const [baseline, setBaseline] = useState<CaptureState>(() => initialCapture(14));
  const [current, setCurrent] = useState<CaptureState>(() => initialCapture(0));
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [exposures, setExposures] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [medicationName, setMedicationName] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{
    baseline: SkinAnalysisCaseResult;
    current: SkinAnalysisCaseResult;
  }>();
  const [visualChange, setVisualChange] = useState<SkinVisualChange>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [viewerMode, setViewerMode] = useState<ViewerMode>('heatmap');
  const [swipePosition, setSwipePosition] = useState(50);

  useEffect(() => () => {
    if (baseline.previewUrl) URL.revokeObjectURL(baseline.previewUrl);
  }, [baseline.previewUrl]);

  useEffect(() => () => {
    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
  }, [current.previewUrl]);

  const resetCapture = (key: CaptureKey) => {
    const setter = key === 'baseline' ? setBaseline : setCurrent;
    setter((previous) => ({
      ...previous,
      file: null,
      previewUrl: undefined,
      report: null,
      checking: false,
    }));
    setResult(undefined);
    setVisualChange(undefined);
  };

  const acceptCapture = async (key: CaptureKey, file: File) => {
    if (!bodyRegion) return Upload.LIST_IGNORE;
    const setter = key === 'baseline' ? setBaseline : setCurrent;
    setter((previous) => ({ ...previous, checking: true }));
    try {
      const report = await analyzeDermatologyImage(file, {
        bodyRegion,
        viewType: 'closeup',
      });
      const previewUrl = report.status === 'blocked'
        ? undefined
        : URL.createObjectURL(report.uploadFile ?? file);
      setter((previous) => ({
        ...previous,
        file: report.status === 'blocked' ? null : (report.uploadFile ?? file),
        previewUrl,
        report,
        checking: false,
      }));
      setResult(undefined);
      setVisualChange(undefined);
      setError(undefined);
    } catch (qualityError) {
      setter((previous) => ({ ...previous, checking: false }));
      setError(
        qualityError instanceof Error
          ? qualityError.message
          : 'Không thể kiểm tra chất lượng ảnh.',
      );
    }
    return false;
  };

  const validation = [
    ...(!bodyRegion ? ['Chọn vùng cơ thể cần theo dõi.'] : []),
    ...(!baseline.file || !baseline.report?.uploadFile ? ['Thêm ảnh mốc ban đầu đạt chất lượng.'] : []),
    ...(!current.file || !current.report?.uploadFile ? ['Thêm ảnh hiện tại đạt chất lượng.'] : []),
    ...(baseline.date > current.date ? ['Ngày ảnh hiện tại phải sau ngày mốc ban đầu.'] : []),
  ];

  const runComparison = async () => {
    if (validation.length || !bodyRegion || !baseline.file || !current.file) return;
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    setVisualChange(undefined);
    try {
      const elapsedDays = Math.max(
        0,
        Math.round(
          (new Date(`${current.date}T00:00:00`).getTime()
            - new Date(`${baseline.date}T00:00:00`).getTime())
          / 86_400_000,
        ),
      );
      const modelContext = [...symptoms, ...exposures, ...observations];
      const clinicalNote = [
        medicationName.trim() ? `Thuốc đang sử dụng: ${medicationName.trim()}` : '',
        note.trim(),
      ].filter(Boolean).join('. ');
      const [baselineResult, currentResult, frameChange] = await Promise.all([
        analyzeSkinCase({
          closeup: baseline.file,
          bodyRegion,
          durationDays: elapsedDays,
          symptoms: modelContext,
          note: clinicalNote,
          patientId,
        }),
        analyzeSkinCase({
          closeup: current.file,
          bodyRegion,
          durationDays: elapsedDays,
          symptoms: modelContext,
          note: clinicalNote,
          patientId,
        }),
        compareSkinFrames(baseline.file, current.file),
      ]);
      setResult({ baseline: baselineResult, current: currentResult });
      setVisualChange(frameChange);
      setViewerMode(
        getCloseup(baselineResult)?.heatmap && getCloseup(currentResult)?.heatmap
          ? 'heatmap'
          : 'original',
      );
      setSwipePosition(50);
    } catch (comparisonError) {
      setError(
        comparisonError instanceof Error
          ? comparisonError.message
          : 'Không thể tạo so sánh hồi phục.',
      );
    } finally {
      setLoading(false);
    }
  };

  const comparison = (() => {
    if (!result) return undefined;
    const baselineImage = getCloseup(result.baseline);
    const currentImage = getCloseup(result.current);
    const baselineAttention = baselineImage?.heatmap?.attention?.coveragePercent;
    const currentAttention = currentImage?.heatmap?.attention?.coveragePercent;
    const attentionDelta =
      typeof baselineAttention === 'number' && typeof currentAttention === 'number'
        ? currentAttention - baselineAttention
        : undefined;
    const baselineTop = topPrediction(result.baseline);
    const currentTop = topPrediction(result.current);
    const baselineRanked = rankedPredictions(result.baseline);
    const currentRanked = rankedPredictions(result.current);
    const calibratedSegmentation = currentImage?.segmentation?.calibrated
      ? currentImage.segmentation
      : undefined;

    return {
      baselineImage,
      currentImage,
      baselineAttention,
      currentAttention,
      attentionDelta,
      baselineTop,
      currentTop,
      baselineRanked,
      currentRanked,
      calibratedSegmentation,
    };
  })();

  const clinicalAssessment = (() => {
    if (!result || !comparison || !visualChange) return undefined;

    const symptomSet = new Set(symptoms);
    const exposureSet = new Set(exposures);
    const observationSet = new Set(observations);
    const normalizedNote = note.trim().toLowerCase();
    const noteMentionsSkinProduct =
      /(mỹ phẩm|sữa tắm|sữa rửa mặt|kem dưỡng|kem bôi|sản phẩm mới)/i.test(normalizedNote);
    const noteMentionsAllergy =
      /(dị ứng|mề đay|nổi ban|phát ban|sưng|phù|phồng rộp|ngứa toàn thân)/i.test(normalizedNote);
    const noteMentionsSevereAllergy =
      /(khó thở|sưng môi|sưng lưỡi|phù mặt|choáng|ngất)/i.test(normalizedNote);
    const noteMentionsInfection =
      /(sốt|có mủ|chảy mủ|đau tăng|lan nhanh)/i.test(normalizedNote);
    const notePositiveChanges = [
      /bớt đỏ/i,
      /đỡ ngứa/i,
      /đỡ đau/i,
      /nhỏ hơn/i,
      /thu nhỏ/i,
    ].filter((pattern) => pattern.test(normalizedNote)).length;
    const noteNegativeChanges = [
      /đỏ hơn/i,
      /ngứa tăng/i,
      /đau tăng/i,
      /to hơn/i,
      /lan rộng/i,
      /ban mới/i,
    ].filter((pattern) => pattern.test(normalizedNote)).length;
    const findings: string[] = [];
    const recommendations: string[] = [];
    const signals: Array<{ value: number; weight: number }> = [];

    if (visualChange.comparable) {
      const rednessSignal = clamp(-visualChange.rednessChangePercent / 35, -1, 1);
      const rednessCoverageSignal = clamp(-visualChange.rednessCoverageDelta / 20, -1, 1);
      signals.push({ value: rednessSignal, weight: 0.35 });
      signals.push({ value: rednessCoverageSignal, weight: 0.25 });
      if (visualChange.rednessChangePercent <= -10) {
        findings.push(`Mức đỏ trong khung ảnh giảm khoảng ${Math.abs(Math.round(visualChange.rednessChangePercent))}%.`);
      } else if (visualChange.rednessChangePercent >= 10) {
        findings.push(`Mức đỏ trong khung ảnh tăng khoảng ${Math.round(visualChange.rednessChangePercent)}%.`);
      } else {
        findings.push('Mức đỏ giữa hai ảnh chưa thay đổi rõ.');
      }
      if (visualChange.rednessCoverageDelta <= -3) {
        findings.push(
          `Phạm vi vùng đỏ giảm ${Math.abs(visualChange.rednessCoverageDelta).toFixed(1)} điểm phần trăm.`,
        );
      } else if (visualChange.rednessCoverageDelta >= 3) {
        findings.push(
          `Phạm vi vùng đỏ tăng ${visualChange.rednessCoverageDelta.toFixed(1)} điểm phần trăm.`,
        );
      }
    } else {
      findings.push(...visualChange.comparabilityReasons);
    }

    if (typeof comparison.attentionDelta === 'number') {
      signals.push({
        value: clamp(-comparison.attentionDelta / 15, -1, 1),
        weight: 0.15,
      });
      if (comparison.attentionDelta <= -5) {
        findings.push('Vùng hệ thống tập trung trên ảnh hiện tại đã thu hẹp.');
      } else if (comparison.attentionDelta >= 5) {
        findings.push('Vùng hệ thống tập trung trên ảnh hiện tại đang mở rộng.');
      }
    }

    const positiveObservations = notePositiveChanges + [
      'less_redness',
      'smaller',
      'less_itching',
      'less_pain',
    ].filter((item) => observationSet.has(item)).length;
    const negativeObservations = noteNegativeChanges + ['more_redness', 'larger', 'new_rash']
      .filter((item) => observationSet.has(item)).length;
    if (positiveObservations || negativeObservations) {
      signals.push({
        value: clamp((positiveObservations - negativeObservations) / 3, -1, 1),
        weight: 0.2,
      });
    }

    if (
      comparison.baselineTop
      && comparison.currentTop
      && comparison.baselineTop.classIndex === comparison.currentTop.classIndex
      && result.current.labelsConfigured
    ) {
      const isHealthy = comparison.currentTop.label === 'healthy';
      const probabilityDelta =
        comparison.currentTop.probability - comparison.baselineTop.probability;
      signals.push({
        value: clamp((isHealthy ? probabilityDelta : -probabilityDelta) / 0.25, -1, 1),
        weight: 0.05,
      });
    }

    const totalWeight = signals.reduce((total, signal) => total + signal.weight, 0);
    const progressSignal = totalWeight
      ? signals.reduce((total, signal) => total + (signal.value * signal.weight), 0)
        / totalWeight
      : 0;
    const improvementPercent = Math.round(clamp(progressSignal, 0, 1) * 100);
    const worseningPercent = Math.round(clamp(-progressSignal, 0, 1) * 100);
    const displayImprovementPercent = visualChange.comparable
      ? improvementPercent
      : undefined;

    const medicationExposure =
      exposureSet.has('new_medication')
      || exposureSet.has('dose_change');
    const allergySymptoms = ['itching', 'hives', 'swelling', 'rapid_spreading', 'blistering']
      .filter((item) => symptomSet.has(item));
    const severeAllergy =
      symptomSet.has('breathing_difficulty')
      || (symptomSet.has('swelling') && symptomSet.has('hives'))
      || noteMentionsSevereAllergy;
    const suspectedDrugReaction =
      medicationExposure
      && (
        allergySymptoms.length >= 2
        || (
          observationSet.has('new_rash')
          && (symptomSet.has('itching') || symptomSet.has('swelling'))
        )
      );
    const suspectedContactReaction =
      (exposureSet.has('new_skin_product') || noteMentionsSkinProduct)
      && (
        ['itching', 'swelling', 'blistering'].some((item) => symptomSet.has(item))
        || noteMentionsAllergy
      );
    const suspectedInfection =
      symptomSet.has('fever')
      || noteMentionsInfection
      || (
        symptomSet.has('pus')
        && (symptomSet.has('pain') || symptomSet.has('rapid_spreading'))
      );

    if (severeAllergy) {
      recommendations.push('Đến cơ sở cấp cứu ngay và mang theo đầy đủ danh sách thuốc đang dùng.');
      recommendations.push('Không tự chờ kết quả AI khi có khó thở, phù mặt hoặc nổi mề đay toàn thân.');
      return {
        type: 'error' as const,
        title: 'Có dấu hiệu phản ứng dị ứng nghiêm trọng',
        summary: 'Các dấu hiệu hiện tại có thể liên quan phản ứng toàn thân và cần được xử trí trực tiếp.',
        improvementPercent: displayImprovementPercent,
        confidence: 'Cảnh báo theo triệu chứng',
        findings,
        recommendations,
      };
    }

    if (suspectedDrugReaction) {
      findings.push('Triệu chứng xuất hiện cùng thời điểm bắt đầu hoặc đổi liều thuốc.');
      recommendations.push('Liên hệ bác sĩ kê đơn trong hôm nay và hỏi hướng xử trí trước liều tiếp theo.');
      recommendations.push('Chuẩn bị tên thuốc, liều dùng và thời điểm xuất hiện ban/ngứa.');
      return {
        type: 'warning' as const,
        title: 'Cần kiểm tra khả năng phản ứng với thuốc',
        summary: 'Thay đổi thuốc gần đây đi kèm các triệu chứng cần được bác sĩ đối chiếu trước khi tiếp tục điều trị.',
        improvementPercent: displayImprovementPercent,
        confidence: 'Nghi ngờ lâm sàng',
        findings,
        recommendations,
      };
    }

    if (suspectedContactReaction) {
      findings.push('Có sản phẩm tiếp xúc da mới kèm dấu hiệu kích ứng.');
      recommendations.push('Tạm ngừng sản phẩm mới, rửa nhẹ bằng nước sạch và đặt lịch nếu ban tiếp tục lan.');
      return {
        type: 'warning' as const,
        title: 'Nghi kích ứng hoặc viêm da tiếp xúc',
        summary: 'Thay đổi sản phẩm chăm sóc da gần đây có thể liên quan dấu hiệu hiện tại.',
        improvementPercent: displayImprovementPercent,
        confidence: 'Nghi ngờ lâm sàng',
        findings,
        recommendations,
      };
    }

    if (suspectedInfection) {
      recommendations.push('Cần bác sĩ đánh giá trong ngày để loại trừ nhiễm trùng.');
      return {
        type: 'warning' as const,
        title: 'Có dấu hiệu cần loại trừ nhiễm trùng',
        summary: 'Sốt, mủ, đau hoặc lan nhanh không phù hợp để chỉ tiếp tục theo dõi tại nhà.',
        improvementPercent: displayImprovementPercent,
        confidence: 'Cảnh báo theo triệu chứng',
        findings,
        recommendations,
      };
    }

    if (!visualChange.comparable) {
      recommendations.push('Chụp lại hai ảnh cùng khoảng cách, góc và ánh sáng trắng.');
      return {
        type: 'info' as const,
        title: 'Chưa thể tính mức cải thiện',
        summary: 'Hai ảnh chưa đủ tương đồng để đưa ra phần trăm có ý nghĩa.',
        improvementPercent: undefined,
        confidence: 'Không đủ dữ liệu',
        findings,
        recommendations,
      };
    }

    if (progressSignal >= 0.15) {
      recommendations.push('Tiếp tục phác đồ hiện tại và chụp lại cùng điều kiện theo lịch.');
      return {
        type: 'success' as const,
        title: 'Có dấu hiệu đáp ứng tích cực',
        summary: 'Mức đỏ, phạm vi vùng chú ý hoặc triệu chứng tự ghi nhận đang cải thiện.',
        improvementPercent,
        confidence: totalWeight >= 0.7 ? 'Trung bình' : 'Thấp',
        findings,
        recommendations,
      };
    }

    if (progressSignal <= -0.15) {
      recommendations.push('Đặt lịch bác sĩ nếu tình trạng tiếp tục tăng hoặc xuất hiện đau, mủ, sốt.');
      return {
        type: 'warning' as const,
        title: 'Tổn thương có xu hướng xấu đi',
        summary: `Chỉ số hình ảnh cho thấy mức xấu đi ước tính ${worseningPercent}% so với ảnh ban đầu.`,
        improvementPercent: 0,
        confidence: totalWeight >= 0.7 ? 'Trung bình' : 'Thấp',
        findings,
        recommendations,
      };
    }

    recommendations.push('Tiếp tục theo dõi; chụp lại nếu có thay đổi rõ về đỏ, kích thước hoặc triệu chứng.');
    return {
      type: 'info' as const,
      title: 'Chưa thấy thay đổi rõ',
      summary: 'Hai ảnh hiện tương đối ổn định, chưa đủ bằng chứng để kết luận đang hồi phục.',
      improvementPercent,
      confidence: totalWeight >= 0.7 ? 'Trung bình' : 'Thấp',
      findings,
      recommendations,
    };
  })();

  const clinicalDifferentials = (() => {
    if (!result || result.current.labelsConfigured) return [];

    const symptomSet = new Set(symptoms);
    const exposureSet = new Set(exposures);
    const candidates: Array<{ name: string; reason: string }> = [];
    const add = (name: string, reason: string) => {
      if (!candidates.some((candidate) => candidate.name === name)) {
        candidates.push({ name, reason });
      }
    };

    if (
      (exposureSet.has('new_medication') || exposureSet.has('dose_change'))
      && ['itching', 'hives', 'swelling', 'new_rash']
        .some((item) => symptomSet.has(item) || observations.includes(item))
    ) {
      add(
        'Phản ứng da liên quan thuốc',
        'Có thay đổi thuốc gần đây đi kèm ban, ngứa hoặc sưng.',
      );
    }
    if (
      exposureSet.has('new_skin_product')
      && ['itching', 'swelling', 'blistering'].some((item) => symptomSet.has(item))
    ) {
      add(
        'Viêm da tiếp xúc',
        'Triệu chứng xuất hiện sau khi dùng sản phẩm tiếp xúc da mới.',
      );
    }
    if (symptomSet.has('hives') || symptomSet.has('swelling')) {
      add('Mề đay', 'Có nổi mề đay hoặc sưng phù.');
    }
    if (
      symptomSet.has('fever')
      || (symptomSet.has('pus') && (symptomSet.has('pain') || symptomSet.has('rapid_spreading')))
    ) {
      add(
        'Nhiễm khuẩn da',
        'Có sốt, mủ, đau tăng hoặc vùng tổn thương lan nhanh.',
      );
    }
    if (symptomSet.has('scaling') && symptomSet.has('itching')) {
      add('Chàm / viêm da', 'Có ngứa kèm bong vảy.');
    }
    if (symptomSet.has('pus') && !symptomSet.has('fever')) {
      add('Tổn thương viêm có mủ', 'Có mủ nhưng chưa ghi nhận sốt.');
    }

    return candidates.slice(0, 3);
  })();

  const sourceFor = (image: SkinCaseImageResult | undefined, mode: ViewerMode) =>
    mode === 'heatmap' && image?.heatmap && !image.heatmap.allZero
      ? image.heatmap.dataUrl
      : image?.original?.dataUrl;

  const baselineSource = comparison
    ? sourceFor(comparison.baselineImage, viewerMode)
    : undefined;
  const currentSource = comparison
    ? sourceFor(comparison.currentImage, viewerMode)
    : undefined;
  const heatmapAvailable = Boolean(
    comparison?.baselineImage?.heatmap
    && !comparison.baselineImage.heatmap.allZero
    && comparison.currentImage?.heatmap
    && !comparison.currentImage.heatmap.allZero,
  );

  const renderCapture = (
    key: CaptureKey,
    title: string,
    subtitle: string,
    capture: CaptureState,
    setter: Dispatch<SetStateAction<CaptureState>>,
  ) => (
    <Card
      className={styles.captureCard}
      title={(
        <div>
          <Text strong>{title}</Text>
          <Text type="secondary" className={styles.cardSubtitle}>{subtitle}</Text>
        </div>
      )}
      extra={capture.report && (
        <Tag color={capture.report.status === 'pass' ? 'green' : capture.report.status === 'review' ? 'gold' : 'red'}>
          Chất lượng {Math.round(capture.report.score * 100)}%
        </Tag>
      )}
      size="small"
    >
      <Input
        type="date"
        value={capture.date}
        max={key === 'baseline' ? current.date : isoDate(new Date())}
        min={key === 'current' ? baseline.date : undefined}
        onChange={(event) => {
          setter((previous) => ({ ...previous, date: event.target.value }));
          setResult(undefined);
        }}
        className={styles.dateInput}
      />

      {!capture.previewUrl ? (
        <Upload.Dragger
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple={false}
          showUploadList={false}
          disabled={!bodyRegion || capture.checking}
          beforeUpload={(file) => acceptCapture(key, file)}
          className={styles.uploader}
        >
          {capture.checking
            ? <Spin size="small" />
            : <Camera size={28} className={styles.uploadIcon} />}
          <Text strong className={styles.uploadTitle}>
            {capture.checking ? 'Đang kiểm tra ảnh…' : 'Chụp hoặc chọn ảnh'}
          </Text>
          <Text type="secondary" className={styles.uploadHint}>
            Cùng khoảng cách, góc chụp và ánh sáng
          </Text>
          <Button
            size="small"
            icon={<UploadIcon size={14} />}
            disabled={!bodyRegion || capture.checking}
          >
            Chọn ảnh
          </Button>
        </Upload.Dragger>
      ) : (
        <div className={styles.capturePreview}>
          <img src={capture.previewUrl} alt={title} />
          <div className={styles.previewOverlay}>
            <Tag color={capture.report?.status === 'pass' ? 'green' : 'gold'}>
              {capture.report?.status === 'pass' ? 'Đạt chuẩn so sánh' : 'Cần bác sĩ xem chất lượng'}
            </Tag>
            <Button size="small" onClick={() => resetCapture(key)}>Đổi ảnh</Button>
          </div>
        </div>
      )}

      {capture.report?.issues.length ? (
        <div className={styles.qualityIssues}>
          {capture.report.issues.slice(0, 2).map((issue) => (
            <Text
              key={issue.code}
              type={issue.severity === 'blocking' ? 'danger' : 'warning'}
            >
              {issue.message}
            </Text>
          ))}
        </div>
      ) : null}
    </Card>
  );

  return (
    <div className={styles.workspace}>
      <Card className={styles.setupCard} size="small" title="1. Thông tin theo dõi">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={8}>
            <Text strong className={styles.fieldLabel}>Vùng cơ thể *</Text>
            <Select
              value={bodyRegion}
              options={BODY_REGIONS}
              placeholder="Chọn vùng cần theo dõi"
              style={{ width: '100%' }}
              onChange={(value) => {
                setBodyRegion(value);
                resetCapture('baseline');
                resetCapture('current');
              }}
            />
          </Col>
          <Col xs={24} md={16}>
            <Text strong className={styles.fieldLabel}>Triệu chứng hiện tại</Text>
            <Checkbox.Group
              value={symptoms}
              options={CURRENT_SYMPTOMS}
              onChange={(values) => {
                setSymptoms(values as string[]);
                setResult(undefined);
                setVisualChange(undefined);
              }}
              className={styles.symptomGroup}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} className={styles.contextRow}>
          <Col xs={24} md={12}>
            <Text strong className={styles.fieldLabel}>Thay đổi thuốc hoặc sản phẩm gần đây</Text>
            <Select
              mode="multiple"
              allowClear
              value={exposures}
              options={RECENT_EXPOSURES}
              placeholder="Không có thay đổi"
              maxTagCount="responsive"
              style={{ width: '100%' }}
              onChange={(values) => {
                setExposures(values);
                setResult(undefined);
                setVisualChange(undefined);
              }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Text strong className={styles.fieldLabel}>So với lần chụp trước</Text>
            <Select
              mode="multiple"
              allowClear
              value={observations}
              options={CHANGE_OBSERVATIONS}
              placeholder="Chọn thay đổi bạn nhận thấy"
              maxTagCount="responsive"
              style={{ width: '100%' }}
              onChange={(values) => {
                setObservations(values);
                setResult(undefined);
                setVisualChange(undefined);
              }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          {renderCapture('baseline', '2. Ảnh ban đầu', 'Ảnh tham chiếu trước điều trị', baseline, setBaseline)}
        </Col>
        <Col xs={24} lg={12}>
          {renderCapture('current', '3. Ảnh hiện tại', 'Ảnh cần đánh giá đáp ứng', current, setCurrent)}
        </Col>
      </Row>

      <Card className={styles.actionCard} size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={8}>
            <Text strong className={styles.fieldLabel}>Thuốc đang sử dụng</Text>
            <Input
              value={medicationName}
              maxLength={160}
              onChange={(event) => {
                setMedicationName(event.target.value);
                setResult(undefined);
                setVisualChange(undefined);
              }}
              placeholder="Ví dụ: Cetirizine 10 mg"
            />
          </Col>
          <Col xs={24} lg={8}>
            <Text strong className={styles.fieldLabel}>Dấu hiệu khác</Text>
            <Input
              value={note}
              maxLength={500}
              onChange={(event) => {
                setNote(event.target.value);
                setResult(undefined);
                setVisualChange(undefined);
              }}
              placeholder="Ví dụ: ban xuất hiện sau 2 ngày…"
            />
          </Col>
          <Col xs={24} lg={8}>
            <Button
              type="primary"
              size="large"
              block
              icon={<ScanLine size={17} />}
              loading={loading}
              disabled={validation.length > 0}
              onClick={() => void runComparison()}
            >
              Phân tích và so sánh
            </Button>
          </Col>
        </Row>
        {validation.length > 0 && (
          <Text type="secondary" className={styles.validationHint}>
            {validation[0]}
          </Text>
        )}
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message="Không thể hoàn tất so sánh"
          description={error}
          onClose={() => setError(undefined)}
        />
      )}

      {loading && (
        <Card className={styles.scanningCard}>
          <div className={styles.scanningVisual}>
            <Spin size="large" />
            <div>
              <Title level={5}>Đang phân tích hai ảnh</Title>
              <Text type="secondary">
                Hệ thống đang kiểm tra chất lượng và đối chiếu thay đổi.
              </Text>
            </div>
          </div>
        </Card>
      )}

      {!loading && result && comparison && clinicalAssessment && (
        <>
          <Alert
            className={styles.outcome}
            type={clinicalAssessment.type}
            showIcon
            icon={
              clinicalAssessment.type === 'success'
                ? <CheckCircle2 size={19} />
                : clinicalAssessment.type === 'warning' || clinicalAssessment.type === 'error'
                  ? <CircleAlert size={19} />
                  : <Activity size={19} />
            }
            message={clinicalAssessment.title}
            description={(
              <div className={styles.assessmentBody}>
                <Text>{clinicalAssessment.summary}</Text>
                {clinicalAssessment.findings.length > 0 && (
                  <ul>
                    {clinicalAssessment.findings.slice(0, 4).map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                )}
                {clinicalAssessment.recommendations.length > 0 && (
                  <div className={styles.recommendation}>
                    <Text strong>Khuyến nghị: </Text>
                    <Text>{clinicalAssessment.recommendations.join(' ')}</Text>
                  </div>
                )}
              </div>
            )}
            action={(
              <div className={styles.assessmentScore}>
                {typeof clinicalAssessment.improvementPercent === 'number' ? (
                  <>
                    <strong>{clinicalAssessment.improvementPercent}%</strong>
                    <span>Mức cải thiện hình ảnh</span>
                  </>
                ) : (
                  <>
                    <strong>—</strong>
                    <span>Cần chụp lại để tính</span>
                  </>
                )}
                <small>Độ tin cậy: {clinicalAssessment.confidence}</small>
              </div>
            )}
          />

          {result.baseline.labelsConfigured && result.current.labelsConfigured ? (
            <Row gutter={[16, 16]}>
              {[
                {
                  key: 'baseline',
                  title: `Khả năng phù hợp · Mốc ${formatDate(baseline.date)}`,
                  predictions: comparison.baselineRanked,
                },
                {
                  key: 'current',
                  title: `Khả năng phù hợp · Hiện tại ${formatDate(current.date)}`,
                  predictions: comparison.currentRanked,
                },
              ].map((scan) => (
                <Col xs={24} lg={12} key={scan.key}>
                  <Card
                    size="small"
                    className={styles.topThreeCard}
                    title={scan.title}
                  >
                    {scan.predictions.length ? (
                      <div className={styles.rankingList}>
                        {scan.predictions.map((prediction, index) => (
                          <div className={styles.rankingRow} key={prediction.classIndex}>
                            <span className={styles.rank}>{index + 1}</span>
                            <div className={styles.rankLabel}>
                              <Text strong>
                                {formatSkinLabel(prediction.label)}
                              </Text>
                            </div>
                            <Progress
                              percent={Math.round(prediction.probability * 100)}
                              size="small"
                              strokeColor={index === 0 ? '#2563eb' : '#64748b'}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa đủ dữ liệu để phân loại"
                      />
                    )}
                    <Text type="secondary" className={styles.rankingDisclaimer}>
                      Mức độ phù hợp do hệ thống ước tính, không thay thế chẩn đoán của bác sĩ.
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Card
              size="small"
              className={styles.topThreeCard}
              title="Các tình trạng cần bác sĩ loại trừ"
            >
              {clinicalDifferentials.length ? (
                <div className={styles.differentialList}>
                  {clinicalDifferentials.map((candidate, index) => (
                    <div className={styles.differentialItem} key={candidate.name}>
                      <span className={styles.rank}>{index + 1}</span>
                      <div>
                        <Text strong>{candidate.name}</Text>
                        <Text type="secondary">{candidate.reason}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="Chưa đủ triệu chứng để gợi ý tên bệnh"
                  description="Bổ sung triệu chứng và thay đổi thuốc/sản phẩm; hệ thống sẽ chỉ nêu tên khi có căn cứ, không suy đoán từ mã kỹ thuật."
                />
              )}
              <Text type="secondary" className={styles.rankingDisclaimer}>
                Đây là danh sách sàng lọc theo triệu chứng, bác sĩ cần khám trực tiếp để xác nhận.
              </Text>
            </Card>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card
                className={styles.viewerCard}
                title="So sánh ảnh trước và sau"
                extra={(
                  <Space wrap>
                    <Segmented
                      size="small"
                      value={viewerMode}
                      onChange={(value) => setViewerMode(value as ViewerMode)}
                      options={[
                        { label: 'Ảnh gốc', value: 'original' },
                        {
                          label: clinicalMode ? 'Bản đồ chú ý' : 'Vùng cần quan sát',
                          value: 'heatmap',
                          disabled: !heatmapAvailable,
                        },
                      ]}
                    />
                    <Tag>{swipePosition}% hiện tại</Tag>
                  </Space>
                )}
                styles={{ body: { padding: 0 } }}
              >
                {baselineSource && currentSource ? (
                  <>
                    <div className={styles.comparisonStage}>
                      <img src={baselineSource} alt="Ảnh mốc ban đầu" />
                      <div
                        className={styles.currentLayer}
                        style={{ clipPath: `inset(0 ${100 - swipePosition}% 0 0)` }}
                      >
                        <img src={currentSource} alt="Ảnh hiện tại" />
                      </div>
                      <div
                        className={styles.swipeDivider}
                        style={{ left: `${swipePosition}%` }}
                      >
                        <span />
                      </div>
                      <div className={styles.stageLabels}>
                        <Tag>Mốc · {formatDate(baseline.date)}</Tag>
                        <Tag color="blue">Hiện tại · {formatDate(current.date)}</Tag>
                      </div>
                      {viewerMode === 'heatmap'
                        && comparison.currentImage?.heatmap?.attention?.boundingBox
                        && (
                          <div
                            className={styles.attentionBox}
                            style={{
                              left: `${comparison.currentImage.heatmap.attention.boundingBox.x * 100}%`,
                              top: `${comparison.currentImage.heatmap.attention.boundingBox.y * 100}%`,
                              width: `${comparison.currentImage.heatmap.attention.boundingBox.width * 100}%`,
                              height: `${comparison.currentImage.heatmap.attention.boundingBox.height * 100}%`,
                            }}
                          >
                            <span>Vùng chú ý</span>
                          </div>
                        )}
                    </div>
                    <div className={styles.sliderBar}>
                      <Text type="secondary">Mốc ban đầu</Text>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={swipePosition}
                        aria-label="Tỷ lệ hiển thị ảnh hiện tại"
                        onChange={(event) => setSwipePosition(Number(event.target.value))}
                      />
                      <Text type="secondary">Hiện tại</Text>
                    </div>
                    {viewerMode === 'heatmap' && (
                      <div className={styles.heatmapLegend}>
                        <div />
                        <Text type="secondary">Ít ảnh hưởng</Text>
                        <Text type="secondary">Ảnh hưởng cao</Text>
                      </div>
                    )}
                  </>
                ) : (
                  <Empty description="Chưa có đủ dữ liệu ảnh để so sánh" />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <div className={styles.metricStack}>
                <Card size="small" className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <Layers3 size={18} />
                    <Text strong>Vùng cần quan sát</Text>
                  </div>
                  {typeof comparison.currentAttention === 'number' ? (
                    <>
                      <div className={styles.metricValue}>
                        {comparison.currentAttention.toFixed(1)}%
                        {typeof comparison.attentionDelta === 'number' && (
                          <Tag color={comparison.attentionDelta <= 0 ? 'green' : 'orange'}>
                            {formatSigned(comparison.attentionDelta)}
                          </Tag>
                        )}
                      </div>
                      <Progress
                        percent={Math.min(100, comparison.currentAttention)}
                        showInfo={false}
                        strokeColor="#7c3aed"
                      />
                    </>
                  ) : <Text type="secondary">Chưa đủ dữ liệu để xác định</Text>}
                  <Text type="secondary" className={styles.metricNote}>
                    Phạm vi vùng hệ thống tập trung; không phải diện tích tổn thương.
                  </Text>
                </Card>

                <Card size="small" className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <Ruler size={18} />
                    <Text strong>Kích thước tổn thương</Text>
                  </div>
                  {comparison.calibratedSegmentation ? (
                    <>
                      <div className={styles.metricValue}>
                        {comparison.calibratedSegmentation.widthMm?.toFixed(1)} × {comparison.calibratedSegmentation.heightMm?.toFixed(1)} mm
                      </div>
                      <Text type="secondary">
                        Diện tích {comparison.calibratedSegmentation.areaMm2?.toFixed(1)} mm²
                      </Text>
                    </>
                  ) : (
                    <div className={styles.metricValueMuted}>Chưa đo được</div>
                  )}
                  <Text type="secondary" className={styles.metricNote}>
                    Muốn đo theo mm, hãy chụp cùng thước chuẩn y tế đặt cạnh tổn thương.
                  </Text>
                </Card>

                <Card size="small" className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <Activity size={18} />
                    <Text strong>Phân luồng hiện tại</Text>
                  </div>
                  <div className={styles.metricValue}>
                    <Tag color={TRIAGE_COLOR[result.current.triage.level]}>
                      {TRIAGE_LABEL[result.current.triage.level]}
                    </Tag>
                  </div>
                  <Text type="secondary" className={styles.metricNote}>
                    Dựa trên triệu chứng hiện tại; không dùng riêng ảnh để loại trừ cấp cứu.
                  </Text>
                </Card>
              </div>
            </Col>
          </Row>

        </>
      )}
    </div>
  );
}
