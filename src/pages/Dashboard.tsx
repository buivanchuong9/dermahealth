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
  Clock,
  ConciergeBell,
  FileSignature,
  FileText,
  HeartHandshake,
  HelpCircle,
  ListChecks,
  Pill,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react";
import Highcharts, {
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

type KpiDef = {
  short: string;
  key: keyof OperationalKpis;
  label: string;
  icon: React.ReactNode;
  /** "warn": any value above zero is a problem and is highlighted in red. */
  severity: "info" | "warn";
};

const KPI_DEFS: KpiDef[] = [
  { key: "activeEncounters", short: "Đang khám", label: "Lượt khám đang hoạt động", icon: <Activity size={18} />, severity: "info" },
  { key: "awaitingDoctorReview", short: "Chờ bác sĩ", label: "Chờ bác sĩ xem xét", icon: <Stethoscope size={18} />, severity: "info" },
  { key: "emergencyEncounters", short: "Khẩn cấp", label: "Cảnh báo khẩn cấp", icon: <TriangleAlert size={18} />, severity: "warn" },
  { key: "overdueSlaTasks", short: "Quá hạn SLA", label: "Tác vụ quá hạn SLA", icon: <Clock size={18} />, severity: "warn" },
  { key: "recordsAwaitingSignature", short: "Chờ ký", label: "Hồ sơ chờ ký", icon: <FileSignature size={18} />, severity: "info" },
  { key: "openCrmAlerts", short: "CRM mở", label: "Cảnh báo CRM đang mở", icon: <HeartHandshake size={18} />, severity: "warn" },
  { key: "failedNotifications", short: "Gửi lỗi", label: "Thông báo gửi thất bại", icon: <BellOff size={18} />, severity: "warn" },
  { key: "unhealthyIntegrations", short: "Tích hợp lỗi", label: "Tích hợp gặp sự cố", icon: <Plug size={18} />, severity: "warn" },
];

/** Signals where any non-zero value means something needs attention. */
const INFO_BLUES = ["#1e5e9e", "#2878c8", "#5da9ea", "#8cc4f0"];

const ISSUE_KEYS: Array<keyof OperationalKpis> = KPI_DEFS.filter(
  (item) => item.severity === "warn",
).map((item) => item.key);

const QUICK_ACTIONS: Array<{
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}> = [
  { path: "/app/work-queue", label: "Hàng đợi công việc", icon: <ListChecks size={22} />, roles: ["doctor", "nurse", "receptionist", "lab_technician", "imaging_technician", "pharmacist", "care_coordinator", "medical_administrator", "super_administrator"] },
  { path: "/app/reception", label: "Trung tâm lễ tân", icon: <ConciergeBell size={22} />, roles: ["receptionist", "medical_administrator", "super_administrator"] },
  { path: "/app/doctor-review", label: "Xem xét & chẩn đoán", icon: <Stethoscope size={22} />, roles: ["doctor"] },
  { path: "/app/appointments", label: "Lịch hẹn", icon: <Calendar size={22} />, roles: ["receptionist", "super_administrator"] },
  { path: "/app/care", label: "Chăm sóc sau khám", icon: <HeartHandshake size={22} />, roles: ["care_coordinator", "customer_care_employee", "medical_administrator", "super_administrator"] },
  { path: "/app/integrations", label: "Tình trạng tích hợp", icon: <Plug size={22} />, roles: ["medical_administrator", "system_administrator", "super_administrator"] },
  { path: "/app/audit", label: "Nhật ký kiểm toán", icon: <ShieldCheck size={22} />, roles: ["medical_administrator", "system_administrator", "super_administrator"] },
  { path: "/app/staff", label: "Quản lý nhân sự", icon: <Users size={22} />, roles: ["medical_administrator", "super_administrator"] },
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
  const [refreshing, setRefreshing] = useState(false);

  const refreshKpis = () => {
    setRefreshing(true);
    getOperationalKpis()
      .then(setKpis)
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (role === "patient" && currentPatient) {
      Promise.all([
        getHealthSummary(currentPatient.id).then(setHealth),
        getHealthHistory(currentPatient.id).then(setHealthHistory).catch(() => []),
        getMedicationReminders(currentPatient.id).then(setMedications).catch(() => []),
      ]).finally(() => setLoading(false));
    } else {
      getOperationalKpis().then(setKpis).finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id, role]);

  const issueCount = ISSUE_KEYS.filter((key) => (kpis?.[key] ?? 0) > 0).length;

  const kpiRows = KPI_DEFS.map((item, index) => {
    const value = kpis?.[item.key] ?? 0;
    const warn = item.severity === "warn" && value > 0;
    return {
      name: item.short,
      y: value,
      // Blues for routine workload, red for live problems, grey for clean signals.
      color: warn ? "#c83e4d" : item.severity === "warn" ? "#b8c4d2" : INFO_BLUES[index % INFO_BLUES.length],
    };
  });

  // 3D columns on a soft "floor": tinted back/bottom panels give the bars a
  // stage so a mostly-empty chart still reads as a finished graphic. Zero
  // values keep a small stub (minPointLength) so every category stays visible.
  const workloadOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "column",
        height: 330,
        spacing: [18, 14, 6, 6],
        options3d: {
          enabled: true,
          alpha: 12,
          beta: 14,
          depth: 70,
          viewDistance: 26,
          frame: {
            bottom: { size: 6, color: "#e9eff6" },
            back: { size: 1, color: "#f6f9fc" },
            side: { size: 1, color: "#f6f9fc" },
          },
        },
      },
      xAxis: {
        categories: kpiRows.map((row) => row.name),
        labels: { rotation: 0, style: { color: "#475467", fontSize: "11px", fontWeight: "500" } },
        lineWidth: 0,
        tickLength: 0,
      },
      yAxis: {
        min: 0,
        allowDecimals: false,
        gridLineColor: "#e3eaf2",
        gridLineDashStyle: "ShortDash",
        labels: { style: { color: "#98a2b3", fontSize: "11px" } },
      },
      legend: { enabled: false },
      tooltip: {
        headerFormat: "<b>{point.key}</b><br/>",
        pointFormat: "{point.y} mục",
      },
      plotOptions: {
        column: {
          depth: 34,
          groupZPadding: 12,
          pointPadding: 0.06,
          groupPadding: 0.08,
          minPointLength: 5,
          borderWidth: 0,
          edgeWidth: 0,
          colorByPoint: true,
          dataLabels: {
            enabled: true,
            // Keep zeros quiet: only label bars that carry a value.
            formatter() {
              return this.y ? String(this.y) : "";
            },
            style: { color: "#1d2939", fontSize: "13px", fontWeight: "700", textOutline: "none" },
          },
        },
      },
      series: [{ type: "column", name: "Số lượng", data: kpiRows }],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis],
  );

  // 3D donut with the total in the hole, so the centre is not left empty.
  const donutTotal = kpiRows.reduce((sum, row) => sum + row.y, 0);
  const donutData = kpiRows.filter((row) => row.y > 0);
  const donutOptions = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: "pie",
        height: 330,
        spacing: [0, 8, 0, 8],
        options3d: { enabled: true, alpha: 52, beta: 0, depth: 30, viewDistance: 40 },
        events: {
          render() {
            const chart = this as Highcharts.Chart & { centerLabel?: Highcharts.SVGElement };
            chart.centerLabel?.destroy();
            const cx = chart.plotLeft + chart.plotWidth / 2;
            const cy = chart.plotTop + chart.plotHeight / 2;
            chart.centerLabel = chart.renderer
              .text(
                `<span style="font-size:30px;font-weight:700;color:#172033">${donutTotal}</span><br/><span style="font-size:11px;color:#8792a2">tổng mục</span>`,
                cx,
                cy + 6,
                true,
              )
              .attr({ align: "center", zIndex: 6 })
              .css({ textAlign: "center" })
              .add();
            const box = chart.centerLabel.getBBox();
            chart.centerLabel.translate(-box.width / 2, -box.height / 2 + 6);
          },
        },
      },
      tooltip: { pointFormat: "<b>{point.y}</b> mục ({point.percentage:.0f}%)" },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        itemStyle: { color: "#5f6b7a", fontSize: "12px", fontWeight: "500" },
      },
      plotOptions: {
        pie: {
          innerSize: "60%",
          depth: 28,
          borderWidth: 3,
          borderColor: "#ffffff",
          showInLegend: true,
          dataLabels: { enabled: false },
        },
      },
      series: [{ type: "pie", name: "Cơ cấu", data: donutData }],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis],
  );

  // Solid gauge: share of signal groups that are currently clean.
  const gaugeOptions = useMemo<Highcharts.Options>(() => {
    const score = Math.round(((ISSUE_KEYS.length - issueCount) / ISSUE_KEYS.length) * 100);
    const color = score >= 80 ? "#238a57" : score >= 50 ? "#b7791f" : "#c83e4d";
    return {
      chart: { type: "solidgauge", height: 250, spacing: [0, 0, 0, 0] },
      pane: {
        center: ["50%", "72%"],
        size: "125%",
        startAngle: -90,
        endAngle: 90,
        background: [
          {
            backgroundColor: "#eef2f6",
            innerRadius: "70%",
            outerRadius: "100%",
            shape: "arc",
            borderWidth: 0,
          },
        ],
      },
      yAxis: {
        min: 0,
        max: 100,
        lineWidth: 0,
        tickPositions: [],
        minorTickInterval: undefined,
      },
      tooltip: { enabled: false },
      plotOptions: {
        solidgauge: {
          rounded: true,
          innerRadius: "70%",
          dataLabels: {
            useHTML: true,
            borderWidth: 0,
            y: -28,
            format: `<div style="text-align:center"><span style="font-size:38px;font-weight:700;color:${color}">{y}%</span><br/><span style="font-size:12px;color:#8792a2">Mức ổn định</span></div>`,
          },
        },
      },
      series: [{ type: "solidgauge", name: "Ổn định", data: [{ y: score, color }] }],
    };
  }, [issueCount]);

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

  if (role !== "patient") {
    const today = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const totalOpen = kpis
      ? KPI_DEFS.reduce((sum, item) => sum + (kpis[item.key] ?? 0), 0)
      : 0;
    const shortcuts = QUICK_ACTIONS.filter((item) => item.roles.includes(role));

    return (
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            padding: "20px 24px",
            borderRadius: 12,
            background: "var(--bg-surface, #fff)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--medical-blue-700)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <Text
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                textTransform: "capitalize",
              }}
            >
              {today}
            </Text>
            <Title level={4} style={{ margin: "2px 0 2px", color: "var(--text-primary)" }}>
              Tổng quan vận hành
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Xin chào {currentUser.name}.{" "}
              {issueCount
                ? `Có ${issueCount} nhóm tín hiệu cần chú ý.`
                : "Các chỉ số vận hành đang ổn định."}
            </Text>
          </div>
          <Space size={10} wrap>
            <Tag
              bordered={false}
              color={issueCount ? "error" : "success"}
              style={{ margin: 0, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}
            >
              {issueCount ? `${issueCount} cảnh báo` : "Hệ thống ổn định"}
            </Tag>
            <Button
              icon={<RefreshCw size={14} />}
              loading={refreshing}
              onClick={refreshKpis}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* KPI cards */}
        <Row gutter={[16, 16]}>
          {KPI_DEFS.map((item) => {
            const value = kpis?.[item.key] ?? 0;
            const warn = item.severity === "warn" && value > 0;
            return (
              <Col xs={24} sm={12} xl={6} key={item.key}>
                <div
                  style={{
                    height: "100%",
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: "var(--bg-surface, #fff)",
                    border: "1px solid var(--border-default)",
                    borderTop: `3px solid ${warn ? "var(--danger)" : "var(--medical-blue-600)"}`,
                    boxShadow: "var(--shadow-card)",
                    transition: "box-shadow .18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-card)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.label}
                    </Text>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        flexShrink: 0,
                        color: warn ? "var(--danger)" : "var(--medical-blue-700)",
                        background: warn ? "var(--danger-bg)" : "var(--medical-blue-100)",
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div
                    style={{
                      margin: "10px 0 6px",
                      fontSize: 32,
                      fontWeight: 650,
                      lineHeight: 1.1,
                      color: warn ? "var(--danger)" : "var(--text-primary)",
                    }}
                  >
                    {value}
                  </div>
                  <Text
                    style={{
                      fontSize: 12,
                      color: warn
                        ? "var(--danger)"
                        : value > 0
                          ? "var(--text-secondary)"
                          : "var(--success)",
                    }}
                  >
                    {warn
                      ? "Cần ưu tiên xử lý"
                      : value > 0
                        ? "Đang được theo dõi"
                        : "Không có tồn đọng"}
                  </Text>
                </div>
              </Col>
            );
          })}
        </Row>

        {/* Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card
              title="Khối lượng công việc"
              extra={
                <Tag bordered={false} color="blue" style={{ margin: 0, fontWeight: 600 }}>
                  Theo thời gian thực
                </Tag>
              }
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
              styles={{ body: { padding: "4px 12px 12px" } }}
            >
              {totalOpen > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={workloadOptions} />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Hiện không có công việc tồn đọng"
                  style={{ margin: "56px 0" }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card
              title="Cơ cấu tồn đọng"
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
              styles={{ body: { padding: "4px 12px 12px" } }}
            >
              {donutData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={donutOptions} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có mục tồn đọng" style={{ margin: "56px 0" }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Shortcuts + placeholders for APIs that do not exist yet */}
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              title="Chỉ số sức khỏe vận hành"
              extra={
                <Tag
                  bordered={false}
                  color={issueCount ? "error" : "success"}
                  style={{ margin: 0, fontWeight: 600 }}
                >
                  {issueCount ? `${issueCount} cảnh báo` : "Ổn định"}
                </Tag>
              }
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
              styles={{ body: { padding: "4px 12px 12px" } }}
            >
              <HighchartsReact highcharts={Highcharts} options={gaugeOptions} />
              <Text
                type="secondary"
                style={{ display: "block", textAlign: "center", fontSize: 12 }}
              >
                Tính từ {ISSUE_KEYS.length} nhóm tín hiệu của hệ thống
              </Text>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              title="Lối tắt nhanh"
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
            >
              {shortcuts.length ? (
                <Row gutter={[10, 10]}>
                  {shortcuts.map((item) => (
                    <Col span={12} key={item.path}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(item.path)}
                        onKeyDown={(e) => e.key === "Enter" && navigate(item.path)}
                        style={{
                          cursor: "pointer",
                          padding: "14px 12px",
                          borderRadius: 12,
                          textAlign: "center",
                          border: "1px solid var(--border-default)",
                          transition: "all .15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--medical-blue-400)";
                          e.currentTarget.style.background = "var(--medical-blue-50)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.background = "";
                        }}
                      >
                        <span style={{ color: "var(--medical-blue-700)" }}>{item.icon}</span>
                        <Text strong style={{ display: "block", marginTop: 6, fontSize: 13 }}>
                          {item.label}
                        </Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lối tắt cho vai trò này" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              title="Lượt khám theo ngày"
              extra={<Tag style={{ margin: 0 }}>Chờ API</Tag>}
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có API thống kê theo ngày. Sẽ hiển thị biểu đồ xu hướng khi backend cung cấp."
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              title="Lịch hẹn hôm nay"
              extra={<Tag style={{ margin: 0 }}>Chờ API</Tag>}
              style={{ height: "100%", borderRadius: 12, boxShadow: "var(--shadow-card)" }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có API tổng hợp lịch hẹn cho quản trị. Sẽ điền khi có dữ liệu."
              />
            </Card>
          </Col>
        </Row>
      </Space>
    );
  }

  // role === "patient" here always implies a resolved currentPatient — the
  // app-level provider blocks rendering otherwise — but this keeps the rest
  // of the patient dashboard type-safe against the null case.
  if (!currentPatient) return null;

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

  const patientAvatar = currentUser.avatarUrl;

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
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
                    type="default"
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
