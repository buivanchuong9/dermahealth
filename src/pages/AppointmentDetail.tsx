import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Descriptions, Result, Space, Tag, Typography, App, Popconfirm } from 'antd';
import { ArrowLeft, ClipboardList, MapPinned, QrCode, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useAppState } from '../state/useAppState';
import { appointmentCheckInTokenRepository, appointmentRepository, queueRepository, userRepository } from '../domain/repositories';
import * as appointmentsApi from '../api/appointments';
import type { AppointmentResponseDto } from '../api/types';
import { AppointmentQRCode } from '../components/appointments/AppointmentQRCode';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { hasRoleAccess } from '../domain/core/role';

const { Title, Text } = Typography;

export default function AppointmentDetail({ consultation = false }: { consultation?: boolean }) {
  const { appointmentId } = useParams();
  const { currentUser } = useAppState();
  const { message } = App.useApp();
  const showError = useFriendlyError();

  // Domain repo (local data – immediate display)
  const appointments = useStore(appointmentRepository);
  const tokens = useStore(appointmentCheckInTokenRepository);
  const tickets = useStore(queueRepository);
  const users = useStore(userRepository);

  // API state
  const [apiAppointment, setApiAppointment] = useState<AppointmentResponseDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const localAppointment = appointments.find(a => a.id === appointmentId);

  // Load appointment detail from API
  const loadDetail = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const res = await appointmentsApi.detail(appointmentId);
      setApiAppointment(res.data);
    } catch {
      // Fall back to domain repo data silently
    }
  }, [appointmentId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  if (!localAppointment) return (
    <Result status="404" title="Không tìm thấy lịch hẹn" extra={<Button href="/app/appointments">Về danh sách lịch hẹn</Button>} />
  );

  const token = tokens
    .filter(t => t.appointmentId === localAppointment.id && ['active', 'used'].includes(t.status))
    .sort((a, b) => b.version - a.version)[0];
  const ticket = tickets.find(t => t.appointmentId === localAppointment.id);
  const doctor = users.find(u => u.id === localAppointment.doctorId);

  // Use API status if available (more up-to-date), else fall back to local
  const status = apiAppointment?.status ?? localAppointment.status;

  const handleCancel = async () => {
    if (!appointmentId) return;
    setCancelling(true);
    try {
      await appointmentsApi.cancel(appointmentId, { reason: 'Bệnh nhân yêu cầu hủy lịch', version: 1 });
      message.success('Đã hủy lịch hẹn thành công.');
      await loadDetail(); // Refresh status from API
    } catch (err) {
      showError(err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to="/app/appointments"><ArrowLeft size={14} /> Quay lại lịch hẹn</Link>

      <div>
        <Title level={3}>{consultation ? 'Chuẩn bị lượt khám' : `Chi tiết lịch hẹn ${localAppointment.id}`}</Title>
        <Text type="secondary">
          {apiAppointment ? 'Dữ liệu từ API máy chủ.' : 'Dữ liệu đọc từ Appointment Repository (chờ API phản hồi).'}
        </Text>
      </div>

      <Card>
        <Descriptions column={{ xs: 1, md: 2 }} items={[
          {
            key: 'status', label: 'Trạng thái',
            children: <Tag color={status === 'upcoming' ? 'blue' : status === 'cancelled' ? 'red' : 'default'}>
              {status === 'upcoming' ? 'Sắp tới' : status === 'cancelled' ? 'Đã hủy' : status}
            </Tag>,
          },
          { key: 'doctor', label: 'Bác sĩ', children: doctor?.name ?? localAppointment.doctorId },
          { key: 'time', label: 'Thời gian', children: `${localAppointment.time}, ${localAppointment.date}` },
          { key: 'clinic', label: 'Phòng khám', children: localAppointment.clinicName ?? 'DermaHealth TP.HCM' },
          { key: 'department', label: 'Khoa', children: localAppointment.department ?? 'Khoa Da liễu' },
          { key: 'encounter', label: 'Lượt khám dự kiến', children: localAppointment.encounterId ?? 'Chưa tạo' },
        ]} />

        <Space wrap style={{ marginTop: 16 }}>
          <Button icon={<QrCode size={15} />} href="/kiosk/check-in">Check-in bằng QR</Button>
          {localAppointment.encounterId && (
            <Button icon={<MapPinned size={15} />} href={`/app/patient-journey/${localAppointment.encounterId}`}>Theo dõi tiến trình</Button>
          )}
          <Button icon={<ClipboardList size={15} />} href={`/app/appointments/${localAppointment.id}/consultation`}>Chuẩn bị lượt khám</Button>
          {status === 'upcoming' && (
            <Popconfirm
              title="Xác nhận hủy lịch hẹn"
              description="Bạn có chắc muốn hủy lịch hẹn này không?"
              okText="Hủy lịch"
              okButtonProps={{ danger: true, loading: cancelling }}
              cancelText="Giữ lại"
              onConfirm={handleCancel}
            >
              <Button danger icon={<XCircle size={15} />} loading={cancelling}>Hủy lịch hẹn</Button>
            </Popconfirm>
          )}
        </Space>
      </Card>

      {ticket && (
        <Card title="Số thứ tự hiện tại">
          <Title>{ticket.number}</Title>
          <Text>{ticket.department} · {ticket.room} · {ticket.estimatedWaitMinutes} phút dự kiến</Text>
        </Card>
      )}

      {token
        ? <AppointmentQRCode appointment={localAppointment} token={token} doctorName={doctor?.name ?? 'Bác sĩ DermaHealth'} actorId={currentUser.id} canRegenerate={hasRoleAccess(currentUser.role, ['receptionist', 'medical_administrator'])} />
        : <ProfessionalEmpty title="Chưa có mã QR" description="Mã QR sẽ được phát hành khi lịch hẹn được xác nhận." primaryLabel="Về danh sách lịch hẹn" primaryHref="/app/appointments" />
      }
    </div>
  );
}
