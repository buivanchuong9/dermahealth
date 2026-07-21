import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Col, Row, Statistic, Typography } from 'antd';
import { ListChecks, QrCode, Users } from 'lucide-react';
import { useStore } from '../state/useStore';
import { appointmentRepository, queueRepository } from '../domain/repositories';
import * as receptionApi from '../api/reception';
import type { ReceptionSummaryResponseDto } from '../api/types';

const { Title, Text } = Typography;

export default function Reception() {
  const localTickets = useStore(queueRepository);
  const localAppointments = useStore(appointmentRepository);
  const [summary, setSummary] = useState<ReceptionSummaryResponseDto | null>(null);

  // Load live summary from API — provides server-side counts across all clients
  const loadSummary = useCallback(async () => {
    try {
      const res = await receptionApi.summary({ clinicLocationId: 'CS-HCM-01' });
      setSummary(res.data);
    } catch {
      // Fall back to domain repository counts
    }
  }, []);

  useEffect(() => {
    loadSummary();
    // Poll every 30 seconds to keep counters fresh
    const interval = setInterval(loadSummary, 30_000);
    return () => clearInterval(interval);
  }, [loadSummary]);

  // Prefer API data; fall back to local counts when API is unavailable
  const upcomingCount = summary?.upcomingAppointments ?? localAppointments.filter(a => a.status === 'upcoming').length;
  const waitingCount = summary?.waitingCount ?? localTickets.filter(t => t.status === 'waiting').length;
  const inServiceCount = summary?.inServiceCount ?? localTickets.filter(t => ['called', 'in_service'].includes(t.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Title level={3}>Trung tâm điều phối lễ tân</Title>
        {summary && <Text type="secondary" style={{ fontSize: 12 }}>Số liệu từ API máy chủ · tự động cập nhật mỗi 30 giây</Text>}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card><Statistic title="Lịch hẹn sắp tới" value={upcomingCount} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Đang chờ" value={waitingCount} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Đang gọi / phục vụ" value={inServiceCount} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Check-in bệnh nhân">
            <Text>Quét và xác thực QR lịch hẹn tại quầy.</Text>
            <Button type="primary" block icon={<QrCode size={16} />} href="/app/reception/qr-check-in" style={{ marginTop: 16 }}>
              Mở máy quét QR
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Điều phối hàng đợi">
            <Text>Gọi số, xác nhận bệnh nhân và bắt đầu phục vụ.</Text>
            <Button block icon={<ListChecks size={16} />} href="/app/reception/queue" style={{ marginTop: 16 }}>
              Mở hàng đợi
            </Button>
          </Card>
        </Col>
      </Row>

      <Button icon={<Users size={16} />} href="/app/appointments">Tra cứu lịch hẹn</Button>
    </div>
  );
}
