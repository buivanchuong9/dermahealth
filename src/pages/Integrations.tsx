import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Typography, App as AntApp, Spin } from 'antd';
import { Plug, RotateCcw, RefreshCw } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { integrationRepository } from '../domain/repositories';
import { type IntegrationStatus } from '../domain/core/enums';
import { hasRoleAccess } from '../domain/core/role';
import { AccessDenied } from '../components/feedback/AccessDenied';
import {
  listIntegrationConnections,
  listIntegrationMessages,
  reconcileIntegrationConnection,
  retryIntegrationConnection,
} from '../api/integrations';
import { getLiveHealth, getReadyHealth } from '../api/health';

const { Title, Text } = Typography;
const STATUS_COLOR: Record<IntegrationStatus, string> = { healthy: 'success', degraded: 'gold', down: 'red' };
const STATUS_LABEL: Record<IntegrationStatus, string> = { healthy: 'Hoạt động tốt', degraded: 'Suy giảm', down: 'Gián đoạn' };
const MSG_STATUS_LABEL: Record<string, string> = { pending: 'Đang chờ', delivered: 'Đã gửi', failed: 'Thất bại', duplicate_rejected: 'Trùng lặp (đã từ chối)' };

export default function Integrations() {
  const { message } = AntApp.useApp();
  const { role } = useAppState();
  const connections = useStore(integrationRepository.connections());
  const messages = useStore(integrationRepository.messages());
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'retry' | 'reconcile'>();
  const [health, setHealth] = useState({ live: false, ready: false, checked: false });
  const selected = connections.find((item) => item.id === selectedId) ?? null;

  const loadConnections = useCallback(async () => {
    const rows = await listIntegrationConnections();
    integrationRepository.connections().replaceAll(rows);
    setSelectedId((current) =>
      current && rows.some((row) => row.id === current)
        ? current
        : rows[0]?.id,
    );
  }, []);

  const loadMessages = useCallback(async (connectionId: string) => {
    const rows = await listIntegrationMessages(connectionId);
    const otherRows = integrationRepository
      .messages()
      .getAll()
      .filter((row) => row.connectionId !== connectionId);
    integrationRepository.messages().replaceAll([...otherRows, ...rows]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConnections()
        .catch((error: unknown) => {
          void message.error(
            error instanceof Error
              ? error.message
              : 'Không tải được trạng thái tích hợp.',
          );
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConnections, message]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.allSettled([getLiveHealth(), getReadyHealth()]).then(([live, ready]) => {
        setHealth({
          live: live.status === 'fulfilled',
          ready: ready.status === 'fulfilled',
          checked: true,
        });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      void loadMessages(selectedId).catch((error: unknown) => {
        void message.error(
          error instanceof Error
            ? error.message
            : 'Không tải được lịch sử tích hợp.',
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMessages, message, selectedId]);

  if (!hasRoleAccess(role, ['system_administrator', 'medical_administrator', 'super_administrator'])) {
    return <AccessDenied featureName="Tình trạng tích hợp" allowedRoles={['system_administrator', 'medical_administrator', 'super_administrator']} />;
  }

  const retry = async (connectionId: string) => {
    setAction('retry');
    try {
      await retryIntegrationConnection(connectionId);
      await Promise.all([loadConnections(), loadMessages(connectionId)]);
      void message.success('Đã gửi yêu cầu thử lại các tin nhắn lỗi.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Thử lại thất bại.');
    } finally {
      setAction(undefined);
    }
  };

  const reconcile = async (connectionId: string) => {
    setAction('reconcile');
    try {
      await reconcileIntegrationConnection(connectionId);
      await Promise.all([loadConnections(), loadMessages(connectionId)]);
      void message.success('Đã gửi yêu cầu đối soát thủ công.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Đối soát thất bại.');
    } finally {
      setAction(undefined);
    }
  };

  if (loading) return <Spin size="large" tip="Đang tải trạng thái tích hợp…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Tình Trạng Tích Hợp</Title>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Text strong>Health / Live</Text>
            <Tag color={!health.checked ? 'default' : health.live ? 'success' : 'error'} style={{ float: 'right' }}>
              {!health.checked ? 'Đang kiểm tra' : health.live ? 'Đang hoạt động' : 'Không phản hồi'}
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Text strong>Health / Ready</Text>
            <Tag color={!health.checked ? 'default' : health.ready ? 'success' : 'error'} style={{ float: 'right' }}>
              {!health.checked ? 'Đang kiểm tra' : health.ready ? 'Sẵn sàng nhận tải' : 'Chưa sẵn sàng'}
            </Tag>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        {connections.map((c) => (
          <Col xs={24} sm={12} md={8} key={c.id}>
            <Card size="small" hoverable onClick={() => setSelectedId(c.id)} style={{ borderColor: selected?.id === c.id ? 'var(--medical-blue-500)' : undefined }}>
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
            <Button size="small" loading={action === 'retry'} disabled={Boolean(action)} icon={<RotateCcw size={13} />} onClick={() => void retry(selected.id)}>Thử lại tin nhắn lỗi</Button>
            <Button size="small" loading={action === 'reconcile'} disabled={Boolean(action)} icon={<RefreshCw size={13} />} onClick={() => void reconcile(selected.id)}>Đối soát thủ công</Button>
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
