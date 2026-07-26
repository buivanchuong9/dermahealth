import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Tag, Typography, Alert, List, App as AntApp, Grid, Modal, Select, Statistic, Steps, Empty } from 'antd';
import { Plus, Workflow, Lock, History, ArrowRight, CheckCircle2, FilePenLine, Rocket, Users, Search } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { workflowRepository } from '../../domain/repositories';
import { listWorkflowTemplates, listWorkflowTemplateVersions, createWorkflowTemplate } from '../../api/workflowTemplate';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { hasRoleAccess, type UserRole } from '../../domain/core/role';

const { Text, Title, Paragraph } = Typography;
const WORKFLOW_AUTHOR_ROLES: readonly UserRole[] = [
  'clinical_process_designer',
  'medical_administrator',
];

export default function WorkflowTemplates() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const showError = useFriendlyError();
  const { role } = useAppState();
  const screens = Grid.useBreakpoint();
  const isStacked = screens.lg === false;
  const templates = useStore(workflowRepository.templates());
  const versions = useStore(workflowRepository.versions());
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const canDesign = hasRoleAccess(role, WORKFLOW_AUTHOR_ROLES);
  const publishedCount = templates.filter((template) => Boolean(template.latestPublishedVersionId)).length;
  const draftCount = templates.filter((template) =>
    versions.some((version) => version.templateId === template.id && version.status === 'draft'),
  ).length;
  const visibleTemplates = templates.filter((template) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    const matchesQuery = !normalizedQuery
      || template.name.toLocaleLowerCase('vi').includes(normalizedQuery)
      || template.specialty.toLocaleLowerCase('vi').includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'published' ? Boolean(template.latestPublishedVersionId) : !template.latestPublishedVersionId);
    return matchesQuery && matchesStatus;
  });

  useEffect(() => {
    listWorkflowTemplates()
      .then(async (rows) => {
        rows.forEach((row) => workflowRepository.templates().upsert(row));
        const versionGroups = await Promise.all(
          rows.map((row) => listWorkflowTemplateVersions(row.id)),
        );
        versionGroups.flat().forEach((version) =>
          workflowRepository.versions().upsert(version),
        );
      })
      .catch((err: unknown) => { showError(err); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    try {
      if (!name.trim() || !specialty.trim()) throw new Error('Vui lòng nhập tên quy trình và chuyên khoa.');
      setCreating(true);
      const template = await createWorkflowTemplate({ name: name.trim(), specialty: specialty.trim(), description: description.trim() });
      workflowRepository.templates().upsert(template);
      setName(''); setSpecialty(''); setDescription('');
      setCreateOpen(false);
      message.success('Đã tạo bản nháp quy trình mới.');
      navigate(`/app/workflows/templates/${template.id}`);
    } catch (err) {
      showError(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quy trình khám & điều trị</Title>
          <Text type="secondary">Thiết kế mẫu chuẩn, xuất bản có phiên bản và áp dụng riêng cho từng lượt khám.</Text>
        </div>
        {canDesign && <Button type="primary" size="large" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>Tạo quy trình</Button>}
      </div>

      {!canDesign && (
        <Alert
          type="warning"
          showIcon
          icon={<Lock size={15} />}
          message="Tài khoản hiện tại chỉ được xem quy trình"
          description={`Vai trò “${role}” chỉ được xem. Chuyển sang vai trò Thiết kế quy trình hoặc Quản trị viên y tế để biên soạn.`}
        />
      )}

      <Card styles={{ body: { padding: isStacked ? 16 : '18px 24px' } }}>
        <Steps
          responsive
          current={-1}
          items={[
            { title: 'Thiết kế', description: 'Xây các bước và điều kiện', icon: <FilePenLine size={16} /> },
            { title: 'Kiểm tra & xuất bản', description: 'Khóa một phiên bản sử dụng', icon: <CheckCircle2 size={16} /> },
            { title: 'Áp dụng lượt khám', description: 'Tạo bản chạy riêng cho bệnh nhân', icon: <Rocket size={16} /> },
            { title: 'Theo dõi điều trị', description: 'Bệnh nhân và bác sĩ cùng cập nhật', icon: <Users size={16} /> },
          ]}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: isStacked ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <Card size="small"><Statistic title="Tổng số quy trình" value={templates.length} prefix={<Workflow size={17} />} /></Card>
        <Card size="small"><Statistic title="Đang sử dụng" value={publishedCount} valueStyle={{ color: 'var(--success)' }} prefix={<CheckCircle2 size={17} />} /></Card>
        <Card size="small"><Statistic title="Đang chỉnh sửa" value={draftCount} valueStyle={{ color: 'var(--warning)' }} prefix={<FilePenLine size={17} />} /></Card>
      </div>

      <Card
        size="small"
        title="Thư viện quy trình"
        extra={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Input allowClear prefix={<Search size={14} />} placeholder="Tìm tên hoặc chuyên khoa" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: isStacked ? 190 : 250 }} />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'published', label: 'Đang sử dụng' },
                { value: 'draft', label: 'Chưa xuất bản' },
              ]}
            />
          </div>
        )}
      >
          <List
            dataSource={visibleTemplates}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có quy trình phù hợp" /> }}
            renderItem={(t) => {
              const tVersions = versions.filter((v) => v.templateId === t.id);
              const published = tVersions.find((v) => v.id === t.latestPublishedVersionId);
              const draft = tVersions.find((v) => v.status === 'draft');
              const stepCount = (published ?? draft)?.steps.length ?? 0;
              return (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type={published ? 'default' : 'primary'}
                      icon={<ArrowRight size={14} />}
                      onClick={() => navigate(`/app/workflows/templates/${t.id}`)}
                    >
                      {published ? 'Xem & quản lý' : 'Tiếp tục thiết kế'}
                    </Button>,
                  ]}
                >
                    <div style={{ padding: 14, background: 'var(--surface-subtle)', borderRadius: 10, border: '1px solid var(--border-default)', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: t.description ? 4 : 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                          <Text strong><Workflow size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t.name}</Text>
                          <Tag color="blue" style={{ margin: 0 }}>{t.specialty}</Tag>
                          <Tag style={{ margin: 0 }}>{stepCount} bước</Tag>
                        </div>
                        <Tag color={published ? 'success' : 'default'} style={{ margin: 0, flexShrink: 0 }}>{published ? `Đang sử dụng · v${published.version}` : 'Đang thiết kế'}</Tag>
                      </div>
                      {t.description && <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 4 }}>{t.description}</Paragraph>}
                      <Text type="secondary" style={{ fontSize: 11.5 }}><History size={11} style={{ verticalAlign: -1 }} /> {tVersions.length} phiên bản · Mỗi lượt khám nhận một bản chạy độc lập</Text>
                    </div>
                </List.Item>
              );
            }}
          />
      </Card>

      <Modal
        title="Tạo quy trình khám mới"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnHidden
      >
          <Alert type="info" showIcon message="Quy trình mới bắt đầu ở bản nháp" description="Bạn có thể thiết kế và thử nghiệm trước khi xuất bản. Quy trình đang chạy của bệnh nhân không bị ảnh hưởng." style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên quy trình *</Text>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Chuyên khoa *</Text>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="VD: Da liễu" />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mô tả</Text>
                <Input.TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
                <Button type="primary" loading={creating} onClick={() => void create()}>Tạo và mở trình thiết kế</Button>
              </div>
            </div>
      </Modal>
    </div>
  );
}
