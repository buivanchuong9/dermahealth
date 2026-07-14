import { useState } from 'react';
import { Row, Col, Card, Progress, Button, Tag, Collapse, Typography, Alert, Statistic } from 'antd';
import { Pill, Clock, CheckCircle, TriangleAlert, Bell, FileText, Plus, Calendar } from 'lucide-react';
import { mockPrescriptions, mockMedicineReminders } from '../data/mockData';

const { Title, Text } = Typography;

const WEEK_SCHEDULE = [
  { day: 'Thứ 2', date: '09/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
  { day: 'Thứ 3', date: '10/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
  { day: 'Thứ 4', date: '11/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
  { day: 'Thứ 5', date: '12/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
  { day: 'Thứ 6', date: '13/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'today' },
  { day: 'Thứ 7', date: '14/10', meds: ['Tretinoin', 'Omega-3'], status: 'upcoming' },
  { day: 'CN', date: '15/10', meds: ['Tretinoin', 'Omega-3'], status: 'upcoming' },
];

export default function Prescriptions() {
  const [reminders, setReminders] = useState(mockMedicineReminders);
  const toggleTaken = (id: number) => setReminders((r) => r.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)));
  const takenCount = reminders.filter((r) => r.taken).length;
  const pct = Math.round((takenCount / reminders.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Đơn Thuốc</Title>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<FileText size={15} />}>Lịch sử đơn thuốc</Button>
          <Button type="primary" icon={<Plus size={16} />}>Yêu cầu tái kê đơn</Button>
        </div>
      </div>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card
            title={<span><Pill size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Thuốc hôm nay</span>}
            extra={<Statistic value={pct} suffix="%" valueStyle={{ fontSize: 22, color: 'var(--medical-blue-700)' }} />}
            size="small"
          >
            <Progress percent={pct} showInfo={false} strokeColor="var(--medical-blue-600)" style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminders.map((med) => (
                <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: med.taken ? 'var(--success-bg)' : 'var(--surface-subtle)', border: `1px solid ${med.taken ? 'rgba(35,138,87,0.25)' : 'var(--border-default)'}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: med.taken ? 'var(--success)' : 'var(--medical-blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pill size={16} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13.5, display: 'block' }}>{med.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}><Clock size={11} style={{ verticalAlign: -1 }} /> {med.time} · {med.type}</Text>
                  </div>
                  <Button
                    shape="circle" size="small"
                    type={med.taken ? 'primary' : 'default'}
                    style={med.taken ? { background: 'var(--success)', borderColor: 'var(--success)' } : undefined}
                    icon={med.taken ? <CheckCircle size={14} /> : undefined}
                    onClick={() => toggleTaken(med.id)}
                  />
                </div>
              ))}
            </div>
            <Button block style={{ marginTop: 16 }} icon={<Bell size={15} />}>Đặt nhắc nhở tùy chỉnh</Button>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={<span><Calendar size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Lịch dùng thuốc tuần này</span>} size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WEEK_SCHEDULE.map((d) => (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8, background: d.status === 'today' ? 'var(--surface-selected)' : 'var(--surface-subtle)', border: `1px solid ${d.status === 'today' ? 'var(--medical-blue-200)' : 'var(--border-default)'}` }}>
                  <div style={{ textAlign: 'center', minWidth: 38 }}>
                    <Text type="secondary" style={{ fontSize: 10.5, fontWeight: 600, display: 'block' }}>{d.day}</Text>
                    <Text strong style={{ fontSize: 14, color: d.status === 'today' ? 'var(--medical-blue-700)' : undefined }}>{d.date.split('/')[0]}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>{d.meds.join(' · ')}</Text>
                  {d.status === 'done' && <CheckCircle size={16} color="var(--success)" />}
                  {d.status === 'today' && <Tag color="blue">Hôm nay</Tag>}
                  {d.status === 'upcoming' && <Tag>Sắp tới</Tag>}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Lịch sử đơn thuốc" size="small" extra={<Text type="secondary" style={{ fontSize: 12 }}>{mockPrescriptions.length} đơn thuốc</Text>}>
        <Collapse
          defaultActiveKey={['RX-001']}
          items={mockPrescriptions.map((rx) => ({
            key: rx.id,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: rx.status === 'active' ? 'var(--medical-blue-700)' : 'var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color={rx.status === 'active' ? 'white' : 'var(--text-muted)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'block' }}>Đơn thuốc {rx.id}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}><Calendar size={11} style={{ verticalAlign: -1 }} /> {rx.date} · {rx.doctor}</Text>
                </div>
                <Tag color={rx.status === 'active' ? 'blue' : 'default'}>{rx.status === 'active' ? 'Đang dùng' : 'Hoàn thành'}</Tag>
              </div>
            ),
            children: (
              <div>
                {rx.note && <Alert type="warning" showIcon icon={<TriangleAlert size={14} />} message={rx.note} style={{ marginBottom: 12 }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rx.medicines.map((med) => (
                    <div key={med.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface-subtle)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--medical-blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Pill size={15} color="var(--medical-blue-700)" /></div>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13.5, display: 'block' }}>{med.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{med.dose}</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: 12.5, display: 'block' }}>{med.duration}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{rx.status === 'active' ? `Còn ${med.remaining}` : 'Hoàn thành'}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
