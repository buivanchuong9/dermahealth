import { useEffect, useState } from "react";
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
  BellOff,
  Calendar,
  ClipboardList,
  FileSignature,
  HeartHandshake,
  Plug,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
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
  if (loading) return <Spin />;
  if (role !== "patient")
    return (
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <Title level={3}>Xin chào, {currentUser.name}</Title>
        <Row gutter={[12, 12]}>
          {KPI_DEFS.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <Card>
                <Statistic
                  title={item.label}
                  value={kpis?.[item.key] ?? 0}
                  prefix={item.icon}
                />
              </Card>
            </Col>
          ))}
        </Row>
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
