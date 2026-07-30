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
import { CalendarDays, Clock3, Pill } from "lucide-react";
import { useAppState } from "../state/useAppState";
import {
  getMedicationReminders,
  getReport,
  markReminderTaken,
  createMedicationReminder,
  type MedicationReminder,
} from "../api/clinical";
const { Title, Text } = Typography;
interface Prescription {
  id: string;
  issuedAt: string;
  medications: unknown;
}

const WEEKDAY_LABEL: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

function ReminderSchedule({ value }: { value: unknown }) {
  const schedule = asObject(value);
  const times = Array.isArray(schedule.times)
    ? schedule.times.filter((item): item is string => typeof item === "string")
    : [];
  const days = Array.isArray(schedule.daysOfWeek)
    ? schedule.daysOfWeek.filter((item): item is number => typeof item === "number")
    : [];
  const everyDay = days.length === 0 || days.length === 7;
  const startDate = asText(schedule.startDate);
  const endDate = asText(schedule.endDate);

  return (
    <Space direction="vertical" size={6}>
      <Space size={[6, 6]} wrap>
        <Clock3 size={14} />
        {times.length ? (
          times.map((time) => (
            <Tag color="blue" key={time}>
              {time}
            </Tag>
          ))
        ) : (
          <Text type="secondary">Chưa đặt giờ nhắc</Text>
        )}
        <Text type="secondary">· {everyDay ? "Hằng ngày" : days.map((day) => WEEKDAY_LABEL[day] ?? day).join(", ")}</Text>
      </Space>
      <Space size={6} wrap>
        <CalendarDays size={14} />
        <Text type="secondary">
          {startDate
            ? `Từ ${new Date(`${startDate}T00:00:00`).toLocaleDateString("vi-VN")}`
            : "Chưa có ngày bắt đầu"}
          {endDate
            ? ` đến ${new Date(`${endDate}T00:00:00`).toLocaleDateString("vi-VN")}`
            : " · Không giới hạn ngày kết thúc"}
        </Text>
      </Space>
    </Space>
  );
}

function MedicationList({ value }: { value: unknown }) {
  const rows = Array.isArray(value) ? value : [];
  if (!rows.length) return <Text type="secondary">Chưa có chi tiết thuốc</Text>;
  return (
    <Space direction="vertical" size={7} style={{ width: "100%" }}>
      {rows.map((raw, index) => {
        const medication = asObject(raw);
        const name =
          asText(medication.name) ??
          asText(medication.medicationName) ??
          asText(medication.display) ??
          `Thuốc ${index + 1}`;
        const details = [
          asText(medication.dosage),
          asText(medication.frequency),
          asText(medication.route),
          asText(medication.duration),
          asText(medication.instructions),
        ].filter(Boolean);
        return (
          <div key={asText(medication.id) ?? `${name}-${index}`}>
            <Text strong>{name}</Text>
            {details.length > 0 && (
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                {details.join(" · ")}
              </Text>
            )}
          </div>
        );
      })}
    </Space>
  );
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
  const reload = useCallback(() => {
    if (!currentPatient) return Promise.resolve();
    return Promise.all([
      getMedicationReminders(currentPatient.id),
      getReport<Prescription[]>(currentPatient.id, "medicine-history"),
    ]).then(([r, p]) => {
      setReminders(r);
      setPrescriptions(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id]);
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);
  if (loading) return <Spin />;
  if (!currentPatient) return <Empty description="Chưa có hồ sơ bệnh nhân liên kết với tài khoản này" />;
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
                avatar={
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: "var(--medical-blue-700)", background: "var(--medical-blue-50)" }}>
                    <Pill size={19} />
                  </span>
                }
                title={item.medicationName}
                description={<ReminderSchedule value={item.schedule} />}
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
                avatar={<Pill size={19} />}
                title={`Đơn thuốc ngày ${new Date(item.issuedAt).toLocaleDateString("vi-VN")}`}
                description={
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Text type="secondary">
                      Kê lúc {new Date(item.issuedAt).toLocaleString("vi-VN")}
                    </Text>
                    <MedicationList value={item.medications} />
                  </Space>
                }
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
