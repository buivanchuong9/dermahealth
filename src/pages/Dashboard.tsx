import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  Activity,
  AlertCircle,
  BellOff,
  Calendar,
  CheckCircle2,
  FileSignature,
  FileText,
  HeartHandshake,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Pill,
  Plug,
  Plus,
  Stethoscope,
  TriangleAlert,
  Video,
} from "lucide-react";
import Highcharts, {
  chart3dDefaults,
  HighchartsReact,
} from "../charts/highchartsSetup";
import { useAppState } from "../state/useAppState";
import { useStore } from "../state/useStore";
import { appointmentRepository, userRepository } from "../domain/repositories";
import {
  getHealthHistory,
  getHealthSummary,
  getMedicationReminders,
  getOperationalKpis,
  type HealthPoint,
  type HealthSummary,
  type MedicationReminder,
  type OperationalKpis,
} from "../api/clinical";

const { Title, Text, Paragraph } = Typography;

const KPI_DEFS: Array<{
  key: keyof OperationalKpis;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "activeEncounters",
    label: "Lượt khám đang hoạt động",
    icon: <Activity />,
  },
  {
    key: "awaitingDoctorReview",
    label: "Chờ bác sĩ xem xét",
    icon: <Stethoscope />,
  },
  {
    key: "emergencyEncounters",
    label: "Cảnh báo khẩn cấp",
    icon: <TriangleAlert />,
  },
  {
    key: "overdueSlaTasks",
    label: "Tác vụ quá hạn SLA",
    icon: <Activity size={18} />,
  },
  {
    key: "recordsAwaitingSignature",
    label: "Hồ sơ chờ ký",
    icon: <FileSignature />,
  },
  {
    key: "openCrmAlerts",
    label: "Cảnh báo CRM đang mở",
    icon: <HeartHandshake />,
  },
  {
    key: "failedNotifications",
    label: "Thông báo gửi thất bại",
    icon: <BellOff />,
  },
  { key: "unhealthyIntegrations", label: "Tích hợp gặp sự cố", icon: <Plug /> },
];

const PRIMARY_KPI_KEYS: Array<keyof OperationalKpis> = [
  "activeEncounters",
  "awaitingDoctorReview",
  "emergencyEncounters",
  "overdueSlaTasks",
];

