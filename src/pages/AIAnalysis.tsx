import { useState } from 'react';
import {
  Row, Col, Card, Steps, Upload, Button, Segmented, InputNumber, Input, Checkbox, Progress, Result, Tag,
  Alert, Typography, List, Space,
} from 'antd';
import { Upload as UploadIcon, Camera, Loader, CheckCircle2, Phone, FlaskConical, ZoomIn } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { encounterService } from '../domain/services/encounterService';
import { aiAssessmentService, SYMPTOM_OPTIONS, type IntakeDraft, type SymptomKey } from '../domain/services/aiAssessmentService';
import type { AIPreliminaryAssessment, ClinicalRedFlag, ConfidenceBand } from '../domain/core/entities';
import type { EncounterId } from '../domain/core/ids';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';

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

export default function AIAnalysis() {
  const { currentPatient, currentUser } = useAppState();
  const [step, setStep] = useState<Step>('upload');
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [intake, setIntake] = useState<IntakeDraft>(EMPTY_INTAKE);
  const [errors, setErrors] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<ClinicalRedFlag | null>(null);
  const [assessment, setAssessment] = useState<AIPreliminaryAssessment | null>(null);
  const [encounterId, setEncounterId] = useState<EncounterId | null>(null);

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

  const startAnalysis = () => {
    const errs = aiAssessmentService.validateIntake(intake);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);

    const redFlag = aiAssessmentService.evaluateRedFlag(intake);
    if (redFlag.urgency === 'emergency') {
      setEmergency(redFlag);
      setStep('emergency');
      return;
    }

    const encounter = encounterService.createEncounter(
      { patientId: currentPatient.id, type: 'standard', origin: 'walk_in', department: 'Khoa Da liễu' },
      currentUser.id,
    );
    encounterService.transitionStatus(encounter.id, 'intake_in_progress', currentUser.id);
    setEncounterId(encounter.id);

    runScanAnimation(() => {
      const { assessment: result } = aiAssessmentService.requestAssessment(encounter.id, intake, currentUser.id);
      setAssessment(result);
      setStep('result');
    });
  };

  const resetAll = () => {
    setIntake(EMPTY_INTAKE); setErrors([]); setEmergency(null); setAssessment(null); setEncounterId(null); setStep('upload');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>AI Preliminary Assessment</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>Phân Tích Da Bằng AI</Title>
          <Text type="secondary">Tải lên hình ảnh và mô tả triệu chứng để nhận đánh giá sơ bộ từ hệ thống AI của DermaHealth.</Text>
        </div>
        <Tag color="blue" style={{ padding: '4px 10px' }}>AI Diagnosis v2.4</Tag>
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
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Upload.Dragger multiple={false} showUploadList={false} beforeUpload={() => false} style={{ background: 'var(--surface-card)' }}>
              <p className="ant-upload-drag-icon"><Camera size={32} color="var(--medical-blue-600)" /></p>
              <p style={{ fontWeight: 600, fontSize: 16 }}>Kéo thả hoặc nhấp để tải lên</p>
              <p style={{ color: 'var(--text-secondary)' }}>Hỗ trợ JPG, PNG, HEIC · Tối đa 5MB (mô phỏng — không lưu file thật)</p>
              <Space style={{ marginTop: 16 }}>
                <Button icon={<UploadIcon size={15} />}>Chọn tệp</Button>
                <Button icon={<Camera size={15} />}>Dùng camera</Button>
              </Space>
            </Upload.Dragger>
          </Col>

          <Col xs={24} md={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card size="small" title="Để có kết quả tốt nhất">
                <List
                  size="small"
                  dataSource={[
                    { title: 'Đủ ánh sáng', desc: 'Chụp dưới ánh sáng trắng tự nhiên' },
                    { title: 'Khoảng cách 10–15cm', desc: 'Để thiết bị gần vùng da cần chụp' },
                    { title: 'Lấy nét rõ', desc: 'Giữ tay ổn định, tránh ảnh mờ' },
                  ]}
                  renderItem={(t) => <List.Item><List.Item.Meta title={t.title} description={t.desc} /></List.Item>}
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

                <Button type="primary" block icon={<FlaskConical size={15} />} onClick={startAnalysis}>Bắt đầu phân tích AI</Button>
              </Card>

              <Alert type="warning" showIcon message="Kết quả AI chỉ là hỗ trợ ra quyết định (AI Preliminary Assessment), không phải chẩn đoán. Chẩn đoán chính thức luôn do bác sĩ xác nhận." />
            </div>
          </Col>
        </Row>
      )}

      {step === 'scan' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', textAlign: 'center' }}>
            <Progress type="circle" percent={pct} size={110} strokeColor="var(--medical-blue-600)" />
            <Title level={4} style={{ marginTop: 20 }}>Đang phân tích hình ảnh</Title>
            <Text type="secondary" style={{ maxWidth: 420, marginBottom: 20 }}>AI đang đối chiếu với hơn 1.5 triệu ca lâm sàng trong cơ sở dữ liệu...</Text>
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
              <div style={{ width: '100%', aspectRatio: '1', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: '22%', left: '28%', width: '40%', height: '38%', border: '2px solid var(--medical-blue-700)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', padding: 4 }}>
                  <Tag color="blue" icon={<ZoomIn size={11} style={{ verticalAlign: -1 }} />} style={{ fontSize: 11 }}>Vùng tổn thương</Tag>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <Text strong style={{ display: 'block' }}>Hình ảnh đã được chú thích</Text>
                <Text type="secondary" style={{ fontSize: 12.5 }}>AI đánh dấu vùng có nghi ngờ tổn thương</Text>
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
                  {assessment.redFlag.urgency === 'urgent'
                    ? ' Do có dấu hiệu cần lưu ý, khuyến nghị đặt lịch khám trong 24–48 giờ tới.'
                    : ' Khuyến nghị đặt lịch với bác sĩ chuyên khoa da liễu trong vòng 7 ngày để được tư vấn phù hợp.'}
                </Paragraph>
                <Button type="primary" block href="/app/appointments">Đặt lịch khám ngay</Button>
              </Card>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}
