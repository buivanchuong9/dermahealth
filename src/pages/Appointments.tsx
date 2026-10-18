import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Row,
  Segmented,
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
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
import {
  DateStrip,
  DoctorPicker,
  ModePicker,
  SlotPicker,
  type DoctorChoice,
  type SlotChoice,
} from "../components/appointments/BookingParts";
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

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const STATUS_META: Record<Appointment["status"], { label: string; color: string }> = {
  upcoming: { label: "Sắp tới", color: "blue" },
  done: { label: "Đã khám", color: "green" },
  cancelled: { label: "Đã hủy", color: "default" },
  missed: { label: "Vắng mặt", color: "orange" },
};

const buildSlotChoices = (
  slots: AvailabilitySlot[],
  appointments: Appointment[],
  excludedAppointmentId?: string,
): SlotChoice[] =>
  slots.map((slot) => {
    const overlaps = overlapsAppointment(slot, appointments, excludedAppointmentId);
    const unavailable = !isSlotAvailable(slot);
    return {
      value: slot.slotId,
      disabled: unavailable || overlaps,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      hint: overlaps
        ? "Trùng lịch của bạn"
        : unavailable
          ? unavailableSlotLabel(slot)
          : `Còn ${slot.remainingCapacity} chỗ`,
    };
  });

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
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const selectedDoctorId = doctorId ?? doctors[0]?.id;
  const doctor = useMemo(
    () => doctors.find((item) => item.id === selectedDoctorId),
    [doctors, selectedDoctorId],
  );

  const slotChoices = useMemo(
    () => buildSlotChoices(slots, appointments),
    [appointments, slots],
  );
  const rescheduleChoices = useMemo(
    () => buildSlotChoices(rescheduleSlots, appointments, rescheduleTarget?.id),
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

  const doctorChoices: DoctorChoice[] = doctors.map((item) => ({
    id: item.id,
    name: item.name,
    specialty: item.specialty,
    place: item.clinicName,
    avatarUrl: item.avatarUrl,
  }));
  const stepDone = {
    doctor: Boolean(doctor),
    date: Boolean(date),
    slot: Boolean(selectedSlot),
  };
  const startOf = (item: Appointment) =>
    item.startAt ? Date.parse(item.startAt) : 0;
  const upcoming = appointments
    .filter((item) => item.status === "upcoming")
    .sort((a, b) => startOf(a) - startOf(b));
  const history = appointments
    .filter((item) => item.status !== "upcoming")
    .sort((a, b) => startOf(b) - startOf(a));
  const shown = tab === "upcoming" ? upcoming : history;
  const nextAppointment = upcoming[0];

  const doctorName = (id: string) =>
    doctors.find((entry) => entry.id === id)?.name ?? id;

  const noSlotsNotice = (
    <Alert
      type="info"
      showIcon
      message="Bác sĩ không có ca khám trong ngày này"
      description={
        suggestedDates.length ? (
          <Space wrap style={{ marginTop: 8 }}>
            <Typography.Text>Ngày gần nhất còn giờ:</Typography.Text>
            {suggestedDates.map((item) => (
              <Button key={item.date} size="small" onClick={() => setDate(dayjs(item.date))}>
                {dayjs(item.date).format("DD/MM")} · {item.availableCount} khung giờ
              </Button>
            ))}
          </Space>
        ) : (
          "Chưa tìm thấy lịch trống trong 14 ngày tiếp theo. Vui lòng chọn bác sĩ khác."
        )
      }
    />
  );

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }} className="appointments-page">
      <div className="appt-hero">
        <div>
          <Title level={3} style={{ margin: 0 }}>Lịch hẹn</Title>
          <Typography.Text type="secondary">
            Đặt lịch, theo dõi check-in và tiến trình vào phòng khám.
          </Typography.Text>
        </div>
        {nextAppointment ? (
          <div className="appt-next">
            <span className="appt-next-icon"><Calendar size={18} /></span>
            <div>
              <small>Lịch hẹn sắp tới</small>
              <strong>
                {nextAppointment.time} · {nextAppointment.date}
              </strong>
              <small>{doctorName(nextAppointment.doctorId)}</small>
            </div>
          </div>
        ) : (
          <div className="appt-next is-empty">
            <span className="appt-next-icon"><Calendar size={18} /></span>
            <div>
              <small>Lịch hẹn sắp tới</small>
              <strong>Chưa có lịch</strong>
            </div>
          </div>
        )}
      </div>

      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={16}>
          <Card className="booking-card" styles={{ body: { padding: 0 } }}>
            <section className="book-step">
              <header>
                <span className={`step-no${stepDone.doctor ? " is-done" : ""}`}>
                  {stepDone.doctor ? <Check size={14} strokeWidth={3} /> : 1}
                </span>
                <div>
                  <h4>Chọn bác sĩ</h4>
                  <p>Bác sĩ sẽ trực tiếp khám cho bạn</p>
                </div>
              </header>
              <DoctorPicker
                doctors={doctorChoices}
                value={selectedDoctorId}
                onChange={setDoctorId}
              />
            </section>

            <section className="book-step">
              <header>
                <span className={`step-no${stepDone.date ? " is-done" : ""}`}>
                  {stepDone.date ? <Check size={14} strokeWidth={3} /> : 2}
                </span>
                <div>
                  <h4>Chọn ngày khám</h4>
                  <p>Chọn nhanh trong 14 ngày tới hoặc một ngày khác</p>
                </div>
              </header>
              <DateStrip value={date} onChange={setDate} />
            </section>

            <section className="book-step">
              <header>
                <span className={`step-no${stepDone.slot ? " is-done" : ""}`}>
                  {stepDone.slot ? <Check size={14} strokeWidth={3} /> : 3}
                </span>
                <div>
                  <h4>Chọn giờ khám</h4>
                  <p>Các khung giờ còn trống của bác sĩ trong ngày</p>
                </div>
              </header>
              {availabilityError && (
                <Alert
                  type="warning"
                  showIcon
                  message="Chưa tải được giờ khám"
                  description={availabilityError}
                  style={{ marginBottom: 12 }}
                />
              )}
              {!date ? (
                <div className="slot-state">Chọn ngày ở bước 2 để xem các khung giờ còn trống.</div>
              ) : suggestionLoading ? (
                <div className="slot-state">
                  <Spin size="small" /> <span>Đang tìm ngày khám gần nhất…</span>
                </div>
              ) : (
                <SlotPicker
                  choices={slotChoices}
                  value={slotId}
                  onChange={setSlotId}
                  loading={slotLoading}
                  empty={availabilityError ? null : noSlotsNotice}
                />
              )}
            </section>

            <section className="book-step">
              <header>
                <span className="step-no is-done"><Check size={14} strokeWidth={3} /></span>
                <div>
                  <h4>Hình thức khám</h4>
                  <p>Bạn có thể khám tại phòng khám hoặc trực tuyến</p>
                </div>
              </header>
              <ModePicker value={mode} onChange={setMode} />
            </section>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="summary-card" styles={{ body: { padding: 0 } }}>
            <div className="summary-head">
              <Typography.Text strong>Tóm tắt lịch hẹn</Typography.Text>
              <small>Kiểm tra lại trước khi xác nhận</small>
            </div>
            <ul className="summary-list">
              <li>
                <UserRound size={16} />
                <div>
                  <small>Bác sĩ</small>
                  <strong>{doctor?.name ?? "Chưa chọn"}</strong>
                  {doctor?.specialty && <span>{doctor.specialty}</span>}
                </div>
              </li>
              <li>
                <Calendar size={16} />
                <div>
                  <small>Ngày khám</small>
                  <strong>{date ? `${WEEKDAY[date.day()]}, ${date.format("DD/MM/YYYY")}` : "Chưa chọn"}</strong>
                </div>
              </li>
              <li>
                <Clock size={16} />
                <div>
                  <small>Giờ khám</small>
                  <strong>
                    {selectedSlot
                      ? `${dayjs(selectedSlot.startsAt).format("HH:mm")} – ${dayjs(selectedSlot.endsAt).format("HH:mm")}`
                      : "Chưa chọn"}
                  </strong>
                </div>
              </li>
              <li>
                {mode === "video" ? <Video size={16} /> : <Building2 size={16} />}
                <div>
                  <small>Hình thức</small>
                  <strong>{mode === "video" ? "Trực tuyến" : "Tại phòng khám"}</strong>
                  {mode === "in_person" && doctor?.clinicName && <span>{doctor.clinicName}</span>}
                </div>
              </li>
            </ul>
            <div className="summary-foot">
              <Button
                type="primary"
                size="large"
                block
                icon={<CheckCircle2 size={16} />}
                disabled={!slotId}
                loading={bookingLoading}
                onClick={() => void submit()}
              >
                Xác nhận đặt lịch
              </Button>
              <small>
                {slotId
                  ? "Lễ tân sẽ nhận được lịch. Bạn vào hàng đợi sau khi check-in."
                  : "Hoàn tất các bước bên trái để đặt lịch."}
              </small>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="appointment-list-card"
        title="Lịch hẹn của bạn"
        extra={
          <Segmented
            value={tab}
            onChange={(value) => setTab(value as "upcoming" | "history")}
            options={[
              { value: "upcoming", label: `Sắp tới (${upcoming.length})` },
              { value: "history", label: `Lịch sử (${history.length})` },
            ]}
          />
        }
      >
        {shown.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={tab === "upcoming" ? "Bạn chưa có lịch hẹn sắp tới" : "Chưa có lịch sử khám"}
          />
        ) : (
          <div className="appt-list">
            {shown.map((item, index) => {
              const start = item.startAt ? dayjs(item.startAt) : undefined;
              const ticket = queueTickets.find((entry) => entry.appointmentId === item.id);
              const progress = queueTickets.some(
                (entry) =>
                  entry.appointmentId === item.id &&
                  ["in_service", "completed"].includes(entry.status),
              )
                ? 2
                : ticket
                  ? 1
                  : 0;
              const meta = STATUS_META[item.status];
              return (
                <article key={item.id} className={`appt-item is-${item.status}`}>
                  <div className="appt-date">
                    <small>{start ? WEEKDAY[start.day()] : ""}</small>
                    <strong>{start ? start.format("DD") : item.date}</strong>
                    <small>{start ? `Thg ${start.format("M")}` : ""}</small>
                  </div>
                  <div className="appt-main">
                    <div className="appt-title">
                      <strong>{item.time}</strong>
                      <Tag bordered={false} color={meta.color}>{meta.label}</Tag>
                      {tab === "upcoming" && index === 0 && (
                        <Tag bordered={false} color="gold">Gần nhất</Tag>
                      )}
                    </div>
                    <div className="appt-meta">
                      <span><Stethoscope size={14} /> {doctorName(item.doctorId)}</span>
                      {item.department && <span>{item.department}</span>}
                      <span>
                        {item.mode === "video" ? <Video size={14} /> : <Building2 size={14} />}
                        {item.mode === "video" ? "Trực tuyến" : "Tại phòng khám"}
                      </span>
                      {item.status === "cancelled" && item.cancelReason && (
                        <span className="appt-reason">Lý do: {item.cancelReason}</span>
                      )}
                    </div>
                  </div>
                  {item.status === "upcoming" && (
                    <>
                      <div className="appt-progress">
                        <Steps
                          size="small"
                          responsive={false}
                          current={progress}
                          items={[{ title: "Đã đặt" }, { title: "Check-in" }, { title: "Đang khám" }]}
                        />
                      </div>
                      <div className="appt-actions">
                        <Button
                          icon={<CalendarClock size={15} />}
                          onClick={() => {
                            setRescheduleTarget(item);
                            setRescheduleDate(null);
                            setRescheduleSlots([]);
                            setRescheduleSlotId(undefined);
                          }}
                        >
                          Đổi lịch
                        </Button>
                        <Button danger type="text" onClick={() => cancel(item)}>
                          Hủy
                        </Button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        title="Đổi lịch hẹn"
        open={Boolean(rescheduleTarget)}
        okText="Xác nhận đổi lịch"
        cancelText="Đóng"
        width={620}
        okButtonProps={{ disabled: !rescheduleSlotId }}
        confirmLoading={actionLoading && Boolean(rescheduleSlotId)}
        onOk={() => void submitReschedule()}
        onCancel={() => {
          setRescheduleTarget(undefined);
          setRescheduleDate(null);
        }}
      >
        {rescheduleTarget && (
          <div className="resched-current">
            <Calendar size={16} />
            <span>
              Lịch hiện tại: <strong>{rescheduleTarget.time} · {rescheduleTarget.date}</strong> ·{" "}
              {doctorName(rescheduleTarget.doctorId)}
            </span>
          </div>
        )}
        <div className="book-step is-modal">
          <header>
            <div>
              <h4>Chọn ngày mới</h4>
            </div>
          </header>
          <DateStrip
            value={rescheduleDate}
            onChange={(value) => {
              setRescheduleDate(value);
              setRescheduleSlots([]);
              setRescheduleSlotId(undefined);
              setActionLoading(Boolean(value));
            }}
          />
        </div>
        <div className="book-step is-modal">
          <header>
            <div>
              <h4>Chọn giờ mới</h4>
            </div>
          </header>
          {!rescheduleDate ? (
            <div className="slot-state">Chọn ngày mới để xem giờ trống.</div>
          ) : (
            <SlotPicker
              choices={rescheduleChoices}
              value={rescheduleSlotId}
              onChange={setRescheduleSlotId}
              loading={actionLoading && rescheduleSlots.length === 0}
              empty={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bác sĩ chưa mở lịch ngày này" />}
            />
          )}
        </div>
      </Modal>
    </Space>
  );
}
