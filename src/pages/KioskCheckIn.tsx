import { useState } from 'react';
import { Button, Card, Input, Result, Space, Statistic, Typography, App } from 'antd';
import { QrCode, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as checkInApi from '../api/checkIn';
import type { QueueTicketResponseDto } from '../api/types';
import { useFriendlyError } from '../components/feedback/useFriendlyError';

const { Title, Text } = Typography;

// ── Queue result screen (shared by Kiosk & Reception) ───────────────────────
export function QueueResult({ ticket, onReset }: { ticket: QueueTicketResponseDto; onReset?: () => void }) {
  const room = typeof ticket.room === 'string' ? ticket.room : null;
  return (
    <Result
      status="success"
      title="Check-in thành công"
      subTitle="Vui lòng giữ số thứ tự và theo dõi bảng gọi số."
      extra={
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Statistic title="Số thứ tự của bạn" value={ticket.number} valueStyle={{ color: '#1769aa', fontSize: 56, fontWeight: 800 }} />
          <Space wrap size="large">
            <Statistic title="Số người phía trước" value={ticket.peopleAhead} />
            <Statistic title="Thời gian chờ dự kiến" value={ticket.estimatedWaitMinutes} suffix="phút" />
          </Space>
          <Card size="small">
            <Text strong>{ticket.department} · {ticket.waitingArea}</Text>
            <br />
            <Text>Phòng dự kiến: {room ?? 'Sẽ thông báo'}</Text>
            {Array.isArray(ticket.preparationInstructions) && ticket.preparationInstructions.map(x => <div key={x}>• {x}</div>)}
          </Card>
          {onReset && <Button icon={<RotateCcw size={15} />} onClick={onReset}>Check-in lượt khác</Button>}
        </Space>
      }
    />
  );
}

const DEVICE_SECRET = import.meta.env.VITE_KIOSK_DEVICE_SECRET as string | undefined ?? 'dev-secret';

export default function KioskCheckIn({ reception = false }: { reception?: boolean }) {
  const showError = useFriendlyError();
  const nav = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const initialTicket = (location.state as { ticket?: QueueTicketResponseDto } | null)?.ticket;
  const [token, setToken] = useState('');
  const [ticket, setTicket] = useState<QueueTicketResponseDto | undefined>(initialTicket);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const raw = token.trim();
    if (!raw || loading) return;
    setLoading(true);

    try {
      const res = await checkInApi.checkIn({
        token: raw,
        clinicLocationId: 'CS-HCM-01',
        deviceId: reception ? 'RECEPTION-01' : 'KIOSK-01',
        deviceSecret: DEVICE_SECRET,
      });

      const resultTicket = res.data.ticket;
      setTicket(resultTicket);

      if (res.data.repeated) {
        message.info('Bệnh nhân đã check-in trước đó. Hiển thị lại số thứ tự.');
      }

      if (!reception) {
        nav('/kiosk/check-in/result', { replace: true, state: { ticket: resultTicket } });
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicket(undefined);
    setToken('');
    nav(reception ? '/app/reception/qr-check-in' : '/kiosk/check-in', { replace: true });
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <Card>
        {ticket ? (
          <QueueResult ticket={ticket} onReset={handleReset} />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <QrCode size={54} color="#1769aa" />
            <div>
              <Title level={2}>{reception ? 'Check-in QR tại quầy lễ tân' : 'Chào mừng đến DermaHealth'}</Title>
              <Text>Quét mã QR trên phiếu hẹn hoặc nhập mã token từ thiết bị quét.</Text>
            </div>
            <Input.TextArea
              autoFocus
              rows={4}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Đặt con trỏ tại đây và quét mã QR"
              onPressEnter={submit}
            />
            <Button type="primary" size="large" block loading={loading} disabled={!token.trim()} onClick={submit}>
              Xác nhận check-in
            </Button>
          </Space>
        )}
      </Card>
    </div>
  );
}
