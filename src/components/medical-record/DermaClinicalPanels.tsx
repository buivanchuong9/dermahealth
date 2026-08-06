import { useState } from 'react';
import { Alert, Button, Card, Collapse, Descriptions, Drawer, Empty, Form, Input, Select, Space, Tag, Typography, App as AntApp } from 'antd';
import { AlertCircle, Camera, Eye, FileCheck2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { humanizeClinicalText } from '../../domain/skinLabels';
import { createAdverseEvent } from '../../api/lifetimeMedicalRecord';
import {
  canViewBothGradCam,
  deriveReviewState,
  effectiveMetrics,
  isLegacyClassification,
  isRegisteredProgressAnalysis,
  primaryMetrics,
  resultSummaryCopy,
  selectResultSummaryState,
  type AdverseEventCausality,
  type ComparisonSession,
  type EvidenceLink,
  type Lesion,
  type LesionDetailBundle,
  type LesionObservation,
  type ReviewState,
} from '../../domain/skinProgress';
import type { ViewMode } from './DermaComparisonWorkbench';
import styles from './DermaTimeline.module.scss';
import { QualityDimensionsChart, QualityGaugeChart } from './DermaCharts';

const { Text, Title } = Typography;

const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  AI_SUGGESTION: 'Gợi ý từ hệ thống',
  AWAITING_CLINICIAN_REVIEW: 'Đang chờ bác sĩ xác nhận',
  CLINICIAN_CONFIRMED: 'Bác sĩ đã xác nhận',
  CLINICIAN_MODIFIED: 'Bác sĩ đã điều chỉnh',
  CLINICIAN_REJECTED: 'Bác sĩ đã từ chối',
  UNABLE_TO_DETERMINE: 'Không thể xác định',
};

/** Patient-friendly name for well-known metric keys */
const PATIENT_METRIC_LABEL: Record<string, string> = {
  'lesion-area-index': 'Diện tích tổn thương',
  'lesion-area-physical-cm2': 'Diện tích thực (cm²)',
  'lesion-count': 'Số lượng tổn thương',
  'inflammation-score': 'Mức độ viêm',
  'redness-score': 'Mức độ đỏ da',
};

