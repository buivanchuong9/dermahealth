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
import { CalendarClock, ListChecks, QrCode, Users } from "lucide-react";
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
    () =>
      appointments
        .filter(
          (item) =>
            item.status === "upcoming" &&
            (!clinicLocationId || item.clinicLocationId === clinicLocationId) &&
            !tickets.some(
              (ticket) =>
                ticket.status !== "completed" &&
                (ticket.appointmentId === item.id ||
                  ticket.patientId === item.patientId),
            ),
        )
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [appointments, clinicLocationId, tickets],
  );

  return <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <Title level={3}>Trung tâm điều phối lễ tân</Title>
    {summaryError && (
      <Alert
        type="warning"
        showIcon
        message="Không tải được số liệu tổng hợp từ máy chủ"
        description="Danh sách bên dưới vẫn dùng dữ liệu lịch hẹn đã đồng bộ gần nhất."
      />
    )}
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}><Card><Statistic title="Lịch hẹn sắp tới" value={counts.upcomingAppointments} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang chờ" value={counts.waitingCount} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Đang phục vụ" value={counts.inServiceCount} /></Card></Col>
    </Row>
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
                  href={hasCheckedIn ? undefined : "/app/reception/qr-check-in"}
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
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}><Card title="Check-in bệnh nhân"><Text>Quét và xác thực QR lịch hẹn tại quầy.</Text><Button type="primary" block icon={<QrCode size={16} />} href="/app/reception/qr-check-in" style={{ marginTop: 16 }}>Mở máy quét QR</Button></Card></Col>
      <Col xs={24} md={12}><Card title="Điều phối hàng đợi"><Text>Gọi số, xác nhận bệnh nhân và bắt đầu phục vụ.</Text><Button block icon={<ListChecks size={16} />} href="/app/reception/queue" style={{ marginTop: 16 }}>Mở hàng đợi</Button></Card></Col>
    </Row>
    <Button icon={<Users size={16} />} href="/app/appointments">Tra cứu lịch hẹn</Button>
  </div>;
}