const SIGNAL_KPI_KEYS: Array<keyof OperationalKpis> = [
  "recordsAwaitingSignature",
  "openCrmAlerts",
  "failedNotifications",
  "unhealthyIntegrations",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, currentPatient, currentUser } = useAppState();
  const appointments = useStore(appointmentRepository);
  const users = useStore(userRepository);
  const [health, setHealth] = useState<HealthSummary>();
  const [healthHistory, setHealthHistory] = useState<HealthPoint[]>([]);
  const [medications, setMedications] = useState<MedicationReminder[]>([]);
  const [kpis, setKpis] = useState<OperationalKpis>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "patient") {
      Promise.all([
        getHealthSummary(currentPatient.id).then(setHealth),
        getHealthHistory(currentPatient.id).then(setHealthHistory).catch(() => []),
        getMedicationReminders(currentPatient.id).then(setMedications).catch(() => []),
      ]).finally(() => setLoading(false));
    } else {
      getOperationalKpis().then(setKpis).finally(() => setLoading(false));
    }
  }, [currentPatient.id, role]);

  const workloadOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        height: 290,
        ...chart3dDefaults,
        spacing: [16, 12, 4, 8],
      },
      xAxis: {
        categories: ["Đang khám", "Chờ bác sĩ", "Chờ ký", "Quá hạn SLA"],
        labels: { rotation: 0 },
      },
      yAxis: {
        min: 0,
        allowDecimals: false,
        gridLineDashStyle: "Dash",
      },
      legend: { enabled: false },
      tooltip: {
        pointFormat: "<b>{point.y} hồ sơ/tác vụ</b>",
      },
      plotOptions: {
        column: {
          depth: 34,
          borderWidth: 0,
          borderRadius: 3,
          colorByPoint: true,
          dataLabels: {
            enabled: true,
            style: {
              color: "#5f6b7a",
              fontSize: "11px",
              fontWeight: "600",
              textOutline: "none",
            },
          },
        },
      },
      colors: ["#2878c8", "#5da9ea", "#b7791f", "#c83e4d"],
      series: [
        {
          type: "column",
          name: "Khối lượng",
          data: [
            kpis?.activeEncounters ?? 0,
            kpis?.awaitingDoctorReview ?? 0,
            kpis?.recordsAwaitingSignature ?? 0,
            kpis?.overdueSlaTasks ?? 0,
          ],
        },
      ],
    }),
    [kpis],
  );

  const issueSignalCount = SIGNAL_KPI_KEYS.filter(
    (key) => (kpis?.[key] ?? 0) > 0,
  ).length;

  const systemHealthOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "pie",
        height: 290,
        ...chart3dDefaults,
        options3d: {
          ...chart3dDefaults.options3d,
          alpha: 34,
          beta: 0,
          depth: 36,
        },
        spacing: [8, 8, 8, 8],
      },
      tooltip: {
        pointFormat: "<b>{point.y} nhóm tín hiệu</b>",
      },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
      },
      plotOptions: {
        pie: {
          innerSize: "58%",
          depth: 30,
          borderWidth: 0,
          showInLegend: true,
          dataLabels: {
            enabled: true,
            distance: 10,
            format: "{point.y}",
            style: {
              color: "#5f6b7a",
              fontSize: "11px",
              textOutline: "none",
            },
          },
        },
      },
      series: [
        {
          type: "pie",
          name: "Tín hiệu",
          data: [
            {
              name: "Ổn định",
              y: SIGNAL_KPI_KEYS.length - issueSignalCount,
              color: "#238a57",
            },
            {
              name: "Cần chú ý",
              y: issueSignalCount,
              color: "#c83e4d",
            },
          ],
        },
      ],
    }),
    [issueSignalCount],
  );

  // Highcharts options for Patient Health Progress Trend (ONLY render real points)
  const patientTrendOptions = useMemo<Highcharts.Options | null>(() => {
    if (!healthHistory || healthHistory.length === 0) return null;

    const dates = healthHistory.map((pt) =>
      new Date(pt.takenAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      })
    );

    const scores = healthHistory.map((pt) => pt.aiScore ?? 0);

    return {
      chart: {
        type: "spline",
        height: 220,
        backgroundColor: "transparent",
      },
      title: { text: undefined },
      xAxis: {
        categories: dates,
        lineColor: "#e2e8f0",
        labels: { style: { color: "#64748b", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: undefined },
        max: 100,
        min: 0,
        gridLineDashStyle: "Dash",
        gridLineColor: "#f1f5f9",
      },
      legend: { enabled: false },
      tooltip: {
        pointFormat: "Điểm sức khỏe: <b>{point.y}</b>",
      },
      series: [
        {
          type: "spline",
          name: "Điểm số da",
          color: "#0284c7",
          data: scores,
        },
      ],
    };
  }, [healthHistory]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;

  if (role !== "patient")
    return (
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Title level={3} style={{ marginBottom: 3 }}>
            Tổng quan vận hành
          </Title>
          <Text type="secondary">
            Xin chào {currentUser.name}, đây là tình hình hệ thống hôm nay.
          </Text>
        </div>

        <Row gutter={[14, 14]}>
          {KPI_DEFS.filter((item) =>
            PRIMARY_KPI_KEYS.includes(item.key),
          ).map((item, index) => {
            const value = kpis?.[item.key] ?? 0;
            const attention = index > 1 && value > 0;
            return (
              <Col xs={24} sm={12} lg={6} key={item.key}>
                <Card
                  styles={{ body: { padding: 18 } }}
                  style={{
                    height: "100%",
                    borderColor: attention
                      ? "rgba(200, 62, 77, 0.3)"
                      : "var(--border-default)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    <Space
                      align="center"
                      style={{
                        color: attention
                          ? "var(--danger)"
                          : "var(--medical-blue-700)",
                      }}
                    >
                      {item.icon}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.label}
                      </Text>
                    </Space>
                    <Statistic
                      value={value}
                      valueStyle={{
                        color: attention
                          ? "var(--danger)"
                          : "var(--text-primary)",
                        fontSize: 28,
                        fontWeight: 650,
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {attention
                        ? "Cần ưu tiên xử lý"
                        : value > 0
                          ? "Đang được hệ thống theo dõi"
                          : "Không có tồn đọng"}
                    </Text>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row gutter={[14, 14]}>
          <Col xs={24} xl={15}>
            <Card
              title="Khối lượng công việc"
              extra={
                <Tag
                  bordered={false}
                  color="blue"
                  style={{ margin: 0, fontWeight: 600 }}
                >
                  Theo thời gian thực
                </Tag>
              }
              style={{ height: "100%", boxShadow: "var(--shadow-card)" }}
              styles={{ body: { padding: "4px 12px 8px" } }}
            >
              <HighchartsReact
                highcharts={Highcharts}
                options={workloadOptions}
              />
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card
              title="Sức khỏe vận hành"
              extra={
                <Tag
                  bordered={false}
                  color={issueSignalCount ? "error" : "success"}
                  style={{ margin: 0, fontWeight: 600 }}
                >
                  {issueSignalCount ? "Cần chú ý" : "Ổn định"}
                </Tag>
              }
              style={{ height: "100%", boxShadow: "var(--shadow-card)" }}
              styles={{ body: { padding: "4px 12px 8px" } }}
            >
              <HighchartsReact
                highcharts={Highcharts}
                options={systemHealthOptions}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Tín hiệu cần xử lý"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Cập nhật tự động
            </Text>
          }
          styles={{ body: { padding: 0 } }}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Row>
            {KPI_DEFS.filter((item) =>
              SIGNAL_KPI_KEYS.includes(item.key),
            ).map((item, index) => {
              const value = kpis?.[item.key] ?? 0;
              return (
                <Col
                  xs={24}
                  md={12}
                  xl={6}
                  key={item.key}
                  style={{
                    padding: "16px 18px",
                    borderRight:
                      index < 3 ? "1px solid var(--border-default)" : undefined,
                  }}
                >
                  <Space align="start" size={12}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: "var(--radius-md)",
                        color: value ? "var(--danger)" : "var(--success)",
                        background: value
                          ? "var(--danger-bg)"
                          : "var(--success-bg)",
                      }}
                    >
                      {value ? item.icon : <CheckCircle2 size={18} />}
                    </span>
                    <div>
                      <Text strong style={{ display: "block" }}>
                        {value}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.label}
                      </Text>
                    </div>
                  </Space>
                </Col>
              );
            })}
          </Row>
        </Card>
      </Space>
    );

  // Patient Dashboard Data Prep
  const patientAppointments = appointments
    .filter((item) => item.patientId === currentPatient.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const formatRiskLevel = (rawRisk?: string) => {
    if (!rawRisk || rawRisk === "not_assessed") return "Chưa đánh giá";
    if (rawRisk.toLowerCase() === "low") return "Thấp";
    if (rawRisk.toLowerCase() === "medium") return "Trung bình";
    if (rawRisk.toLowerCase() === "high") return "Cao";
    return rawRisk;
  };

  const patientAvatar = currentUser?.avatarUrl || (currentUser?.id ? localStorage.getItem(`user_avatar_${currentUser.id}`) : null) || undefined;

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      {/* Clean Hospital Portal Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "18px 24px",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #eaecf0",
        }}
      >
        <Space align="center" size={14}>
          <Avatar
            size={48}
            src={patientAvatar}
            style={{ backgroundColor: "#0284c7", fontWeight: 600, fontSize: 18 }}
          >
            {!patientAvatar && currentPatient.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Space align="center" size={8}>
              <Title level={4} style={{ margin: 0, color: "#101828" }}>
                Xin chào, {currentPatient.name}
              </Title>
              {currentPatient.code && <Tag color="blue">{currentPatient.code}</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hồ sơ bệnh nhân & Tiến trình theo dõi sức khỏe da liễu
            </Text>
          </div>
        </Space>

        <Space size={10}>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/app/appointments")}
            style={{ borderRadius: 6 }}
          >
            Đặt lịch hẹn mới
          </Button>
        </Space>
      </div>

      {/* 4 Clean Clinical KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, borderColor: "#eaecf0" }} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Điểm sức khỏe</Text>}
              value={health?.score !== null && health?.score !== undefined ? health.score : "Chưa đánh giá"}
              valueStyle={{
                fontSize: health?.score !== null && health?.score !== undefined ? 26 : 20,
                fontWeight: 700,
                color: health?.score !== null && health?.score !== undefined ? "#0284c7" : "#475467",
              }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: "block" }}>
              {health?.dataAvailability.clinicalScoringModel ? "Mô hình AI lâm sàng" : "Chưa phê duyệt công thức"}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, borderColor: "#eaecf0" }} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Ảnh tiến triển</Text>}
              value={health?.dataAvailability.progressPhotos ?? 0}
              suffix={<span style={{ fontSize: 14, color: "#475467" }}>ảnh</span>}
              valueStyle={{ fontSize: 26, fontWeight: 700, color: "#101828" }}
            />
            <Text
              onClick={() => navigate("/app/progress")}
              style={{ fontSize: 12, color: "#0284c7", cursor: "pointer", marginTop: 8, display: "block" }}
            >
              Quản lý danh mục ảnh →
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, borderColor: "#eaecf0" }} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Mức rủi ro</Text>}
              value={formatRiskLevel(health?.riskLevel)}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#101828" }}
            />
            <Tag color={health?.riskLevel === "low" ? "success" : "default"} style={{ marginTop: 8 }}>
              Theo dõi định kỳ
            </Tag>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, borderColor: "#eaecf0" }} styles={{ body: { padding: 18 } }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Đơn thuốc & Nhắc nhở</Text>}
              value={medications.length}
              suffix={<span style={{ fontSize: 14, color: "#475467" }}>đơn</span>}
              valueStyle={{ fontSize: 26, fontWeight: 700, color: "#101828" }}
            />
            <Text
              onClick={() => navigate("/app/prescriptions")}
              style={{ fontSize: 12, color: "#0284c7", cursor: "pointer", marginTop: 8, display: "block" }}
            >
              Chi tiết đơn thuốc →
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Main Section: Trend Chart & Clinical Notice */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="Lịch sử điểm sức khỏe da"
            style={{ borderRadius: 10, borderColor: "#eaecf0", height: "100%" }}
          >
            {patientTrendOptions ? (
              <HighchartsReact highcharts={Highcharts} options={patientTrendOptions} />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có dữ liệu lịch sử điểm sức khỏe"
                style={{ margin: "30px 0" }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title="Thông báo & Ghi chú từ hệ thống"
            style={{ borderRadius: 10, borderColor: "#eaecf0", height: "100%" }}
          >
            {health?.notice ? (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: 14,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Space align="start" size={10}>
                  <AlertCircle size={18} style={{ color: "#0284c7", marginTop: 2 }} />
                  <Paragraph style={{ margin: 0, color: "#334155", fontSize: 13 }}>
                    {health.notice}
                  </Paragraph>
                </Space>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có thông báo mới"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Appointments List */}
      <Card
        title="Lịch hẹn sắp tới"
        extra={
          <Button type="link" onClick={() => navigate("/app/appointments")} style={{ padding: 0 }}>
            Xem tất cả ({patientAppointments.length})
          </Button>
        }
        style={{ borderRadius: 10, borderColor: "#eaecf0" }}
      >
        <List
          dataSource={patientAppointments}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có lịch hẹn nào"
              />
            ),
          }}
          renderItem={(item) => {
            const doctor = users.find((user) => user.id === item.doctorId);
            return (
              <List.Item
                actions={[
                  <Button
                    key="detail"
                    size="small"
                    type="outline"
                    icon={<Video size={14} />}
                    onClick={() => navigate(`/app/appointments/${item.id}`)}
                  >
                    Chi tiết
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar shape="square" icon={<Calendar />} style={{ backgroundColor: "#e0f2fe", color: "#0284c7" }} />
                  }
                  title={
                    <Space>
                      <Text strong>{`${item.date} ${item.time}`}</Text>
                      <Tag>{item.status}</Tag>
                    </Space>
                  }
                  description={doctor?.name ? `Bác sĩ: ${doctor.name}` : `Mã bác sĩ: ${item.doctorId}`}
                />
              </List.Item>
            );
          }}
        />
      </Card>

      {/* Quick Services */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => navigate("/app/prescriptions")}
            style={{ borderRadius: 10, borderColor: "#eaecf0", textAlign: "center" }}
            styles={{ body: { padding: "16px 12px" } }}
          >
            <Pill size={24} style={{ color: "#0284c7", marginBottom: 8 }} />
            <Text strong style={{ display: "block" }}>Đơn thuốc</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Tra cứu & nhắc dùng</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => navigate("/app/records")}
            style={{ borderRadius: 10, borderColor: "#eaecf0", textAlign: "center" }}
            styles={{ body: { padding: "16px 12px" } }}
          >
            <FileText size={24} style={{ color: "#16a34a", marginBottom: 8 }} />
            <Text strong style={{ display: "block" }}>Bệnh án trọn đời</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Lịch sử chẩn đoán</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => navigate("/app/care")}
            style={{ borderRadius: 10, borderColor: "#eaecf0", textAlign: "center" }}
            styles={{ body: { padding: "16px 12px" } }}
          >
            <HeartHandshake size={24} style={{ color: "#9333ea", marginBottom: 8 }} />
            <Text strong style={{ display: "block" }}>Chăm sóc sau khám</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Hướng dẫn theo dõi</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            hoverable
            onClick={() => navigate("/app/support")}
            style={{ borderRadius: 10, borderColor: "#eaecf0", textAlign: "center" }}
            styles={{ body: { padding: "16px 12px" } }}
          >
            <HelpCircle size={24} style={{ color: "#ea580c", marginBottom: 8 }} />
            <Text strong style={{ display: "block" }}>Hỗ trợ 24/7</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Giải đáp thắc mắc</Text>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
