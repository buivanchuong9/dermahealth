import { App, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { BellRing, Check, LogIn, Route, SkipForward } from 'lucide-react';
import { useStore } from '../state/useStore';
import { appointmentRepository, queueRepository } from '../domain/repositories';
import type { QueueTicket } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { acknowledgeQueueTicket, callNextQueueTicket, completeQueueTicket, skipQueueTicket, startQueueTicketService } from '../api/queue';
const { Title, Text } = Typography;
const labels: Record<QueueTicket['status'], string> = { waiting: 'Đang chờ', called: 'Đang gọi', acknowledged: 'Đã xác nhận', in_service: 'Đang phục vụ', skipped: 'Tạm bỏ qua', completed: 'Hoàn tất', routed: 'Đã chuyển trạm' };
const announce = (ticket: QueueTicket) => { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(`Mời số ${ticket.number.split('').join(' ')}, đến ${ticket.room ?? ticket.serviceStation}`); u.lang = 'vi-VN'; window.speechSynthesis.speak(u); };
export default function ClinicQueue({ board = false }: { board?: boolean }) {
  const tickets = useStore(queueRepository); const appointments = useStore(appointmentRepository); const { message } = App.useApp(); const showError = useFriendlyError(); const [calling, setCalling] = useState(false); const [actionTicketId, setActionTicketId] = useState<string>();
  const called = [...tickets].filter((t) => t.status === 'called').sort((a,b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''))[0];
  if (board) return <div style={{ minHeight: '100vh', background: '#082b49', color: 'white', padding: 32 }}><Title style={{ color: 'white', textAlign: 'center' }}>DERMAHEALTH · BẢNG GỌI SỐ</Title><Row gutter={24} justify="center"><Col xs={24} lg={14}><Card style={{ textAlign: 'center', border: called ? '5px solid #35c98b' : undefined }}><Text>ĐANG MỜI</Text><div style={{ fontSize: 'clamp(70px,15vw,170px)', fontWeight: 900, color: '#1769aa' }}>{called?.number ?? '—'}</div><Title level={2}>{called?.room ?? 'Vui lòng chờ gọi số'}</Title></Card></Col><Col xs={24} lg={8}><Card title="Các số đang chờ">{tickets.filter(t=>t.status==='waiting').slice(0,8).map(t=><div key={t.id} style={{fontSize:28,padding:10,borderBottom:'1px solid #ddd'}}>{t.number} <Text type="secondary">· {t.department}</Text></div>)}</Card></Col></Row></div>;
  const act = async (ticket: QueueTicket, fn: () => Promise<QueueTicket>, success: string) => { setActionTicketId(ticket.id); try { const updated = await fn(); queueRepository.upsert(updated); message.success(success); } catch(e) { showError(e); } finally { setActionTicketId(undefined); } };
  const callNext = async () => {
    const waiting = tickets.find((ticket) => ticket.status === 'waiting');
    if (!waiting) return message.info('Không còn bệnh nhân đang chờ.');
    const appointment = appointments.find((item) => item.id === waiting.appointmentId);
    if (!appointment?.clinicLocationId) return message.error('Lịch hẹn chưa có cơ sở khám.');
    setCalling(true);
    try {
      const updated = await callNextQueueTicket({ department: waiting.department, clinicLocationId: appointment.clinicLocationId });
      queueRepository.upsert(updated);
      announce(updated);
      message.success('Đã gọi bệnh nhân tiếp theo.');
    } catch (error) { showError(error); } finally { setCalling(false); }
  };
  return <div style={{ display:'flex', flexDirection:'column', gap:16 }}><div><Title level={3}>Hàng đợi khám bệnh</Title></div><Space><Button type="primary" loading={calling} icon={<BellRing size={16}/>} onClick={() => void callNext()}>Gọi số tiếp theo</Button><Button href="/display/queue" target="_blank">Mở bảng hiển thị</Button></Space>
    <Card><Table rowKey="id" dataSource={tickets} locale={{emptyText:<ProfessionalEmpty title="Chưa có bệnh nhân check-in" description="Hàng đợi sẽ cập nhật ngay khi bệnh nhân quét mã QR." primaryLabel="Mở check-in QR" primaryHref="/app/reception/qr-check-in"/>}} columns={[
      {title:'Số',dataIndex:'number',render:v=><Title level={4} style={{margin:0}}>{v}</Title>},{title:'Khoa',dataIndex:'department'},{title:'Khu vực',dataIndex:'waitingArea'},{title:'Trạng thái',dataIndex:'status',render:(v:QueueTicket['status'])=><Tag color={v==='called'?'blue':v==='in_service'?'green':'default'}>{labels[v]}</Tag>},
      {title:'Thao tác',render:(_:unknown,t:QueueTicket)=><Space wrap>{t.status==='called'&&<><Button icon={<BellRing size={14}/>} onClick={()=>announce(t)}>Gọi lại</Button><Button loading={actionTicketId===t.id} icon={<Check size={14}/>} onClick={()=>void act(t,()=>acknowledgeQueueTicket(t.id,t.version??0),'Đã xác nhận bệnh nhân.')}>Xác nhận</Button><Button loading={actionTicketId===t.id} danger icon={<SkipForward size={14}/>} onClick={()=>void act(t,()=>skipQueueTicket(t.id,t.version??0),'Đã tạm bỏ qua.')}>Bỏ qua</Button></>}{t.status==='acknowledged'&&<Button loading={actionTicketId===t.id} type="primary" icon={<LogIn size={14}/>} onClick={()=>void act(t,()=>startQueueTicketService(t.id,t.version??0),'Đã bắt đầu phục vụ.')}>Bắt đầu phục vụ</Button>}{t.status==='in_service'&&<Button loading={actionTicketId===t.id} icon={<Route size={14}/>} onClick={()=>void act(t,()=>completeQueueTicket(t.id,{version:t.version??0}),'Đã hoàn tất lượt phục vụ.')}>Hoàn tất</Button>}</Space>}
    ]}/></Card></div>;
}
