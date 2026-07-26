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
  Modal,
  Select,
  Space,
  Spin,
  TimePicker,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ArrowRightLeft,
  MoonStar,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
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
import "./PractitionerSchedule.css";

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
  const [doctorSelectOpen, setDoctorSelectOpen] = useState(false);

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
  const [transferTarget, setTransferTarget] = useState<ScheduleException>();
  const [transferDoctorId, setTransferDoctorId] = useState<string>();
  const [transferring, setTransferring] = useState(false);

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
    const overlapsExistingWindow = draftWindows.some(
      (item) =>
        item.dayOfWeek === dayOfWeek &&
        startMinute < item.endMinute &&
        endMinute > item.startMinute,
    );
    if (overlapsExistingWindow) {
      void message.error("Ca làm mới bị trùng với khung giờ đã có trong ngày.");
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

  const submitDutyShift = async () => {
    if (!doctor?.clinicLocationId) return;
    const values = await exceptionForm.validateFields();
    const [start, end] = values.range as [Dayjs, Dayjs];
    if (!end.isAfter(start)) {
      void message.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    const overlapsDutyShift = (schedule?.exceptions ?? []).some(
      (item) =>
        item.kind === "override" &&
        start.isBefore(dayjs(item.endsAt)) &&
        end.isAfter(dayjs(item.startsAt)),
    );
    if (overlapsDutyShift) {
      void message.error("Ca trực này bị trùng với một ca trực đã có.");
      return;
    }
    setCreatingException(true);
    try {
      await createScheduleException(doctor.id, doctor.clinicLocationId, {
        kind: "override",
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        reason: values.reason?.trim() || "Ca trực",
      });
      exceptionForm.resetFields(["range", "reason"]);
      void message.success("Đã thêm ca trực.");
      await loadSchedule();
    } catch (error) {
      void message.error(describeError(error, "Không thêm được ca trực."));
    } finally {
      setCreatingException(false);
    }
  };

  const removeException = (exception: ScheduleException) => {
    if (!doctor?.clinicLocationId) return;
    const clinicLocationId = doctor.clinicLocationId;
    modal.confirm({
      title: "Xoá ca trực này?",
      content: `${dayjs(exception.startsAt).format("DD/MM/YYYY HH:mm")} – ${dayjs(exception.endsAt).format("DD/MM/YYYY HH:mm")}`,
      okText: "Xoá",
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingExceptionId(exception.id);
        try {
          await deleteScheduleException(doctor.id, clinicLocationId, exception.id);
          void message.success("Đã xoá ca trực.");
          await loadSchedule();
        } catch (error) {
          void message.error(describeError(error, "Không xoá được ca trực."));
        } finally {
          setDeletingExceptionId(undefined);
        }
      },
    });
  };

  const transferDutyShift = async () => {
    if (!doctor?.clinicLocationId || !transferTarget || !transferDoctorId) return;
    const receivingDoctor = practitioners.find((item) => item.id === transferDoctorId);
    if (!receivingDoctor?.clinicLocationId) {
      void message.error("Bác sĩ nhận ca chưa được gán cơ sở khám.");
      return;
    }

    setTransferring(true);
    let createdShift: ScheduleException | undefined;
    try {
      createdShift = await createScheduleException(
        receivingDoctor.id,
        receivingDoctor.clinicLocationId,
        {
          kind: "override",
          startsAt: transferTarget.startsAt,
          endsAt: transferTarget.endsAt,
          reason: transferTarget.reason || "Ca trực được chuyển",
        },
      );
      try {
        await deleteScheduleException(
          doctor.id,
          doctor.clinicLocationId,
          transferTarget.id,
        );
      } catch (deleteError) {
        try {
          await deleteScheduleException(
            receivingDoctor.id,
            receivingDoctor.clinicLocationId,
            createdShift.id,
          );
        } catch {
          throw new Error(
            "Không hoàn tất đổi ca và không thể tự hoàn tác. Vui lòng kiểm tra lịch của cả hai bác sĩ.",
          );
        }
        throw deleteError;
      }

      void message.success(`Đã chuyển ca trực cho ${receivingDoctor.name}.`);
      setTransferTarget(undefined);
      setTransferDoctorId(undefined);
      await loadSchedule();
    } catch (error) {
      void message.error(describeError(error, "Không đổi được người trực."));
    } finally {
      setTransferring(false);
    }
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

  const scheduleSummary = useMemo(() => {
    const totalMinutes = draftWindows.reduce(
      (total, item) => total + item.endMinute - item.startMinute,
      0,
    );
    return {
      activeDays: windowsByDay.size,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      shifts: draftWindows.length,
    };
  }, [draftWindows, windowsByDay]);

  const dutyShifts = useMemo(
    () => {
      const now = dayjs();
      return (schedule?.exceptions ?? [])
        .filter((item) => item.kind === "override")
        .sort((a, b) => {
          const aPast = dayjs(a.endsAt).isBefore(now);
          const bPast = dayjs(b.endsAt).isBefore(now);
          if (aPast !== bPast) return aPast ? 1 : -1;
          return aPast
            ? dayjs(b.startsAt).valueOf() - dayjs(a.startsAt).valueOf()
            : dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf();
        });
    },
    [schedule?.exceptions],
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Lịch làm việc bác sĩ</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={6}>
          <Text strong>Bác sĩ</Text>
          <Select
            style={{ width: 320, maxWidth: "100%" }}
            placeholder="Chọn bác sĩ"
            showSearch
            optionFilterProp="label"
            loading={practitionersLoading}
            open={doctorSelectOpen}
            onOpenChange={setDoctorSelectOpen}
            value={doctorId}
            onChange={(value) => {
              setDoctorId(value);
              setDoctorSelectOpen(false);
            }}
            options={practitioners.map((item) => ({
              value: item.id,
              label: `${item.name}${item.clinicName ? ` — ${item.clinicName}` : ""}`,
            }))}
          />
        </Space>
      </Card>

      {!doctor ? (
        <Card
          styles={{ body: { padding: "56px 24px" } }}
          style={{ borderColor: "#d9e8f5" }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 20px",
                borderRadius: 20,
                display: "grid",
                placeItems: "center",
                color: "#1677ff",
                background: "linear-gradient(145deg, #e6f4ff 0%, #f0f9ff 100%)",
                boxShadow: "0 10px 28px rgba(22, 119, 255, 0.12)",
              }}
            >
              <CalendarDays size={34} strokeWidth={1.8} />
            </div>
            <Title level={4} style={{ margin: "0 0 8px" }}>
              Thiết lập lịch làm việc cho bác sĩ
            </Title>
            <Text type="secondary">
              Chọn bác sĩ để xem, cập nhật giờ làm việc hàng tuần và quản lý các ngày
              nghỉ hoặc ca làm ngoài lịch.
            </Text>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                margin: "28px 0",
              }}
            >
              {[
                { icon: <UserRound size={17} />, label: "Chọn bác sĩ" },
                { icon: <Clock3 size={17} />, label: "Thiết lập khung giờ" },
                { icon: <CheckCircle2 size={17} />, label: "Lưu lịch làm việc" },
              ].map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    minWidth: 180,
                    padding: "12px 16px",
                    border: "1px solid #e8edf3",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#475569",
                    background: "#fafcff",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      color: "#1677ff",
                      background: "#e6f4ff",
                    }}
                  >
                    {item.icon}
                  </span>
                  <Text>{index + 1}. {item.label}</Text>
                </div>
              ))}
            </div>

            <Button
              type="primary"
              size="large"
              icon={<UserRound size={17} />}
              loading={practitionersLoading}
              disabled={!practitionersLoading && practitioners.length === 0}
              onClick={() => setDoctorSelectOpen(true)}
            >
              {practitioners.length === 0 && !practitionersLoading
                ? "Chưa có bác sĩ"
                : "Chọn bác sĩ"}
            </Button>
          </div>
        </Card>
      ) : !doctor.clinicLocationId ? (
        <Alert type="warning" showIcon message="Bác sĩ này chưa được gán cơ sở khám." />
      ) : scheduleLoading ? (
        <Spin />
      ) : scheduleError ? (
        <Alert type="error" showIcon message={scheduleError} />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card
            className="schedule-card"
            title={
              <div className="schedule-card-title">
                <div className="schedule-title-icon">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <Text strong>Lịch làm việc hàng tuần</Text>
                  <Text type="secondary">Lịch chuẩn được lặp lại mỗi tuần</Text>
                </div>
              </div>
            }
            extra={
              <Space size={16}>
                <div className="schedule-summary">
                  <span><strong>{scheduleSummary.activeDays}</strong>/7 ngày</span>
                  <span><strong>{scheduleSummary.totalHours}</strong> giờ/tuần</span>
                  <span><strong>{scheduleSummary.shifts}</strong> ca</span>
                </div>
                <Button
                  type="primary"
                  loading={saving}
                  disabled={!dirty}
                  onClick={() => void saveSchedule()}
                >
                  Lưu thay đổi
                </Button>
              </Space>
            }
          >
            <div className="weekly-schedule-scroll">
              <div className="weekly-schedule-grid">
                {DAY_LABELS.map((label, dayOfWeek) => {
                  const dayWindows = windowsByDay.get(dayOfWeek) ?? [];
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <section
                      key={dayOfWeek}
                      className={`schedule-day${isWeekend ? " schedule-day-weekend" : ""}`}
                    >
                      <header className="schedule-day-header">
                        <Text strong>{label}</Text>
                        <span className={dayWindows.length ? "day-status-active" : "day-status-off"}>
                          {dayWindows.length ? `${dayWindows.length} ca` : "Nghỉ"}
                        </span>
                      </header>
                      <div className="schedule-day-body">
                        {dayWindows.map((item) => (
                          <div className="shift-block" key={item.key}>
                            <Clock3 size={15} />
                            <div>
                              <strong>{minutesToTime(item.startMinute)}</strong>
                              <span>đến {minutesToTime(item.endMinute)}</span>
                            </div>
                            <button
                              type="button"
                              className="shift-remove"
                              aria-label={`Xoá ca ${minutesToTime(item.startMinute)}`}
                              onClick={() => removeWindow(item.key)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {!dayWindows.length && (
                          <div className="day-off-state">
                            <Clock3 size={20} />
                            <span>Không có ca làm</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="text"
                        icon={<Plus size={14} />}
                        className="day-add-button"
                        onClick={() => windowForm.setFieldValue("dayOfWeek", dayOfWeek)}
                      >
                        Thêm ca
                      </Button>
                    </section>
                  );
                })}
              </div>
            </div>
            <Form form={windowForm} layout="inline" className="add-shift-form">
              <div className="add-shift-label">
                <Plus size={18} />
                <div>
                  <Text strong>Thêm ca làm việc</Text>
                  <Text type="secondary">Chọn ngày và khoảng thời gian</Text>
                </div>
              </div>
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
                <Button type="primary" icon={<Plus size={14} />} onClick={() => void addWindow()}>
                  Thêm ca
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card
            className="duty-card"
            title={
              <div className="schedule-card-title">
                <div className="duty-title-icon">
                  <MoonStar size={20} />
                </div>
                <div>
                  <Text strong>Lịch trực</Text>
                  <Text type="secondary">Quản lý các ca trực theo ngày cụ thể</Text>
                </div>
              </div>
            }
            extra={
              <span className="duty-count">
                {dutyShifts.length} ca trực
              </span>
            }
          >
            <List
              className="duty-list"
              dataSource={dutyShifts}
              locale={{
                emptyText: (
                  <div className="duty-empty">
                    <CalendarClock size={30} />
                    <Text strong>Chưa có ca trực</Text>
                    <Text type="secondary">
                      Thêm ca trực đầu tiên bằng biểu mẫu bên dưới.
                    </Text>
                  </div>
                ),
              }}
              renderItem={(exception) => (
                <List.Item className="duty-list-item">
                  <div className="duty-date">
                    <span>{dayjs(exception.startsAt).format("DD")}</span>
                    <small>Th{dayjs(exception.startsAt).format("M")}</small>
                  </div>
                  <div className="duty-info">
                    <div className="duty-info-top">
                      <Text strong>{exception.reason || "Ca trực"}</Text>
                      <span
                        className={
                          dayjs().isAfter(dayjs(exception.endsAt))
                            ? "duty-status duty-status-past"
                            : dayjs().isAfter(dayjs(exception.startsAt))
                              ? "duty-status duty-status-active"
                              : "duty-status duty-status-upcoming"
                        }
                      >
                        {dayjs().isAfter(dayjs(exception.endsAt))
                          ? "Đã kết thúc"
                          : dayjs().isAfter(dayjs(exception.startsAt))
                            ? "Đang trực"
                            : "Sắp tới"}
                      </span>
                    </div>
                    <div className="duty-meta">
                      <span>
                        <CalendarDays size={14} />
                        {DAY_LABELS[dayjs(exception.startsAt).day()]},{" "}
                        {dayjs(exception.startsAt).format("DD/MM/YYYY")}
                      </span>
                      <span>
                        <Clock3 size={14} />
                        {dayjs(exception.startsAt).format("HH:mm")} –{" "}
                        {dayjs(exception.endsAt).format(
                          dayjs(exception.startsAt).isSame(dayjs(exception.endsAt), "day")
                            ? "HH:mm"
                            : "HH:mm · DD/MM",
                        )}
                      </span>
                      <span>
                        {Math.round(
                          dayjs(exception.endsAt).diff(dayjs(exception.startsAt), "minute") / 6,
                        ) / 10}{" "}
                        giờ
                      </span>
                    </div>
                  </div>
                  <Button
                    type="text"
                    icon={<ArrowRightLeft size={15} />}
                    onClick={() => {
                      setTransferTarget(exception);
                      setTransferDoctorId(undefined);
                    }}
                  >
                    Đổi người trực
                  </Button>
                  <Button
                    type="text"
                    danger
                    aria-label="Xoá ca trực"
                    icon={<Trash2 size={15} />}
                    loading={deletingExceptionId === exception.id}
                    onClick={() => removeException(exception)}
                  />
                </List.Item>
              )}
            />
            <Form
              form={exceptionForm}
              layout="inline"
              className="duty-form"
            >
              <div className="duty-form-label">
                <CalendarClock size={18} />
                <div>
                  <Text strong>Đăng ký trực hộ</Text>
                  <Text type="secondary" ellipsis={{ tooltip: doctor.name }}>
                    Cho {doctor.name}
                  </Text>
                </div>
              </div>
              <Form.Item name="range" rules={[{ required: true, message: "Chọn thời gian" }]}>
                <DatePicker.RangePicker
                  showTime={{ format: "HH:mm", minuteStep: 5 }}
                  format="DD/MM/YYYY HH:mm"
                  placeholder={["Bắt đầu", "Kết thúc"]}
                />
              </Form.Item>
              <Form.Item name="reason">
                <Input placeholder="Tên hoặc ghi chú ca trực" style={{ width: 240 }} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  loading={creatingException}
                  onClick={() => void submitDutyShift()}
                >
                  Thêm ca trực
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      )}
      <Modal
        title="Đổi người trực"
        open={Boolean(transferTarget)}
        okText="Xác nhận đổi ca"
        cancelText="Hủy"
        confirmLoading={transferring}
        okButtonProps={{ disabled: !transferDoctorId }}
        onOk={() => void transferDutyShift()}
        onCancel={() => {
          if (transferring) return;
          setTransferTarget(undefined);
          setTransferDoctorId(undefined);
        }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {transferTarget && (
            <div className="transfer-shift-summary">
              <div className="duty-date">
                <span>{dayjs(transferTarget.startsAt).format("DD")}</span>
                <small>Th{dayjs(transferTarget.startsAt).format("M")}</small>
              </div>
              <div>
                <Text strong>{transferTarget.reason || "Ca trực"}</Text>
                <Text type="secondary">
                  {DAY_LABELS[dayjs(transferTarget.startsAt).day()]},{" "}
                  {dayjs(transferTarget.startsAt).format("DD/MM/YYYY · HH:mm")} –{" "}
                  {dayjs(transferTarget.endsAt).format("DD/MM/YYYY · HH:mm")}
                </Text>
              </div>
            </div>
          )}
          <div>
            <Text strong>Bác sĩ nhận ca</Text>
            <Select
              showSearch
              optionFilterProp="label"
              value={transferDoctorId}
              onChange={setTransferDoctorId}
              placeholder="Chọn bác sĩ nhận ca trực"
              style={{ width: "100%", marginTop: 8 }}
              options={practitioners
                .filter((item) => item.id !== doctor?.id)
                .map((item) => ({
                  value: item.id,
                  label: `${item.name}${item.clinicName ? ` — ${item.clinicName}` : ""}`,
                  disabled: !item.clinicLocationId,
                }))}
            />
          </div>
          <Alert
            type="info"
            showIcon
            message="Ca trực sẽ được chuyển khỏi bác sĩ hiện tại sau khi bác sĩ nhận ca được cập nhật thành công."
          />
        </Space>
      </Modal>
    </div>
  );
}
