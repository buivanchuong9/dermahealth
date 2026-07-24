import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { KeyRound, ListChecks, Plus, Power, QrCode, Users } from "lucide-react";
import { useStore } from "../state/useStore";
import { appointmentRepository, queueRepository } from "../domain/repositories";
import {
  createKioskDevice,
  deactivateKioskDevice,
  getReceptionSummary,
  listKioskDevices,
  rotateKioskDeviceCredentials,
  type KioskDevice,
  type ReceptionSummary,
} from "../api/reception";

const { Title, Text, Paragraph } = Typography;

export default function Reception() {
  const appointments = useStore(appointmentRepository);
  const tickets = useStore(queueRepository);
  const { message, modal } = App.useApp();
  const clinicLocationId =
    appointments.find((item) => item.clinicLocationId)?.clinicLocationId ??
    import.meta.env.VITE_CLINIC_LOCATION_ID ??
    "";
  const [summary, setSummary] = useState<ReceptionSummary>();
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [label, setLabel] = useState("");
  const [savingDevice, setSavingDevice] = useState(false);

  useEffect(() => {
    if (clinicLocationId) {
      getReceptionSummary(clinicLocationId).then(setSummary).catch(() => undefined);
    }
    listKioskDevices().then(setDevices).catch(() => undefined);
  }, [clinicLocationId]);

  const fallbackSummary = useMemo<ReceptionSummary>(
    () => ({
      upcomingAppointments: appointments.filter((item) => item.status === "upcoming").length,
      waitingCount: tickets.filter((item) => item.status === "waiting").length,
      inServiceCount: tickets.filter((item) => ["called", "in_service"].includes(item.status)).length,
    }),
    [appointments, tickets],
  );
  const counts = summary ?? fallbackSummary;

  const revealSecret = (device: KioskDevice) => {
    if (!device.deviceSecret) return;
    modal.info({
      title: "Thông tin xác thực kiosk",
      content: <><Paragraph copyable={{ text: device.id }}>Device ID: {device.id}</Paragraph><Paragraph copyable={{ text: device.deviceSecret }}>Device secret: {device.deviceSecret}</Paragraph></>,
      okText: "Đã lưu an toàn",
    });
  };

  const addDevice = async () => {
    if (!clinicLocationId || !label.trim()) return;
    setSavingDevice(true);
    try {
      const created = await createKioskDevice({ clinicLocationId, label: label.trim() });
      setDevices((rows) => [created, ...rows]);
      setLabel("");
      revealSecret(created);
      void message.success("Đã tạo thiết bị kiosk.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Không tạo được kiosk.");
    } finally {
      setSavingDevice(false);
    }
  };

  const updateDevice = async (device: KioskDevice, action: "rotate" | "deactivate") => {
    try {
      const updated = action === "rotate"
        ? await rotateKioskDeviceCredentials(device.id)
        : await deactivateKioskDevice(device.id);
      setDevices((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      if (action === "rotate") revealSecret(updated);
      void message.success(action === "rotate" ? "Đã xoay khóa thiết bị." : "Đã vô hiệu hóa thiết bị.");
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "Không cập nhật được kiosk.");
    }
  };

  return <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <Title level={3}>Trung tâm điều phối lễ tân</Title>
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}><Card><Statistic title="Lịch hẹn sắp tới" value={counts.upcomingAppointments} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang chờ" value={counts.waitingCount} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang phục vụ" value={counts.inServiceCount} /></Card></Col>
    </Row>
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}><Card title="Check-in bệnh nhân"><Text>Quét và xác thực QR lịch hẹn tại quầy.</Text><Button type="primary" block icon={<QrCode size={16} />} href="/app/reception/qr-check-in" style={{ marginTop: 16 }}>Mở máy quét QR</Button></Card></Col>
      <Col xs={24} md={12}><Card title="Điều phối hàng đợi"><Text>Gọi số, xác nhận bệnh nhân và bắt đầu phục vụ.</Text><Button block icon={<ListChecks size={16} />} href="/app/reception/queue" style={{ marginTop: 16 }}>Mở hàng đợi</Button></Card></Col>
    </Row>
    <Card title="Thiết bị kiosk" extra={<Tag>{clinicLocationId || "Chưa xác định cơ sở"}</Tag>}>
      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Tên thiết bị kiosk" />
        <Button type="primary" icon={<Plus size={15} />} loading={savingDevice} disabled={!clinicLocationId || !label.trim()} onClick={() => void addDevice()}>Tạo thiết bị</Button>
      </Space.Compact>
      <List dataSource={devices} locale={{ emptyText: "Chưa có thiết bị kiosk" }} renderItem={(device) => <List.Item actions={device.status === "active" ? [<Button key="rotate" icon={<KeyRound size={14} />} onClick={() => void updateDevice(device, "rotate")}>Xoay khóa</Button>, <Button key="off" danger icon={<Power size={14} />} onClick={() => void updateDevice(device, "deactivate")}>Vô hiệu hóa</Button>] : []}><List.Item.Meta title={device.label} description={`${device.id} · ${device.clinicLocationId}`} /><Tag color={device.status === "active" ? "success" : "default"}>{device.status}</Tag></List.Item>} />
    </Card>
    <Button icon={<Users size={16} />} href="/app/appointments">Tra cứu lịch hẹn</Button>
  </div>;
}
