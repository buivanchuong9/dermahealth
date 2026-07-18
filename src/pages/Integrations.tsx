import { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, App as AntApp } from 'antd';
import { Plug, RotateCcw, RefreshCw } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { integrationRepository } from '../domain/repositories';
import type { IntegrationConnection } from '../domain/core/entities';
import { type IntegrationStatus } from '../domain/core/enums';
import { hasRoleAccess } from '../domain/core/role';
import { AccessDenied } from '../components/feedback/AccessDenied';

const { Title, Text } = Typography;
const STATUS_COLOR: Record<IntegrationStatus, string> = { healthy: 'success', degraded: 'gold', down: 'red' };
const STATUS_LABEL: Record<IntegrationStatus, string> = { healthy: 'Hoạt động tốt', degraded: 'Suy giảm', down: 'Gián đoạn' };
const MSG_STATUS_LABEL: Record<string, string> = { pending: 'Đang chờ', delivered: 'Đã gửi', failed: 'Thất bại', duplicate_rejected: 'Trùng lặp (đã từ chối)' };

export default function Integrations() {
  const { message } = AntApp.useApp();
  const { role } = useAppState();
  const connections = useStore(integrationRepository.connections());
  const messages = useStore(integrationRepository.messages());
  const [selected, setSelected] = useState<IntegrationConnection | null>(null);

  if (!hasRoleAccess(role, ['system_administrator', 'medical_administrator'])) {
    return <AccessDenied featureName="Tình trạng tích hợp" allowedRoles={['system_administrator', 'medical_administrator']} />;
  }

  const retry = (connectionId: string) => {
    const msgs = integrationRepository.messages().getAll().filter((m) => m.connectionId === connectionId && m.status === 'failed');
    msgs.forEach((m) => integrationRepository.messages().upsert({ ...m, status: 'delivered' }));
    const conn = integrationRepository.connections().getById(connectionId);
    if (conn) integrationRepository.connections().upsert({ ...conn, status: 'healthy', pendingMessages: Math.max(0, conn.pendingMessages - msgs.length), lastSuccessAt: new Date().toISOString() });
    message.success('Đã thử lại các tin nhắn lỗi.');
  };

  const reconcile = (connectionId: string) => {
    const conn = integrationRepository.connections().getById(connectionId);
    if (conn) integrationRepository.connections().upsert({ ...conn, deadLetterCount: 0, retryCount: 0 });
    message.success('Đã đối soát thủ công.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Tình Trạng Tích Hợp</Title>
      </div>

      <Row gutter={[12, 12]}>
        {connections.map((c) => (
          <Col xs={24} sm={12} md={8} key={c.id}>
            <Card size="small" hoverable onClick={() => setSelected(c)} style={{ borderColor: selected?.id === c.id ? 'var(--medical-blue-500)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13.5 }}><Plug size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{c.name}</Text>
                <Tag color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>Đang chờ: {c.pendingMessages} · Thử lại: {c.retryCount} · Dead-letter: {c.deadLetterCount}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {selected && (
        <Card
          title={selected.name}
          size="small"
          extra={<div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<RotateCcw size={13} />} onClick={() => retry(selected.id)}>Thử lại tin nhắn lỗi</Button>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={() => reconcile(selected.id)}>Đối soát thủ công</Button>
          </div>}
        >
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}><Text type="secondary" style={{ fontSize: 12 }}>Lần thành công cuối</Text><br /><Text style={{ fontSize: 13 }}>{selected.lastSuccessAt ? new Date(selected.lastSuccessAt).toLocaleString('vi-VN') : '—'}</Text></Col>
            <Col xs={24} sm={12} md={6}><Text type="secondary" style={{ fontSize: 12 }}>Lần lỗi cuối</Text><br /><Text style={{ fontSize: 13 }}>{selected.lastFailureAt ? new Date(selected.lastFailureAt).toLocaleString('vi-VN') : '—'}</Text></Col>
            <Col xs={24} sm={12} md={6}><Text type="secondary" style={{ fontSize: 12 }}>Tin nhắn đang chờ</Text><br /><Text style={{ fontSize: 13 }}>{selected.pendingMessages}</Text></Col>
            <Col xs={24} sm={12} md={6}><Text type="secondary" style={{ fontSize: 12 }}>Dead-letter</Text><br /><Text style={{ fontSize: 13 }}>{selected.deadLetterCount}</Text></Col>
          </Row>
          <Table
            size="small"
            scroll={{ x: 'max-content' }}
            rowKey="id"
            pagination={false}
            dataSource={messages.filter((m) => m.connectionId === selected.id)}
            columns={[
              { title: 'Mã tương quan', dataIndex: 'correlationId' },
              { title: 'Idempotency key', dataIndex: 'idempotencyKey', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
              { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'failed' ? 'red' : v === 'delivered' ? 'success' : 'default'}>{MSG_STATUS_LABEL[v]}</Tag> },
              { title: 'Thời gian', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
