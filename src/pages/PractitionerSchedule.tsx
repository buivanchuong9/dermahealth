import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  List,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "../api/http";
import {
  createScheduleException,
  deleteScheduleException,
  getPractitionerSchedule,
  listPractitioners,
  replacePractitionerSchedule,
  type Practitioner,
  type PractitionerScheduleConfig,
  type ScheduleException,
  type ScheduleWindow,
  type WeeklyScheduleWindowInput,
} from "../api/clinical";

const { Title, Text } = Typography;

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const describeError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} (requestId: ${error.requestId})`
      : error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

interface DraftWindow extends WeeklyScheduleWindowInput {
  key: string;
}

const toDraft = (window: ScheduleWindow): DraftWindow => ({
  key: window.id,
  dayOfWeek: window.dayOfWeek,
  startMinute: window.startMinute,
  endMinute: window.endMinute,
  effectiveFrom: window.effectiveFrom,
  effectiveTo: window.effectiveTo ?? undefined,
});

export default function PractitionerSchedulePage() {
  const { message, modal } = App.useApp();

  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [practitionersLoading, setPractitionersLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string>();

  const [schedule, setSchedule] = useState<PractitionerScheduleConfig>();
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string>();

  const [draftWindows, setDraftWindows] = useState<DraftWindow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [windowForm] = Form.useForm();
  const [exceptionForm] = Form.useForm();
  const [creatingException, setCreatingException] = useState(false);
  const [deletingExceptionId, setDeletingExceptionId] = useState<string>();

  const doctor = useMemo(
    () => practitioners.find((item) => item.id === doctorId),
    [practitioners, doctorId],
  );

  useEffect(() => {
    let active = true;
    listPractitioners()
      .then((rows) => {
        if (active) setPractitioners(rows);
      })
      .catch((error) =>
        message.error(describeError(error, "Không tải được danh sách bác sĩ.")),
      )
      .finally(() => {
        if (active) setPractitionersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [message]);

  const loadSchedule = useCallback(async () => {
    if (!doctor?.clinicLocationId) return;
    setScheduleLoading(true);
    setScheduleError(undefined);
    try {
      const config = await getPractitionerSchedule(doctor.id, doctor.clinicLocationId);
      setSchedule(config);
      setDraftWindows(config.weeklySchedule.map(toDraft));
      setDirty(false);
    } catch (error) {
      setScheduleError(describeError(error, "Không tải được lịch làm việc."));
    } finally {
      setScheduleLoading(false);
    }
  }, [doctor]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSchedule(undefined);
      setDraftWindows([]);
      setDirty(false);
      setScheduleError(undefined);
      if (doctor?.clinicLocationId) void loadSchedule();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [doctor, loadSchedule]);

  const addWindow = async () => {
    const values = await windowForm.validateFields();
    const dayOfWeek = values.dayOfWeek as number;
    const [start, end] = values.range as [Dayjs, Dayjs];
    const startMinute = start.hour() * 60 + start.minute();
    const endMinute = end.hour() * 60 + end.minute();
    if (startMinute >= endMinute) {
      void message.error("Giờ bắt đầu phải trước giờ kết thúc.");
      return;
    }
    setDraftWindows((prev) => [
      ...prev,
      { key: `draft-${Date.now()}-${Math.random()}`, dayOfWeek, startMinute, endMinute },
    ]);
    setDirty(true);
    windowForm.resetFields(["range"]);
  };

  const removeWindow = (key: string) => {
    setDraftWindows((prev) => prev.filter((item) => item.key !== key));
    setDirty(true);
  };

  const saveSchedule = async () => {
    if (!doctor?.clinicLocationId) return;
    setSaving(true);
    try {
      const config = await replacePractitionerSchedule(
        doctor.id,
        doctor.clinicLocationId,
        draftWindows.map((window) => ({
          dayOfWeek: window.dayOfWeek,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
          effectiveFrom: window.effectiveFrom,
          effectiveTo: window.effectiveTo,
        })),
      );
      setSchedule(config);
      setDraftWindows(config.weeklySchedule.map(toDraft));
      setDirty(false);
      void message.success("Đã lưu lịch làm việc.");
    } catch (error) {
      void message.error(describeError(error, "Không lưu được lịch làm việc."));
    } finally {
      setSaving(false);
    }
  };

  const submitException = async () => {
    if (!doctor?.clinicLocationId) return;
    const values = await exceptionForm.validateFields();
    const [start, end] = values.range as [Dayjs, Dayjs];
    setCreatingException(true);
    try {
      await createScheduleException(doctor.id, doctor.clinicLocationId, {
        kind: values.kind,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        reason: values.reason || undefined,
      });
      exceptionForm.resetFields(["range", "reason"]);
      void message.success("Đã thêm ngoại lệ.");
      await loadSchedule();
    } catch (error) {
      void message.error(describeError(error, "Không thêm được ngoại lệ."));
    } finally {
      setCreatingException(false);
    }
  };

  const removeException = (exception: ScheduleException) => {
    if (!doctor?.clinicLocationId) return;
    const clinicLocationId = doctor.clinicLocationId;
    modal.confirm({
      title: "Xoá ngoại lệ này?",
      content: `${dayjs(exception.startsAt).format("DD/MM/YYYY HH:mm")} – ${dayjs(exception.endsAt).format("DD/MM/YYYY HH:mm")}`,
      okText: "Xoá",
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingExceptionId(exception.id);
        try {
          await deleteScheduleException(doctor.id, clinicLocationId, exception.id);
          void message.success("Đã xoá ngoại lệ.");
          await loadSchedule();
        } catch (error) {
          void message.error(describeError(error, "Không xoá được ngoại lệ."));
        } finally {
          setDeletingExceptionId(undefined);
        }
      },
    });
  };

  const windowsByDay = useMemo(() => {
    const map = new Map<number, DraftWindow[]>();
    for (const window of draftWindows) {
      const list = map.get(window.dayOfWeek) ?? [];
      list.push(window);
      map.set(window.dayOfWeek, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startMinute - b.startMinute);
    return map;
  }, [draftWindows]);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Lịch làm việc bác sĩ</Title>
      <Card style={{ marginBottom: 16 }}>
        <Select
          style={{ minWidth: 320 }}
          placeholder="Chọn bác sĩ"
          loading={practitionersLoading}
          value={doctorId}
          onChange={setDoctorId}
          options={practitioners.map((item) => ({
            value: item.id,
            label: `${item.name}${item.clinicName ? ` — ${item.clinicName}` : ""}`,
          }))}
        />
      </Card>

      {!doctor ? (
        <Alert type="info" showIcon message="Chọn một bác sĩ để xem/chỉnh lịch làm việc." />
      ) : !doctor.clinicLocationId ? (
        <Alert type="warning" showIcon message="Bác sĩ này chưa được gán cơ sở khám." />
      ) : scheduleLoading ? (
        <Spin />
      ) : scheduleError ? (
        <Alert type="error" showIcon message={scheduleError} />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card
            title="Giờ làm việc hàng tuần"
            extra={
              <Button
                type="primary"
                loading={saving}
                disabled={!dirty}
                onClick={() => void saveSchedule()}
              >
                Lưu thay đổi
              </Button>
            }
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {DAY_LABELS.map((label, dayOfWeek) => (
                <div key={dayOfWeek} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Text strong style={{ width: 90 }}>
                    {label}
                  </Text>
                  <Space wrap size={[8, 8]} style={{ flex: 1 }}>
                    {(windowsByDay.get(dayOfWeek) ?? []).map((window) => (
                      <Tag
                        key={window.key}
                        closable
                        onClose={(event) => {
                          event.preventDefault();
                          removeWindow(window.key);
                        }}
                      >
                        {minutesToTime(window.startMinute)} – {minutesToTime(window.endMinute)}
                      </Tag>
                    ))}
                    {!(windowsByDay.get(dayOfWeek) ?? []).length && (
                      <Text type="secondary">Nghỉ</Text>
                    )}
                  </Space>
                </div>
              ))}
            </Space>
            <Form form={windowForm} layout="inline" style={{ marginTop: 16 }}>
              <Form.Item
                name="dayOfWeek"
                rules={[{ required: true, message: "Chọn ngày" }]}
                initialValue={1}
              >
                <Select
                  style={{ width: 120 }}
                  options={DAY_LABELS.map((label, value) => ({ value, label }))}
                />
              </Form.Item>
              <Form.Item name="range" rules={[{ required: true, message: "Chọn giờ" }]}>
                <TimePicker.RangePicker format="HH:mm" minuteStep={5} />
              </Form.Item>
              <Form.Item>
                <Button icon={<Plus size={14} />} onClick={() => void addWindow()}>
                  Thêm khung giờ
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="Ngày nghỉ / mở thêm ngoài lịch">
            <List
              size="small"
              dataSource={schedule?.exceptions ?? []}
              locale={{ emptyText: "Chưa có ngoại lệ nào." }}
              renderItem={(exception) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<Trash2 size={14} />}
                      loading={deletingExceptionId === exception.id}
                      onClick={() => removeException(exception)}
                    />,
                  ]}
                >
                  <Space direction="vertical" size={0}>
                    <Text>
                      {exception.kind === "override" ? "Mở thêm" : "Nghỉ / khoá"}:{" "}
                      {dayjs(exception.startsAt).format("DD/MM/YYYY HH:mm")} –{" "}
                      {dayjs(exception.endsAt).format("DD/MM/YYYY HH:mm")}
                    </Text>
                    {exception.reason && <Text type="secondary">{exception.reason}</Text>}
                  </Space>
                </List.Item>
              )}
            />
            <Form
              form={exceptionForm}
              layout="inline"
              style={{ marginTop: 16 }}
              initialValues={{ kind: "unavailable" }}
            >
              <Form.Item name="kind" rules={[{ required: true }]}>
                <Radio.Group
                  optionType="button"
                  options={[
                    { value: "unavailable", label: "Nghỉ / khoá" },
                    { value: "override", label: "Mở thêm" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="range" rules={[{ required: true, message: "Chọn thời gian" }]}>
                <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
              <Form.Item name="reason">
                <Input placeholder="Lý do (tuỳ chọn)" style={{ width: 220 }} />
              </Form.Item>
              <Form.Item>
                <Button loading={creatingException} onClick={() => void submitException()}>
                  Thêm
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      )}
    </div>
  );
}
