import { useEffect, useMemo, useState } from "react";
import {
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
  CheckCircle2,
  BellOff,
  Calendar,
  ClipboardList,
  FileSignature,
  HeartHandshake,
  Plug,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import Highcharts, {
  chart3dDefaults,
  HighchartsReact,
} from "../charts/highchartsSetup";
import { useAppState } from "../state/useAppState";
import { useStore } from "../state/useStore";
import { appointmentRepository, userRepository } from "../domain/repositories";
import {
  getHealthSummary,
  getOperationalKpis,
  type HealthSummary,
  type OperationalKpis,
} from "../api/clinical";
const { Title, Text } = Typography;
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
    icon: <ClipboardList />,
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
  const { role, currentPatient, currentUser } = useAppState();
  const appointments = useStore(appointmentRepository);
  const users = useStore(userRepository);
  const [health, setHealth] = useState<HealthSummary>();
  const [kpis, setKpis] = useState<OperationalKpis>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (role === "patient"
      ? getHealthSummary(currentPatient.id).then(setHealth)
      : getOperationalKpis().then(setKpis)
    ).finally(() => setLoading(false));
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

  if (loading) return <Spin />;
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
  const patientAppointments = appointments
    .filter((item) => item.patientId === currentPatient.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Title level={3}>Xin chào, {currentPatient.name}</Title>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Điểm sức khỏe"
              value={health?.score ?? "Chưa đánh giá"}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ảnh tiến triển"
              value={health?.dataAvailability.progressPhotos ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Mức rủi ro"
              value={health?.riskLevel ?? "not_assessed"}
            />
          </Card>
        </Col>
      </Row>
      <Card>
        <Text type="secondary">{health?.notice}</Text>
      </Card>
      <Card title="Lịch hẹn">
        <List
          dataSource={patientAppointments}
          locale={{ emptyText: <Empty description="Chưa có lịch hẹn" /> }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Calendar />}
                title={`${item.date} ${item.time}`}
                description={
                  users.find((user) => user.id === item.doctorId)?.name ??
                  item.doctorId
                }
              />
              <Tag>{item.status}</Tag>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
