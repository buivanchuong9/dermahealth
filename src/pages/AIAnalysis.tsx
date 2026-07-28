import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Steps, Upload, Button, Segmented, InputNumber, Input, Checkbox, Progress, Result, Tag,
  Alert, Typography, List, Space, Select, Skeleton,
} from 'antd';
import {
  Upload as UploadIcon,
  Camera,
  Loader,
  CheckCircle2,
  Phone,
  FlaskConical,
  Focus,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  SunMedium,
  TriangleAlert,
} from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { aiAssessmentService, SYMPTOM_OPTIONS, type IntakeDraft, type SymptomKey } from '../domain/services/aiAssessmentService';
import type { AIPreliminaryAssessment, ClinicalRedFlag, ConfidenceBand } from '../domain/core/entities';
import type { EncounterId } from '../domain/core/ids';
import { analyzeDermatologyImage, type ImageQualityReport } from '../domain/imageQuality';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { createEncounter, getActiveEncounter } from '../api/encounters';
import { submitEncounterIntake } from '../api/aiAssessment';
import { uploadFile } from '../api/uploads';
import { getPatientConsents } from '../api/clinical';
import { aiAssessmentRepository, encounterRepository } from '../domain/repositories';

const { Title, Text, Paragraph } = Typography;

type Step = 'upload' | 'scan' | 'result' | 'emergency';

const EMPTY_INTAKE: IntakeDraft = { chiefComplaint: '', severity: null, durationDays: null, symptoms: [], history: [], currentMedication: [] };

const STEPS_TXT = [
  'Tiền xử lý và tăng cường hình ảnh',
  'Trích xuất đặc trưng vùng da tổn thương',
  'Đối chiếu với mô hình AI lâm sàng (1.5M ca)',
  'Tổng hợp kết quả và tạo báo cáo',
];

const BAND_META: Record<ConfidenceBand, { label: string; color: string }> = {
  high: { label: 'Khả năng cao', color: 'red' },
  moderate: { label: 'Khả năng trung bình', color: 'gold' },
  low: { label: 'Khả năng thấp', color: 'default' },
};

const STEP_INDEX: Record<Step, number> = { upload: 0, scan: 1, result: 2, emergency: 2 };

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

