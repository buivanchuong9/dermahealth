import { Alert, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd';
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Ruler,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  deriveReviewState,
  effectiveMetrics,
  isRegisteredProgressAnalysis,
  type ComparisonSession,
  type Lesion,
  type LesionObservation,
} from '../../domain/skinProgress';
import { SymptomTrendChart } from './DermaCharts';
import styles from './DermaTimeline.module.scss';

const { Text, Title } = Typography;

const assessmentCopy = {
  IMPROVING: {
    title: 'Tổn thương đang có dấu hiệu cải thiện',
    detail: 'Các chỉ số ghi nhận ở mốc hiện tại nhìn chung tốt hơn mốc ban đầu.',
    color: 'green',
  },
  STABLE: {
    title: 'Tổn thương hiện tương đối ổn định',
    detail: 'Chưa ghi nhận thay đổi rõ rệt giữa hai mốc được chọn.',
    color: 'blue',
  },
  WORSENING: {
    title: 'Có dấu hiệu cần bác sĩ đánh giá thêm',
    detail: 'Một số chỉ số đang xấu hơn. Không tự thay đổi thuốc khi chưa trao đổi với bác sĩ.',
    color: 'red',
  },
  INDETERMINATE: {
    title: 'Chưa đủ dữ liệu để kết luận',
    detail: 'Chất lượng ảnh hoặc dữ liệu hiện có chưa đủ để so sánh tin cậy.',
    color: 'gold',
  },
} as const;

const formatMetricValue = (value: number | null, unit: string) => {
  if (value === null) return 'Chưa ghi nhận';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
};

