import { useEffect, useState } from "react";
import { App, Button, Card, Descriptions, Empty, List, Space, Spin, Typography } from "antd";
import { Download } from "lucide-react";
import { useAppState } from "../state/useAppState";
import { getReport, getReportExport } from "../api/clinical";
const { Title, Text } = Typography;
interface Overview {
  completedAppointments: number;
  closedEncounters: number;
}
interface RecordRow {
  id: string;
  status?: string;
  createdAt?: string;
  issuedAt?: string;
  medications?: unknown;
}
export default function Reports() {
  const { message } = App.useApp();
  const { currentPatient } = useAppState();
  const [overview, setOverview] = useState<Overview>();
  const [treatments, setTreatments] = useState<RecordRow[]>([]);
  const [medicines, setMedicines] = useState<RecordRow[]>([]);
  const [assessments, setAssessments] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(() => Boolean(currentPatient));
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    if (!currentPatient) return;
    Promise.all([
      getReport<Overview>(currentPatient.id, "overview"),
      getReport<RecordRow[]>(currentPatient.id, "treatment-history"),
      getReport<RecordRow[]>(currentPatient.id, "medicine-history"),
      getReport<{ assessments: RecordRow[] }>(currentPatient.id, "ai-summary"),
    ])
      .then(([o, t, m, a]) => {
        setOverview(o);
        setTreatments(t);
        setMedicines(m);
        setAssessments(a.assessments);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id]);
  if (loading) return <Spin />;
  if (!currentPatient) return <Empty description="Chưa có hồ sơ bệnh nhân liên kết với tài khoản này" />;
  const exportReport = async () => {
    setExporting(true);
    try {
      const result = await getReportExport(currentPatient.id);
      if (typeof result === "string" && /^(https?:|data:)/.test(result)) {
        window.open(result, "_blank", "noopener,noreferrer");
      } else {
        const blob = new Blob(
          [typeof result === "string" ? result : JSON.stringify(result, null, 2)],
          { type: "application/json;charset=utf-8" },
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `bao-cao-${currentPatient.id}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      message.success("Đã tạo tệp báo cáo.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không xuất được báo cáo.",
      );
    } finally {
      setExporting(false);
    }
  };
  const rows = (items: RecordRow[], empty: string) => (
    <List
      dataSource={items}
      locale={{ emptyText: <Empty description={empty} /> }}
      renderItem={(item) => (
        <List.Item>
          <Text strong>{item.id}</Text>
          <Text type="secondary">
            {item.status ?? item.issuedAt ?? item.createdAt ?? ""}
          </Text>
        </List.Item>
      )}
    />
  );
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>Báo cáo & thống kê</Title>
        <Button
          icon={<Download size={16} />}
          loading={exporting}
          onClick={() => void exportReport()}
        >
          Xuất báo cáo
        </Button>
      </Space>
      <Card>
        <Descriptions
          items={[
            {
              key: "appointments",
              label: "Lịch hẹn hoàn thành",
              children: overview?.completedAppointments ?? 0,
            },
            {
              key: "encounters",
              label: "Lượt khám đã đóng",
              children: overview?.closedEncounters ?? 0,
            },
          ]}
        />
      </Card>
      <Card title="Lịch sử điều trị">
        {rows(treatments, "Chưa có lượt điều trị")}
      </Card>
      <Card title="Lịch sử đơn thuốc">
        {rows(medicines, "Chưa có đơn thuốc")}
      </Card>
      <Card title="Đánh giá AI">
        {rows(assessments, "Chưa có đánh giá AI")}
      </Card>
    </Space>
  );
}
