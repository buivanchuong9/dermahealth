import { Alert, Button, Card, Col, Collapse, Empty, Row, Space, Tag, Typography } from 'antd';
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Eye,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  canViewBaselineMask,
  canViewFollowUpMask,
  deriveReviewState,
  effectiveMetrics,
  primaryMetrics,
  resultSummaryCopy,
  selectResultSummaryState,
  type ComparisonSession,
  type Lesion,
  type LesionObservation,
} from '../../domain/skinProgress';
import { SymptomTrendChart } from './DermaCharts';
import styles from './DermaTimeline.module.scss';

const { Text, Title } = Typography;

const formatMetricValue = (value: number | null, unit: string) => {
  if (value === null) return 'Chưa ghi nhận';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
};

/** One backend-derived fact per state — never a frontend-computed number,
 * never a raw metric code, at most 4. PROGRESSION_AVAILABLE and
 * RELATIVE_ONLY read straight from the backend's own metric rows;
 * PER_IMAGE_ONLY and the failure states read asset/quality existence only. */
function summaryFacts(
  state: ReturnType<typeof selectResultSummaryState>,
  session: ComparisonSession | null,
  baseline?: LesionObservation,
  target?: LesionObservation,
): { label: string; value: string }[] {
  const analysis = session?.analysis;
  if (state === 'PROGRESSION_AVAILABLE' || state === 'RELATIVE_ONLY') {
    if (!session) return [];
    const measured = effectiveMetrics(session).filter(
      (metric) => metric.baseline !== null || metric.current !== null,
    );
    return primaryMetrics(measured, 4).primary.map((metric) => ({
      label: metric.label,
      value: `${formatMetricValue(metric.baseline, metric.unit)} → ${formatMetricValue(metric.current, metric.unit)}`,
    }));
  }
  if (state === 'PER_IMAGE_ONLY') {
    const facts: { label: string; value: string }[] = [];
    if (baseline) {
      facts.push({
        label: 'Mask ảnh ban đầu',
        value: canViewBaselineMask(baseline, analysis) ? 'Đã xác định vùng tổn thương' : 'Chưa có',
      });
    }
    if (target) {
      facts.push({
        label: 'Mask ảnh hiện tại',
        value: canViewFollowUpMask(target, analysis) ? 'Đã xác định vùng tổn thương' : 'Chưa có',
      });
    }
    if (analysis) {
      facts.push({
        label: 'Khả năng so sánh',
        value:
          analysis.quality.comparisonDisposition === 'CAUTION'
            ? 'Có thể xem với cảnh báo'
            : 'Không đủ tin cậy để so sánh trực tiếp',
      });
    }
    return facts;
  }
  return [];
}

/** The one primary conclusion for the comparison result screen — reused
 * identically by patient and clinician views (Part 7: same summary, extra
 * technical detail lives elsewhere, never a second competing conclusion). */
