import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Alert,
  Steps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
import { useAppState } from "../state/useAppState";
import { useStore } from "../state/useStore";
import { appointmentRepository, queueRepository, userRepository } from "../domain/repositories";
import type { Appointment } from "../domain/core/entities";
import {
  createAppointment,
  getAvailability,
  getPractitionerAvailability,
  listAppointments,
  type AvailabilitySlot,
  type Practitioner,
} from "../api/clinical";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../api/appointments";
import { ApiError } from "../api/http";
import "./Appointments.css";

const { Title } = Typography;

const overlapsAppointment = (
  slot: AvailabilitySlot,
  appointments: Appointment[],
  excludedAppointmentId?: string,
) => {
  const slotStart = Date.parse(slot.startsAt);
  const slotEnd = Date.parse(slot.endsAt);
  return appointments.some((appointment) => {
    if (
      appointment.id === excludedAppointmentId ||
      appointment.status !== "upcoming" ||
      !appointment.startAt ||
      !appointment.endAt
    )
      return false;
    const appointmentStart = Date.parse(appointment.startAt);
    const appointmentEnd = Date.parse(appointment.endAt);
    return slotStart < appointmentEnd && slotEnd > appointmentStart;
  });
};

const isSlotAvailable = (slot: AvailabilitySlot) =>
  slot.selectable !== false &&
  (slot.status === undefined || slot.status === "AVAILABLE") &&
  slot.remainingCapacity > 0;

const unavailableSlotLabel = (slot: AvailabilitySlot) => {
  if (slot.unavailableReason?.display) return slot.unavailableReason.display;
  const labels: Partial<Record<NonNullable<AvailabilitySlot["status"]>, string>> = {
    FULL: "Đã kín",
    BLOCKED: "Đã khóa",
    BREAK: "Giờ nghỉ",
    LEAVE: "Bác sĩ nghỉ",
    PAST: "Đã qua",
    CANCELLED: "Ca đã hủy",
  };
  return slot.status ? labels[slot.status] ?? "Không khả dụng" : "Đã kín";
};

