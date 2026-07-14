import { App, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd';
import { BellRing, Check, LogIn, Route, SkipForward } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { queueRepository } from '../domain/repositories';
import { queueService } from '../domain/services/queueService';
import type { QueueTicket } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
const { Title, Text } = Typography;
const labels: Record<QueueTicket['status'], string> = { waiting: 'Đang chờ', called: 'Đang gọi', acknowledged: 'Đã xác nhận', in_service: 'Đang phục vụ', skipped: 'Tạm bỏ qua', completed: 'Hoàn tất', routed: 'Đã chuyển trạm' };
const announce = (ticket: QueueTicket) => { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(`Mời số ${ticket.number.split('').join(' ')}, đến ${ticket.room ?? ticket.serviceStation}`); u.lang = 'vi-VN'; window.speechSynthesis.speak(u); };
export default function ClinicQueue({ board = false }: { board?: boolean }) {
  const tickets = useStore(queueRepository); const { currentUser } = useAppState(); const { message } = App.useApp(); const showError = useFriendlyError();
  const called = [...tickets].filter((t) => t.status === 'called').sort((a,b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''))[0];
  if (board) return <div style={{ minHeight: '100vh', background: '#082b49', color: 'white', padding: 32 }}><Title style={{ color: 'white', textAlign: 'center' }}>DERMAHEALTH · BẢNG GỌI SỐ</Title><Row gutter={24} justify="center"><Col xs={24} lg={14}><Card style={{ textAlign: 'center', border: called ? '5px solid #35c98b' : undefined }}><Text>ĐANG MỜI</Text><div style={{ fontSize: 'clamp(70px,15vw,170px)', fontWeight: 900, color: '#1769aa' }}>{called?.number ?? '—'}</div><Title level={2}>{called?.room ?? 'Vui lòng chờ gọi số'}</Title></Card></Col><Col xs={24} lg={8}><Card title="Các số đang chờ">{tickets.filter(t=>t.status==='waiting').slice(0,8).map(t=><div key={t.id} style={{fontSize:28,padding:10,borderBottom:'1px solid #ddd'}}>{t.number} <Text type="secondary">· {t.department}</Text></div>)}</Card></Col></Row></div>;
  const act = (fn: () => QueueTicket, success: string, voice = false) => { try { const t = fn(); if (voice) announce(t); message.success(success); } catch(e) { showError(e); } };
  return <div style={{ display:'flex', flexDirection:'column', gap:16 }}><div><Title level={3}>Hàng đợi khám bệnh</Title></div><Space><Button type="primary" icon={<BellRing size={16}/>} onClick={()=>act(()=>queueService.callNext('Khoa Da liễu',currentUser.id),'Đã gọi bệnh nhân tiếp theo.',true)}>Gọi số tiếp theo</Button><Button href="/display/queue" target="_blank">Mở bảng hiển thị</Button></Space>
    <Card><Table rowKey="id" dataSource={tickets} locale={{emptyText:<ProfessionalEmpty title="Chưa có bệnh nhân check-in" description="Hàng đợi sẽ cập nhật ngay khi bệnh nhân quét mã QR." primaryLabel="Mở check-in QR" primaryHref="/app/reception/qr-check-in"/>}} columns={[
      {title:'Số',dataIndex:'number',render:v=><Title level={4} style={{margin:0}}>{v}</Title>},{title:'Khoa',dataIndex:'department'},{title:'Khu vực',dataIndex:'waitingArea'},{title:'Trạng thái',dataIndex:'status',render:(v:QueueTicket['status'])=><Tag color={v==='called'?'blue':v==='in_service'?'green':'default'}>{labels[v]}</Tag>},
      {title:'Thao tác',render:(_:unknown,t:QueueTicket)=><Space wrap>{t.status==='called'&&<><Button icon={<BellRing size={14}/>} onClick={()=>announce(t)}>Gọi lại</Button><Button icon={<Check size={14}/>} onClick={()=>act(()=>queueService.acknowledge(t.id,currentUser.id),'Đã xác nhận bệnh nhân.')}>Xác nhận</Button><Button danger icon={<SkipForward size={14}/>} onClick={()=>act(()=>queueService.skip(t.id,currentUser.id),'Đã tạm bỏ qua.')}>Bỏ qua</Button></>}{t.status==='acknowledged'&&<Button type="primary" icon={<LogIn size={14}/>} onClick={()=>act(()=>queueService.startService(t.id,currentUser.id),'Đã bắt đầu phục vụ.')}>Bắt đầu phục vụ</Button>}{t.status==='in_service'&&<Button icon={<Route size={14}/>} onClick={()=>act(()=>queueService.complete(t.id,currentUser.id),'Đã hoàn tất lượt phục vụ.')}>Hoàn tất</Button>}</Space>}
    ]}/></Card></div>;
}
