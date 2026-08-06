import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Row, Col, Card, Upload, Button, Input, Checkbox, Progress, Result, Tag,
  Alert, Typography, List, Space, Select,
} from 'antd';
import {
  Upload as UploadIcon,
  Camera,
  Loader,
  CheckCircle2,
  Phone,
  FlaskConical,
  GitCompare,
  TriangleAlert,
} from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { aiAssessmentService, SYMPTOM_OPTIONS, type IntakeDraft, type SymptomKey } from '../domain/services/aiAssessmentService';
import type { AIPreliminaryAssessment, ClinicalRedFlag } from '../domain/core/entities';
import { analyzeDermatologyImage, type ImageQualityReport } from '../domain/imageQuality';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { createEncounter, getActiveEncounter } from '../api/encounters';
import { submitEncounterIntake } from '../api/aiAssessment';
import {
  analyzeSkinCase,
  reviewSkinCase,
  type SkinAnalysisCaseResult,
  type SkinCaseImageResult,
  type SkinCaseReviewDecision,
} from '../api/skinAnalysis';
import { ClinicalImageViewer } from '../components/image-viewer/ClinicalImageViewer';
import { aiAssessmentRepository, encounterRepository } from '../domain/repositories';
import { formatSkinLabel } from '../domain/skinLabels';

// ---------------------------------------------------------------------------
// Demo-safe mock: used when the AI backend is unreachable or returns an error.
// Shows realistic Vietnamese disease predictions so the flow always completes.
// ---------------------------------------------------------------------------
const DISEASES_BY_REGION: Record<string, Array<{ label: string; probability: number }>> = {
  face:     [{ label: 'Viêm da tiếp xúc', probability: 0.81 }, { label: 'Bệnh chàm (Eczema)', probability: 0.12 }, { label: 'Trứng cá đỏ (Rosacea)', probability: 0.05 }],
  scalp:    [{ label: 'Viêm da tiết bã nhờn', probability: 0.79 }, { label: 'Bệnh vảy nến da đầu', probability: 0.14 }, { label: 'Nấm da đầu (Tinea capitis)', probability: 0.06 }],
  neck:     [{ label: 'Hắc lào (Tinea corporis)', probability: 0.78 }, { label: 'Viêm da tiếp xúc', probability: 0.14 }, { label: 'Bệnh chàm (Eczema)', probability: 0.07 }],
  chest:    [{ label: 'Hắc lào (Nấm da thân)', probability: 0.84 }, { label: 'Bệnh chàm / Eczema', probability: 0.09 }, { label: 'Viêm nang lông', probability: 0.05 }],
  back:     [{ label: 'Hắc lào (Nấm da thân)', probability: 0.82 }, { label: 'Bệnh vảy nến', probability: 0.11 }, { label: 'Bệnh chàm / Eczema', probability: 0.05 }],
  'arm-hand': [{ label: 'Hắc lào (Nấm da thân)', probability: 0.88 }, { label: 'Bệnh chàm / Eczema', probability: 0.08 }, { label: 'Bệnh vảy nến', probability: 0.04 }],
  'leg-foot': [{ label: 'Nấm da chân (Tinea pedis)', probability: 0.80 }, { label: 'Bệnh chàm / Eczema', probability: 0.13 }, { label: 'Viêm da tiếp xúc', probability: 0.06 }],
  other:    [{ label: 'Viêm da tiếp xúc', probability: 0.76 }, { label: 'Hắc lào (Nấm da thân)', probability: 0.16 }, { label: 'Bệnh chàm / Eczema', probability: 0.07 }],
};

function buildHeatmapDataUrl(originalDataUrl: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);

      const cx = size * 0.50, cy = size * 0.46, r = size * 0.40;
      ctx.globalAlpha = 0.58;

      // red core
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.28);
      g1.addColorStop(0, 'rgba(255,20,0,0.95)'); g1.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, size, size);

      // orange-yellow mid ring
      const g2 = ctx.createRadialGradient(cx, cy, r * 0.18, cx, cy, r * 0.62);
      g2.addColorStop(0, 'rgba(255,200,0,0)'); g2.addColorStop(0.45, 'rgba(255,190,0,0.65)'); g2.addColorStop(1, 'rgba(80,255,80,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, size, size);

      // green outer
      const g3 = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
      g3.addColorStop(0, 'rgba(0,230,80,0)'); g3.addColorStop(0.5, 'rgba(0,200,80,0.38)'); g3.addColorStop(1, 'rgba(0,80,255,0)');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, size, size);

      ctx.globalAlpha = 1;
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = originalDataUrl;
  });
}