export default function Appointments() {
  const { message, modal } = App.useApp();
  const { currentPatient } = useAppState();
  const appointments = useStore(appointmentRepository).filter(
    (item) => item.patientId === currentPatient?.id,
  );
  const queueTickets = useStore(queueRepository).filter(
    (item) => item.patientId === currentPatient?.id,
  );
  const doctors = useStore(userRepository).filter(
    (item) => item.role === "doctor",
  ) as Practitioner[];
  const [doctorId, setDoctorId] = useState<string>();
  const [date, setDate] = useState<Dayjs | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotId, setSlotId] = useState<string>();
  const [mode, setMode] = useState<"video" | "in_person">("in_person");
  const [slotLoading, setSlotLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>();
  const [suggestedDates, setSuggestedDates] = useState<
    Array<{ date: string; availableCount: number }>
  >([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment>();
  const [rescheduleDate, setRescheduleDate] = useState<Dayjs | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlot[]>([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>();
  const [actionLoading, setActionLoading] = useState(false);
  const selectedDoctorId = doctorId ?? doctors[0]?.id;
  const doctor = useMemo(
    () => doctors.find((item) => item.id === selectedDoctorId),
    [doctors, selectedDoctorId],
  );

  const slotOptions = useMemo(
    () =>
      slots.map((slot) => {
        const overlaps = overlapsAppointment(slot, appointments);
        const unavailable = !isSlotAvailable(slot);
        return {
          value: slot.slotId,
          disabled: unavailable || overlaps,
          label: `${dayjs(slot.startsAt).format("HH:mm")} – ${dayjs(slot.endsAt).format("HH:mm")}${
            overlaps
              ? " · Bạn đã có lịch trùng giờ"
              : unavailable
                ? ` · ${unavailableSlotLabel(slot)}`
                : ` · Còn ${slot.remainingCapacity} chỗ`
          }`,
        };
      }),
    [appointments, slots],
  );
  const rescheduleSlotOptions = useMemo(
    () =>
      rescheduleSlots.map((slot) => {
        const overlaps = overlapsAppointment(
          slot,
          appointments,
          rescheduleTarget?.id,
        );
        const unavailable = !isSlotAvailable(slot);
        return {
          value: slot.slotId,
          disabled: unavailable || overlaps,
          label: `${dayjs(slot.startsAt).format("HH:mm")} – ${dayjs(slot.endsAt).format("HH:mm")}${
            overlaps
              ? " · Bạn đã có lịch trùng giờ"
              : unavailable
                ? ` · ${unavailableSlotLabel(slot)}`
                : ` · Còn ${slot.remainingCapacity} chỗ`
          }`,
        };
      }),
    [appointments, rescheduleSlots, rescheduleTarget?.id],
  );
  const selectedSlot = useMemo(
    () => slots.find((item) => item.slotId === slotId),
    [slotId, slots],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setSlots([]);
      setSlotId(undefined);
      setAvailabilityError(undefined);
      setSuggestedDates([]);
      if (!date) {
        setSlotLoading(false);
        return;
      }
      if (!doctor) {
        setAvailabilityError("Vui lòng chọn bác sĩ trước.");
        setSlotLoading(false);
        return;
      }
      if (!doctor.clinicLocationId) {
        setAvailabilityError(
          "Bác sĩ chưa được gán cơ sở khám nên chưa thể tải khung giờ. Vui lòng chọn bác sĩ khác hoặc liên hệ phòng khám.",
        );
        setSlotLoading(false);
        return;
      }
      setSlotLoading(true);
      getPractitionerAvailability(
        doctor.id,
        doctor.clinicLocationId,
        date.format("YYYY-MM-DD"),
      )
        .then(async (availability) => {
          if (!active) return;
          const rows = availability.slots;
          setSlots(rows);
          if (rows.some(isSlotAvailable)) return;

          if (availability.nextAvailableDates !== undefined) {
            setSuggestedDates(
              availability.nextAvailableDates.slice(0, 3).map((item) => ({
                date: item.date,
                availableCount: item.availableSlotCount,
              })),
            );
            return;
          }

          // Compatibility fallback until BE provides nextAvailableDates.
          setSuggestionLoading(true);
          const nearbyDates = Array.from({ length: 14 }, (_, index) =>
            date.add(index + 1, "day"),
          );
          const results = await Promise.allSettled(
            nearbyDates.map(async (candidate) => ({
              date: candidate.format("YYYY-MM-DD"),
              slots: await getAvailability(
                doctor.id,
                doctor.clinicLocationId!,
                candidate.format("YYYY-MM-DD"),
              ),
            })),
          );
          if (!active) return;
          setSuggestedDates(
            results
              .flatMap((result) =>
                result.status === "fulfilled" ? [result.value] : [],
              )
              .map((result) => ({
                date: result.date,
                availableCount: result.slots.filter(isSlotAvailable).length,
              }))
              .filter((result) => result.availableCount > 0)
              .slice(0, 3),
          );
        })
        .catch((error) => {
          if (active)
            setAvailabilityError(
              error instanceof Error ? error.message : "Không tải được lịch trống.",
            );
        })
        .finally(() => {
          if (active) {
            setSlotLoading(false);
            setSuggestionLoading(false);
          }
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      active = false;
    };
  }, [date, doctor]);

  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate) return;
    const targetDoctor = doctors.find(
      (item) => item.id === rescheduleTarget.doctorId,
    );
    if (!targetDoctor?.clinicLocationId) return;
    getAvailability(
      targetDoctor.id,
      targetDoctor.clinicLocationId,
      rescheduleDate.format("YYYY-MM-DD"),
    )
      .then(setRescheduleSlots)
      .catch((error) =>
        message.error(
          error instanceof Error ? error.message : "Không tải được lịch trống.",
        ),
      )
      .finally(() => setActionLoading(false));
  }, [doctors, message, rescheduleDate, rescheduleTarget]);

  if (!currentPatient) return <Empty description="Chưa có hồ sơ bệnh nhân liên kết với tài khoản này" />;

  const submit = async () => {
    if (!slotId || !doctor?.clinicLocationId || !date) return;
    setBookingLoading(true);
    try {
      const freshSlots = await getAvailability(
        doctor.id,
        doctor.clinicLocationId,
        date.format("YYYY-MM-DD"),
      );
      setSlots(freshSlots);
      const selected = freshSlots.find((slot) => slot.slotId === slotId);
      if (!selected || !isSlotAvailable(selected)) {
        setSlotId(undefined);
        throw new Error(
          "Khung giờ vừa được người khác đặt. Danh sách giờ trống đã được cập nhật.",
        );
      }
      if (overlapsAppointment(selected, appointments)) {
        setSlotId(undefined);
        throw new Error(
          "Bạn đã có một lịch hẹn khác trùng thời gian này. Vui lòng chọn giờ khác.",
        );
      }
      const created = await createAppointment({
        slotId,
        mode,
        onBehalfOfPatientId: currentPatient.id,
      });
      appointmentRepository.upsert(created);
      appointmentRepository.replaceAll(await listAppointments());
      message.success(
        "Đặt lịch thành công. Lễ tân đã nhận được lịch; bệnh nhân sẽ vào hàng đợi sau khi check-in.",
        5,
      );
      setSlotId(undefined);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSlotId(undefined);
        try {
          setSlots(
            await getAvailability(
              doctor.id,
              doctor.clinicLocationId,
              date.format("YYYY-MM-DD"),
            ),
          );
        } catch {
          // Keep the original conflict message; the next selection reloads slots.
        }
      }
      message.error(
        error instanceof ApiError && error.status === 409
          ? "Khung giờ không còn khả dụng hoặc bị trùng lịch. Vui lòng chọn giờ khác."
          : error instanceof Error
            ? error.message
            : "Đặt lịch thất bại.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const cancel = (appointment: Appointment) => {
    modal.confirm({
      title: "Hủy lịch hẹn?",
      content: "Lịch hẹn sẽ được hủy trên hệ thống và không thể hoàn tác.",
      okText: "Hủy lịch",
      okButtonProps: { danger: true },
      cancelText: "Giữ lịch",
      onOk: async () => {
        const updated = await cancelAppointment(appointment.id, {
          reason: "Bệnh nhân yêu cầu hủy lịch",
          version: appointment.version ?? 0,
        });
        appointmentRepository.upsert(updated);
        message.success("Đã hủy lịch hẹn.");
      },
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleSlotId || !rescheduleDate) return;
    const targetDoctor = doctors.find(
      (item) => item.id === rescheduleTarget.doctorId,
    );
    if (!targetDoctor?.clinicLocationId) {
      message.error("Bác sĩ chưa được gán cơ sở khám.");
      return;
    }
    setActionLoading(true);
    try {
      const freshSlots = await getAvailability(
        targetDoctor.id,
        targetDoctor.clinicLocationId,
        rescheduleDate.format("YYYY-MM-DD"),
      );
      setRescheduleSlots(freshSlots);
      const selected = freshSlots.find(
        (slot) => slot.slotId === rescheduleSlotId,
      );
      if (!selected || !isSlotAvailable(selected)) {
        setRescheduleSlotId(undefined);
        throw new Error(
          "Khung giờ vừa được người khác đặt. Danh sách giờ đã được cập nhật.",
        );
      }
      if (
        overlapsAppointment(selected, appointments, rescheduleTarget.id)
      ) {
        setRescheduleSlotId(undefined);
        throw new Error(
          "Bạn đã có một lịch hẹn khác trùng thời gian này. Vui lòng chọn giờ khác.",
        );
      }
      const updated = await rescheduleAppointment(rescheduleTarget.id, {
        slotId: rescheduleSlotId,
        version: rescheduleTarget.version ?? 0,
      });
      appointmentRepository.upsert(updated);
      setRescheduleTarget(undefined);
      setRescheduleDate(null);
      message.success("Đã đổi lịch hẹn.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setRescheduleSlotId(undefined);
      }
      message.error(
        error instanceof ApiError && error.status === 409
          ? "Khung giờ không còn khả dụng hoặc bị trùng lịch. Vui lòng chọn giờ khác."
          : error instanceof Error
            ? error.message
            : "Không thể đổi lịch hẹn.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }} className="appointments-page">
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>Lịch hẹn</Title>
        <Typography.Text type="secondary">
          Đặt lịch, theo dõi check-in và tiến trình vào phòng khám.
        </Typography.Text>
      </div>
      <Card
        className="booking-card"
        title={
          <div className="booking-card-title">
            <span><Calendar size={19} /></span>
            <div>
              <Typography.Text strong>Đặt lịch khám</Typography.Text>
              <Typography.Text type="secondary">Chọn bác sĩ, ngày và khung giờ phù hợp</Typography.Text>
            </div>
          </div>
        }
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div className="booking-fields">
            <label>
              <span className="field-label"><UserRound size={14} /> Bác sĩ</span>
              <Select
                placeholder="Chọn bác sĩ"
                value={selectedDoctorId}
                onChange={setDoctorId}
                options={doctors.map((item) => ({
                  value: item.id,
                  label: `${item.name}${item.specialty ? ` — ${item.specialty}` : ""}`,
                }))}
                notFoundContent={<Empty description="Chưa có bác sĩ trong hệ thống" />}
              />
            </label>
            <label>
              <span className="field-label"><Calendar size={14} /> Ngày khám</span>
              <DatePicker
                value={date}
                onChange={setDate}
                disabledDate={(value) => value.isBefore(dayjs(), "day")}
                style={{ width: "100%" }}
                placeholder="Chọn ngày khám"
                format="DD/MM/YYYY"
              />
            </label>
            <label>
              <span className="field-label"><Building2 size={14} /> Hình thức</span>
              <Radio.Group
                value={mode}
                optionType="button"
                buttonStyle="solid"
                onChange={(event) => setMode(event.target.value)}
                options={[
                  { value: "in_person", label: "Tại phòng khám" },
                  { value: "video", label: "Trực tuyến" },
                ]}
              />
            </label>
          </div>
          {availabilityError && (
            <Alert
              type="warning"
              showIcon
              message="Chưa tải được giờ khám"
              description={availabilityError}
            />
          )}
          {slotLoading || suggestionLoading ? (
            <Space>
              <Spin size="small" />
              <Typography.Text type="secondary">
                {slotLoading
                  ? "Đang kiểm tra giờ trống…"
                  : "Đang tìm ngày khám gần nhất…"}
              </Typography.Text>
            </Space>
          ) : date && slotOptions.length ? (
            <div className="slot-section">
              <Typography.Text strong>Giờ khám còn trống</Typography.Text>
              <div className="slot-grid">
              {slotOptions.map((option) => (
                <Button
                  key={option.value}
                  disabled={option.disabled}
                  type={slotId === option.value ? "primary" : "default"}
                  onClick={() => setSlotId(option.value)}
                >
                  <Clock size={14} /> {option.label}
                </Button>
              ))}
              </div>
            </div>
          ) : date ? (
            <Alert
              type="info"
              showIcon
              message="Bác sĩ không có ca khám trong ngày này"
              description={
                suggestedDates.length ? (
                  <Space wrap style={{ marginTop: 8 }}>
                    <Typography.Text>Ngày gần nhất còn giờ:</Typography.Text>
                    {suggestedDates.map((item) => (
                      <Button
                        key={item.date}
                        size="small"
                        onClick={() => setDate(dayjs(item.date))}
                      >
                        {dayjs(item.date).format("ddd, DD/MM")} ·{" "}
                        {item.availableCount} khung giờ
                      </Button>
                    ))}
                  </Space>
                ) : (
                  "Chưa tìm thấy lịch trống trong 14 ngày tiếp theo. Vui lòng chọn bác sĩ khác."
                )
              }
            />
          ) : (
            <Typography.Text type="secondary">
              Chọn ngày để xem các khung giờ còn trống.
            </Typography.Text>
          )}
          <div className="booking-confirm">
            <div>
              <Typography.Text strong>
                {selectedSlot
                  ? `${dayjs(selectedSlot.startsAt).format("HH:mm")} · ${dayjs(selectedSlot.startsAt).format("DD/MM/YYYY")}`
                  : "Chưa chọn giờ khám"}
              </Typography.Text>
              <Typography.Text type="secondary">
                {selectedSlot
                  ? `${doctor?.name ?? "Bác sĩ"} · ${mode === "video" ? "Trực tuyến" : "Tại phòng khám"}`
                  : "Chọn một khung giờ khả dụng để tiếp tục"}
              </Typography.Text>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircle2 size={16} />}
              disabled={!slotId}
              loading={bookingLoading}
              onClick={() => void submit()}
            >
              Xác nhận đặt lịch
            </Button>
          </div>
        </Space>
      </Card>
      <Card
        className="appointment-list-card"
        title="Lịch hẹn của bệnh nhân"
        extra={<Typography.Text type="secondary">{appointments.length} lịch hẹn</Typography.Text>}
      >
        <List
          dataSource={[...appointments].sort((a, b) =>
            `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
          )}
          locale={{ emptyText: "Chưa có lịch hẹn" }}
          renderItem={(item) => (
            <List.Item
              className="appointment-row"
              actions={
                item.status === "upcoming"
                  ? [
                      <Button
                        key="reschedule"
                        type="link"
                        onClick={() => {
                          setRescheduleTarget(item);
                          setRescheduleDate(null);
                          setRescheduleSlots([]);
                          setRescheduleSlotId(undefined);
                        }}
                      >
                        Đổi lịch
                      </Button>,
                      <Button
                        key="cancel"
                        type="link"
                        danger
                        onClick={() => cancel(item)}
                      >
                        Hủy
                      </Button>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                avatar={<div className="appointment-date-icon"><Calendar size={19} /></div>}
                title={<span>{item.time} · {item.date}</span>}
                description={
                  <Space wrap>
                    <Stethoscope size={14} />
                    {doctors.find((entry) => entry.id === item.doctorId)
                      ?.name ?? item.doctorId}
                    <span>· {item.department}</span>
                    {item.mode === "video" ? <Video size={14} /> : <Building2 size={14} />}
                    {item.mode === "video" ? "Trực tuyến" : "Tại phòng khám"}
                  </Space>
                }
              />
              <div className="appointment-progress">
                <Steps
                  size="small"
                  responsive={false}
                  current={
                    queueTickets.some((ticket) =>
                      ticket.appointmentId === item.id &&
                      ["in_service", "completed"].includes(ticket.status)
                    )
                      ? 2
                      : queueTickets.some((ticket) => ticket.appointmentId === item.id)
                        ? 1
                        : 0
                  }
                  items={[
                    { title: "Đã đặt" },
                    { title: "Check-in" },
                    { title: "Đang khám" },
                  ]}
                />
                <Tag color={item.status === "upcoming" ? "blue" : "default"}>
                  {item.status === "upcoming" ? "Sắp tới" : item.status}
                </Tag>
              </div>
            </List.Item>
          )}
        />
      </Card>
      <Modal
        title="Đổi lịch hẹn"
        open={Boolean(rescheduleTarget)}
        okText="Xác nhận đổi lịch"
        cancelText="Đóng"
        okButtonProps={{ disabled: !rescheduleSlotId }}
        confirmLoading={actionLoading}
        onOk={() => void submitReschedule()}
        onCancel={() => {
          setRescheduleTarget(undefined);
          setRescheduleDate(null);
        }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <DatePicker
            value={rescheduleDate}
            onChange={(value) => {
              setRescheduleDate(value);
              setRescheduleSlots([]);
              setRescheduleSlotId(undefined);
              setActionLoading(Boolean(value));
            }}
            disabledDate={(value) => value.isBefore(dayjs(), "day")}
            placeholder="Chọn ngày mới"
            style={{ width: "100%" }}
          />
          <Select
            value={rescheduleSlotId}
            onChange={setRescheduleSlotId}
            loading={actionLoading}
            placeholder="Chọn giờ mới"
            options={rescheduleSlotOptions}
            notFoundContent={
              <Empty description="Bác sĩ chưa mở lịch ngày này" />
            }
          />
        </Space>
      </Modal>
    </Space>
  );
}
