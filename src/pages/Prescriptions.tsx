import { useCallback, useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { Pill } from "lucide-react";
import { useAppState } from "../state/useAppState";
import {
  getMedicationReminders,
  getReport,
  markReminderTaken,
  createMedicationReminder,
  type MedicationReminder,
} from "../api/clinical";
const { Title } = Typography;
interface Prescription {
  id: string;
  issuedAt: string;
  medications: unknown;
}
export default function Prescriptions() {
  const { message } = App.useApp();
  const { currentPatient } = useAppState();
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [times, setTimes] = useState("08:00");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const reload = useCallback(
    () =>
      Promise.all([
        getMedicationReminders(currentPatient.id),
        getReport<Prescription[]>(currentPatient.id, "medicine-history"),
      ]).then(([r, p]) => {
        setReminders(r);
        setPrescriptions(p);
      }),
    [currentPatient.id],
  );
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);
  const taken = async (id: string) => {
    try {
      await markReminderTaken(id);
      await reload();
      message.success("Đã lưu thời điểm dùng thuốc.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không cập nhật được.",
      );
    }
  };
  const create = async () => {
    try {
      const normalizedTimes = times
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (!medicationName.trim() || !startDate || !normalizedTimes.length) {
        throw new Error("Vui lòng nhập tên thuốc, ngày bắt đầu và giờ nhắc.");
      }
      await createMedicationReminder(currentPatient.id, {
        medicationName: medicationName.trim(),
        schedule: {
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Asia/Ho_Chi_Minh",
          startDate,
          ...(endDate ? { endDate } : {}),
          times: normalizedTimes,
          daysOfWeek: weekdays,
        },
      });
      await reload();
      setCreateOpen(false);
      setMedicationName("");
      message.success("Đã tạo nhắc thuốc.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không tạo được nhắc thuốc.",
      );
    }
  };
  if (loading) return <Spin />;
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>Đơn thuốc</Title>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Tạo nhắc thuốc
        </Button>
      </Space>
      <Card title="Nhắc thuốc">
        <List
          dataSource={reminders}
          locale={{ emptyText: <Empty description="Chưa có nhắc thuốc" /> }}
          renderItem={(item) => (
            <List.Item
              actions={[
                item.takenAt ? (
                  <Tag color="success">
                    Đã dùng {new Date(item.takenAt).toLocaleString("vi-VN")}
                  </Tag>
                ) : (
                  <Button onClick={() => void taken(item.id)}>
                    Đánh dấu đã dùng
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                avatar={<Pill />}
                title={item.medicationName}
                description={JSON.stringify(item.schedule)}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card title="Lịch sử đơn thuốc">
        <List
          dataSource={prescriptions}
          locale={{ emptyText: <Empty description="Chưa có đơn thuốc" /> }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={`Đơn ${item.id}`}
                description={`${new Date(item.issuedAt).toLocaleString("vi-VN")} — ${JSON.stringify(item.medications)}`}
              />
            </List.Item>
          )}
        />
      </Card>
      <Modal
        title="Tạo nhắc thuốc"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void create()}
        okText="Tạo nhắc"
        cancelText="Hủy"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input
            value={medicationName}
            onChange={(event) => setMedicationName(event.target.value)}
            placeholder="Tên thuốc"
          />
          <Space.Compact style={{ width: "100%" }}>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Ngày bắt đầu"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="Ngày kết thúc"
            />
          </Space.Compact>
          <Input
            value={times}
            onChange={(event) => setTimes(event.target.value)}
            placeholder="Giờ nhắc, cách nhau bằng dấu phẩy: 08:00, 20:00"
          />
          <Select
            mode="multiple"
            value={weekdays}
            onChange={setWeekdays}
            style={{ width: "100%" }}
            options={[
              { value: 1, label: "Thứ 2" },
              { value: 2, label: "Thứ 3" },
              { value: 3, label: "Thứ 4" },
              { value: 4, label: "Thứ 5" },
              { value: 5, label: "Thứ 6" },
              { value: 6, label: "Thứ 7" },
              { value: 7, label: "Chủ nhật" },
            ]}
          />
        </Space>
      </Modal>
    </Space>
  );
}