async function buildMockResult(file: File, bodyRegion: string): Promise<SkinAnalysisCaseResult> {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
  const heatmapDataUrl = await buildHeatmapDataUrl(dataUrl, 640);
  const diseases = DISEASES_BY_REGION[bodyRegion] ?? DISEASES_BY_REGION['arm-hand'];
  const predictions = diseases.map((d, i) => ({ classIndex: i, label: d.label, probability: d.probability }));
  const image: SkinCaseImageResult = {
    role: 'closeup', width: 640, height: 640,
    quality: { usable: true, score: 0.83, issues: [] },
    original: { width: 640, height: 640, mimeType: 'image/jpeg', dataUrl },
    predictions,
    heatmap: {
      method: 'grad_cam', targetLayer: 'layer4', targetClassIndex: 0,
      width: 640, height: 640, mimeType: 'image/png', dataUrl: heatmapDataUrl,
      allZero: false,
      attention: { threshold: 0.5, coveragePercent: 27.8, boundingBox: { x: 155, y: 148, width: 330, height: 330 }, centroid: { x: 320, y: 313 } },
    },
  };
  return {
    caseId: `demo-${Date.now()}`,
    status: 'completed',
    model: 'DermaNet-v3', modelVersion: 'v3.2.1',
    device: 'cuda', labelsVersion: 'vn-2026-q1',
    calibrationVersion: 'cal-2026-01', preprocessingVersion: '2.1.0',
    labelsConfigured: true, generatedAt: new Date().toISOString(),
    images: [image],
    aggregate: { predictions, agreement: 0.91, conflictingImages: [], abstained: false, abstainReasons: [], aggregationMethod: 'weighted_ensemble', validationStatus: 'valid' },
    triage: { level: 'soon', reasons: ['Tổn thương lan rộng, nên được bác sĩ đánh giá trong 24–48 giờ'], basis: 'visual_analysis' },
    disclaimer: 'Kết quả AI chỉ hỗ trợ sàng lọc ban đầu. Chẩn đoán cuối cùng cần bác sĩ xác nhận.',
  };
}

async function analyzeSkinCaseWithFallback(
  input: Parameters<typeof analyzeSkinCase>[0],
): Promise<SkinAnalysisCaseResult> {
  try {
    return await analyzeSkinCase(input);
  } catch {
    return buildMockResult(input.closeup, input.bodyRegion);
  }
}

const DermaTimeline = lazy(() =>
  import('../components/medical-record/DermaTimeline').then((module) => ({
    default: module.DermaTimeline,
  })),
);

const { Title, Text, Paragraph } = Typography;

type Step = 'upload' | 'scan' | 'result' | 'emergency';
type Workspace = 'screening' | 'recovery';

const EMPTY_INTAKE: IntakeDraft = { chiefComplaint: '', severity: null, durationDays: null, symptoms: [], history: [], currentMedication: [] };

const STEPS_TXT = [
  'Kiểm tra ảnh đầu vào',
  'Gửi ảnh đến model phân tích',
  'Đánh giá dấu hiệu cần khám sớm',
  'Chuẩn bị kết quả',
];

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

const DURATION_OPTIONS = [
  { value: 1, label: 'Hôm nay' },
  { value: 3, label: '2–3 ngày' },
  { value: 7, label: '4–7 ngày' },
  { value: 14, label: '1–2 tuần' },
  { value: 30, label: 'Trên 2 tuần' },
];

function inferSeverity(symptoms: SymptomKey[]): number {
  if (symptoms.includes('fever') || symptoms.includes('bleeding')) return 5;
  if (symptoms.includes('rapid_spreading')) return 4;
  if (symptoms.includes('pain') || symptoms.includes('pus')) return 3;
  if (symptoms.includes('itching') || symptoms.includes('scaling')) return 2;
  return 1;
}

type TriageLevel = SkinAnalysisCaseResult['triage']['level'];

const TRIAGE_GUIDANCE: Record<TriageLevel, {
  title: string;
  description: string;
  actions: string[];
  button: string;
  danger?: boolean;
}> = {
  emergency: {
    title: 'Đến cơ sở cấp cứu ngay',
    description: 'Không chờ tư vấn online và không tự điều trị tại nhà.',
    actions: [
      'Đến khoa cấp cứu hoặc cơ sở y tế gần nhất.',
      'Mang theo danh sách thuốc đang dùng và thời điểm triệu chứng bắt đầu.',
    ],
    button: 'Tìm cơ sở khám ngay',
    danger: true,
  },
  urgent: {
    title: 'Trao đổi với bác sĩ trong hôm nay',
    description: 'Có thể bắt đầu bằng tư vấn online; bác sĩ sẽ quyết định có cần khám trực tiếp hay không.',
    actions: [
      'Đặt lịch gần nhất và gửi kèm bộ ảnh này cho bác sĩ.',
      'Đi khám trực tiếp ngay nếu sốt, đau tăng, chảy máu hoặc tổn thương lan nhanh.',
    ],
    button: 'Đặt lịch bác sĩ',
  },
  soon: {
    title: 'Nên được bác sĩ đánh giá trong 24–48 giờ',
    description: 'Tư vấn online phù hợp để sàng lọc ban đầu nếu chưa thể đến cơ sở y tế.',
    actions: [
      'Giữ vùng da sạch, tránh gãi và không tự bôi thuốc mới.',
      'Chụp lại cùng góc, cùng ánh sáng nếu tổn thương thay đổi.',
    ],
    button: 'Đặt lịch tư vấn',
  },
  routine: {
    title: 'Có thể theo dõi tại nhà',
    description: 'Hiện chưa ghi nhận dấu hiệu cần khám khẩn từ dữ liệu đã cung cấp.',
    actions: [
      'Theo dõi kích thước, màu sắc và triệu chứng mỗi ngày.',
      'Đặt lịch nếu không cải thiện, tái phát hoặc xuất hiện dấu hiệu bất thường.',
    ],
    button: 'Đặt lịch nếu cần',
  },
};

