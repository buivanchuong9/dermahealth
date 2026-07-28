import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  List,
  Row,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { ArrowRight, CalendarClock, ListChecks, QrCode, Users } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useStore } from "../state/useStore";
import { appointmentRepository, patientRepository, queueRepository } from "../domain/repositories";
import {
  getReceptionSummary,
  type ReceptionSummary,
} from "../api/reception";
import { listAppointments } from "../api/appointments";
import { listQueueTickets, mergeQueueTicketSnapshot } from "../api/queue";

const { Title, Text } = Typography;

export default function Reception() {
  const appointments = useStore(appointmentRepository);
  const patients = useStore(patientRepository);
  const tickets = useStore(queueRepository);
  const clinicLocationId =
    appointments.find((item) => item.clinicLocationId)?.clinicLocationId ??
    import.meta.env.VITE_CLINIC_LOCATION_ID ??
    "";
  const [summary, setSummary] = useState<ReceptionSummary>();
  const [summaryError, setSummaryError] = useState(false);
  const publicQueueUrl = `${window.location.origin}/queue/join?clinic=${encodeURIComponent(clinicLocationId || "CS-HCM-01")}`;

  useEffect(() => {
    if (clinicLocationId) {
      getReceptionSummary(clinicLocationId)
        .then((value) => {
          setSummary(value);
          setSummaryError(false);
        })
        .catch(() => setSummaryError(true));
    }
    Promise.allSettled([
      listAppointments(),
      listQueueTickets(clinicLocationId || undefined),
    ]).then(([appointmentResult, queueResult]) => {
      if (appointmentResult.status === "fulfilled") {
        appointmentRepository.replaceAll(appointmentResult.value);
      }
      if (queueResult.status === "fulfilled") {
        queueRepository.replaceAll(
          mergeQueueTicketSnapshot(
            queueResult.value,
            queueRepository.getAll(),
          ),
        );
      }
    });
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
  const upcomingAppointments = useMemo(
    () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return appointments
        .filter(
          (item) =>
            item.status === "upcoming" &&
            Boolean(item.startAt) &&
            new Date(item.startAt!).getTime() >= start.getTime() &&
            new Date(item.startAt!).getTime() <= end.getTime() &&
            (!clinicLocationId || item.clinicLocationId === clinicLocationId) &&
            !tickets.some(
              (ticket) =>
                ticket.status !== "completed" &&
                (ticket.appointmentId === item.id ||
                  ticket.patientId === item.patientId),
            ),
        )
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));
    },
    [appointments, clinicLocationId, tickets],
  );

  return <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <Title level={3} style={{ marginBottom: 3 }}>Tiếp đón và cấp số khám</Title>
        <Text type="secondary">Một luồng thống nhất từ quét QR, xác nhận lịch hẹn đến gọi số tại phòng khám.</Text>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="large" icon={<ListChecks size={16} />} href="/app/clinic-queue">Mở hàng đợi</Button>
        <Button size="large" type="primary" icon={<QrCode size={17} />} href="/app/reception/qr-check-in">Quét QR check-in</Button>
      </div>
    </div>
    {summaryError && (
      <Alert
        type="warning"
        showIcon
        message="Không tải được số liệu tổng hợp từ máy chủ"
        description="Danh sách bên dưới vẫn dùng dữ liệu lịch hẹn đã đồng bộ gần nhất."
      />
    )}
    <Card styles={{ body: { padding: 0 } }} style={{ overflow: "hidden", borderRadius: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div style={{ display: "grid", placeItems: "center", padding: 22, background: "#f7fbfe", borderRight: "1px solid #e4ecf2" }}>
          <div style={{ padding: 13, borderRadius: 13, background: "#fff", boxShadow: "0 8px 24px rgba(15,70,105,.12)" }}>
            <QRCodeCanvas value={publicQueueUrl} size={184} level="M" marginSize={2} aria-label="QR đăng ký lấy số tại phòng khám" />
          </div>
          <Text strong style={{ marginTop: 11 }}>QR lấy số tại cơ sở</Text>
          <Text type="secondary" style={{ fontSize: 11.5, textAlign: "center" }}>In và đặt mã này tại bàn lễ tân hoặc cửa vào.</Text>
        </div>
        <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Tag color="cyan" style={{ width: "fit-content", marginBottom: 10 }}>DÀNH CHO BỆNH NHÂN</Tag>
          <Title level={4} style={{ margin: 0 }}>Quét QR bằng điện thoại để tự lấy số</Title>
          <Text type="secondary" style={{ marginTop: 7, maxWidth: 620 }}>
            Bệnh nhân chọn nhu cầu, nhập thông tin liên hệ và nhận số điện tử. Lượt mới được chuyển thẳng vào hàng đợi để nhân viên gọi số.
          </Text>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Button type="primary" icon={<QrCode size={15} />} href={publicQueueUrl} target="_blank">Mở thử giao diện điện thoại</Button>
            <Button onClick={() => window.print()}>In mã QR</Button>
          </div>
          <Text copyable={{ text: publicQueueUrl }} type="secondary" style={{ marginTop: 12, fontSize: 11.5, wordBreak: "break-all" }}>{publicQueueUrl}</Text>
        </div>
      </div>
    </Card>
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}><Card><Statistic title="Lịch hẹn sắp tới" value={counts.upcomingAppointments} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang chờ" value={counts.waitingCount} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang phục vụ" value={counts.inServiceCount} /></Card></Col>
    </Row>
    <Card styles={{ body: { padding: 16 } }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        {[
          { number: "1", title: "Quét QR hoặc tra lịch", detail: "Xác thực đúng bệnh nhân và lịch hẹn" },
          { number: "2", title: "Cấp số tự động", detail: "Bệnh nhân nhận số và thời gian chờ" },
          { number: "3", title: "Gọi đến quầy/phòng", detail: "Loa và bảng điện tử gọi đúng lượt" },
          { number: "4", title: "Bắt đầu phục vụ", detail: "Trạng thái được đồng bộ cho nhân viên" },
        ].map((step, index) => (
          <div key={step.number} style={{ display: "flex", alignItems: "center", gap: 11, padding: 11, borderRadius: 10, background: "#f7fafc", border: "1px solid #e5edf3" }}>
            <span style={{ width: 30, height: 30, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 9, color: "#fff", background: "#1769aa", fontWeight: 700 }}>{step.number}</span>
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: "block", fontSize: 13 }}>{step.title}</Text>
              <Text type="secondary" style={{ fontSize: 11.5 }}>{step.detail}</Text>
            </div>
            {index < 3 && <ArrowRight size={15} color="#9aabb9" style={{ marginLeft: "auto", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </Card>
    <Card
      title="Danh sách chờ tiếp nhận"
      extra={<Tag color="blue">{upcomingAppointments.length} lịch sắp tới</Tag>}
    >
      <List
        dataSource={upcomingAppointments}
        locale={{ emptyText: "Không có lịch hẹn sắp tới tại cơ sở này." }}
        renderItem={(appointment) => {
          const patient = patients.find((item) => item.id === appointment.patientId);
          const hasCheckedIn = tickets.some(
            (ticket) =>
              ticket.status !== "completed" &&
              (ticket.appointmentId === appointment.id ||
                ticket.patientId === appointment.patientId),
          );
          return (
            <List.Item
              actions={[
                <Button
                  key="detail"
                  type="link"
                  href={`/app/appointments/${appointment.id}`}
                >
                  Xem lịch hẹn
                </Button>,
                <Button
                  key="check-in"
                  type={hasCheckedIn ? "default" : "primary"}
                  disabled={hasCheckedIn}
                  href={hasCheckedIn ? undefined : `/app/reception/qr-check-in?appointmentId=${encodeURIComponent(appointment.id)}`}
                  icon={<QrCode size={14} />}
                >
                  {hasCheckedIn ? "Đã check-in" : "Tiếp nhận"}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", color: "#1769aa", background: "#edf6ff" }}>
                    <CalendarClock size={19} />
                  </div>
                }
                title={patient?.name ?? appointment.patientId}
                description={`${appointment.time} · ${appointment.date} · ${appointment.department}`}
              />
              <Tag color={hasCheckedIn ? "success" : "processing"}>
                {hasCheckedIn ? "Trong hàng đợi khám" : "Chờ check-in"}
              </Tag>
            </List.Item>
          );
        }}
      />
    </Card>
    <Button icon={<Users size={16} />} href="/app/appointments">Tra cứu lịch hẹn</Button>
  </div>;
}
