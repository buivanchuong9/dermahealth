import { useMemo, useState } from "react";
import { App, Button, Card, Checkbox, Input, Tag, Typography } from "antd";
import { ArrowLeft, Check, ClipboardList, HeartPulse, QrCode, Stethoscope } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { createWalkInQueueTicket } from "../api/queue";
import type { QueueTicket } from "../domain/core/entities";
import { QueueResult } from "./KioskCheckIn";

const { Title, Text } = Typography;

const SERVICES = [
  { code: "DERMATOLOGY", title: "Khám Da liễu", detail: "Ngứa, nổi ban, tổn thương da, tái khám da liễu", icon: Stethoscope },
  { code: "GENERAL", title: "Khám tổng quát", detail: "Khám ban đầu, tư vấn triệu chứng chưa xác định", icon: ClipboardList },
  { code: "VITALS", title: "Đo sinh hiệu", detail: "Đo huyết áp, mạch, nhiệt độ và chỉ số cơ thể", icon: HeartPulse },
] as const;

export default function WalkInQueue() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const clinicLocationId = params.get("clinic") || import.meta.env.VITE_CLINIC_LOCATION_ID || "02d400ec-2ab3-48f1-8a6a-57b7f7d1de14";
  const [selectedCode, setSelectedCode] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<QueueTicket>();
  const selectedService = useMemo(
    () => SERVICES.find((s) => s.code === selectedCode),
    [selectedCode],
  );

  const submit = async () => {
    if (!selectedService) return message.warning("Vui lòng chọn một nhu cầu.");
    if (fullName.trim().length < 2) return message.warning("Vui lòng nhập họ tên.");
    if (!/^[0-9+ ]{9,15}$/.test(phone.trim())) return message.warning("Số điện thoại chưa hợp lệ.");
    setSubmitting(true);
    try {
      const next = await createWalkInQueueTicket({
        clinicLocationId,
        serviceCode: selectedService.code,
        fullName: fullName.trim(),
        phone: phone.trim(),
        note: note.trim() || undefined,
      });
      setTicket(next);
      message.success(`Đã cấp số ${next.number}.`);
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
            const active = selectedCode === service.code;
            const Icon = service.icon;
            return (
              <button
                key={service.code}
                type="button"
                onClick={() => setSelectedCode(service.code)}
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
            <Input size="large" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Họ và tên *" />
            <Input size="large" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại *" />
            <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả ngắn nhu cầu hoặc triệu chứng (không bắt buộc)" />
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
