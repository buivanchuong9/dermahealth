import { useMemo, useState } from "react";
import { App, Button, Card, Checkbox, Input, Tag, Typography } from "antd";
import { ArrowLeft, Check, ClipboardList, HeartPulse, QrCode, Stethoscope } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { createWalkInQueueTicket } from "../api/queue";
import type { QueueTicket } from "../domain/core/entities";
import type { AppointmentId, EncounterId, PatientId } from "../domain/core/ids";
import { patientRepository, queueRepository } from "../domain/repositories";
import { QueueResult } from "./KioskCheckIn";

const { Title, Text } = Typography;

const SERVICES = [
  { code: "DERMATOLOGY", title: "Khám Da liễu", detail: "Ngứa, nổi ban, tổn thương da, tái khám da liễu", department: "Khoa Da liễu", station: "Tiếp nhận Da liễu", prefix: "D", icon: Stethoscope },
  { code: "GENERAL", title: "Khám tổng quát", detail: "Khám ban đầu, tư vấn triệu chứng chưa xác định", department: "Khám tổng quát", station: "Quầy tiếp nhận", prefix: "A", icon: ClipboardList },
  { code: "VITALS", title: "Đo sinh hiệu", detail: "Đo huyết áp, mạch, nhiệt độ và chỉ số cơ thể", department: "Điều dưỡng", station: "Khu đo sinh hiệu", prefix: "S", icon: HeartPulse },
] as const;

export default function WalkInQueue() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const clinicLocationId = params.get("clinic") || "CS-HCM-01";
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<QueueTicket>();
  const selectedService = useMemo(
    () => SERVICES.find((item) => item.code === selectedCodes[0]),
    [selectedCodes],
  );

  const createDemoTicket = (): QueueTicket => {
    const service = selectedService ?? SERVICES[0];
    const existing = queueRepository.getAll();
    const samePrefixNumbers = existing
      .filter((item) => item.number.startsWith(service.prefix))
      .map((item) => Number(item.number.replace(/\D/g, "")) || 0);
    const sequence = Math.max(0, ...samePrefixNumbers) + 1;
    const now = new Date().toISOString();
    return {
      id: `WALKIN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      appointmentId: `WALKIN-APPOINTMENT-${Date.now()}` as AppointmentId,
      patientId: `WALKIN-PATIENT-${Date.now()}` as PatientId,
      encounterId: `WALKIN-ENCOUNTER-${Date.now()}` as EncounterId,
      number: `${service.prefix}${String(sequence).padStart(3, "0")}`,
      department: service.department,
      serviceStation: service.station,
      waitingArea: "Sảnh chờ tầng 1",
      priority: "normal",
      status: "waiting",
      issuedAt: now,
      peopleAhead: existing.filter((item) => item.status === "waiting" && item.department === service.department).length,
      estimatedWaitMinutes: Math.max(5, existing.filter((item) => item.status === "waiting" && item.department === service.department).length * 10),
      preparationInstructions: ["Giữ điện thoại ở chế độ có âm thanh", "Theo dõi màn hình gọi số tại sảnh"],
      version: 0,
    };
  };

  const submit = async () => {
    if (!selectedService) return message.warning("Vui lòng chọn một nhu cầu.");
    if (fullName.trim().length < 2) return message.warning("Vui lòng nhập họ tên.");
    if (!/^[0-9+ ]{9,15}$/.test(phone.trim())) return message.warning("Số điện thoại chưa hợp lệ.");
    setSubmitting(true);
    try {
      let nextTicket: QueueTicket;
      try {
        nextTicket = await createWalkInQueueTicket({
          clinicLocationId,
          serviceCode: selectedService.code,
          fullName: fullName.trim(),
          phone: phone.trim(),
          note: note.trim() || undefined,
        });
      } catch (error) {
        if (!import.meta.env.DEV) throw error;
        nextTicket = createDemoTicket();
      }
      patientRepository.upsert({
        id: nextTicket.patientId,
        code: `BN-${Date.now().toString().slice(-6)}`,
        name: fullName.trim(),
        profile: {
          dob: "1995-01-01",
          gender: "nam",
          phone: phone.trim(),
          email: "",
          address: "",
          bloodType: "A+",
        },
        primaryDoctorId: "" as any,
      });
      queueRepository.upsert(nextTicket);
      setTicket(nextTicket);
      message.success(`Đã cấp số ${nextTicket.number}.`);
    } catch {
      message.error("Chưa thể cấp số. Vui lòng thử lại hoặc liên hệ lễ tân.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticket) return (
    <main style={{ minHeight: "100dvh", padding: "22px 14px", background: "#f2f6f9" }}>
      <QueueResult ticket={ticket} />
    </main>
  );

  return (
    <main style={{ minHeight: "100dvh", padding: "20px 14px 34px", background: "linear-gradient(180deg,#e9f5fb 0,#f6f8fa 240px)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Tag color="blue" icon={<QrCode size={12} />}>ĐĂNG KÝ TẠI CƠ SỞ</Tag>
        <Title level={2} style={{ margin: "12px 0 4px" }}>Bạn cần hỗ trợ gì hôm nay?</Title>
        <Text type="secondary">Chọn nhu cầu để hệ thống xếp đúng hàng đợi và cấp số tự động.</Text>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {SERVICES.map((service) => {
            const active = selectedCodes.includes(service.code);
            const Icon = service.icon;
            return (
              <button
                key={service.code}
                type="button"
                onClick={() => setSelectedCodes([service.code])}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 15, textAlign: "left", borderRadius: 13, border: `1.5px solid ${active ? "#1769aa" : "#dce6ed"}`, background: active ? "#edf6ff" : "#fff", cursor: "pointer", boxShadow: active ? "0 7px 20px rgba(23,105,170,.12)" : "none" }}
              >
                <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 11, color: active ? "#fff" : "#1769aa", background: active ? "#1769aa" : "#edf6ff", flexShrink: 0 }}><Icon size={21} /></span>
                <span style={{ flex: 1 }}>
                  <Text strong style={{ display: "block", fontSize: 15 }}>{service.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12.5 }}>{service.detail}</Text>
                </span>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", color: active ? "#fff" : "transparent", background: active ? "#1769aa" : "#fff", border: `1px solid ${active ? "#1769aa" : "#cbd8e2"}` }}><Check size={14} /></span>
              </button>
            );
          })}
        </div>

        <Card style={{ marginTop: 16, borderRadius: 13 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <Input size="large" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Họ và tên *" />
            <Input size="large" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại *" />
            <Input.TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Mô tả ngắn nhu cầu hoặc triệu chứng (không bắt buộc)" />
            <Checkbox defaultChecked>Tôi xác nhận thông tin trên là chính xác</Checkbox>
            <Button type="primary" size="large" block loading={submitting} disabled={!selectedService} onClick={() => void submit()}>
              Lấy số thứ tự
            </Button>
          </div>
        </Card>
        <Button type="text" icon={<ArrowLeft size={14} />} href="/" style={{ marginTop: 10 }}>Quay lại</Button>
      </div>
    </main>
  );
}
