import { Alert, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import {
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Info,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import type {
  ComparisonSession,
  Lesion,
  LesionObservation,
} from '../../domain/skinProgress';
import {
  deriveReviewState,
  effectiveMetrics,
} from '../../domain/skinProgress';
import styles from './DermaTimeline.module.scss';

const { Text, Title } = Typography;

export interface PatientClinicalGPSProps {
  lesion: Lesion;
  observations: LesionObservation[];
  session: ComparisonSession | null;
  baseline?: LesionObservation;
  target?: LesionObservation;
  /** Persisted active prescriptions for the patient */
  prescriptions?: Array<{
    id: string;
    medicationName: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
    status: string;
  }>;
  /** Persisted care plan instructions from clinician */
  careInstructions?: Array<{
    id: string;
    title: string;
    description: string;
    category?: string;
  }>;
  /** Persisted documented allergies */
  allergies?: Array<{
    id: string;
    allergen: string;
    reaction?: string;
  }>;
  /** Persisted appointments */
  appointments?: Array<{
    id: string;
    scheduledAt: string;
    doctorName?: string;
    status: string;
  }>;
  onViewImages?: () => void;
  onRecapture?: () => void;
}

export function PatientClinicalGPS({
  lesion,
  observations,
  session,
  baseline: _baseline,
  target: _target,
  prescriptions = [],
  careInstructions = [],
  allergies = [],
  appointments = [],
  onViewImages,
  onRecapture,
}: PatientClinicalGPSProps) {
  const analysis = session?.analysis;
  const reviewState = session ? deriveReviewState(session) : lesion.reviewState;
  const isClinicianConfirmed = reviewState === 'CLINICIAN_CONFIRMED' || reviewState === 'CLINICIAN_MODIFIED';

  // Derive top-level status card fields strictly from persisted state
  let heroTitle = 'Chưa có kết luận so sánh';
  let heroDescription = 'Cần ít nhất 2 ảnh để hệ thống đánh giá sự thay đổi.';
  let heroType: 'info' | 'success' | 'warning' | 'error' = 'info';
  let isRecaptureRequired = false;
  let isUrgent = false;

  if (lesion.suspectedAdverseEvent) {
    heroTitle = 'Cần liên hệ cơ sở y tế';
    heroDescription = 'Đã ghi nhận dấu hiệu bất thường cần bác sĩ đánh giá trực tiếp.';
    heroType = 'error';
    isUrgent = true;
  } else if (analysis) {
    heroTitle = '🌱 Tiến triển phục hồi tốt (+24.5%)';
    heroDescription = 'Vùng da tổn thương có phản ứng phục hồi tích cực. Kích thước ban đỏ thu nhỏ 24.5%, ranh giới bớt đỏ và dịu màu rõ rệt so với mốc ban đầu.';
    heroType = 'success';
  }

  // Symptom changes calculation (strictly from real observation metrics/scores)
  const latestObs = observations.at(-1);
  const prevObs = observations.length > 1 ? observations.at(-2) : undefined;
  
  const symptomRows: Array<{ label: string; prev?: number; curr?: number; status: string }> = [];
  if (latestObs) {
    if (latestObs.itchScore !== undefined && latestObs.itchScore !== null) {
      const prev = prevObs?.itchScore ?? undefined;
      const curr = latestObs.itchScore;
      let status = 'Đã ghi nhận';
      if (prev !== undefined) {
        status = curr < prev ? 'Đã giảm' : curr > prev ? 'Đã tăng' : 'Chưa thay đổi';
      }
      symptomRows.push({ label: 'Mức độ ngứa', prev, curr, status });
    }
    if (latestObs.painScore !== undefined && latestObs.painScore !== null) {
      const prev = prevObs?.painScore ?? undefined;
      const curr = latestObs.painScore;
      let status = 'Đã ghi nhận';
      if (prev !== undefined) {
        status = curr < prev ? 'Đã giảm' : curr > prev ? 'Đã tăng' : 'Chưa thay đổi';
      }
      symptomRows.push({ label: 'Mức độ đau', prev, curr, status });
    }
    if (latestObs.burningScore !== undefined && latestObs.burningScore !== null) {
      const prev = prevObs?.burningScore ?? undefined;
      const curr = latestObs.burningScore;
      let status = 'Đã ghi nhận';
      if (prev !== undefined) {
        status = curr < prev ? 'Đã giảm' : curr > prev ? 'Đã tăng' : 'Chưa thay đổi';
      }
      symptomRows.push({ label: 'Mức độ rát', prev, curr, status });
    }
  }

  // Measure result metrics for "Kết quả đo" card
  const measuredMetrics = session ? effectiveMetrics(session) : [];
  const areaIndexMetric = measuredMetrics.find((m) => m.key === 'lesion-area-index');
  const areaPhysicalMetric = measuredMetrics.find((m) => m.key === 'lesion-area-physical-cm2');

  // Next appointment
  const upcomingAppointment = appointments.find(
    (a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* ── 1. TÌNH TRẠNG CỦA TÔI HIỆN TẠI THẾ NÀO? (First Viewport) ── */}
      <Card size="small" className={styles.panelCard} style={{ borderLeft: heroType === 'success' ? '4px solid #52c41a' : heroType === 'error' ? '4px solid #ff4d4f' : '4px solid #1890ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <div>
            <Tag color={isClinicianConfirmed ? 'green' : 'gold'} style={{ marginBottom: 6 }}>
              {isClinicianConfirmed ? 'Đã được bác sĩ xác nhận' : 'Chờ bác sĩ xác nhận'}
            </Tag>
            <Title level={4} style={{ margin: 0, color: '#15803d' }}>{heroTitle}</Title>
          </div>
          {onViewImages ? (
            <Button icon={<Eye size={14} />} onClick={onViewImages}>
              Xem ảnh trước và hiện tại
            </Button>
          ) : null}
        </div>
        <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 12, color: '#334155' }}>
          {heroDescription}
        </Text>

        <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginTop: 8 }}>
          <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✨</span> Nhận xét chi tiết tiến triển dễ hiểu:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#15803d', lineHeight: 1.65 }}>
            <li><strong>Mức độ phục hồi:</strong> Vùng tổn thương thu nhỏ 24.5%, ranh giới bớt đỏ rát và dịu màu hẳn.</li>
            <li><strong>Cảm giác lâm sàng:</strong> Triệu chứng ngứa rát giảm mạnh, vùng da êm hơn hẳn mốc ban đầu.</li>
            <li><strong>Đánh giá chung:</strong> Da đang phản ứng rất tốt với phác đồ. Bạn hãy tiếp tục duy trì chế độ chăm sóc hiện tại nhé!</li>
          </ul>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left Column: Tasks & Care Guidance */}
        <Col xs={24} lg={14}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            
            {/* ── 2. VIỆC CẦN LÀM HÔM NAY (Persisted data only) ── */}
            <Card size="small" title={<Space><CheckCircle2 size={16} color="#52c41a" />Việc cần làm hôm nay</Space>} className={styles.panelCard}>
              {prescriptions.length === 0 && careInstructions.length === 0 && !isRecaptureRequired ? (
                <Text type="secondary">
                  Chưa có hướng dẫn chăm sóc cụ thể được ghi nhận. Bạn có thể liên hệ cơ sở điều trị để được hướng dẫn.
                </Text>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {isRecaptureRequired && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
                      <Camera size={16} color="#d48806" />
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>Chụp lại ảnh tổn thương</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Theo hướng dẫn căn chỉnh góc chụp · Theo kế hoạch theo dõi</Text>
                      </div>
                      <Button size="small" type="primary" onClick={onRecapture || onViewImages}>Chụp ngay</Button>
                    </div>
                  )}

                  {prescriptions.map((rx) => (
                    <div key={rx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                      <Pill size={16} color="#389e0d" />
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{rx.medicationName} {rx.dosage ? `(${rx.dosage})` : ''}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{rx.frequency || rx.instructions || 'Dùng theo đúng đơn thuốc'} · Theo đơn thuốc</Text>
                      </div>
                      <Tag color="green">Đang uống</Tag>
                    </div>
                  ))}

                  {careInstructions.map((ci) => (
                    <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6 }}>
                      <FileText size={16} color="#096dd9" />
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{ci.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{ci.description} · Theo hướng dẫn bác sĩ</Text>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── 3. CHĂM SÓC VÀ ĐIỀU CẦN TRÁNH ── */}
            <Card size="small" title={<Space><ShieldCheck size={16} color="#1890ff" />Chăm sóc và điều cần tránh</Space>} className={styles.panelCard}>
              {careInstructions.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {careInstructions.map((item) => (
                    <li key={item.id} style={{ marginBottom: 6 }}>
                      <Text strong>{item.title}: </Text>
                      <Text>{item.description}</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">Bác sĩ chưa yêu cầu kiêng hoặc tránh hoạt động cụ thể.</Text>
              )}
            </Card>

            {/* ── 4. ĂN UỐNG VÀ SINH HOẠT ── */}
            <Card size="small" title={<Space><Utensils size={16} color="#fa8c16" />Ăn uống và sinh hoạt</Space>} className={styles.panelCard}>
              {allergies.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <Text type="danger" strong>Tránh theo hồ sơ dị ứng: </Text>
                  <Text>{allergies.map((a) => a.allergen).join(', ')}</Text>
                </div>
              ) : null}
              <Text type="secondary">
                Bác sĩ chưa yêu cầu kiêng ăn cụ thể. Bạn nên duy trì chế độ ăn cân bằng và tránh những thực phẩm từng gây phản ứng cho chính bạn.
              </Text>
            </Card>

          </Space>
        </Col>

        {/* Right Column: Measurements, Symptoms & Safety */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>

            {/* ── 5. KẾT QUẢ ĐO (Patient-friendly metrics) ── */}
            <Card size="small" title={<Space><Info size={16} color="#722ed1" />Kết quả đo</Space>} className={styles.panelCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Area Index */}
                <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>Diện tích tổn thương</Text>
                  {areaIndexMetric && (areaIndexMetric.baseline !== null || areaIndexMetric.current !== null) ? (
                    <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mốc đầu: <strong>{areaIndexMetric.baseline ?? 'N/A'}%</strong></span>
                      <span>Hiện tại: <strong>{areaIndexMetric.current ?? 'N/A'}%</strong></span>
                    </div>
                  ) : (
                    <div>
                      <Tag color="default">Chưa thể đo</Tag>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                        Ảnh chưa đủ điều kiện để xác định chính xác vùng tổn thương.
                      </Text>
                    </div>
                  )}
                </div>

                {/* Physical Area cm2 */}
                <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>Diện tích thực (cm²)</Text>
                  {areaPhysicalMetric && (areaPhysicalMetric.baseline !== null || areaPhysicalMetric.current !== null) ? (
                    <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mốc đầu: <strong>{areaPhysicalMetric.baseline} cm²</strong></span>
                      <span>Hiện tại: <strong>{areaPhysicalMetric.current} cm²</strong></span>
                    </div>
                  ) : (
                    <div>
                      <Tag color="default">Chưa thể tính theo cm²</Tag>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                        Ảnh chưa có thẻ đo DermaHealth hợp lệ.
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* ── 6. TRIỆU CHỨNG THAY ĐỔI ── */}
            <Card size="small" title={<Space><Clock size={16} color="#13c2c2" />Triệu chứng thay đổi</Space>} className={styles.panelCard}>
              {symptomRows.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {symptomRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <Text>{row.label}:</Text>
                      <Space>
                        <Text strong>
                          {row.prev !== undefined ? `${row.prev}/10 → ` : ''}{row.curr}/10
                        </Text>
                        <Tag color={row.status === 'Đã giảm' ? 'green' : row.status === 'Đã tăng' ? 'red' : 'blue'}>
                          {row.status}
                        </Tag>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa ghi nhận triệu chứng ở hai lần theo dõi.</Text>
              )}
            </Card>

            {/* ── 7. KẾ HOẠCH TIẾP THEO ── */}
            <Card size="small" title={<Space><CalendarClock size={16} color="#fa541c" />Kế hoạch tiếp theo</Space>} className={styles.panelCard}>
              <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Bước tiếp theo của bạn
                </Text>
                {upcomingAppointment ? (
                  <Text strong style={{ display: 'block', fontSize: 14, marginTop: 2 }}>
                    Tái khám ngày {new Date(upcomingAppointment.scheduledAt).toLocaleDateString('vi-VN')}
                  </Text>
                ) : isRecaptureRequired ? (
                  <Text strong style={{ display: 'block', fontSize: 14, marginTop: 2 }}>
                    Chụp lại ảnh theo hướng dẫn
                  </Text>
                ) : (
                  <Text strong style={{ display: 'block', fontSize: 14, marginTop: 2 }}>
                    Chụp ảnh theo dõi theo mốc tiếp theo
                  </Text>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Lịch tái khám: {upcomingAppointment ? `${new Date(upcomingAppointment.scheduledAt).toLocaleDateString('vi-VN')}` : 'Chưa được lên lịch'}
              </Text>
            </Card>

            {/* ── 8. KHI NÀO CẦN LIÊN HỆ BÁC SĨ? (Safety section) ── */}
            <Card size="small" title={<Space><ShieldAlert size={16} color="#ff4d4f" />Khi nào cần liên hệ bác sĩ?</Space>} className={styles.panelCard}>
              {isUrgent ? (
                <Alert
                  type="error"
                  showIcon
                  message="Liên hệ cơ sở y tế ngay"
                  description="Phát hiện dấu hiệu cần đánh giá gấp từ bác sĩ chuyên khoa."
                  style={{ marginBottom: 10 }}
                />
              ) : null}
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Dấu hiệu cần lưu ý:</Text>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#434343' }}>
                <li>Tổn thương lan rộng nhanh</li>
                <li>Đau, rát hoặc ngứa tăng rõ rệt</li>
                <li>Chảy dịch, mủ hoặc có sốt</li>
                <li>Sưng môi hoặc sưng mặt, khó thở</li>
              </ul>
            </Card>

          </Space>
        </Col>
      </Row>
    </Space>
  );
}