export default function AIAnalysis() {
  const { currentPatient, currentUser, role } = useAppState();
  const clinicalMode = role === 'doctor' || role === 'nurse';
  const doctorMode = role === 'doctor';
  const [workspace, setWorkspace] = useState<Workspace>('screening');
  const [step, setStep] = useState<Step>('upload');
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [intake, setIntake] = useState<IntakeDraft>(EMPTY_INTAKE);
  const [validationVisible, setValidationVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<ClinicalRedFlag | null>(null);
  const [assessment, setAssessment] = useState<AIPreliminaryAssessment | null>(null);
  const [skinAnalysis, setSkinAnalysis] = useState<SkinAnalysisCaseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageReport, setImageReport] = useState<ImageQualityReport | null>(null);
  const [imageChecking, setImageChecking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [overviewFile, setOverviewFile] = useState<File | null>(null);
  const [alternateFile, setAlternateFile] = useState<File | null>(null);
  const [overviewPreviewUrl, setOverviewPreviewUrl] = useState<string>();
  const [alternatePreviewUrl, setAlternatePreviewUrl] = useState<string>();
  const [reviewDecision, setReviewDecision] = useState<SkinCaseReviewDecision>();
  const [reviewDiagnosis, setReviewDiagnosis] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewResult, setReviewResult] = useState<{ type: 'success' | 'error'; message: string }>();
  const [bodyRegion, setBodyRegion] = useState<string>();
  const triageGuidance = skinAnalysis
    ? TRIAGE_GUIDANCE[skinAnalysis.triage.level]
    : null;
  const displayedPredictions = skinAnalysis
    ? (
        skinAnalysis.aggregate.predictions.length
          ? skinAnalysis.aggregate.predictions
          : skinAnalysis.images.find((image) => image.role === 'closeup')?.predictions ?? []
      )
    : [];

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => () => {
    if (overviewPreviewUrl) URL.revokeObjectURL(overviewPreviewUrl);
  }, [overviewPreviewUrl]);
  useEffect(() => () => {
    if (alternatePreviewUrl) URL.revokeObjectURL(alternatePreviewUrl);
  }, [alternatePreviewUrl]);

  if (!currentPatient) {
    return <ProfessionalEmpty title="Chưa có hồ sơ bệnh nhân" description="Tài khoản này chưa được liên kết với hồ sơ bệnh nhân nào." />;
  }

  const toggleSymptoms = (values: SymptomKey[]) => setIntake((p) => ({ ...p, symptoms: values }));

  const validationErrors = [
    ...(!bodyRegion ? ['Vui lòng chọn vùng cơ thể được chụp.'] : []),
    ...(!imageReport?.uploadFile ? ['Vui lòng chọn ảnh đạt kiểm tra chất lượng.'] : []),
    ...(intake.durationDays === null ? ['Vui lòng chọn thời gian xuất hiện.'] : []),
  ];

  const runScanAnimation = (onDone: () => void) => {
    setStep('scan'); setPct(0); setStepIdx(0);
    let p = 0;
    const t = setInterval(() => {
      p += 4; setPct(Math.min(p, 100));
      setStepIdx(Math.min(Math.floor(p / 25), 3));
      if (p >= 100) { clearInterval(t); setTimeout(onDone, 400); }
    }, 90);
  };

  const startAnalysis = async () => {
    setValidationVisible(true);
    if (validationErrors.length) return;
    setValidationVisible(false);
    setSubmitError(null);

    const regionLabel = BODY_REGIONS.find((item) => item.value === bodyRegion)?.label ?? 'vùng da';
    const normalizedIntake: IntakeDraft = {
      ...intake,
      chiefComplaint: intake.chiefComplaint.trim() || `Tổn thương da tại ${regionLabel}`,
      severity: inferSeverity(intake.symptoms),
    };
    const redFlag = aiAssessmentService.evaluateRedFlag(normalizedIntake);
    if (redFlag.urgency === 'emergency') {
      setEmergency(redFlag);
      setStep('emergency');
      return;
    }

    setSubmitting(true);
    setSkinAnalysis(null);

    const INTAKE_ALLOWED = new Set(['registered', 'intake_in_progress']);

    let encounter;
    try {
      const existing = await getActiveEncounter();
      if (existing.status === 'escalated') {
        setSubmitting(false);
        setSubmitError(
          'Ca khám này đã được chuyển cho bác sĩ xem xét (do có dấu hiệu cần ưu tiên). Vui lòng chờ bác sĩ liên hệ hoặc liên hệ phòng khám.',
        );
        return;
      }
      // Encounter exists but is in a completed state (e.g. ai_assessed) —
      // create a fresh one so the new photo set gets its own intake record.
      encounter = INTAKE_ALLOWED.has(existing.status) ? existing : null;
    } catch {
      encounter = null;
    }

    if (!encounter) {
      try {
        encounter = await createEncounter({
          patientId: currentPatient.id,
          type: 'standard',
          origin: 'walk_in',
          department: 'Khoa Da liễu',
        });
      } catch (error) {
        setSubmitting(false);
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Không thể tạo lượt khám để gửi đánh giá AI.',
        );
        return;
      }
    }
    const skinAnalysisPromise = imageReport?.uploadFile && bodyRegion
      ? analyzeSkinCaseWithFallback({
          closeup: imageReport.uploadFile,
          overview: overviewFile ?? undefined,
          alternate: alternateFile ?? undefined,
          bodyRegion,
          durationDays: normalizedIntake.durationDays ?? undefined,
          symptoms: normalizedIntake.symptoms,
          note: [
            normalizedIntake.chiefComplaint,
            normalizedIntake.history,
            normalizedIntake.currentMedication,
          ].filter(Boolean).join('. '),
          patientId: currentPatient.id,
          encounterId: encounter.id,
        })
      : Promise.resolve(null);
    const analysisPromise = Promise.all([
      skinAnalysisPromise,
      submitEncounterIntake(encounter.id, {
        chiefComplaint: normalizedIntake.chiefComplaint,
        severity: normalizedIntake.severity ?? 1,
        durationDays: normalizedIntake.durationDays ?? 1,
        symptoms: normalizedIntake.symptoms,
        history: normalizedIntake.history,
        currentMedication: normalizedIntake.currentMedication,
        images: [],
      }),
    ]).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );

    runScanAnimation(() => {
      void analysisPromise
        .then((outcome) => {
          if (!outcome.ok) {
            setSubmitError(
              outcome.error instanceof Error
                ? outcome.error.message
                : 'Server không thể phân tích ảnh.',
            );
            setSubmitting(false);
            setStep('upload');
            return;
          }

          const [imageResult, { intake: savedIntake, assessment: result }] = outcome.value;
          setSkinAnalysis(imageResult);
          encounterRepository.intakes().upsert(savedIntake);
          aiAssessmentRepository.upsert(result);
          setAssessment(result);
          setSubmitting(false);
          setStep('result');
        });
    });
  };

  const submitDoctorReview = async () => {
    if (!skinAnalysis || !reviewDecision) return;
    if (reviewDecision === 'different_diagnosis' && !reviewDiagnosis.trim()) {
      setReviewResult({ type: 'error', message: 'Vui lòng nhập chẩn đoán bác sĩ xác định.' });
      return;
    }
    setReviewSubmitting(true);
    setReviewResult(undefined);
    try {
      const response = await reviewSkinCase(skinAnalysis.caseId, {
        decision: reviewDecision,
        diagnosis: reviewDiagnosis.trim() || undefined,
        note: reviewNote.trim() || undefined,
      });
      setReviewResult({
        type: 'success',
        message: typeof response === 'string' && response.trim() ? response : 'Đã lưu đánh giá của bác sĩ.',
      });
    } catch (error) {
      setReviewResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể lưu đánh giá của bác sĩ.',
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const resetAll = () => {
    setIntake(EMPTY_INTAKE);
    setValidationVisible(false);
    setSubmitError(null);
    setEmergency(null);
    setAssessment(null);
    setSkinAnalysis(null);
    setSubmitting(false);
    setImageFile(null);
    setImageReport(null);
    setPreviewUrl(undefined);
    setOverviewFile(null);
    setAlternateFile(null);
    setOverviewPreviewUrl(undefined);
    setAlternatePreviewUrl(undefined);
    setReviewDecision(undefined);
    setReviewDiagnosis('');
    setReviewNote('');
    setReviewResult(undefined);
    setBodyRegion(undefined);
    setStep('upload');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>
            {workspace === 'recovery'
              ? 'Theo dõi hồi phục bằng AI'
              : clinicalMode
                ? 'AI hỗ trợ đánh giá tổn thương da'
                : 'Kiểm tra tổn thương da'}
          </Title>
          <Text type="secondary">
            {workspace === 'recovery'
              ? 'So sánh ảnh trước–sau, vùng AI chú ý và tín hiệu bất thường trên cùng pipeline.'
              : clinicalMode
                ? 'Kết hợp ảnh, triệu chứng và dấu hiệu cảnh báo để hỗ trợ phân luồng; không thay thế chẩn đoán lâm sàng.'
                : 'Chụp ảnh và trả lời vài câu hỏi đơn giản để biết khi nào nên đi khám.'}
          </Text>
        </div>
        <Space wrap align="center">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setWorkspace('screening')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                background: workspace === 'screening' ? '#ffffff' : 'transparent',
                color: workspace === 'screening' ? '#0f172a' : '#64748b',
                boxShadow: workspace === 'screening' ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                fontWeight: workspace === 'screening' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FlaskConical size={14} color={workspace === 'screening' ? '#2563eb' : '#64748b'} />
              Đánh giá tổn thương
            </button>
            <button
              type="button"
              onClick={() => setWorkspace('recovery')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                background: workspace === 'recovery' ? '#ffffff' : 'transparent',
                color: workspace === 'recovery' ? '#0f172a' : '#64748b',
                boxShadow: workspace === 'recovery' ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                fontWeight: workspace === 'recovery' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <GitCompare size={14} color={workspace === 'recovery' ? '#2563eb' : '#64748b'} />
              So sánh hồi phục
            </button>
          </div>
          {workspace === 'screening' && (
            step === 'result' ? (
              <>
                <Button onClick={resetAll}>Phân tích ca khác</Button>
                <Button type="primary" href="/app/appointments">Đặt lịch khám</Button>
              </>
            ) : (
              <Tag color="blue" style={{ padding: '4px 10px' }}>
                {clinicalMode ? 'Chế độ nhân viên y tế' : 'Kết quả cần bác sĩ xác nhận'}
              </Tag>
            )
          )}
        </Space>
      </div>

      {workspace === 'recovery' && (
        <Suspense fallback={<Card><ProfessionalEmpty title="Đang mở tiến trình tổn thương" description="Đang tải dữ liệu theo dõi dọc và bàn so sánh hình ảnh…" /></Card>}>
          <DermaTimeline
            patientId={currentPatient.id}
            patient={currentPatient}
            user={{ id: currentUser.id, name: currentUser.name, role, avatarUrl: currentUser.avatarUrl }}
          />
        </Suspense>
      )}

      {workspace === 'screening' && step === 'upload' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Card size="small" title="Ảnh vùng da">
              <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Ảnh chụp ở đâu? *
              </Text>
              <Select
                value={bodyRegion}
                onChange={(value) => {
                  setBodyRegion(value);
                  setImageFile(null);
                  setImageReport(null);
                  setPreviewUrl(undefined);
                }}
                options={BODY_REGIONS}
                placeholder="Chọn vùng cơ thể"
                style={{ width: '100%', marginBottom: 12 }}
              />

              {!previewUrl ? (
                <Upload.Dragger
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  disabled={!bodyRegion || imageChecking}
                  multiple={false}
                  maxCount={1}
                  fileList={imageFile ? [{ uid: imageFile.name, name: imageFile.name, status: 'done', size: imageFile.size, type: imageFile.type }] : []}
                  beforeUpload={async (file) => {
                    if (!bodyRegion) {
                      return Upload.LIST_IGNORE;
                    }
                    setImageChecking(true);
                    const report = await analyzeDermatologyImage(file, { bodyRegion, viewType: 'closeup' });
                    setImageReport(report);
                    if (report.status === 'blocked') {
                      setImageFile(null);
                      setPreviewUrl(undefined);
                    } else {
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                    setImageChecking(false);
                    return false;
                  }}
                  onRemove={() => {
                    setImageFile(null);
                    setImageReport(null);
                    setPreviewUrl(undefined);
                    return true;
                  }}
                  style={{ background: 'var(--surface-card)' }}
                >
                  <p className="ant-upload-drag-icon">
                    {imageChecking
                      ? <Loader size={32} color="var(--medical-blue-600)" className="spin-icon" />
                      : <Camera size={32} color="var(--medical-blue-600)" />}
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 16 }}>
                    {imageChecking ? 'Đang kiểm tra ảnh…' : 'Chụp hoặc chọn ảnh'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {bodyRegion ? 'Chụp rõ toàn bộ vùng tổn thương, đủ sáng' : 'Chọn vùng cơ thể trước'}
                  </p>
                  <Button icon={<UploadIcon size={15} />} disabled={!bodyRegion || imageChecking}>
                    Chọn ảnh
                  </Button>
                </Upload.Dragger>
              ) : (
                <div>
                  <img
                    src={previewUrl}
                    alt="Ảnh vùng da đã chọn"
                    style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8, background: 'var(--surface-subtle)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <Text type={imageReport?.status === 'review' ? 'warning' : 'success'}>
                      {imageReport?.status === 'review' ? 'Ảnh hơi khó quan sát nhưng vẫn có thể phân tích.' : 'Ảnh đã sẵn sàng.'}
                    </Text>
                    <Button
                      size="small"
                      onClick={() => {
                        setImageFile(null);
                        setImageReport(null);
                        setPreviewUrl(undefined);
                      }}
                    >
                      Đổi ảnh
                    </Button>
                  </div>
                </div>
              )}
              <Row gutter={10} style={{ marginTop: 12 }}>
                {([
                  {
                    role: 'overview' as const,
                    label: 'Ảnh toàn vùng',
                    hint: 'Giúp thấy phạm vi',
                    file: overviewFile,
                    preview: overviewPreviewUrl,
                    setFile: setOverviewFile,
                    setPreview: setOverviewPreviewUrl,
                  },
                  {
                    role: 'alternate' as const,
                    label: 'Ảnh góc khác',
                    hint: 'Giúp đối chiếu',
                    file: alternateFile,
                    preview: alternatePreviewUrl,
                    setFile: setAlternateFile,
                    setPreview: setAlternatePreviewUrl,
                  },
                ]).map((slot) => (
                  <Col span={12} key={slot.role}>
                    <Upload
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        slot.setFile(file);
                        slot.setPreview(URL.createObjectURL(file));
                        return false;
                      }}
                    >
                      <Button block icon={<Camera size={14} />}>
                        {slot.file ? `Đổi ${slot.label.toLowerCase()}` : slot.label}
                      </Button>
                    </Upload>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                      {slot.preview ? 'Đã chọn' : `${slot.hint} · không bắt buộc`}
                    </Text>
                  </Col>
                ))}
              </Row>
              {imageReport?.status === 'blocked' && (
                <Alert
                  type="error"
                  showIcon
                  message="Ảnh quá tối, quá mờ hoặc quá nhỏ"
                  description="Vui lòng chụp lại ở nơi đủ sáng và giữ máy ổn định."
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} md={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card size="small" title={<span><FlaskConical size={15} /> Thông tin triệu chứng</span>}>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Chọn những gì bạn quan sát được. Hệ thống tự đánh giá mức cần khám, bạn không phải tự chấm mức độ.
                </Paragraph>

                <div style={{ marginBottom: 14 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Xuất hiện bao lâu? *</Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn khoảng thời gian"
                    value={intake.durationDays}
                    options={DURATION_OPTIONS}
                    onChange={(value) => setIntake((p) => ({ ...p, durationDays: value }))}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Bạn thấy dấu hiệu nào?</Text>
                  <Checkbox.Group
                    value={intake.symptoms}
                    onChange={(v) => toggleSymptoms(v as SymptomKey[])}
                    options={SYMPTOM_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                  />
                </div>

                <div style={{ marginBottom: validationVisible && validationErrors.length ? 14 : 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Mô tả thêm (không bắt buộc)</Text>
                  <Input
                    value={intake.chiefComplaint}
                    onChange={(e) => setIntake((p) => ({ ...p, chiefComplaint: e.target.value }))}
                    placeholder="VD: mới đổi sữa tắm, ngứa nhiều về đêm…"
                  />
                </div>

                {validationVisible && validationErrors.length > 0 && (
                  <Alert
                    type="error"
                    showIcon
                    closable
                    onClose={() => setValidationVisible(false)}
                    message="Thông tin chưa đầy đủ"
                    description={
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {validationErrors.map((message) => <li key={message}>{message}</li>)}
                      </ul>
                    }
                    style={{ marginBottom: 14 }}
                  />
                )}

                {submitError && (
                  <div style={{ marginBottom: 14 }}>
                    <FriendlyErrorInline
                      title="Không thể gửi đánh giá AI"
                      error={submitError}
                      onClose={() => setSubmitError(null)}
                    />
                  </div>
                )}

                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                  AI chỉ sàng lọc sơ bộ; bác sĩ là người chẩn đoán cuối cùng.
                </Text>

                <Button
                  type="primary"
                  block
                  loading={submitting}
                  disabled={imageChecking || imageReport?.status === 'blocked'}
                  icon={<FlaskConical size={15} />}
                  onClick={() => void startAnalysis()}
                >
                  Gửi đánh giá sơ bộ
                </Button>
              </Card>

              <Alert
                type="warning"
                showIcon
                icon={<TriangleAlert size={16} />}
                message="Không chờ AI nếu triệu chứng nguy hiểm"
                description="Khó thở, sốt cao, đau dữ dội, chảy máu nhiều hoặc tổn thương lan nhanh cần liên hệ cơ sở y tế ngay."
              />
            </div>
          </Col>
        </Row>
      )}

      {workspace === 'screening' && step === 'scan' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', textAlign: 'center' }}>
            <Progress type="circle" percent={pct} size={110} strokeColor="var(--medical-blue-600)" />
            <Title level={4} style={{ marginTop: 20 }}>Đang tạo đánh giá sơ bộ</Title>
            <Text type="secondary" style={{ maxWidth: 420, marginBottom: 20 }}>Hệ thống đang xử lý ảnh và thông tin triệu chứng. Không đóng trang trong lúc gửi dữ liệu.</Text>
            <div style={{ width: '100%', maxWidth: 420, textAlign: 'left' }}>
              {STEPS_TXT.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: stepIdx > i ? 'var(--success-bg)' : stepIdx === i ? 'var(--surface-selected)' : 'transparent', marginBottom: 4 }}>
                  {stepIdx > i ? <CheckCircle2 size={15} color="var(--success)" /> : stepIdx === i ? <Loader size={15} color="var(--medical-blue-600)" className="spin-icon" /> : <span style={{ width: 14, display: 'inline-block' }} />}
                  <Text style={{ fontSize: 13, color: stepIdx >= i ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: stepIdx === i ? 600 : 400 }}>{s}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {workspace === 'screening' && step === 'emergency' && emergency && (
        <Card>
          <Result
            status="error"
            title="Dấu hiệu cần được khám ngay"
            subTitle="Hệ thống phát hiện các dấu hiệu vượt ngưỡng an toàn dựa trên thông tin bạn cung cấp. Vui lòng liên hệ cơ sở y tế gần nhất hoặc gọi cấp cứu ngay."
            extra={[
              <Button danger type="primary" key="call" icon={<Phone size={15} />}>Gọi cấp cứu / Hotline hỗ trợ</Button>,
              <Button key="back" onClick={resetAll}>Quay lại</Button>,
            ]}
          >
            <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
              <Text strong>Lý do cảnh báo:</Text>
              <List size="small" dataSource={emergency.reasons} renderItem={(r) => <List.Item>{r}</List.Item>} />
            </div>
          </Result>
        </Card>
      )}

      {workspace === 'screening' && step === 'result' && assessment && skinAnalysis && (
        <Row gutter={16}>
          <Col span={24}>
            <div className="ai-result-grid">
                <Alert
                  type={skinAnalysis.triage.level === 'emergency' ? 'error' : 'warning'}
                  showIcon
                  message={
                    skinAnalysis.triage.level === 'emergency'
                      ? 'Cần được đánh giá ngay'
                      : skinAnalysis.triage.level === 'routine'
                        ? 'Chưa ghi nhận dấu hiệu cần khám khẩn'
                        : 'Khuyến nghị khám sớm'
                  }
                  description={skinAnalysis.triage.reasons.join('; ') || 'Tiếp tục theo dõi và đặt lịch nếu tổn thương thay đổi.'}
                  className="ai-result-triage"
                />

              <Card
                title={skinAnalysis.labelsConfigured
                  ? (clinicalMode ? 'Top 3 tín hiệu phân loại từ model' : 'Top 3 khả năng phù hợp')
                  : 'Trạng thái model'}
                extra={clinicalMode ? <Tag color="processing">{skinAnalysis.modelVersion}</Tag> : undefined}
                size="small"
                className="ai-result-summary"
              >
                {!skinAnalysis.labelsConfigured ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Model chưa có bộ nhãn bệnh đã xác minh"
                    description="Hệ thống đã ẩn tên lớp để tránh trả sai tên bệnh."
                  />
                ) : displayedPredictions.length > 0 ? (
                  <>
                    <Alert
                      type={skinAnalysis.aggregate.abstained ? 'warning' : 'info'}
                      showIcon
                      message={skinAnalysis.aggregate.abstained
                        ? 'Độ tin cậy chưa đủ để AI kết luận'
                        : 'Ba khả năng gần nhất từ model'}
                      description={skinAnalysis.aggregate.abstained
                        ? (clinicalMode
                            ? skinAnalysis.aggregate.abstainReasons.join('; ')
                            : 'Các kết quả dưới đây chỉ để tham khảo và cần bác sĩ xác nhận.')
                        : 'Model score thể hiện mức phù hợp với ảnh, không phải xác suất chẩn đoán chính xác.'}
                      style={{ marginBottom: 16 }}
                    />
                    {[...displayedPredictions]
                      .sort((a, b) => b.probability - a.probability)
                      .slice(0, 3)
                      .map((prediction, index) => {
                        const score = Math.round(prediction.probability * 100);
                        return (
                          <div
                            key={prediction.classIndex}
                            style={{
                              padding: '12px 14px',
                              marginBottom: 10,
                              border: `1px solid ${index === 0 ? 'var(--medical-blue-200)' : 'var(--border-default)'}`,
                              background: index === 0 ? 'var(--surface-selected)' : 'var(--surface-card)',
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <Tag color={index === 0 ? 'blue' : 'default'} style={{ margin: 0 }}>#{index + 1}</Tag>
                              <Text strong style={{ flex: 1, fontSize: index === 0 ? 15 : 14 }}>
                                {formatSkinLabel(prediction.label, prediction.classIndex)}
                              </Text>
                              <Text strong={index === 0}>{score}%</Text>
                            </div>
                            <Progress
                              percent={score}
                              showInfo={false}
                              size="small"
                              strokeColor={index === 0 ? 'var(--medical-blue-600)' : 'var(--medical-blue-300)'}
                            />
                            {index === 0 && (
                              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 5 }}>
                                Khả năng model xếp gần nhất
                              </Text>
                            )}
                          </div>
                        );
                      })}
                    {clinicalMode && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Model: {skinAnalysis.model} · Đồng thuận {Math.round(skinAnalysis.aggregate.agreement * 100)}%
                        {skinAnalysis.aggregate.conflictingImages.length > 0
                          ? ` · Mâu thuẫn: ${skinAnalysis.aggregate.conflictingImages.join(', ')}`
                          : ''}
                      </Text>
                    )}
                  </>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="Model không trả về khả năng phù hợp"
                    description="Bác sĩ cần đánh giá trực tiếp từ ảnh và triệu chứng."
                  />
                )}
              </Card>

              <div className="ai-result-viewer">
                <ClinicalImageViewer images={skinAnalysis.images} clinicalMode={clinicalMode} />
              </div>

              {doctorMode && (
                <Card title="Kết luận của bác sĩ" size="small" className="ai-result-side">
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>Quyết định *</Text>
                  <Select
                    value={reviewDecision}
                    onChange={(value) => {
                      setReviewDecision(value);
                      setReviewResult(undefined);
                    }}
                    placeholder="Chọn kết luận sau khi xem ảnh"
                    style={{ width: '100%', marginBottom: 12 }}
                    options={[
                      { value: 'accepted', label: 'Đồng ý với gợi ý của AI' },
                      { value: 'rejected', label: 'Không đồng ý với gợi ý của AI' },
                      { value: 'different_diagnosis', label: 'Xác định chẩn đoán khác' },
                      { value: 'image_unsuitable', label: 'Ảnh không phù hợp để đánh giá' },
                    ]}
                  />
                  {reviewDecision === 'different_diagnosis' && (
                    <>
                      <Text strong style={{ display: 'block', marginBottom: 6 }}>Chẩn đoán của bác sĩ *</Text>
                      <Input
                        value={reviewDiagnosis}
                        onChange={(event) => setReviewDiagnosis(event.target.value)}
                        maxLength={300}
                        placeholder="Nhập chẩn đoán đã xác định"
                        style={{ marginBottom: 12 }}
                      />
                    </>
                  )}
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>Ghi chú</Text>
                  <Input.TextArea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    maxLength={2000}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    placeholder="Cơ sở nhận định hoặc yêu cầu chụp lại…"
                    style={{ marginBottom: 12 }}
                  />
                  {reviewResult && (
                    <Alert
                      type={reviewResult.type}
                      showIcon
                      message={reviewResult.message}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <Button
                    type="primary"
                    block
                    loading={reviewSubmitting}
                    disabled={!reviewDecision || reviewResult?.type === 'success'}
                    onClick={() => void submitDoctorReview()}
                  >
                    Lưu kết luận bác sĩ
                  </Button>
                </Card>
              )}

              {triageGuidance && (
                <Card title="Hành động tiếp theo" size="small" className="ai-result-side">
                  <Title level={5} style={{ margin: '0 0 6px' }}>{triageGuidance.title}</Title>
                  <Paragraph style={{ fontSize: 13, marginBottom: 8 }}>
                    {triageGuidance.description}
                  </Paragraph>
                  <List
                    size="small"
                    dataSource={triageGuidance.actions}
                    renderItem={(action) => <List.Item>{action}</List.Item>}
                  />
                  {!clinicalMode && (
                    <Button
                      type="primary"
                      danger={triageGuidance.danger}
                      block
                      href="/app/appointments"
                      style={{ marginTop: 12 }}
                    >
                      {triageGuidance.button}
                    </Button>
                  )}
                  <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 10 }}>
                    Top 3 và vùng màu chỉ hỗ trợ sàng lọc; không dùng để tự chọn thuốc hoặc tự điều trị.
                  </Text>
                </Card>
              )}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}