/** Patient-friendly missing reason by metric key */
const PATIENT_METRIC_MISSING: Record<string, string> = {
  'lesion-area-index': 'Ảnh chưa đủ điều kiện để xác định vùng tổn thương.',
  'lesion-area-physical-cm2': 'Không phát hiện thẻ đo DermaHealth trong ảnh — chưa tính được diện tích thực.',
  'lesion-count': 'Ảnh chưa đủ rõ để đếm số lượng tổn thương.',
};

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
  // At most three issues, ordered as returned by the backend policy (most
  // impactful first) — one compact list instead of a repeated yellow Alert
  // per reason, which reads as louder-the-more-wrong-it-is rather than a
  // clear summary.
  const topIssues = quality.reasons.slice(0, 3);
  return (
    <Card size="small" title="Khả năng so sánh" className={styles.panelCard}>
      <div className={styles.panelCardInner}>
        <div className={styles.panelCardContent}>
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
              <Text type="secondary">Điểm phản ánh chất lượng kỹ thuật của cặp ảnh, không phải độ chắc chắn chẩn đoán.</Text>
            </div>
          </div>
          <div className={styles.qualityChart}>
            <QualityDimensionsChart quality={quality} />
          </div>
        </div>
        {topIssues.length > 0 && (
          <div className={styles.qualityIssues}>
            <Text strong className={styles.qualityIssuesTitle}>Vấn đề cần lưu ý</Text>
            <ol>
              {topIssues.map((reason) => <li key={reason}>{reason}</li>)}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

export function MetricsPanel({ session, focusedMetric, patientMode }: { session: ComparisonSession; focusedMetric?: string; patientMode?: boolean }) {
  const registeredProgress = isRegisteredProgressAnalysis(session.analysis);
  const metrics = effectiveMetrics(session).filter(
    (metric) => metric.source !== 'IMAGE_ANALYSIS' ||
      (registeredProgress && ['lesion-area-index', 'lesion-area-physical-cm2'].includes(metric.key)),
  );
  if (!metrics.length) {
    return (
      <Card size="small" title={patientMode ? 'Kết quả đo' : 'Chỉ số lâm sàng'} className={styles.panelCard}>
        <Empty description={patientMode ? 'Chưa có kết quả đo cho hai mốc ảnh này.' : 'Backend chưa ghi nhận chỉ số có thể so sánh cho hai mốc này'} />
      </Card>
    );
  }
  // One shared limitation line per section instead of repeating a
  // missing-data reason inside every card that lacks a value.
  const sharedMissingReason = metrics.find(
    (metric) => metric.baseline === null && metric.current === null && metric.missingReason,
  )?.missingReason;
  // Keep the card grid short — area metrics lead (they drive the headline),
  // everything else moves into a collapsed "Xem thêm chỉ số" so the panel
  // doesn't read as one long wall of near-identical cards.
  const { primary, secondary } = primaryMetrics(metrics, 4);
  const metricCard = (metric: (typeof metrics)[number]) => (
    <div
      key={metric.key}
      className={`${styles.metricCard} ${metric.key === focusedMetric ? styles.metricCardFocused : ''}`}
    >
      <div className={styles.metricCardHeader}>
        <Space direction="vertical" size={2}>
          <Text strong>{patientMode ? PATIENT_METRIC_LABEL[metric.key] ?? metric.label : metric.label}</Text>
          {!patientMode && <Tag>{categoryLabel[metric.category]}</Tag>}
        </Space>
        {!patientMode && <Tag color={interpretation[metric.interpretation].color}>{interpretation[metric.interpretation].label}</Tag>}
      </div>
      {metric.baseline === null && metric.current === null ? (
        <div className={styles.metricIndeterminateBox}>
          <AlertCircle size={14} />
          <span>{patientMode
            ? (PATIENT_METRIC_MISSING[metric.key] ?? 'Ảnh chưa đủ điều kiện để xác định chỉ số này.')
            : (humanizeClinicalText(metric.missingReason) || 'Ảnh chưa đủ tương đồng hoặc mask chưa đủ tin cậy để tính diện tích.')
          }</span>
        </div>
      ) : (
        <div className={styles.metricCardValues}>
          <div><span>Mốc đầu</span><strong>{number(metric.baseline, ` ${metric.unit}`)}</strong></div>
          <div><span>Hiện tại</span><strong>{number(metric.current, ` ${metric.unit}`)}</strong></div>
          <div><span>Thay đổi</span><strong>{metric.delta === null ? 'Không tính được' : `${metric.delta > 0 ? '+' : ''}${number(metric.delta, ` ${metric.unit}`)}`}</strong></div>
        </div>
      )}
      <div className={styles.metricCardFooter}>
        {!patientMode && (
          <Text type="secondary">
            {sourceLabel[metric.source]}
            {metric.measurementMethod ? ` · ${humanizeClinicalText(metric.measurementMethod)}` : ''}
            {metric.confidence != null ? ` · Tin cậy ${Math.round(metric.confidence * 100)}%` : ''}
          </Text>
        )}
        <Tag color={metric.clinicianVerified ? 'green' : 'gold'}>
          {metric.clinicianVerified ? 'Bác sĩ xác nhận' : 'Chờ bác sĩ xác nhận'}
        </Tag>
      </div>
    </div>
  );
  return (
    <Card size="small" title={patientMode ? 'Kết quả đo' : 'Chỉ số lâm sàng theo nguồn'} className={styles.panelCard}>
      <div className={styles.panelCardInner}>
        <div className={styles.panelCardContent}>
          <div className={styles.metricCardGrid}>{primary.map(metricCard)}</div>
          {secondary.length > 0 && (
            <Collapse
              ghost
              className={styles.secondaryMetricsCollapse}
              items={[{ key: 'more-metrics', label: `Xem thêm chỉ số (${secondary.length})`, children: <div className={styles.metricCardGrid}>{secondary.map(metricCard)}</div> }]}
            />
          )}
        </div>
        <div className={styles.panelFootnoteBox}>
          <Text type="secondary" className={styles.panelFootnote}>
            {patientMode
              ? 'Kết quả dựa trên ảnh bạn đã gửi — chưa phải kết luận điều trị của bác sĩ.'
              : `ℹ️ Các chỉ số trên dựa trên ảnh và dữ liệu đã ghi nhận — chưa phải kết luận điều trị của bác sĩ.${sharedMissingReason ? ` ${humanizeClinicalText(sharedMissingReason)}` : ''}`
            }
          </Text>
        </div>
      </div>
    </Card>
  );
}

export function ExplainabilityPanel({
  session,
  baseline,
  target,
  onViewEvidence,
  patientMode,
}: {
  session: ComparisonSession;
  baseline: LesionObservation;
  target: LesionObservation;
  onEvidence: (evidence: EvidenceLink) => void;
  onViewEvidence: (mode: ViewMode) => void;
  patientMode?: boolean;
}) {
  const analysis = session.analysis;
  if (!analysis) return null;
  if (!isRegisteredProgressAnalysis(analysis)) {
    return (
      <Card size="small" title="So sánh 2 mốc ảnh" className={styles.panelCard}>
        <Alert
          type="warning"
          showIcon
          message="Chưa có dữ liệu so sánh căn chỉnh"
          description="Hình ảnh này chưa được xử lý qua bộ căn chỉnh tiến triển."
        />
      </Card>
    );
  }
  const reviewState = deriveReviewState(session);
  const latestReview = session.reviews.at(-1);

  const baselineDate = baseline.capturedAt ? new Date(baseline.capturedAt).toLocaleDateString('vi-VN') : 'Mốc 1';
  const targetDate = target.capturedAt ? new Date(target.capturedAt).toLocaleDateString('vi-VN') : 'Mốc 2';

  const summaryInfo = resultSummaryCopy(selectResultSummaryState(session, baseline, target), analysis.assessment);

  const isRecapture = summaryInfo.title.toLowerCase().includes('chụp lại') ||
    selectResultSummaryState(session, baseline, target) === 'RECAPTURE_REQUIRED';

  return (
    <Card
      size="small"
      title={patientMode ? 'Kết quả so sánh' : 'So sánh 2 mốc ảnh (Mốc đầu vs Hiện tại)'}
      className={styles.panelCard}
    >
      <div className={styles.panelCardInner}>
        <div className={styles.panelCardContent}>

          {/* ── Patient mode: hero status card ── */}
          {patientMode ? (
            <div className={styles.comparisonSummaryBox}>
              <div className={styles.comparisonDateBadge}>
                <span>{baselineDate}</span>
                <span className={styles.arrowIcon}>➔</span>
                <span>{targetDate}</span>
              </div>
              <Alert
                type={analysis.assessment === 'WORSENING' ? 'warning' : analysis.assessment === 'IMPROVING' ? 'success' : 'info'}
                showIcon
                message={<span style={{ fontWeight: 700, fontSize: 15 }}>{summaryInfo.title}</span>}
                description={
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#334155' }}>{summaryInfo.description}</p>
                    {isRecapture && (
                      <Button
                        type="primary"
                        icon={<Camera size={14} />}
                        style={{ marginTop: 12 }}
                        onClick={() => onViewEvidence('side')}
                      >
                        Xem hướng dẫn chụp lại
                      </Button>
                    )}
                    {!isRecapture && (
                      <Button
                        size="small"
                        icon={<Eye size={13} />}
                        style={{ marginTop: 10 }}
                        onClick={() => onViewEvidence('side')}
                      >
                        Xem ảnh trước và hiện tại
                      </Button>
                    )}
                  </div>
                }
              />

              {/* Việc cần làm hôm nay — static safe defaults; replace with real care plan when available */}
              <div className={styles.patientTodoBlock}>
                <Text strong className={styles.explainSectionTitle}>Việc cần làm hôm nay</Text>
                <ul className={styles.patientTodoList}>
                  {isRecapture && <li><Camera size={13} /> Chụp lại ảnh theo hướng dẫn để hệ thống có thể so sánh chính xác hơn.</li>}
                  <li>💊 Tiếp tục dùng thuốc đúng theo đơn bác sĩ đã kê.</li>
                  <li>🚫 Không tự ý ngừng hoặc đổi thuốc khi chưa hỏi bác sĩ.</li>
                </ul>
              </div>

              {/* Khi nào cần liên hệ */}
              <div className={styles.patientWarningBlock}>
                <Text strong className={styles.explainSectionTitle}>Khi nào cần liên hệ bác sĩ</Text>
                <ul className={styles.limitationList}>
                  <li>Tổn thương đau, rát hoặc ngứa tăng rõ rệt</li>
                  <li>Vùng da lan rộng ra hoặc xuất hiện vùng mới</li>
                  <li>Chảy dịch, mủ hoặc có sốt</li>
                  <li>Sưng mặt, môi hoặc khó thở</li>
                </ul>
              </div>

              {/* Hình ảnh AI — collapsed */}
              {canViewBothGradCam(baseline, target) && (
                <Collapse
                  ghost
                  className={styles.secondaryMetricsCollapse}
                  items={[{
                    key: 'ai-images',
                    label: 'Xem thêm hình ảnh AI',
                    children: (
                      <div>
                        <Alert
                          type="info"
                          showIcon={false}
                          style={{ marginBottom: 8, fontSize: 12 }}
                          message="Hình ảnh dưới đây cho thấy vùng AI đã chú ý khi phân tích — không phản ánh mức độ bệnh."
                        />
                        <Button size="small" icon={<Eye size={13} />} onClick={() => onViewEvidence('bothAttention')}>
                          Xem vùng AI quan sát
                        </Button>
                      </div>
                    ),
                  }]}
                />
              )}
            </div>
          ) : (
            /* ── Clinician mode: original layout ── */
            <div className={styles.comparisonSummaryBox}>
              <div className={styles.comparisonDateBadge}>
                <span>Mốc ban đầu ({baselineDate})</span>
                <span className={styles.arrowIcon}>➔</span>
                <span>Ảnh hiện tại ({targetDate})</span>
              </div>
              <Alert
                type={analysis.assessment === 'WORSENING' ? 'warning' : analysis.assessment === 'IMPROVING' ? 'success' : 'info'}
                showIcon
                message={<span style={{ fontWeight: 700, fontSize: 14 }}>{summaryInfo.title}</span>}
                description={
                  <div style={{ marginTop: 6, lineHeight: 1.65, color: '#334155' }}>
                    <p style={{ margin: 0, fontSize: 13.5 }}>{summaryInfo.description}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                      ℹ️ Kết luận chính xác sẽ do bác sĩ điều trị xác nhận sau khi xem xét ảnh và hồ sơ.
                    </p>
                  </div>
                }
              />
              <section className={styles.explainSection}>
                <Text strong className={styles.explainSectionTitle}>Công cụ xem đối chiếu</Text>
                <Space wrap style={{ marginTop: 6 }}>
                  <Button size="small" icon={<Eye size={14} />} onClick={() => onViewEvidence('side')}>So sánh 2 ảnh gốc</Button>
                  {canViewBothGradCam(baseline, target) && (
                    <Button size="small" icon={<Eye size={14} />} onClick={() => onViewEvidence('bothAttention')}>Xem Grad-CAM hai mốc</Button>
                  )}
                </Space>
              </section>
            </div>
          )}
        </div>

        <div className={styles.explainDoctorFooter}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              {patientMode ? 'Bác sĩ đã xem xét:' : 'Trạng thái xác nhận của bác sĩ:'}
            </Text>
            <Tag color={reviewState === 'CLINICIAN_CONFIRMED' || reviewState === 'CLINICIAN_MODIFIED' ? 'green' : 'gold'}>
              {REVIEW_STATE_LABEL[reviewState]}
            </Tag>
          </div>
          {latestReview && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              Bác sĩ {latestReview.reviewerName} · {new Date(latestReview.reviewedAt).toLocaleDateString('vi-VN')}
            </Text>
          )}
        </div>
      </div>
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
        <Descriptions.Item label="Chính sách chất lượng">{analysis?.quality.policyVersion ?? 'Không khả dụng'}</Descriptions.Item>
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
  patientId,
  canReport,
  onReported,
}: {
  lesion: Lesion;
  patientId: string;
  canReport: boolean;
  onReported: () => void;
}) {
  const { message } = AntApp.useApp();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AdverseEventFormValues>();

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
      {!lesion.suspectedAdverseEvent && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Chưa ghi nhận dấu hiệu nguy hiểm nào. Giới hạn phân tích ảnh nằm trong mục Giải thích và Khả năng so sánh ở trên.
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
