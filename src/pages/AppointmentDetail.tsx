import { useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Result,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  MapPinned,
  QrCode,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../state/useStore";
import { useAppState } from "../state/useAppState";
import {
  appointmentCheckInTokenRepository,
  appointmentRepository,
  patientRepository,
  queueRepository,
  userRepository,
} from "../domain/repositories";
import { AppointmentQRCode } from "../components/appointments/AppointmentQRCode";
import { hasRoleAccess } from "../domain/core/role";
import { issueCheckInToken, type ApiCheckInToken } from "../api/appointments";
import type { Appointment, AppointmentCheckInToken } from "../domain/core/entities";
import type { EncounterId } from "../domain/core/ids";
import "./AppointmentDetail.css";

const { Title, Text } = Typography;

const appointmentStatusLabel: Record<Appointment["status"], string> = {
  upcoming: "Sắp tới",
  done: "Đã hoàn tất",
  cancelled: "Đã hủy",
  missed: "Vắng mặt",
};

export default function AppointmentDetail({
  consultation = false,
}: {
  consultation?: boolean;
}) {
  const { appointmentId } = useParams();
  const { currentUser } = useAppState();
  const { message } = App.useApp();
  const appointments = useStore(appointmentRepository);
  const tokens = useStore(appointmentCheckInTokenRepository);
  const tickets = useStore(queueRepository);
  const users = useStore(userRepository);
  const patients = useStore(patientRepository);
  const [issuingQr, setIssuingQr] = useState(false);

  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) {
    return (
      <Result
        status="404"
        title="Không tìm thấy lịch hẹn"
        extra={<Button href="/app/appointments">Về danh sách lịch hẹn</Button>}
      />
    );
  }

  const token = tokens
    .filter(
      (item) =>
        item.appointmentId === appointment.id &&
        ["active", "used"].includes(item.status),
    )
    .sort((a, b) => b.version - a.version)[0];
  const ticket = tickets.find((item) => item.appointmentId === appointment.id);
  const doctor = users.find((item) => item.id === appointment.doctorId);
  const patient = patients.find((item) => item.id === appointment.patientId);
  const canManageQr = hasRoleAccess(currentUser.role, [
    "receptionist",
    "medical_administrator",
  ]);
  const shortCode = appointment.id.slice(0, 8).toUpperCase();
  const journeyStep = ticket
    ? ["in_service", "completed"].includes(ticket.status)
      ? 2
      : 1
    : 0;

  const storeIssuedToken = (row: ApiCheckInToken): AppointmentCheckInToken => ({
    id: row.id,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    plannedEncounterId:
      appointment.encounterId ??
      (`pending-${appointment.id}` as EncounterId),
    clinicLocationId: appointment.clinicLocationId ?? "",
    token: row.token ?? "",
    tokenHash: "",
    issuedAt: row.issuedAt,
    validFrom: row.validFrom,
    expiresAt: row.expiresAt,
    status: row.status,
    version: row.version,
  });

  const createQr = async () => {
    setIssuingQr(true);
    try {
      const issued = await issueCheckInToken(appointment.id);
      if (!issued.token) {
        throw new Error("Máy chủ không trả về nội dung QR.");
      }
      appointmentCheckInTokenRepository.upsert(storeIssuedToken(issued));
      void message.success("Đã phát hành mã QR check-in.");
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : "Không phát hành được mã QR.",
      );
    } finally {
      setIssuingQr(false);
    }
  };

  return (
    <div className="appointment-detail-page">
      <Link to="/app/appointments" className="appointment-back-link">
        <ArrowLeft size={14} /> Quay lại lịch hẹn
      </Link>

      <header className="appointment-detail-header">
        <div>
          <Space size={10} wrap>
            <Title level={3}>
              {consultation ? "Chuẩn bị lượt khám" : "Chi tiết lịch hẹn"}
            </Title>
            <Tag color="blue">#{shortCode}</Tag>
          </Space>
          <Text type="secondary">
            {patient?.name ?? "Bệnh nhân"} · {appointmentStatusLabel[appointment.status]}
          </Text>
        </div>
        <Tag
          className="appointment-status-tag"
          color={
            appointment.status === "upcoming"
              ? "processing"
              : appointment.status === "done"
                ? "success"
                : "default"
          }
        >
          {appointmentStatusLabel[appointment.status]}
        </Tag>
      </header>

      <Card className="appointment-journey-card">
        <Steps
          current={journeyStep}
          items={[
            {
              title: "Đã đặt lịch",
              description: "Lễ tân đã nhận lịch",
            },
            {
              title: "Đã check-in",
              description: ticket ? `Số thứ tự ${ticket.number}` : "Thực hiện khi đến",
            },
            {
              title: "Vào phòng khám",
              description:
                journeyStep === 2
                  ? ticket?.room ?? "Đang phục vụ"
                  : "Chờ lễ tân điều phối",
            },
          ]}
        />
      </Card>

      <div className="appointment-detail-grid">
        <Card
          className="appointment-info-card"
          title="Thông tin lịch khám"
        >
          <div className="appointment-time-hero">
            <div className="appointment-calendar-icon">
              <CalendarDays size={24} />
            </div>
            <div>
              <Text type="secondary">Thời gian khám</Text>
              <Title level={4}>{appointment.time}</Title>
              <Text>{appointment.date}</Text>
            </div>
          </div>
          <Descriptions
            column={1}
            colon={false}
            items={[
              {
                key: "patient",
                label: <span><UserRound size={14} /> Bệnh nhân</span>,
                children: patient?.name ?? appointment.patientId,
              },
              {
                key: "doctor",
                label: <span><Stethoscope size={14} /> Bác sĩ</span>,
                children: doctor?.name ?? appointment.doctorId,
              },
              {
                key: "clinic",
                label: <span><Building2 size={14} /> Cơ sở khám</span>,
                children: appointment.clinicName ?? "DermaHealth TP.HCM",
              },
              {
                key: "department",
                label: <span><MapPinned size={14} /> Chuyên khoa</span>,
                children: appointment.department ?? "Da liễu",
              },
              {
                key: "mode",
                label: <span><Clock3 size={14} /> Hình thức</span>,
                children:
                  appointment.consultationType ??
                  (appointment.mode === "in_person"
                    ? "Khám tại phòng khám"
                    : "Khám trực tuyến"),
              },
            ]}
          />
          <Space wrap className="appointment-actions">
            {appointment.encounterId && (
              <Button
                icon={<MapPinned size={15} />}
                href={`/app/patient-journey/${appointment.encounterId}`}
              >
                Theo dõi tiến trình
              </Button>
            )}
            <Button
              icon={<ClipboardList size={15} />}
              href={`/app/appointments/${appointment.id}/consultation`}
            >
              Chuẩn bị lượt khám
            </Button>
          </Space>
        </Card>

        {ticket ? (
          <Card className="queue-ticket-card" title="Hàng đợi khám">
            <Text type="secondary">Số thứ tự</Text>
            <div className="queue-number">{ticket.number}</div>
            <div className="queue-stats">
              <div>
                <strong>{ticket.peopleAhead}</strong>
                <span>người phía trước</span>
              </div>
              <div>
                <strong>{ticket.estimatedWaitMinutes}</strong>
                <span>phút dự kiến</span>
              </div>
            </div>
            <Text>
              {ticket.department} · {ticket.room ?? ticket.waitingArea}
            </Text>
          </Card>
        ) : (
          <Card className="checkin-card" title="Check-in tại phòng khám">
            <div className="checkin-icon"><QrCode size={26} /></div>
            <Title level={5}>Chưa check-in</Title>
            <Text type="secondary">
              Khi đến phòng khám, sử dụng mã QR để lễ tân đưa bệnh nhân vào
              hàng đợi.
            </Text>
            <Button
              block
              type="primary"
              icon={<QrCode size={15} />}
              href={
                hasRoleAccess(currentUser.role, ["receptionist"])
                  ? "/app/reception/qr-check-in"
                  : "/kiosk/check-in"
              }
            >
              Mở màn hình check-in
            </Button>
          </Card>
        )}
      </div>

      {token ? (
        <AppointmentQRCode
          appointment={appointment}
          token={token}
          doctorName={doctor?.name ?? "Bác sĩ DermaHealth"}
          actorId={currentUser.id}
          canRegenerate={canManageQr}
        />
      ) : (
        <Card className="qr-empty-card">
          <div className="qr-empty-content">
            <div className="qr-empty-icon"><QrCode size={25} /></div>
            <div>
              <Text strong>Mã QR check-in chưa được phát hành</Text>
              <Text type="secondary">
                {canManageQr
                  ? "Phát hành mã để bệnh nhân sử dụng khi đến phòng khám."
                  : "Vui lòng liên hệ lễ tân để nhận mã QR check-in."}
              </Text>
            </div>
            {canManageQr && (
              <Button
                type="primary"
                icon={<QrCode size={15} />}
                loading={issuingQr}
                onClick={() => void createQr()}
              >
                Phát hành QR
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
