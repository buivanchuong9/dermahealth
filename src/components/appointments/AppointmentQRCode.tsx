import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { App, Button, Card, Descriptions, Modal, Space, Typography } from 'antd';
import { Copy, Download, Maximize2, Printer, RefreshCw } from 'lucide-react';
import type { Appointment, AppointmentCheckInToken } from '../../domain/core/entities';
import { checkInService } from '../../domain/services/checkInService';
import type { UserId } from '../../domain/core/ids';
import styles from './AppointmentQRCode.module.scss';

const { Text, Title } = Typography;
export function AppointmentQRCode({ appointment, token, doctorName, actorId, canRegenerate = false }: { appointment: Appointment; token: AppointmentCheckInToken; doctorName: string; actorId: UserId; canRegenerate?: boolean }) {
  const { message } = App.useApp();
  const [large, setLarge] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const download = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a'); link.download = `QR-${appointment.id}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  };
  const print = () => window.print();
  const regenerate = () => { checkInService.issueToken(appointment.id, actorId); message.success('Đã tạo mã QR mới và vô hiệu hóa mã cũ.'); };
  const qr = (size: number) => <QRCodeCanvas value={token.token} size={size} level="M" marginSize={2} aria-label={`Mã QR check-in lịch hẹn ${appointment.id}`} />;
  return <Card className={styles.card} title="Mã QR check-in">
    <div className={styles.layout}>
      <div ref={qrRef} className={styles.qr}>{qr(190)}<Text strong>Quét mã này khi đến phòng khám</Text></div>
      <div className={styles.details}>
        <Title level={4}>{appointment.id}</Title>
        <Descriptions size="small" column={1} items={[
          { key: 'time', label: 'Ngày và giờ', children: `${appointment.time}, ${appointment.date}` },
          { key: 'clinic', label: 'Phòng khám', children: appointment.clinicName ?? 'DermaHealth TP.HCM' },
          { key: 'doctor', label: 'Bác sĩ', children: doctorName },
          { key: 'type', label: 'Hình thức', children: appointment.consultationType ?? (appointment.mode === 'in_person' ? 'Khám tại phòng khám' : 'Khám trực tuyến') },
          { key: 'expires', label: 'QR hết hạn', children: new Date(token.expiresAt).toLocaleString('vi-VN') },
        ]} />
        <Space wrap>
          <Button icon={<Maximize2 size={15}/>} onClick={() => setLarge(true)}>Phóng to mã QR</Button>
          <Button icon={<Download size={15}/>} onClick={download}>Tải mã QR</Button>
          <Button icon={<Printer size={15}/>} onClick={print}>In phiếu hẹn</Button>
          <Button icon={<Copy size={15}/>} onClick={() => navigator.clipboard.writeText(appointment.id).then(() => message.success('Đã sao chép mã lịch hẹn.'))}>Sao chép mã lịch hẹn</Button>
          {canRegenerate && <Button icon={<RefreshCw size={15}/>} onClick={regenerate}>Tạo lại QR</Button>}
        </Space>
      </div>
    </div>
    <Modal open={large} onCancel={() => setLarge(false)} footer={null} title={`Mã QR ${appointment.id}`} centered><div className={styles.large}>{qr(320)}<Text>Quét mã này khi đến phòng khám</Text></div></Modal>
  </Card>;
}
