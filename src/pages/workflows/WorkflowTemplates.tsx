import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Input, Button, Tag, Typography, Alert, List, App as AntApp, Grid } from 'antd';
import { Plus, Workflow, Lock, History } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { workflowRepository } from '../../domain/repositories';
import { workflowService } from '../../domain/services/workflowService';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';

const { Text, Title, Paragraph } = Typography;

export default function WorkflowTemplates() {
  const { message } = AntApp.useApp();
  const showError = useFriendlyError();
  const { currentUser, role } = useAppState();
  const screens = Grid.useBreakpoint();
  const isStacked = screens.lg === false;
  const templates = useStore(workflowRepository.templates());
  const versions = useStore(workflowRepository.versions());
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');

  const canDesign = role === 'clinical_process_designer' || role === 'medical_administrator';

  const create = () => {
    try {
      if (!name.trim() || !specialty.trim()) throw new Error('Vui lòng nhập tên quy trình và chuyên khoa.');
      workflowService.createDraftTemplate(name, specialty, description, currentUser.id);
      setName(''); setSpecialty(''); setDescription('');
      message.success('Đã tạo bản nháp quy trình mới.');
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>BPM · Workflow Template Design</Text>
        <Title level={3} style={{ margin: '4px 0 0' }}>Quy Trình Vận Hành (Workflow Templates)</Title>
        <Text type="secondary">Tách biệt Workflow Template (mẫu) và Workflow Instance (áp dụng cho từng lượt khám cụ thể).</Text>
      </div>

      {!canDesign && (
        <Alert type="warning" showIcon icon={<Lock size={15} />} message="Bạn có thể xem danh sách quy trình, nhưng chỉ Chuyên viên thiết kế quy trình hoặc Quản trị viên y tế mới có thể tạo/chỉnh sửa/xuất bản." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: canDesign && !isStacked ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
        <Card size="small" title="Danh sách quy trình">
          <List
            dataSource={templates}
            renderItem={(t) => {
              const tVersions = versions.filter((v) => v.templateId === t.id);
              const published = tVersions.find((v) => v.id === t.latestPublishedVersionId);
              return (
                <List.Item>
                  <Link to={`/app/workflows/templates/${t.id}`} style={{ width: '100%' }}>
                    <div style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 8, border: '1px solid var(--border-default)', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong><Workflow size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t.name}</Text>
                        <Tag color={published ? 'success' : 'default'}>{published ? `v${published.version} đã xuất bản` : 'Chưa xuất bản'}</Tag>
                      </div>
                      <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 4 }}>{t.description}</Paragraph>
                      <Text type="secondary" style={{ fontSize: 11.5 }}>{t.specialty} · <History size={11} style={{ verticalAlign: -1 }} /> {tVersions.length} phiên bản</Text>
                    </div>
                  </Link>
                </List.Item>
              );
            }}
          />
          {templates.length === 0 && <Text type="secondary">Chưa có quy trình nào.</Text>}
        </Card>

        {canDesign && (
          <Card size="small" title={<span><Plus size={15} style={{ verticalAlign: -2 }} /> Tạo quy trình mới (bản nháp)</span>}>
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
              <Button type="primary" block onClick={create}>Tạo bản nháp</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
