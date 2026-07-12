import { Row, Col, Card, Statistic, Progress, Button, Tag, List, Avatar, Typography, Alert, Select, Empty } from 'antd';
import Highcharts, { HighchartsReact, chart3dDefaults } from '../charts/highchartsSetup';
import {
  Video, Calendar, Camera, TrendingUp, Brain, TriangleAlert, Plus, ArrowRight, Bell, Pill, FileText,
  Activity, Stethoscope, ClipboardList, FileSignature, HeartHandshake, BellOff, Plug,
} from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, medicalRecordRepository, workflowRepository, carePlanRepository, notificationRepository, integrationRepository } from '../domain/repositories';
import { ROLE_LABEL, ENCOUNTER_STATUS_LABEL } from '../domain/core/enums';

const { Title, Text, Paragraph } = Typography;

const WEEKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
const SCORES = [52, 58, 63, 61, 70, 74, 78, 85];

const recoveryChartOptions: Highcharts.Options = {
  chart: { type: 'column', height: 220, spacing: [8, 8, 8, 0], ...chart3dDefaults },
  xAxis: { categories: WEEKS },
  yAxis: { min: 30, max: 100, tickAmount: 4 },
  plotOptions: { column: { depth: 32 } },
  accessibility: { description: 'Biểu đồ cột 3D thể hiện chỉ số phục hồi da theo tuần điều trị, từ tuần 1 đến tuần 8.' },
  series: [{ type: 'column', name: 'Chỉ số phục hồi da', data: SCORES, color: '#1e5e9e' }],
  tooltip: { valueSuffix: ' điểm' },
};

const APPTS = [
  { id: 1, day: '15', month: '10', type: 'Da liễu', time: '09:00', doctor: 'Bs. Nguyễn Thị An' },
  { id: 2, day: '22', month: '10', type: 'Tái khám', time: '14:00', doctor: 'Bs. Trần Văn Nam' },
];

const RECORDS = [
  { id: 1, icon: Pill, title: 'Đơn thuốc Tretinoin 0.05%', date: '10/10/2023' },
  { id: 2, icon: FileText, title: 'Kết quả xét nghiệm máu', date: '28/09/2023' },
  { id: 3, icon: Camera, title: 'Ảnh phân tích da – Tuần 3', date: '05/10/2023' },
];

const QUICK = [
  { label: 'Đặt lịch hẹn', Icon: Calendar, href: '/app/appointments' },
  { label: 'Phân tích da AI', Icon: Camera, href: '/app/ai-analysis' },
  { label: 'Hành trình điều trị', Icon: TrendingUp, href: '/app/records' },
  { label: 'Nhắc nhở uống thuốc', Icon: Bell, href: '/app/profile' },
];