export function PatientRecoveryOverview({
  lesion,
  observations,
  session,
}: {
  lesion: Lesion;
  observations: LesionObservation[];
  session: ComparisonSession | null;
}) {
  const rawAnalysis = session?.analysis;
  const registeredProgress = isRegisteredProgressAnalysis(rawAnalysis);
  const analysis = registeredProgress ? rawAnalysis : undefined;
  const assessment = assessmentCopy[analysis?.assessment ?? 'INDETERMINATE'];
  const reviewState = session ? deriveReviewState(session) : lesion.reviewState;
  const reviewed = ['CLINICIAN_CONFIRMED', 'CLINICIAN_MODIFIED'].includes(reviewState);
  const metrics = session
    ? effectiveMetrics(session)
        .filter((metric) => metric.source !== 'IMAGE_ANALYSIS' ||
          (registeredProgress && metric.key === 'lesion-area-index'))
        .slice(0, 5)
    : [];
  const areaMetric = session && registeredProgress
    ? effectiveMetrics(session).find((metric) => metric.key === 'lesion-area-index')
    : undefined;
  const areaDelta = areaMetric && areaMetric.baseline !== null && areaMetric.current !== null
    ? areaMetric.current - areaMetric.baseline
    : null;
  const hasSymptoms = observations.some(
    (item) =>
      item.itchScore !== null && item.itchScore !== undefined ||
      item.painScore !== null && item.painScore !== undefined ||
      item.burningScore !== null && item.burningScore !== undefined,
  );

  return (
    <Row gutter={[16, 16]} align="stretch" className={styles.patientOverview}>
      <Col xs={24} xl={10}>
        <Card className={styles.patientResultCard}>
          <div className={styles.sectionEyebrow}>03 · KẾT QUẢ SO SÁNH</div>
          <div className={styles.patientAssessment}>
            {!registeredProgress || analysis?.assessment === 'WORSENING' ? (
              <CircleAlert size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
            <div>
              <Space size={8} wrap>
                <Title level={4}>{assessment.title}</Title>
                <Tag color={assessment.color}>{!registeredProgress ? 'Chưa có phân tích ảnh hợp lệ' : reviewed ? 'Bác sĩ đã xác nhận' : 'Đang chờ bác sĩ xác nhận'}</Tag>
              </Space>
              <Text type="secondary">{assessment.detail}</Text>
            </div>
          </div>

          {!registeredProgress && rawAnalysis && (
            <Alert
              type="warning"
              showIcon
              message="Kết quả cũ không được dùng để đánh giá tiến triển"
              description="Bản ghi không có cặp ảnh đã căn chỉnh và mask có provenance. Hệ thống đã ẩn mọi điểm số suy diễn từ classifier từng ảnh."
            />
          )}

          {areaMetric && areaMetric.baseline !== null && areaMetric.current !== null && areaDelta !== null && (
            <div className={styles.areaEvidenceCard}>
              <div className={styles.areaEvidenceHeader}>
                <span><ScanLine size={18} /></span>
                <div>
                  <Text strong>Diện tích tương đối của tổn thương</Text>
                  <Text type="secondary">Theo mask trên cặp ảnh đã căn chỉnh</Text>
                </div>
                <Tag color={areaMetric.clinicianVerified ? 'green' : 'gold'}>
                  {areaMetric.clinicianVerified ? 'Bác sĩ đã xác nhận' : 'Mask chờ xác nhận'}
                </Tag>
              </div>
              <div className={styles.areaEvidenceBody}>
                <div className={`${styles.areaDelta} ${areaDelta < 0 ? styles.areaDeltaImproved : areaDelta > 0 ? styles.areaDeltaWorsened : ''}`}>
                  {areaDelta < 0 ? <TrendingDown size={22} /> : areaDelta > 0 ? <TrendingUp size={22} /> : <Ruler size={22} />}
                  <div>
                    <strong>{areaDelta > 0 ? '+' : ''}{areaDelta.toFixed(1)}%</strong>
                    <span>{areaDelta < 0 ? 'giảm so với ban đầu' : areaDelta > 0 ? 'tăng so với ban đầu' : 'không đổi rõ rệt'}</span>
                  </div>
                </div>
                <div className={styles.areaBars}>
                  <div>
                    <span><b>Mốc ban đầu</b><em>{formatMetricValue(areaMetric.baseline, areaMetric.unit)}</em></span>
                    <i><u style={{ width: `${Math.min(100, Math.max(3, areaMetric.baseline))}%` }} /></i>
                  </div>
                  <div>
                    <span><b>Hiện tại</b><em>{formatMetricValue(areaMetric.current, areaMetric.unit)}</em></span>
                    <i><u className={areaDelta <= 0 ? styles.areaBarImproved : styles.areaBarWorsened} style={{ width: `${Math.min(100, Math.max(3, areaMetric.current))}%` }} /></i>
                  </div>
                </div>
              </div>
              <Text type="secondary" className={styles.areaEvidenceFootnote}>
                Diện tích tương đối theo ảnh đã chuẩn hóa, không phải cm². {areaMetric.measurementMethod ?? ''}
              </Text>
            </div>
          )}

          {metrics.length ? (
            <div className={styles.patientMetricList}>
              {metrics.map((metric) => (
                <div key={metric.key}>
                  <div>
                    <Text strong>{metric.label}</Text>
                    <Text type="secondary">
                      {formatMetricValue(metric.baseline, metric.unit)} → {formatMetricValue(metric.current, metric.unit)}
                    </Text>
                  </div>
                  <Tag
                    color={
                      metric.interpretation === 'IMPROVED'
                        ? 'green'
                        : metric.interpretation === 'WORSENED'
                          ? 'red'
                          : 'default'
                    }
                  >
                    {metric.interpretation === 'IMPROVED'
                      ? 'Tốt hơn'
                      : metric.interpretation === 'WORSENED'
                        ? 'Cần theo dõi'
                        : 'Ổn định'}
                  </Tag>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chỉ số so sánh" />
          )}
          <Text type="secondary" className={styles.patientDisclaimer}>
            Kết quả hỗ trợ theo dõi, không thay thế chẩn đoán hoặc chỉ định điều trị của bác sĩ.
          </Text>
        </Card>
      </Col>

      <Col xs={24} xl={8}>
        <Card className={styles.symptomChartCard}>
          <div className={styles.sectionEyebrow}>04 · TRIỆU CHỨNG THEO THỜI GIAN</div>
          {hasSymptoms ? (
            <SymptomTrendChart observations={observations} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu triệu chứng" />
          )}
        </Card>
      </Col>

      <Col xs={24} xl={6}>
        <Card className={styles.nextStepCard}>
          <div className={styles.sectionEyebrow}>05 · VIỆC CẦN LÀM TIẾP</div>
          <div className={styles.nextStepList}>
            <div>
              <span><Stethoscope size={16} /></span>
              <div>
                <Text strong>{reviewed ? 'Theo đánh giá của bác sĩ' : 'Chờ bác sĩ xác nhận'}</Text>
                <Text type="secondary">
                  {reviewed ? 'Tiếp tục theo hướng dẫn đã được xác nhận.' : 'Chưa tự thay đổi thuốc hoặc liều dùng.'}
                </Text>
              </div>
            </div>
            <div>
              <span><CalendarClock size={16} /></span>
              <div>
                <Text strong>Chụp ảnh đúng mốc</Text>
                <Text type="secondary">Giữ cùng ánh sáng, góc chụp và khoảng cách.</Text>
              </div>
            </div>
            <div>
              <span><ShieldCheck size={16} /></span>
              <div>
                <Text strong>Theo dõi dấu hiệu bất thường</Text>
                <Text type="secondary">Liên hệ cơ sở y tế khi tổn thương lan nhanh, đau tăng hoặc có sốt.</Text>
              </div>
            </div>
          </div>
          {lesion.suspectedAdverseEvent && (
            <Alert type="error" showIcon message="Đã ghi nhận dấu hiệu cần bác sĩ xem sớm" />
          )}
        </Card>
      </Col>
    </Row>
  );
}
