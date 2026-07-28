import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Tag, Typography, Alert, App as AntApp, Grid, Modal, Select, Statistic, Popconfirm, Table } from 'antd';
import { Plus, Workflow, Lock, History, ArrowRight, CheckCircle2, FilePenLine, Search, Archive } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { workflowRepository } from '../../domain/repositories';
import { listWorkflowTemplates, listWorkflowTemplateVersions, createWorkflowTemplate, archiveWorkflowTemplateVersion } from '../../api/workflowTemplate';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { hasRoleAccess, type UserRole } from '../../domain/core/role';

const { Text, Title } = Typography;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [archivingVersionId, setArchivingVersionId] = useState<string>();

  const canDesign = hasRoleAccess(role, WORKFLOW_AUTHOR_ROLES);
  const canArchive = hasRoleAccess(role, ['medical_administrator']);
  const publishedCount = templates.filter((template) =>
    versions.some((version) =>
      version.templateId === template.id
      && version.id === template.latestPublishedVersionId
      && version.status === 'published',
    ),
  ).length;
  const draftCount = templates.filter((template) =>
    versions.some((version) => version.templateId === template.id && version.status === 'draft'),
  ).length;
  const visibleTemplates = templates.filter((template) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    const matchesQuery = !normalizedQuery
      || template.name.toLocaleLowerCase('vi').includes(normalizedQuery)
      || template.specialty.toLocaleLowerCase('vi').includes(normalizedQuery);
    const templateVersions = versions.filter((version) => version.templateId === template.id);
    const isPublished = templateVersions.some((version) =>
      version.id === template.latestPublishedVersionId && version.status === 'published',
    );
    const hasDraft = templateVersions.some((version) => version.status === 'draft');
    const isArchived = templateVersions.length > 0
      && templateVersions.every((version) => version.status === 'archived');
    const matchesStatus = statusFilter === 'all'
      ? !isArchived
      : statusFilter === 'published'
        ? isPublished
        : statusFilter === 'draft'
          ? hasDraft
          : isArchived;
    return matchesQuery && matchesStatus;
  });
  const tableRows = visibleTemplates.map((template) => {
    const templateVersions = versions.filter((version) => version.templateId === template.id);
    const published = templateVersions.find((version) =>
      version.id === template.latestPublishedVersionId && version.status === 'published',
    );
    const draft = templateVersions.find((version) => version.status === 'draft');
    const archived = templateVersions
      .filter((version) => version.status === 'archived')
      .sort((left, right) => right.version - left.version)[0];
    return {
      key: template.id,
      template,
      templateVersions,
      published,
      draft,
      archived,
      displayedVersion: published ?? draft ?? archived,
    };
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

  const archiveVersion = async (versionId: string, rowVersion: number, published: boolean) => {
    try {
      setArchivingVersionId(versionId);
      const archived = await archiveWorkflowTemplateVersion(versionId, Math.max(1, rowVersion));
      workflowRepository.versions().upsert(archived);
      message.success(published ? 'Đã ngừng sử dụng quy trình.' : 'Đã xóa bản nháp.');
    } catch (err) {
      showError(err);
    } finally {
      setArchivingVersionId(undefined);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quy trình khám & điều trị</Title>
          <Text type="secondary">Thiết kế mẫu chuẩn, xuất bản có phiên bản và áp dụng riêng cho từng lượt khám.</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<Search size={14} />}
            placeholder="Tìm tên hoặc chuyên khoa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ width: isStacked ? 'min(100%, 260px)' : 280 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'Đang hoạt động' },
              { value: 'published', label: 'Đang sử dụng' },
              { value: 'draft', label: 'Đang thiết kế' },
              { value: 'archived', label: 'Đã lưu trữ' },
            ]}
          />
          {canDesign && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Tạo quy trình
            </Button>
          )}
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: isStacked ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <Card size="small"><Statistic title="Tổng số quy trình" value={templates.length} prefix={<Workflow size={17} />} /></Card>
        <Card size="small"><Statistic title="Đang sử dụng" value={publishedCount} valueStyle={{ color: 'var(--success)' }} prefix={<CheckCircle2 size={17} />} /></Card>
        <Card size="small"><Statistic title="Đang chỉnh sửa" value={draftCount} valueStyle={{ color: 'var(--warning)' }} prefix={<FilePenLine size={17} />} /></Card>
      </div>

      <Card
        size="small"
        title="Thư viện quy trình"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="key"
          dataSource={tableRows}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có quy trình phù hợp' }}
          columns={[
            {
              title: 'Quy trình',
              key: 'workflow',
              width: '48%',
              render: (_, row) => (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    <Workflow size={14} style={{ verticalAlign: -2, marginRight: 7 }} />
                    {row.template.name}
                  </Text>
                  {row.template.description && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 5 }}>
                      {row.template.description}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    <History size={11} style={{ verticalAlign: -1 }} /> {row.templateVersions.length} phiên bản
                  </Text>
                </div>
              ),
            },
            {
              title: 'Chuyên khoa',
              key: 'specialty',
              width: 150,
              render: (_, row) => <Tag color="blue">{row.template.specialty}</Tag>,
            },
            {
              title: 'Số bước',
              key: 'steps',
              width: 100,
              align: 'center',
              render: (_, row) => row.displayedVersion?.steps.length ?? 0,
            },
            {
              title: 'Trạng thái',
              key: 'status',
              width: 150,
              render: (_, row) => (
                <Tag color={row.published ? 'success' : row.archived && !row.draft ? 'default' : 'processing'}>
                  {row.published ? `Đang sử dụng · v${row.published.version}` : row.draft ? 'Đang thiết kế' : 'Đã lưu trữ'}
                </Tag>
              ),
            },
            {
              title: 'Hành động',
              key: 'actions',
              width: 260,
              align: 'right',
              render: (_, row) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  {canArchive && row.displayedVersion?.status !== 'archived' && (
                    <Popconfirm
                      title={row.published ? 'Ngừng sử dụng quy trình này?' : 'Xóa bản nháp này?'}
                      description={row.published
                        ? 'Lượt khám mới sẽ không dùng phiên bản này. Các ca đã áp dụng vẫn được giữ nguyên.'
                        : 'Bản nháp sẽ được chuyển vào mục Đã lưu trữ.'}
                      okText={row.published ? 'Ngừng sử dụng' : 'Xóa bản nháp'}
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void archiveVersion(
                        (row.published ?? row.draft)!.id,
                        (row.published ?? row.draft)!.rowVersion ?? 1,
                        Boolean(row.published),
                      )}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<Archive size={14} />}
                        loading={archivingVersionId === (row.published ?? row.draft)?.id}
                      >
                        {row.published ? 'Ngừng' : 'Xóa'}
                      </Button>
                    </Popconfirm>
                  )}
                  {row.displayedVersion?.status !== 'archived' && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<ArrowRight size={14} />}
                      onClick={() => navigate(`/app/workflows/templates/${row.template.id}`)}
                    >
                      {row.published ? 'Quản lý' : 'Thiết kế'}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
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
