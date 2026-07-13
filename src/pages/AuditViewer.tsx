import { useMemo, useState } from 'react';
import { Card, Select, Table, Tag, Typography, Alert } from 'antd';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { auditRepository } from '../domain/repositories';
import { hasRoleAccess, ROLE_LABEL } from '../domain/core/enums';
import type { AuditEvent } from '../domain/core/entities';
import { AccessDenied } from '../components/feedback/AccessDenied';

const { Title, Text } = Typography;
const SEVERITY_COLOR: Record<string, string> = { info: 'default', warning: 'gold', critical: 'red' };

export default function AuditViewer() {
  const { role } = useAppState();
  const events = useStore(auditRepository);
  const [module, setModule] = useState('all');
  const [severity, setSeverity] = useState('all');

  const modules = useMemo(() => Array.from(new Set(events.map((e) => e.sourceModule))), [events]);
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  const filtered = sorted.filter((e) => (module === 'all' || e.sourceModule === module) && (severity === 'all' || e.severity === severity));

  if (!hasRoleAccess(role, ['medical_administrator', 'system_administrator'])) {
    return <AccessDenied featureName="Nhật ký kiểm toán" allowedRoles={['medical_administrator', 'system_administrator']} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Nhật Ký Kiểm Toán</Title>
      </div>

      <Card size="small">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Select style={{ width: 220 }} value={module} onChange={setModule} options={[{ value: 'all', label: 'Tất cả module' }, ...modules.map((m) => ({ value: m, label: m }))]} />
          <Select style={{ width: 180 }} value={severity} onChange={setSeverity} options={[{ value: 'all', label: 'Mọi mức độ' }, { value: 'info', label: 'Thông tin' }, { value: 'warning', label: 'Cảnh báo' }, { value: 'critical', label: 'Nghiêm trọng' }]} />
        </div>
      </Card>

      <Card size="small">
        <Table
          size="small"
          scroll={{ x: 'max-content' }}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          dataSource={filtered}
          columns={[
            { title: 'Thời gian', dataIndex: 'at', render: (v: string) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(v).toLocaleString('vi-VN')}</Text> },
            { title: 'Người thực hiện', render: (_, e: AuditEvent) => <span>{e.actorName} <Text type="secondary">({ROLE_LABEL[e.role]})</Text></span> },
            { title: 'Hành động', dataIndex: 'action' },
            { title: 'Đối tượng', render: (_, e: AuditEvent) => <Text type="secondary" style={{ fontSize: 12.5 }}>{e.entityType} · {e.entityId}</Text> },
            { title: 'Trước / Sau', render: (_, e: AuditEvent) => <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{e.previousState ?? '—'} <ArrowRight size={10} /> {e.newState ?? '—'}</Text> },
            { title: 'Module', dataIndex: 'sourceModule' },
            { title: 'Mức độ', dataIndex: 'severity', render: (v: string) => <Tag color={SEVERITY_COLOR[v]}>{v}</Tag> },
          ]}
        />
      </Card>

      <Alert
        type="info"
        showIcon
        icon={<ShieldCheck size={16} />}
        message="Mỗi bản ghi kiểm toán bao gồm: mã sự kiện, thời gian, người/vai trò thực hiện, hành động, loại & mã đối tượng, bệnh nhân/lượt khám liên quan, trạng thái trước–sau, lý do, module nguồn và mức độ nghiêm trọng."
      />
    </div>
  );
}