export default function AIAnalysis() {
  const { currentPatient } = useAppState();
  const [step, setStep] = useState<Step>('upload');
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [intake, setIntake] = useState<IntakeDraft>(EMPTY_INTAKE);
  const [errors, setErrors] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<ClinicalRedFlag | null>(null);
  const [assessment, setAssessment] = useState<AIPreliminaryAssessment | null>(null);
  const [encounterId, setEncounterId] = useState<EncounterId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageReport, setImageReport] = useState<ImageQualityReport | null>(null);
  const [imageChecking, setImageChecking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [bodyRegion, setBodyRegion] = useState<string>();
  const [viewType, setViewType] = useState<'overview' | 'closeup'>('closeup');
  const [qualityWarningAccepted, setQualityWarningAccepted] = useState(false);
  const [aiAcknowledged, setAiAcknowledged] = useState(false);
  const [consentState, setConsentState] = useState<'loading' | 'granted' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    getPatientConsents(currentPatient.id)
      .then((consents) => {
        if (!active) return;
        const consent = consents.find((item) => item.type === 'data_processing');
        setConsentState(consent?.granted ? 'granted' : 'missing');
      })
      .catch(() => {
        if (active) setConsentState('error');
      });
    return () => {
      active = false;
    };
  }, [currentPatient.id]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const toggleSymptoms = (values: SymptomKey[]) => setIntake((p) => ({ ...p, symptoms: values }));

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
    const errs = [
      ...aiAssessmentService.validateIntake(intake),
      ...(!bodyRegion ? ['Vui lòng chọn vùng cơ thể được chụp.'] : []),
      ...(!imageReport?.uploadFile ? ['Vui lòng chọn ảnh đạt kiểm tra chất lượng.'] : []),
      ...(imageReport?.status === 'review' && !qualityWarningAccepted
        ? ['Vui lòng xác nhận đã xem cảnh báo chất lượng ảnh.']
        : []),
      ...(consentState !== 'granted'
        ? ['Cần đồng ý xử lý dữ liệu y tế cá nhân trước khi gửi ảnh.']
        : []),
      ...(!aiAcknowledged
        ? ['Vui lòng xác nhận đã hiểu AI chỉ đưa ra đánh giá sơ bộ.']
        : []),
    ];
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);

    const redFlag = aiAssessmentService.evaluateRedFlag(intake);
    if (redFlag.urgency === 'emergency') {
      setEmergency(redFlag);
      setStep('emergency');
      return;
    }

    setSubmitting(true);
    let uploadedFileId: string | undefined;
    if (imageReport?.uploadFile) {
      try {
        uploadedFileId = (await uploadFile(imageReport.uploadFile)).fileId;
      } catch (error) {
        setSubmitting(false);
        setErrors([
          error instanceof Error ? error.message : 'Không tải được ảnh lên hệ thống.',
        ]);
        return;
      }
    }
    let encounter;
    try {
      encounter = await getActiveEncounter();
    } catch {
      try {
        encounter = await createEncounter({
          patientId: currentPatient.id,
          type: 'standard',
          origin: 'walk_in',
          department: 'Khoa Da liễu',
        });
      } catch (error) {
        setSubmitting(false);
        setErrors([
          error instanceof Error
            ? error.message
            : 'Không thể tạo lượt khám để gửi đánh giá AI.',
        ]);
        return;
      }
    }
    setEncounterId(encounter.id as EncounterId);

    runScanAnimation(() => {
      void submitEncounterIntake(encounter.id, {
        chiefComplaint: intake.chiefComplaint.trim(),
        severity: intake.severity ?? 0,
        durationDays: intake.durationDays ?? 0,
        symptoms: intake.symptoms,
        history: intake.history,
        currentMedication: intake.currentMedication,
        images: uploadedFileId ? [uploadedFileId] : [],
      })
        .then(({ intake: savedIntake, assessment: result }) => {
          encounterRepository.intakes().upsert(savedIntake);
          aiAssessmentRepository.upsert(result);
          setAssessment(result);
          setSubmitting(false);
          setStep('result');
        })
        .catch((error: unknown) => {
          setErrors([
            error instanceof Error
              ? error.message
              : 'Không thể gửi dữ liệu đánh giá AI.',
          ]);
          setSubmitting(false);
          setStep('upload');
        });
    });
  };

  const resetAll = () => {
    setIntake(EMPTY_INTAKE);
    setErrors([]);
    setEmergency(null);
    setAssessment(null);
    setEncounterId(null);
    setSubmitting(false);
    setImageFile(null);
    setImageReport(null);
    setPreviewUrl(undefined);
    setBodyRegion(undefined);
    setViewType('closeup');
    setQualityWarningAccepted(false);
    setAiAcknowledged(false);
    setStep('upload');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Sàng Lọc Da Liễu Có Hỗ Trợ AI</Title>
          <Text type="secondary">Kiểm tra chất lượng ảnh trước khi gửi để bác sĩ có dữ liệu đáng tin cậy hơn.</Text>
        </div>
        <Tag color="blue" style={{ padding: '4px 10px' }}>AI hỗ trợ lâm sàng · Không thay thế bác sĩ</Tag>
      </div>

      <Card size="small">
        <Steps
          size="small"
          current={STEP_INDEX[step]}
          status={step === 'emergency' ? 'error' : undefined}
          items={[{ title: 'Tải lên & khai báo' }, { title: 'Đang phân tích' }, { title: step === 'emergency' ? 'Cảnh báo khẩn cấp' : 'Kết quả' }]}
        />
      </Card>

      {step === 'upload' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card size="small" title="1. Xác định ảnh đang chụp">
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                      Vùng cơ thể *
                    </Text>
                    <Select
                      value={bodyRegion}
                      onChange={(value) => {
                        setBodyRegion(value);
                        setImageFile(null);
                        setImageReport(null);
                        setQualityWarningAccepted(false);
                      }}
                      options={BODY_REGIONS}
                      placeholder="Chọn vùng da"
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                      Loại ảnh *
                    </Text>
                    <Segmented
                      block
                      value={viewType}
                      onChange={(value) => {
                        setViewType(value as 'overview' | 'closeup');
                        setImageFile(null);
                        setImageReport(null);
                        setQualityWarningAccepted(false);
                      }}
                      options={[
                        { label: 'Toàn vùng', value: 'overview' },
                        { label: 'Cận tổn thương', value: 'closeup' },
                      ]}
                    />
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="2. Chọn ảnh và kiểm tra chất lượng">
                <Upload.Dragger
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  disabled={!bodyRegion || imageChecking}
                  multiple={false}
                  maxCount={1}
                  fileList={imageFile ? [{ uid: imageFile.name, name: imageFile.name, status: 'done', size: imageFile.size, type: imageFile.type }] : []}
                  beforeUpload={async (file) => {
                    if (!bodyRegion) {
                      setErrors(['Vui lòng chọn vùng cơ thể trước khi tải ảnh.']);
                      return Upload.LIST_IGNORE;
                    }
                    setImageChecking(true);
                    setErrors([]);
                    setQualityWarningAccepted(false);
                    const report = await analyzeDermatologyImage(file, { bodyRegion, viewType });
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
                    setQualityWarningAccepted(false);
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
                    {imageChecking ? 'Đang kiểm tra ảnh…' : 'Kéo thả hoặc nhấp để chọn ảnh'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {bodyRegion ? 'JPG, PNG · Tối đa 5MB' : 'Chọn vùng cơ thể ở bước 1 để tiếp tục'}
                  </p>
                  <Button icon={<UploadIcon size={15} />} disabled={!bodyRegion || imageChecking}>
                    Chọn ảnh
                  </Button>
                </Upload.Dragger>

                {imageReport && (
                  <div style={{ marginTop: 14 }}>
                    <Alert
                      type={imageReport.status === 'pass' ? 'success' : imageReport.status === 'review' ? 'warning' : 'error'}
                      showIcon
                      message={
                        imageReport.status === 'pass'
                          ? `Ảnh đạt kiểm tra chất lượng · ${imageReport.score}/100`
                          : imageReport.status === 'review'
                            ? `Ảnh có thể sử dụng nhưng cần kiểm tra · ${imageReport.score}/100`
                            : 'Ảnh chưa đạt, vui lòng chụp lại'
                      }
                      description={
                        <div>
                          {imageReport.metrics && (
                            <Space size={[6, 6]} wrap style={{ margin: '8px 0' }}>
                              <Tag>{imageReport.metrics.width}×{imageReport.metrics.height}px</Tag>
                              <Tag>Độ sáng {imageReport.metrics.brightness}/255</Tag>
                              <Tag>Độ nét {imageReport.metrics.sharpness}</Tag>
                            </Space>
                          )}
                          {imageReport.issues.map((item) => (
                            <div key={`${item.code}-${item.severity}`} style={{ marginTop: 6 }}>
                              <Text strong>{item.message}</Text>
                              <Text type="secondary" style={{ display: 'block' }}>{item.guidance}</Text>
                            </div>
                          ))}
                          {imageReport.privacy.metadataRemoved && (
                            <Text type="success" style={{ display: 'block', marginTop: 8 }}>
                              <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Đã tạo bản tải lên không chứa metadata vị trí/thiết bị.
                            </Text>
                          )}
                        </div>
                      }
                    />
                    {imageReport.status === 'review' && (
                      <Checkbox
                        checked={qualityWarningAccepted}
                        onChange={(event) => setQualityWarningAccepted(event.target.checked)}
                        style={{ marginTop: 10 }}
                      >
                        Tôi đã phóng to kiểm tra và vẫn muốn dùng ảnh này
                      </Checkbox>
                    )}
                  </div>
                )}
              </Card>

              {previewUrl && (
                <Card size="small" title="Ảnh sẽ gửi cho hệ thống" styles={{ body: { padding: 10 } }}>
                  <img
                    src={previewUrl}
                    alt="Ảnh da liễu đang chờ gửi"
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 8, background: 'var(--surface-subtle)' }}
                  />
                </Card>
              )}
            </div>
          </Col>

          <Col xs={24} md={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card size="small" title="Để có kết quả tốt nhất">
                <List
                  size="small"
                  dataSource={[
                    { icon: <SunMedium size={16} />, title: 'Ánh sáng trắng, tản đều', desc: 'Không dùng flash sát da hoặc bộ lọc làm đẹp' },
                    { icon: <MapPin size={16} />, title: viewType === 'closeup' ? 'Cách vùng da khoảng 10–15cm' : 'Bao trọn vùng cơ thể liên quan', desc: 'Không crop mất ranh giới tổn thương' },
                    { icon: <Focus size={16} />, title: 'Chạm lấy nét vào vùng da', desc: 'Giữ điện thoại ổn định và lau sạch ống kính' },
                    { icon: <ImageIcon size={16} />, title: 'Không sửa màu ảnh', desc: 'Không dùng filter, tăng trắng hoặc ảnh chụp lại từ màn hình' },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta avatar={item.icon} title={item.title} description={item.desc} />
                    </List.Item>
                  )}
                />
              </Card>

              <Card size="small" title={<span><FlaskConical size={15} /> Thông tin triệu chứng</span>}>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>Bắt buộc — giúp AI đưa ra đánh giá chính xác hơn và phát hiện dấu hiệu cần khám gấp.</Paragraph>

                <div style={{ marginBottom: 14 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Lý do khám / mô tả chính *</Text>
                  <Input value={intake.chiefComplaint} onChange={(e) => setIntake((p) => ({ ...p, chiefComplaint: e.target.value }))} placeholder="VD: Mụn viêm lan rộng vùng má và trán" />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Mức độ nghiêm trọng *</Text>
                  <Segmented block value={intake.severity ?? undefined} onChange={(v) => setIntake((p) => ({ ...p, severity: v as number }))} options={[1, 2, 3, 4, 5]} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Số ngày xuất hiện *</Text>
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="VD: 3" value={intake.durationDays} onChange={(v) => setIntake((p) => ({ ...p, durationDays: v }))} />
                </div>

                <div style={{ marginBottom: errors.length ? 14 : 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Triệu chứng đi kèm (nếu có)</Text>
                  <Checkbox.Group value={intake.symptoms} onChange={(v) => toggleSymptoms(v as SymptomKey[])} options={SYMPTOM_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} />
                </div>

                {errors.length > 0 && (
                  <div style={{ marginBottom: 14 }}><FriendlyErrorInline title="Thông tin chưa đầy đủ" error={errors.join(' · ')} onClose={() => setErrors([])} /></div>
                )}

                <Skeleton active loading={consentState === 'loading'} paragraph={{ rows: 1 }}>
                  {consentState === 'granted' ? (
                    <Alert
                      type="success"
                      showIcon
                      icon={<ShieldCheck size={16} />}
                      message="Đã có đồng ý xử lý dữ liệu y tế"
                      style={{ marginBottom: 12 }}
                    />
                  ) : (
                    <Alert
                      type="error"
                      showIcon
                      message={consentState === 'error' ? 'Không kiểm tra được trạng thái đồng ý' : 'Chưa có đồng ý xử lý dữ liệu y tế'}
                      description="Ảnh da là dữ liệu y tế nhạy cảm. Hệ thống sẽ không gửi ảnh khi chưa có đồng ý hợp lệ."
                      action={<Button size="small" href="/app/settings">Mở quyền riêng tư</Button>}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                </Skeleton>

                <Checkbox
                  checked={aiAcknowledged}
                  onChange={(event) => setAiAcknowledged(event.target.checked)}
                  style={{ marginBottom: 12 }}
                >
                  Tôi hiểu AI chỉ sàng lọc sơ bộ; bác sĩ mới là người chẩn đoán cuối cùng
                </Checkbox>

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

      {step === 'scan' && (
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

      {step === 'emergency' && emergency && (
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

      {step === 'result' && assessment && assessment.status === 'insufficient_data' && (
        <Card>
          <Result
            status="warning"
            title="Chưa đủ dữ liệu để đánh giá"
            subTitle="AI không thể đưa ra đánh giá đáng tin cậy với thông tin hiện tại thay vì đoán mò. Vui lòng bổ sung thêm:"
            extra={<Button type="primary" icon={<FlaskConical size={15} />} onClick={() => setStep('upload')}>Bổ sung thông tin</Button>}
          >
            <List size="small" style={{ maxWidth: 420, margin: '0 auto' }} dataSource={assessment.missingDataHints} renderItem={(h) => <List.Item>{h}</List.Item>} />
          </Result>
        </Card>
      )}

      {step === 'result' && assessment && assessment.status === 'completed' && (
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" styles={{ body: { padding: 0 } }}>
              <div style={{ width: '100%', aspectRatio: '1', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {previewUrl
                  ? <img src={previewUrl} alt="Ảnh đầu vào đã kiểm tra" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <ImageIcon size={48} color="var(--text-muted)" />}
              </div>
              <div style={{ padding: 16 }}>
                <Text strong style={{ display: 'block' }}>Ảnh đầu vào đã kiểm tra</Text>
                <Text type="secondary" style={{ fontSize: 12.5 }}>
                  {imageReport ? `Chất lượng ${imageReport.score}/100 · ${BODY_REGIONS.find((item) => item.value === bodyRegion)?.label}` : 'Ảnh đã gửi cùng khai báo triệu chứng'}
                </Text>
                {encounterId && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>Lượt khám: {encounterId}</Text>}
                <Space style={{ marginTop: 12 }}>
                  <Button size="small" onClick={resetAll}>Phân tích lại</Button>
                  <Button size="small" icon={<UploadIcon size={15} />}>Tải xuống</Button>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {assessment.redFlag.urgency === 'urgent' && (
                <Alert type="warning" showIcon message="Khuyến nghị khám sớm" description={`${assessment.redFlag.reasons.join('; ')} — nên đặt lịch trong 24–48 giờ.`} />
              )}

              <Card title="Top 3 Ứng Viên Chẩn Đoán (AI Preliminary Assessment)" extra={<Tag color="warning">Đang chờ bác sĩ xác nhận</Tag>} size="small">
                {assessment.candidateConditions.map((c) => {
                  const band = BAND_META[c.confidenceBand];
                  return (
                    <div key={c.code} style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text strong>{c.name}</Text>
                        <Tag color={band.color}>{band.label}</Tag>
                      </div>
                      <Progress percent={c.confidenceScore} showInfo={false} strokeColor={band.color === 'red' ? 'var(--danger)' : band.color === 'gold' ? 'var(--warning)' : 'var(--text-muted)'} size="small" />
                      <Paragraph type="secondary" style={{ fontSize: 12.5, margin: '6px 0' }}>{c.rationale}</Paragraph>
                      <Space size={[4, 4]} wrap>
                        {c.supportingEvidence.map((e) => <Tag key={e} color="blue">{e}</Tag>)}
                        {c.conflictingEvidence.map((e) => <Tag key={e} color="red">{e}</Tag>)}
                      </Space>
                    </div>
                  );
                })}
                <Text type="secondary" style={{ fontSize: 11, display: 'block', borderTop: '1px solid var(--border-default)', paddingTop: 10 }}>
                  Mô hình: {assessment.modelVersion} · {new Date(assessment.generatedAt).toLocaleString('vi-VN')} · Mã dữ liệu: {assessment.inputSnapshotId}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', display: 'block', marginTop: 6 }}>
                  Đây là hỗ trợ ra quyết định của AI, không phải chẩn đoán xác định. Bác sĩ là người đưa ra quyết định lâm sàng cuối cùng.
                </Text>
              </Card>

              <Card title="Đề Xuất Tiếp Theo" size="small">
                <Paragraph style={{ fontSize: 13 }}>
                  Đây là kết quả hỗ trợ từ AI, chưa phải chẩn đoán chính thức. Bác sĩ sẽ xem xét thông tin này cùng với hồ sơ của bạn trong lần khám tới.
                </Paragraph>
                {assessment.suggestedSpecialty && <Tag color="blue" style={{ marginBottom: 8 }}>Chuyên khoa: {assessment.suggestedSpecialty}</Tag>}
                <List
                  size="small"
                  dataSource={assessment.suggestedNextActions}
                  locale={{ emptyText: assessment.redFlag.urgency === 'urgent' ? 'Khuyến nghị đặt lịch khám trong 24–48 giờ.' : 'Khuyến nghị đặt lịch khám để được bác sĩ tư vấn.' }}
                  renderItem={(action) => <List.Item>{action}</List.Item>}
                />
                <Button type="primary" block href="/app/appointments">Đặt lịch khám ngay</Button>
              </Card>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}
