import { Button, Card, Descriptions, Result, Space, Tag, Typography } from 'antd';
import { ArrowLeft, ClipboardList, MapPinned, QrCode } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useAppState } from '../state/useAppState';
import { appointmentCheckInTokenRepository, appointmentRepository, queueRepository, userRepository } from '../domain/repositories';
import { AppointmentQRCode } from '../components/appointments/AppointmentQRCode';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { hasRoleAccess } from '../domain/core/role';
const { Title, Text } = Typography;

export default function AppointmentDetail({ consultation = false }: { consultation?: boolean }) {
  const { appointmentId } = useParams(); const { currentUser } = useAppState();
  const appointments = useStore(appointmentRepository); const tokens = useStore(appointmentCheckInTokenRepository);
  const tickets = useStore(queueRepository); const users = useStore(userRepository);
  const appointment = appointments.find(a => a.id === appointmentId);
  if (!appointment) return <Result status="404" title="Không tìm thấy lịch hẹn" extra={<Button href="/app/appointments">Về danh sách lịch hẹn</Button>}/>;
  const token = tokens.filter(t => t.appointmentId === appointment.id && ['active','used'].includes(t.status)).sort((a,b)=>b.version-a.version)[0];
  const ticket = tickets.find(t => t.appointmentId === appointment.id); const doctor = users.find(u => u.id === appointment.doctorId);
  return <div style={{display:'flex',flexDirection:'column',gap:16}}>
    <Link to="/app/appointments"><ArrowLeft size={14}/> Quay lại lịch hẹn</Link>
    <div><Title level={3}>{consultation ? 'Chuẩn bị lượt khám' : `Chi tiết lịch hẹn ${appointment.id}`}</Title><Text type="secondary">Thông tin được đọc từ Appointment Repository.</Text></div>
    <Card><Descriptions column={{xs:1,md:2}} items={[
      {key:'status',label:'Trạng thái',children:<Tag color={appointment.status==='upcoming'?'blue':'default'}>{appointment.status==='upcoming'?'Sắp tới':appointment.status}</Tag>},
      {key:'doctor',label:'Bác sĩ',children:doctor?.name ?? appointment.doctorId},{key:'time',label:'Thời gian',children:`${appointment.time}, ${appointment.date}`},
      {key:'clinic',label:'Phòng khám',children:appointment.clinicName ?? 'DermaHealth TP.HCM'},{key:'department',label:'Khoa',children:appointment.department ?? 'Khoa Da liễu'},
      {key:'encounter',label:'Lượt khám dự kiến',children:appointment.encounterId ?? 'Chưa tạo'},
    ]}/><Space wrap style={{marginTop:16}}><Button icon={<QrCode size={15}/>} href="/kiosk/check-in">Check-in bằng QR</Button>{appointment.encounterId&&<Button icon={<MapPinned size={15}/>} href={`/app/patient-journey/${appointment.encounterId}`}>Theo dõi tiến trình</Button>}<Button icon={<ClipboardList size={15}/>} href={`/app/appointments/${appointment.id}/consultation`}>Chuẩn bị lượt khám</Button></Space></Card>
    {ticket && <Card title="Số thứ tự hiện tại"><Title>{ticket.number}</Title><Text>{ticket.department} · {ticket.room} · {ticket.estimatedWaitMinutes} phút dự kiến</Text></Card>}
    {token ? <AppointmentQRCode appointment={appointment} token={token} doctorName={doctor?.name ?? 'Bác sĩ DermaHealth'} actorId={currentUser.id} canRegenerate={hasRoleAccess(currentUser.role, ['receptionist', 'medical_administrator'])}/> : <ProfessionalEmpty title="Chưa có mã QR" description="Mã QR sẽ được phát hành khi lịch hẹn được xác nhận." primaryLabel="Về danh sách lịch hẹn" primaryHref="/app/appointments"/>}
  </div>;
}