export function ResultSummaryCard({
  lesion,
  session,
  baseline,
  target,
  primaryAction,
  onRetry,
  retrying,
}: {
  lesion: Lesion;
  session: ComparisonSession | null;
  baseline?: LesionObservation;
  target?: LesionObservation;
  primaryAction?: { label: string; onClick: () => void };
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const state = selectResultSummaryState(session, baseline, target);
  const analysis = session?.analysis;
  const copy = resultSummaryCopy(state, analysis?.assessment);
  const reviewState = session ? deriveReviewState(session) : lesion.reviewState;
  const reviewed = ['CLINICIAN_CONFIRMED', 'CLINICIAN_MODIFIED'].includes(reviewState);
  const warn =
    state === 'RECAPTURE_REQUIRED' ||
    state === 'ANALYSIS_UNAVAILABLE' ||
    (state === 'PROGRESSION_AVAILABLE' && analysis?.assessment === 'WORSENING');
  const facts = summaryFacts(state, session, baseline, target);

  return (
    <Card className={`${styles.resultSummaryCard} ${warn ? styles.resultSummaryWarn : styles.resultSummaryGood}`}>
      <div className={styles.resultSummaryHeader}>
        {warn ? <CircleAlert size={26} /> : <CheckCircle2 size={26} />}
        <div>
          <Space size={8} wrap>
            <Title level={4}>{copy.title}</Title>
            <Tag color={reviewed ? 'green' : 'gold'}>
              {reviewed ? 'Bác sĩ đã xác nhận' : 'Đang chờ bác sĩ xác nhận'}
            </Tag>
          </Space>
          <Text type="secondary">{copy.description}</Text>
        </div>
      </div>

      {state === 'RECAPTURE_REQUIRED' && (
        <Alert
          type="warning"
          showIcon
          message={session?.failureReason ?? 'Ảnh hiện tại chưa đủ chất lượng để đưa ra nhận định đáng tin cậy.'}
          className={styles.resultSummaryAlert}
        />
      )}
      {state === 'ANALYSIS_UNAVAILABLE' && session?.status === 'FAILED' && (
        <Alert
          type="error"
          showIcon
          message={session.failureReason ?? 'Không thể hoàn tất phân tích tự động. Ảnh gốc vẫn an toàn trong hồ sơ.'}
          className={styles.resultSummaryAlert}
        />
      )}

      {facts.length > 0 && (
        <div className={styles.resultSummaryFacts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      )}

      <Space wrap size={10} className={styles.resultSummaryActions}>
        {primaryAction && (
          <Button type="primary" icon={<Eye size={15} />} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        {onRetry && (state === 'ANALYSIS_UNAVAILABLE' || state === 'RECAPTURE_REQUIRED') && (
          <Button icon={<RefreshCw size={15} />} loading={retrying} onClick={onRetry}>
            Phân tích lại
          </Button>
        )}
      </Space>
    </Card>
  );
}

export function PatientRecoveryOverview({
  lesion,
  observations,
  session,
}: {
  lesion: Lesion;
  observations: LesionObservation[];
  session: ComparisonSession | null;
}) {
  const reviewState = session ? deriveReviewState(session) : lesion.reviewState;
  const reviewed = ['CLINICIAN_CONFIRMED', 'CLINICIAN_MODIFIED'].includes(reviewState);
  const secondaryMetrics = session
    ? primaryMetrics(
        effectiveMetrics(session).filter(
          (metric) => metric.source !== 'IMAGE_ANALYSIS' || metric.key === 'lesion-area-index',
        ),
        4,
      ).secondary
    : [];
  const hasSymptoms = observations.some(
    (item) =>
      (item.itchScore !== null && item.itchScore !== undefined) ||
      (item.painScore !== null && item.painScore !== undefined) ||
      (item.burningScore !== null && item.burningScore !== undefined),
  );

  return (
    <Row gutter={[16, 16]} align="stretch" className={styles.patientOverview}>
      <Col xs={24} xl={14}>
        <Card className={styles.symptomChartCard}>
          <div className={styles.sectionEyebrow}>TRIỆU CHỨNG THEO THỜI GIAN</div>
          {hasSymptoms ? (
            <SymptomTrendChart observations={observations} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu triệu chứng" />
          )}
          {secondaryMetrics.length > 0 && (
            <Collapse
              ghost
              className={styles.secondaryMetricsCollapse}
              items={[
                {
                  key: 'more-metrics',
                  label: 'Xem thêm chỉ số',
                  children: (
                    <div className={styles.patientMetricList}>
                      {secondaryMetrics.map((metric) => (
                        <div key={metric.key}>
                          <div>
                            <Text strong>{metric.label}</Text>
                            <Text type="secondary">
                              {formatMetricValue(metric.baseline, metric.unit)} → {formatMetricValue(metric.current, metric.unit)}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} xl={10}>
        <Card className={styles.nextStepCard}>
          <div className={styles.sectionEyebrow}>VIỆC CẦN LÀM TIẾP</div>
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
          <Text type="secondary" className={styles.patientDisclaimer}>
            Kết quả hỗ trợ theo dõi, không thay thế chẩn đoán hoặc chỉ định điều trị của bác sĩ.
          </Text>
        </Card>
      </Col>
    </Row>
  );
}
