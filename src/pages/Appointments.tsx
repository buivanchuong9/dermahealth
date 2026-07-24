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
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Calendar, Clock, Stethoscope } from "lucide-react";
import { useAppState } from "../state/useAppState";
import { useStore } from "../state/useStore";
import { appointmentRepository, userRepository } from "../domain/repositories";
import type { Appointment } from "../domain/core/entities";
import {
  createAppointment,
  getAvailability,
  listAppointments,
  type AvailabilitySlot,
  type Practitioner,
} from "../api/clinical";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../api/appointments";

const { Title } = Typography;
export default function Appointments() {
  const { message, modal } = App.useApp();
  const { currentPatient } = useAppState();
  const appointments = useStore(appointmentRepository).filter(
    (item) => item.patientId === currentPatient.id,
  );
  const doctors = useStore(userRepository).filter(
    (item) => item.role === "doctor",
  ) as Practitioner[];
  const [doctorId, setDoctorId] = useState<string>();
  const [date, setDate] = useState<Dayjs | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotId, setSlotId] = useState<string>();
  const [mode, setMode] = useState<"video" | "in_person">("in_person");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (!doctor || !doctor.clinicLocationId || !date) return;
    getAvailability(
      doctor.id,
      doctor.clinicLocationId,
      date.format("YYYY-MM-DD"),
    )
      .then(setSlots)
      .catch((error) =>
        message.error(
          error instanceof Error ? error.message : "Không tải được lịch trống.",
        ),
      )
      .finally(() => setLoading(false));
  }, [date, doctor, message]);

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

  const submit = async () => {
    if (!slotId) return;
    setLoading(true);
    try {
      const created = await createAppointment({ slotId, mode });
      appointmentRepository.upsert(created);
      appointmentRepository.replaceAll(await listAppointments());
      message.success("Đặt lịch thành công và đã lưu vào hệ thống.");
      setSlotId(undefined);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Đặt lịch thất bại.",
      );
    } finally {
      setLoading(false);
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
    if (!rescheduleTarget || !rescheduleSlotId) return;
    setActionLoading(true);
    try {
      const updated = await rescheduleAppointment(rescheduleTarget.id, {
        slotId: rescheduleSlotId,
        version: rescheduleTarget.version ?? 0,
      });
      appointmentRepository.upsert(updated);
      setRescheduleTarget(undefined);
      setRescheduleDate(null);
      message.success("Đã đổi lịch hẹn.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không thể đổi lịch hẹn.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Title level={3}>Lịch hẹn</Title>
      <Card title="Đặt lịch khám">
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Select
            placeholder="Chọn bác sĩ"
            value={selectedDoctorId}
            onChange={(value) => {
              setDoctorId(value);
              setSlots([]);
              setSlotId(undefined);
              const nextDoctor = doctors.find((item) => item.id === value);
              setLoading(Boolean(date && nextDoctor?.clinicLocationId));
            }}
            options={doctors.map((item) => ({
              value: item.id,
              label: `${item.name}${item.specialty ? ` — ${item.specialty}` : ""}`,
            }))}
            notFoundContent={
              <Empty description="Chưa có bác sĩ trong database" />
            }
          />
          <DatePicker
            value={date}
            onChange={(value) => {
              setDate(value);
              setSlots([]);
              setSlotId(undefined);
              setLoading(Boolean(value && doctor?.clinicLocationId));
            }}
            disabledDate={(value) => value.isBefore(dayjs(), "day")}
            style={{ width: "100%" }}
            placeholder="Chọn ngày khám"
          />
          <Radio.Group
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            options={[
              { value: "in_person", label: "Tại phòng khám" },
              { value: "video", label: "Trực tuyến" },
            ]}
          />
          {loading ? (
            <Spin />
          ) : (
            <Select
              placeholder="Chọn giờ còn trống"
              value={slotId}
              onChange={setSlotId}
              options={slots.map((slot) => ({
                value: slot.slotId,
                label: `${dayjs(slot.startsAt).format("HH:mm")} – ${dayjs(slot.endsAt).format("HH:mm")} (${slot.remainingCapacity} chỗ)`,
              }))}
              notFoundContent={
                <Empty
                  description={
                    date ? "Không còn khung giờ trống" : "Hãy chọn ngày"
                  }
                />
              }
            />
          )}
          <Button
            type="primary"
            disabled={!slotId}
            loading={loading}
            onClick={() => void submit()}
          >
            Xác nhận đặt lịch
          </Button>
        </Space>
      </Card>
      <Card title="Lịch hẹn từ hệ thống">
        <List
          dataSource={[...appointments].sort((a, b) =>
            `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
          )}
          locale={{ emptyText: "Chưa có lịch hẹn" }}
          renderItem={(item) => (
            <List.Item
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
                avatar={<Calendar size={20} />}
                title={`${item.date} ${item.time}`}
                description={
                  <Space>
                    <Stethoscope size={14} />
                    {doctors.find((entry) => entry.id === item.doctorId)
                      ?.name ?? item.doctorId}
                    <Clock size={14} />
                    {item.department}
                  </Space>
                }
              />
              <Tag>{item.status}</Tag>
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
            options={rescheduleSlots.map((slot) => ({
              value: slot.slotId,
              label: `${dayjs(slot.startsAt).format("HH:mm")} – ${dayjs(slot.endsAt).format("HH:mm")} (${slot.remainingCapacity} chỗ)`,
            }))}
            notFoundContent={<Empty description="Không có khung giờ trống" />}
          />
        </Space>
      </Modal>
    </Space>
  );
}
