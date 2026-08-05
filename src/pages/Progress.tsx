import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Space, Spin, Statistic, Tabs, Upload, Typography } from "antd";
import { UploadCloud } from "lucide-react";
import Highcharts, { HighchartsReact } from "../charts/highchartsSetup";
import { DermaTimeline } from "../components/medical-record/DermaTimeline";
import { useAppState } from "../state/useAppState";
import {
  getHealthHistory,
  getHealthSummary,
  createProgressPhoto,
  type HealthPoint,
  type HealthSummary,
} from "../api/clinical";
import { uploadFile } from "../api/uploads";
const { Title, Text } = Typography;
export default function Progress() {
  const { message } = App.useApp();
  const { currentPatient, currentUser } = useAppState();
  const [history, setHistory] = useState<HealthPoint[]>([]);
  const [summary, setSummary] = useState<HealthSummary>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const reload = () => {
    if (!currentPatient) return Promise.resolve();
    return Promise.all([
      getHealthHistory(currentPatient.id),
      getHealthSummary(currentPatient.id),
    ])
      .then(([points, result]) => {
        setHistory(points);
        setSummary(result);
      });
  };
  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id]);
  const submitPhoto = async (file: File) => {
    if (!currentPatient) return false;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "progress-photo");
      await createProgressPhoto(currentPatient.id, {
        fileId: uploaded.fileId,
        takenAt: new Date().toISOString(),
      });
      await reload();
      message.success("Đã lưu ảnh tiến triển.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không tải được ảnh.",
      );
    } finally {
      setUploading(false);
    }
    return false;
  };
  const scored = history.filter(
    (item): item is HealthPoint & { aiScore: number } => item.aiScore !== null,
  );
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: "line", height: 320 },
      xAxis: {
        categories: scored.map((item) =>
          new Date(item.takenAt).toLocaleDateString("vi-VN"),
        ),
      },
      yAxis: { min: 0, max: 100, title: { text: "Điểm" } },
      series: [
        {
          type: "line",
          name: "Điểm AI",
          data: scored.map((item) => item.aiScore),
        },
      ],
    }),
    [scored],
  );
  if (loading) return <Spin />;
  if (!currentPatient) return <Empty description="Chưa có hồ sơ bệnh nhân liên kết với tài khoản này" />;
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>Theo dõi tiến triển</Title>
        <Text type="secondary">
          So sánh ảnh theo thời gian, sàng lọc Top 3 tín hiệu và lưu lịch sử điều trị.
        </Text>
      </div>
      <Tabs
        defaultActiveKey="ai-comparison"
        items={[
          {
            key: "ai-comparison",
            label: "Tiến trình tổn thương",
            children: (
              <DermaTimeline
                patientId={currentPatient.id}
                patient={currentPatient}
                user={{
                  id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.role,
                  avatarUrl: currentUser.avatarUrl,
                }}
              />
            ),
          },
          {
            key: "history",
            label: "Lịch sử & ảnh đã lưu",
            children: (
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Card
                  extra={(
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        void submitPhoto(file);
                        return false;
                      }}
                      disabled={uploading}
                    >
                      <Button
                        type="primary"
                        icon={<UploadCloud size={16} />}
                        loading={uploading}
                      >
                        Tải ảnh tiến triển
                      </Button>
                    </Upload>
                  )}
                >
                  <Statistic
                    title="Ảnh tiến triển đã lưu"
                    value={summary?.dataAvailability.progressPhotos ?? 0}
                  />
                  <Text type="secondary">{summary?.notice}</Text>
                </Card>
                <Card title="Lịch sử điểm từ database">
                  {scored.length ? (
                    <HighchartsReact highcharts={Highcharts} options={options} />
                  ) : (
                    <Empty description="Chưa có ảnh được chấm điểm" />
                  )}
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
