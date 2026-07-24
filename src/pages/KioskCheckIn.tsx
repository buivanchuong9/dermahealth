import { useState } from 'react';
import { Button, Card, Input, Result, Space, Statistic, Typography } from 'antd';
import { QrCode, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { QueueTicket } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { checkIn } from '../api/reception';
import { queueRepository } from '../domain/repositories';
const { Title, Text } = Typography;

export function QueueResult({ ticket, onReset }: { ticket: QueueTicket; onReset?: () => void }) {
  return <Result status="success" title="Check-in thành công" subTitle="Vui lòng giữ số thứ tự và theo dõi bảng gọi số."
    extra={<Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Statistic title="Số thứ tự của bạn" value={ticket.number} valueStyle={{ color: '#1769aa', fontSize: 56, fontWeight: 800 }} />
      <Space wrap size="large"><Statistic title="Số người phía trước" value={ticket.peopleAhead}/><Statistic title="Thời gian chờ dự kiến" value={ticket.estimatedWaitMinutes} suffix="phút"/></Space>
      <Card size="small"><Text strong>{ticket.department} · {ticket.waitingArea}</Text><br/><Text>Phòng dự kiến: {ticket.room ?? 'Sẽ thông báo'}</Text>{ticket.preparationInstructions.map((x) => <div key={x}>• {x}</div>)}</Card>
      {onReset && <Button icon={<RotateCcw size={15}/>} onClick={onReset}>Check-in lượt khác</Button>}
    </Space>} />;
}
export default function KioskCheckIn({ reception = false }: { reception?: boolean }) {
  const showError = useFriendlyError(); const nav = useNavigate(); const location = useLocation();
  const initial = (location.state as { ticket?: QueueTicket } | null)?.ticket;
  const [token, setToken] = useState(''); const [ticket, setTicket] = useState<QueueTicket | undefined>(initial); const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!token.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await checkIn({
        token: token.trim(),
        clinicLocationId: import.meta.env.VITE_KIOSK_CLINIC_LOCATION_ID ?? import.meta.env.VITE_CLINIC_LOCATION_ID ?? 'CS-HCM-01',
        deviceId: import.meta.env.VITE_KIOSK_DEVICE_ID ?? (reception ? 'RECEPTION-01' : 'KIOSK-01'),
        deviceSecret: import.meta.env.VITE_KIOSK_DEVICE_SECRET ?? '',
        patientId: import.meta.env.VITE_KIOSK_PATIENT_ID || undefined,
      });
      queueRepository.upsert(result);
      setTicket(result);
      if (!reception) nav('/kiosk/check-in/result', { replace: true, state: { ticket: result } });
    } catch (error) {
      showError(error, 'Không thể check-in');
    } finally {
      setSubmitting(false);
    }
  };
  return <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}><Card>
    {ticket ? <QueueResult ticket={ticket} onReset={() => { setTicket(undefined); setToken(''); nav(reception ? '/app/reception/qr-check-in' : '/kiosk/check-in', { replace: true }); }}/> : <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <QrCode size={54} color="#1769aa"/><div><Title level={2}>{reception ? 'Check-in QR tại quầy lễ tân' : 'Chào mừng đến DermaHealth'}</Title><Text>Quét mã QR trên phiếu hẹn hoặc nhập mã token từ thiết bị quét.</Text></div>
      <Input.TextArea autoFocus rows={4} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Đặt con trỏ tại đây và quét mã QR" onPressEnter={() => void submit()}/>
      <Button type="primary" size="large" block loading={submitting} disabled={!token.trim()} onClick={() => void submit()}>Xác nhận check-in</Button>
    </Space>}
  </Card></div>;
}