function greetingForHour(h: number): string {
  return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

function isTaskOverdue(t: { status: string; createdAt: string; slaMinutes: number }): boolean {
  if (t.status === 'completed' || t.status === 'skipped' || t.status === 'cancelled') return false;
  const created = new Date(t.createdAt.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).getTime();
  return !Number.isNaN(created) && Date.now() - created > t.slaMinutes * 60_000;
}

function OperationalDashboard() {
  const { currentUser, role } = useAppState();
  const encounters = useStore(encounterRepository);
  const records = useStore(medicalRecordRepository.records());
  const tasks = useStore(workflowRepository.tasks());
  const alerts = useStore(carePlanRepository.alerts());
  const notifications = useStore(notificationRepository);
  const connections = useStore(integrationRepository.connections());

  const activeEncounters = encounters.filter((e) => e.status !== 'closed' && e.status !== 'follow_up_linked');
  const awaitingDoctorReview = encounters.filter((e) => e.status === 'under_doctor_review' || e.status === 'ai_assessed');
  const emergencyEncounters = encounters.filter((e) => e.status === 'escalated');
  const overdueTasks = tasks.filter(isTaskOverdue);
  const recordsAwaitingSignature = records.filter((r) => r.status === 'awaiting_signature' || r.status === 'in_review' || r.status === 'addendum_required');
  const activeEscalations = alerts.filter((a) => a.status !== 'resolved');
  const failedNotifications = notifications.filter((n) => n.status === 'failed');
  const failedIntegrations = connections.filter((c) => c.status !== 'healthy');

  const WIDGETS = [
    { label: 'Lượt khám đang hoạt động', val: activeEncounters.length, icon: <Activity size={18} />, href: '/app/journey' },
    { label: 'Chờ bác sĩ xem xét', val: awaitingDoctorReview.length, icon: <Stethoscope size={18} />, href: '/app/doctor-review' },
    { label: 'Cảnh báo khẩn cấp', val: emergencyEncounters.length, icon: <TriangleAlert size={18} />, href: '/app/journey', danger: emergencyEncounters.length > 0 },
    { label: 'Tác vụ quá hạn SLA', val: overdueTasks.length, icon: <ClipboardList size={18} />, href: '/app/work-queue', warn: overdueTasks.length > 0 },
    { label: 'Hồ sơ chờ ký', val: recordsAwaitingSignature.length, icon: <FileSignature size={18} />, href: '/app/records' },
    { label: 'Cảnh báo CRM đang mở', val: activeEscalations.length, icon: <HeartHandshake size={18} />, href: '/app/care' },
    { label: 'Thông báo gửi thất bại', val: failedNotifications.length, icon: <BellOff size={18} />, href: '/app/audit', warn: failedNotifications.length > 0 },
    { label: 'Tích hợp gặp sự cố', val: failedIntegrations.length, icon: <Plug size={18} />, href: '/app/integrations', warn: failedIntegrations.length > 0 },
  ];

  return (
    <div className="dashboard-page operational-dashboard">
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Tổng quan vận hành</Text>
        <Title level={3} style={{ margin: '4px 0 0' }}>Xin chào, {currentUser.name}</Title>
        <Text type="secondary">{ROLE_LABEL[role]} — theo dõi tình trạng vận hành toàn hệ thống.</Text>
      </div>

      <Row gutter={[12, 12]}>
        {WIDGETS.map((w) => (
          <Col xs={24} sm={12} md={6} key={w.label}>
            <a href={w.href} style={{ color: 'inherit' }}>
              <Card size="small" hoverable>
                <Statistic
                  title={w.label}
                  value={w.val}
                  prefix={w.icon}
                  valueStyle={{ color: w.danger ? 'var(--danger)' : w.warn ? 'var(--warning)' : 'var(--text-primary)', fontSize: 26 }}
                />
              </Card>
            </a>
          </Col>
        ))}
      </Row>

      {emergencyEncounters.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<TriangleAlert size={16} />}
          message="Lượt khám khẩn cấp cần xử lý ngay"
          description={
            <List
              size="small"
              dataSource={emergencyEncounters}
              renderItem={(e) => (
                <List.Item>
                  <Text strong>{e.id}</Text>&nbsp;— {e.department} — {e.blockingCondition ?? ENCOUNTER_STATUS_LABEL[e.status]}
                </List.Item>
              )}
            />
          }
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { role, currentPatient } = useAppState();
  const greet = greetingForHour(new Date().getHours());

  if (role !== 'patient') return <OperationalDashboard />;

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Tổng quan hôm nay</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>{greet}, {currentPatient.name}</Title>
          <Text type="secondary">Sức khỏe da của bạn đang được cải thiện. Tiếp tục theo dõi nhé.</Text>
        </div>
        <Button type="primary" icon={<Video size={16} />} href="/app/appointments">Khám trực tuyến</Button>
      </div>

      <Alert
        type="warning"
        showIcon
        icon={<TriangleAlert size={16} />}
        message={<span><strong>Nhắc nhở:</strong> Bạn chưa bôi kem Tretinoin tối nay. Hãy thực hiện trước 22:00.</span>}
        action={<Button size="small">Đánh dấu xong</Button>}
      />

      <Row gutter={[16, 16]} className="dashboard-page__quick-actions">
        {QUICK.map(({ label, Icon, href }) => (
          <Col xs={24} sm={12} md={6} key={label}>
            <a href={href}>
              <Card size="small" hoverable>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--medical-blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="var(--medical-blue-700)" />
                  </div>
                  <Text strong style={{ fontSize: 13, flex: 1 }}>{label}</Text>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              </Card>
            </a>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} className="dashboard-page__content-grid">
        <Col xs={24} lg={15}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card
              title="Chỉ số sức khỏe da AI"
              extra={<Tag color="success">Cải thiện 15%</Tag>}
              size="small"
            >
              <Row gutter={16}>
                {[
                  { label: 'Điểm tổng quát', value: 85, color: 'var(--medical-blue-700)' },
                  { label: 'Hồi phục', value: 72, color: 'var(--medical-blue-500)' },
                  { label: 'Độ ẩm da', value: 68, color: 'var(--success)' },
                ].map((s) => (
                  <Col xs={24} sm={12} md={8} key={s.label} style={{ textAlign: 'center' }}>
                    <Progress type="dashboard" percent={s.value} strokeColor={s.color} size={90} />
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card
              title="Tiến trình phục hồi da"
              extra={<Select size="small" defaultValue="8w" options={[{ value: '8w', label: '8 tuần qua' }, { value: '3m', label: '3 tháng qua' }]} style={{ width: 130 }} />}
              size="small"
            >
              {SCORES.length > 0
                ? <HighchartsReact highcharts={Highcharts} options={recoveryChartOptions} />
                : <Empty description="Chưa có dữ liệu theo dõi" />}
            </Card>

            <Card title="Chi tiết tình trạng da" size="small">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Mụn viêm', value: 35, color: 'var(--danger)', tag: 'Giảm 48%' },
                  { label: 'Vết thâm', value: 55, color: 'var(--warning)', tag: 'Giảm 22%' },
                  { label: 'Độ ẩm da', value: 68, color: 'var(--success)', tag: 'Tốt' },
                  { label: 'Nguy cơ tái phát', value: 20, color: 'var(--info)', tag: 'Thấp' },
                ].map((m) => (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>{m.label}</Text>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Tag color="success">{m.tag}</Tag>
                        <Text strong style={{ color: m.color }}>{m.value}%</Text>
                      </div>
                    </div>
                    <Progress percent={m.value} strokeColor={m.color} showInfo={false} size="small" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} lg={9}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Lịch hẹn sắp tới" extra={<a href="/app/appointments">Xem tất cả</a>} size="small">
              <List
                dataSource={APPTS}
                renderItem={(a) => (
                  <List.Item>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--medical-blue-700)', color: 'white', borderRadius: 8, padding: '6px 10px', minWidth: 44 }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{a.day}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>Th {a.month}</Text>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>Khám {a.type}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{a.time} — {a.doctor}</Text>
                      </div>
                      <Tag color="blue">Video</Tag>
                    </div>
                  </List.Item>
                )}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <Button type="primary" block icon={<Video size={15} />}>Tham gia cuộc gọi</Button>
                <Button block icon={<Plus size={15} />} href="/app/appointments">Đặt lịch mới</Button>
              </div>
            </Card>

            <Card title="Hồ sơ & Đơn thuốc" extra={<a href="/app/records">Tất cả</a>} size="small">
              <List
                dataSource={RECORDS}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<r.icon size={16} />} style={{ background: 'var(--medical-blue-100)', color: 'var(--medical-blue-700)' }} />}
                      title={<Text style={{ fontSize: 13 }}>{r.title}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{r.date}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card size="small" style={{ background: 'var(--medical-blue-800)', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Brain size={17} color="white" />
                <Text style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>AI Insights</Text>
              </div>
              <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 12 }}>
                Dựa trên tiến trình 8 tuần, da của bạn đang phục hồi tốt. Tiếp tục sử dụng kem Tretinoin và dùng kem chống nắng SPF 50 hàng ngày để đạt kết quả tối ưu.
              </Paragraph>
              <Button ghost size="small" icon={<ArrowRight size={13} />} iconPosition="end">Xem báo cáo đầy đủ</Button>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
