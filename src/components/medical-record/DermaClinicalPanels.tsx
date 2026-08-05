import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Select, Space, Table, Tag, Typography, App as AntApp } from 'antd';
import { Eye, FileCheck2, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { createAdverseEvent } from '../../api/lifetimeMedicalRecord';
import {
  effectiveMetrics,
  isLegacyClassification,
  isRegisteredProgressAnalysis,
  type AdverseEventCausality,
  type ComparisonAnalysis,
  type ComparisonSession,
  type EvidenceLink,
  type Lesion,
  type LesionDetailBundle,
} from '../../domain/skinProgress';
import styles from './DermaTimeline.module.scss';
import { QualityDimensionsChart, QualityGaugeChart } from './DermaCharts';

const { Paragraph, Text, Title } = Typography;

const sourceLabel = {
  IMAGE_ANALYSIS: 'Phân tích hình ảnh',
  PATIENT_REPORTED: 'Bệnh nhân tự báo cáo',
  CLINICIAN_REPORTED: 'Nhân viên y tế ghi nhận',
  DEVICE: 'Thiết bị',
  IMPORTED: 'Dữ liệu nhập',
};

const categoryLabel = {
  MORPHOLOGY: 'Hình thái',
  INFLAMMATION: 'Viêm',
  SYMPTOM: 'Triệu chứng',
  FUNCTION: 'Chức năng / chất lượng sống',
  TREATMENT: 'Điều trị',
  IMAGE_QUALITY: 'Chất lượng ảnh',
  OTHER: 'Khác',
};

const interpretation = {
  IMPROVED: { label: 'Cải thiện', color: 'green' },
  STABLE: { label: 'Ổn định', color: 'blue' },
  WORSENED: { label: 'Xấu đi', color: 'red' },
  INDETERMINATE: { label: 'Chưa xác định', color: 'default' },
  NOT_APPLICABLE: { label: 'Không áp dụng', color: 'default' },
} as const;

const number = (value: number | null, unit = '') =>
  value === null ? 'Không khả dụng' : `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;

export function ImageQualityPanel({ session }: { session: ComparisonSession }) {
  const analysis = session.analysis;
  const quality = analysis?.quality;
  if (!quality) {
    return <Alert type="warning" showIcon message="Phân tích chất lượng ảnh không khả dụng" description="Hình ảnh gốc vẫn có thể được bác sĩ review thủ công." />;
  }
  if (!isRegisteredProgressAnalysis(analysis)) {
    return (
      <Card size="small" title="Chất lượng & khả năng so sánh" className={styles.panelCard}>
        <Alert
          type="warning"
          showIcon
          message="Đã ẩn điểm chất lượng legacy"
          description="Bản ghi này không có provenance căn chỉnh và hai mask hợp lệ. Điểm chất lượng của từng ảnh không được dùng làm điểm khả năng so sánh."
        />
      </Card>
    );
  }
  const comparable = quality.comparisonDisposition === 'COMPARABLE';
  return (
    <Card size="small" title="Chất lượng & khả năng so sánh" className={styles.panelCard}>
      <div className={styles.qualityHero}>
        <div className={styles.qualityGauge}>
          {quality.comparabilityScore === null ? (
            <div className={styles.qualityUnavailable}>N/A</div>
          ) : (
            <QualityGaugeChart score={quality.comparabilityScore} compact />
          )}
        </div>
        <div>
          <Title level={5}>{comparable ? 'Có thể so sánh' : quality.comparisonDisposition === 'CAUTION' ? 'Có thể xem với cảnh báo' : quality.comparisonDisposition === 'UNAVAILABLE' ? 'Chưa có đánh giá kỹ thuật' : 'Không đủ tin cậy để kết luận'}</Title>
          <Text type="secondary">Điểm so sánh phản ánh chất lượng kỹ thuật, không phải độ chắc chắn chẩn đoán.</Text>
        </div>
      </div>
      <div className={styles.qualityChart}>
        <QualityDimensionsChart quality={quality} />
      </div>
      <Tag color={quality.registrationQuality === 'GOOD' ? 'green' : quality.registrationQuality === 'FAIR' ? 'gold' : 'red'}>
        Đăng ký ảnh: {quality.registrationQuality}
      </Tag>
      {quality.policyVersion && <Tag>Chính sách chất lượng: {quality.policyVersion}</Tag>}
      {quality.reasons.map((reason) => <Alert key={reason} type="warning" showIcon message={reason} className={styles.inlineAlert} />)}
    </Card>
  );
}

export function MetricsPanel({ session, focusedMetric }: { session: ComparisonSession; focusedMetric?: string }) {
  const registeredProgress = isRegisteredProgressAnalysis(session.analysis);
  const metrics = effectiveMetrics(session).filter(
    (metric) => metric.source !== 'IMAGE_ANALYSIS' ||
      (registeredProgress && metric.key === 'lesion-area-index'),
  );
  if (!metrics.length) {
    return (
      <Card size="small" title="Chỉ số lâm sàng" className={styles.panelCard}>
        <Empty description="Backend chưa ghi nhận chỉ số có thể so sánh cho hai mốc này" />
      </Card>
    );
  }
  return (
    <Card size="small" title="Chỉ số lâm sàng theo nguồn" className={styles.panelCard}>
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        scroll={{ x: 720 }}
        rowClassName={(record) => record.key === focusedMetric ? styles.focusedRow : ''}
        dataSource={metrics}
        columns={[
          { title: 'Nhóm', render: (_, row) => categoryLabel[row.category], width: 150 },
          { title: 'Chỉ số', dataIndex: 'label', fixed: 'left', width: 190 },
          { title: 'Mốc', render: (_, row) => row.baseline === null ? row.missingReason ?? 'Chưa ghi nhận' : number(row.baseline, ` ${row.unit}`) },
          { title: 'Hiện tại', render: (_, row) => row.current === null ? row.missingReason ?? 'Chưa ghi nhận' : number(row.current, ` ${row.unit}`) },
          { title: 'Thay đổi', render: (_, row) => row.delta === null ? 'Không tính được' : `${row.delta > 0 ? '+' : ''}${number(row.delta, ` ${row.unit}`)}` },
          { title: 'Diễn giải', render: (_, row) => <Tag color={interpretation[row.interpretation].color}>{interpretation[row.interpretation].label}</Tag> },
          { title: 'Nguồn', render: (_, row) => <Space direction="vertical" size={0}><Tag>{sourceLabel[row.source]}</Tag>{row.measurementMethod && <Text type="secondary">{row.measurementMethod}</Text>}</Space> },
          { title: 'Tin cậy', render: (_, row) => row.confidence == null ? '—' : `${Math.round(row.confidence * 100)}%` },
          { title: 'Xác nhận', render: (_, row) => row.clinicianVerified ? <Tag color="green">Bác sĩ xác nhận</Tag> : <Tag color="gold">Chờ review</Tag> },
        ]}
      />
      <Text type="secondary" className={styles.panelFootnote}>Diễn giải do backend cung cấp theo chính sách có phiên bản; không suy ra từ dấu của delta. Không sử dụng “tỷ lệ hồi phục” tổng hợp.</Text>
    </Card>
  );
}

export function ExplainabilityPanel({
  session,
  onEvidence,
}: {
  session: ComparisonSession;
  onEvidence: (evidence: EvidenceLink) => void;
}) {
  const analysis = session.analysis;
  if (!analysis) return null;
  if (!isRegisteredProgressAnalysis(analysis)) {
    return (
      <Card size="small" title="Giải thích có dẫn chứng" className={styles.panelCard}>
        <Alert
          type="warning"
          showIcon
          message="Kết luận ảnh legacy đã bị ẩn"
          description="Classifier từng ảnh không đo thay đổi tổn thương. Cần chạy lại cặp ảnh bằng pipeline căn chỉnh → mask → difference map."
        />
      </Card>
    );
  }
  return (
    <Card size="small" title="Giải thích có dẫn chứng" className={styles.panelCard}>
      <Alert
        type={analysis.assessment === 'WORSENING' ? 'warning' : 'info'}
        showIcon
        message={analysis.visualChangeSummary}
        description="Đây là gợi ý hỗ trợ đánh giá và chưa phải kết luận của bác sĩ."
      />
      <ul className={styles.evidenceList}>
        {analysis.evidence.map((evidence) => (
          <li key={evidence.id}>
            <span><Info size={15} /> {evidence.text}</span>
            <Button size="small" icon={<Eye size={14} />} onClick={() => onEvidence(evidence)}>Xem bằng chứng</Button>
          </li>
        ))}
      </ul>
      {analysis.limitations.length > 0 && (
        <Paragraph type="secondary"><strong>Giới hạn:</strong> {analysis.limitations.join(' ')}</Paragraph>
      )}
    </Card>
  );
}

export function ProvenancePanel({ bundle }: { bundle: LesionDetailBundle }) {
  const session = bundle.comparison;
  const analysis = session?.analysis;
  const review = session?.reviews.at(-1);
  const originals = bundle.observations.flatMap((observation) =>
    observation.imageAssets.filter((asset) => asset.type === 'ORIGINAL'),
  );
  return (
    <Card size="small" title={<Space><ShieldCheck size={16} />Nguồn gốc & audit</Space>} className={styles.panelCard}>
      <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
        <Descriptions.Item label="Ảnh gốc">{originals.length ? `${originals.length} asset` : 'Chưa ghi nhận'}</Descriptions.Item>
        <Descriptions.Item label="Toàn vẹn dữ liệu">{originals.length > 0 && originals.every((asset) => asset.checksum) ? 'Có checksum từ backend' : 'Chưa đủ bằng chứng xác minh'}</Descriptions.Item>
        <Descriptions.Item label="Bộ phân tích">{analysis ? `${analysis.modelName} ${analysis.modelVersion}` : 'Không khả dụng'}</Descriptions.Item>
        <Descriptions.Item label="Phiên bản thuật toán">{analysis?.algorithmVersion ?? 'Không khả dụng'}</Descriptions.Item>
        <Descriptions.Item label="Thời điểm phân tích">{analysis ? new Date(analysis.generatedAt).toLocaleString('vi-VN') : '—'}</Descriptions.Item>
        <Descriptions.Item label="Độ tin cậy">{analysis?.confidence == null ? 'Không khả dụng' : `${Math.round(analysis.confidence * 100)}% (không phải độ chắc chắn chẩn đoán)`}</Descriptions.Item>
        <Descriptions.Item label="Review cuối">{review ? `${review.reviewerName} · ${review.decision}` : 'Đang chờ bác sĩ'}</Descriptions.Item>
        <Descriptions.Item label="Loại phân tích">
          {analysis?.analysisType ?? 'Không khả dụng'}
          {analysis && isLegacyClassification(analysis) && (
            <Tag color="default" style={{ marginLeft: 8 }}>Legacy · chưa qua pipeline hiện tại</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Kết quả phân tích gốc">{analysis?.assessment ?? 'Không khả dụng'}</Descriptions.Item>
        {analysis?.quality.registrationProvenance && (
          <Descriptions.Item label="Đăng ký ảnh (chi tiết)" span={2}>
            {analysis.quality.registrationProvenance.kind === 'translation' ? 'Tịnh tiến' : analysis.quality.registrationProvenance.kind}
            {` · dx=${analysis.quality.registrationProvenance.dx}px, dy=${analysis.quality.registrationProvenance.dy}px`}
            {` · điểm căn chỉnh ${Math.round(analysis.quality.registrationProvenance.score * 100)}%`}
            {analysis.quality.registrationProvenance.requiresClinicianMaskReview && (
              <Tag color="gold" style={{ marginLeft: 8 }}>Cần bác sĩ xác nhận mask</Tag>
            )}
          </Descriptions.Item>
        )}
      </Descriptions>
      <div className={styles.auditList}>
        {bundle.audit.map((entry) => (
          <div key={entry.id}>
            <FileCheck2 size={15} />
            <div><Text strong>{entry.action}</Text><Text type="secondary">{entry.actorName} · {new Date(entry.occurredAt).toLocaleString('vi-VN')} · {entry.reason}</Text></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const localDateTimeValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

interface AdverseEventFormValues {
  onsetAt: string;
  symptoms: string[];
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'UNKNOWN';
  urgencyLevel: 'ROUTINE' | 'SOON' | 'URGENT' | 'EMERGENCY';
}

export function SafetyPanel({
  lesion,
  analysis,
  patientId,
  canReport,
  onReported,
}: {
  lesion: Lesion;
  analysis?: ComparisonAnalysis | null;
  patientId: string;
  canReport: boolean;
  onReported: () => void;
}) {
  const { message } = AntApp.useApp();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AdverseEventFormValues>();
  const reasons = [...(analysis?.limitations ?? []), ...(analysis?.quality.reasons ?? [])];

  const submit = async (values: AdverseEventFormValues) => {
    setSubmitting(true);
    try {
      await createAdverseEvent(
        patientId,
        {
          lesionId: lesion.id,
          suspectedMedicationIds: [],
          onsetAt: new Date(values.onsetAt).toISOString(),
          symptoms: values.symptoms,
          severity: values.severity,
          urgencyLevel: values.urgencyLevel,
          causalityStatus: 'UNASSESSED' as AdverseEventCausality,
          clinicianStatus: 'PENDING_REVIEW',
          status: 'OPEN',
        },
        crypto.randomUUID(),
      );
      setOpen(false);
      form.resetFields();
      void message.success('Đã ghi nhận biến cố nghi ngờ.');
      onReported();
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : 'Không thể ghi nhận biến cố.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      size="small"
      title={<Space><ShieldAlert size={16} />An toàn & Cảnh báo</Space>}
      className={`${styles.panelCard} ${styles.safetyPanel}`}
      extra={canReport ? <Button size="small" danger onClick={() => setOpen(true)}>Ghi nhận biến cố</Button> : null}
    >
      <Tag color={lesion.suspectedAdverseEvent ? 'red' : 'green'}>
        Mức cảnh báo: {lesion.suspectedAdverseEvent ? 'Cao — có biến cố nghi ngờ' : 'Thấp'}
      </Tag>
      {reasons.length > 0 ? (
        reasons.map((reason) => (
          <Alert key={reason} type="warning" showIcon message={reason} className={styles.inlineAlert} />
        ))
      ) : (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Chưa ghi nhận dấu hiệu nguy hiểm hoặc giới hạn phân tích nào.
        </Text>
      )}
      <Drawer
        title="Ghi nhận biến cố nghi ngờ"
        open={open}
        onClose={() => !submitting && setOpen(false)}
        width={420}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          message="Chỉ ghi nhận, không tự động tạo Allergy"
          description="Biến cố được lưu ở trạng thái chờ bác sĩ review, không ảnh hưởng hồ sơ dị ứng."
          style={{ marginBottom: 16 }}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => void submit(values)}
          initialValues={{ onsetAt: localDateTimeValue(), severity: 'MODERATE', urgencyLevel: 'SOON', symptoms: [] }}
        >
          <Form.Item name="onsetAt" label="Thời điểm khởi phát" rules={[{ required: true }]}>
            <Input type="datetime-local" max={localDateTimeValue()} />
          </Form.Item>
          <Form.Item name="symptoms" label="Triệu chứng" rules={[{ required: true, type: 'array', min: 1 }]}>
            <Select mode="tags" tokenSeparators={[',']} placeholder="Nhập triệu chứng rồi nhấn Enter" />
          </Form.Item>
          <Form.Item name="severity" label="Mức độ nặng" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'MILD', label: 'Nhẹ' },
                { value: 'MODERATE', label: 'Trung bình' },
                { value: 'SEVERE', label: 'Nặng' },
                { value: 'UNKNOWN', label: 'Chưa xác định' },
              ]}
            />
          </Form.Item>
          <Form.Item name="urgencyLevel" label="Mức độ khẩn cấp" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'ROUTINE', label: 'Thường quy' },
                { value: 'SOON', label: 'Sớm' },
                { value: 'URGENT', label: 'Khẩn' },
                { value: 'EMERGENCY', label: 'Cấp cứu' },
              ]}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting} danger>
              Ghi nhận biến cố
            </Button>
            <Button onClick={() => setOpen(false)} disabled={submitting}>Hủy</Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  );
}
