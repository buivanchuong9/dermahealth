import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pill, Activity, Calendar, FileText, Trash2, Upload, FileSignature, History, ShieldAlert, Lock, GripVertical, Home,
} from 'lucide-react';
import {
  Tabs, Card, Row, Col, Tag, Button, Modal, Input, Select, Alert, Typography, List, App as AntApp,
} from 'antd';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners,
  useDroppable, useDraggable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, medicalRecordRepository, clinicalOrderRepository, workflowRepository, auditRepository } from '../domain/repositories';
import { medicalRecordService } from '../domain/services/medicalRecordService';
import { auditService } from '../domain/services/auditService';
import { RECORD_STATUS_LABEL, ENCOUNTER_STATUS_LABEL } from '../domain/core/enums';
import type { EncounterId } from '../domain/core/ids';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const { Title, Text, Paragraph } = Typography;

interface PlanTask { id: number; col: string; title: string; type: string; date: string; desc: string; priority: 'high' | 'medium' | 'low' }

const INIT: PlanTask[] = [
  { id: 1, col: 'todo', title: 'Bôi kem Tretinoin 0.05%', type: 'Thuốc', date: 'Hôm nay', desc: 'Thoa lớp mỏng vùng mụn viêm trước khi ngủ. Tránh vùng mắt và môi.', priority: 'high' },
  { id: 2, col: 'todo', title: 'Chụp ảnh AI báo cáo tuần 3', type: 'AI', date: 'Ngày mai', desc: 'Upload hình ảnh vùng má phải và trán để AI theo dõi tiến độ phục hồi.', priority: 'medium' },
  { id: 3, col: 'in_progress', title: 'Theo dõi phản ứng thuốc', type: 'Theo dõi', date: 'Tuần này', desc: 'Quan sát xem vùng da có phản ứng đỏ, ngứa quá mức sau khi dùng thuốc.', priority: 'medium' },
  { id: 4, col: 'in_progress', title: 'Uống Omega-3 hàng ngày', type: 'Thuốc', date: '14 ngày', desc: 'Uống 1 viên sau bữa sáng. Hỗ trợ giảm viêm từ bên trong.', priority: 'low' },
  { id: 5, col: 'done', title: 'Khám với Bs. Nguyễn Thị An', type: 'Lịch hẹn', date: '01/10/2023', desc: 'Khám định kỳ tháng 10. Đã điều chỉnh liều Tretinoin.', priority: 'high' },
  { id: 6, col: 'done', title: 'Uống kháng sinh Doxycycline', type: 'Thuốc', date: '25/09–02/10', desc: '7 ngày theo đơn. Đã hoàn thành đủ liệu trình.', priority: 'high' },
  { id: 7, col: 'done', title: 'Xét nghiệm máu tổng quát', type: 'Xét nghiệm', date: '28/09/2023', desc: 'Kết quả bình thường. Không có dấu hiệu nhiễm khuẩn.', priority: 'medium' },
];

const COLS = [
  { id: 'todo', label: 'Cần thực hiện' },
  { id: 'in_progress', label: 'Đang thực hiện' },
  { id: 'done', label: 'Đã hoàn thành' },
];

const TYPE_ICON: Record<string, typeof Pill> = { Thuốc: Pill, AI: Activity, 'Lịch hẹn': Calendar };
const PRIO_COLOR: Record<string, string> = { high: 'red', medium: 'gold', low: 'default' };
const PRIO_LABEL: Record<string, string> = { high: 'Quan trọng', medium: 'Trung bình', low: 'Bình thường' };

function PlanCard({ task, onDelete }: { task: PlanTask; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const Icon = TYPE_ICON[task.type] || FileText;
  return (
    <Card
      ref={setNodeRef}
      size="small"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1, marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Tag icon={<Icon size={12} style={{ verticalAlign: -1 }} />}>{task.type}</Tag>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span {...attributes} {...listeners} role="button" tabIndex={0} aria-label={`Kéo để di chuyển bước "${task.title}" sang cột khác`} style={{ cursor: 'grab', color: 'var(--text-muted)', touchAction: 'none' }}><GripVertical size={13} /></span>
          <Button size="small" type="text" danger icon={<Trash2 size={12} />} onClick={onDelete} />
        </div>
      </div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{task.title}</Text>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }} ellipsis={{ rows: 2 }}>{task.desc}</Paragraph>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Tag color={PRIO_COLOR[task.priority]}>{PRIO_LABEL[task.priority]}</Tag>
        <Text type="secondary" style={{ fontSize: 11.5 }}>{task.date}</Text>
      </div>
    </Card>
  );
}

function PlanColumn({ colId, label, tasks, onDelete }: { colId: string; label: string; tasks: PlanTask[]; onDelete: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div ref={setNodeRef} style={{ background: isOver ? 'var(--surface-selected)' : 'var(--surface-subtle)', borderRadius: 10, padding: 12, minHeight: 400, border: `1px dashed ${isOver ? 'var(--medical-blue-500)' : 'var(--border-default)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <Tag>{tasks.length}</Tag>
      </div>
      {tasks.map((t) => <PlanCard key={t.id} task={t} onDelete={() => onDelete(t.id)} />)}
      {tasks.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Thả thẻ vào đây</Text>}
    </div>
  );
}

function EMRWorkspace() {
  const navigate = useNavigate();
  const { currentPatient, currentUser, role } = useAppState();
  const encounters = useStore(encounterRepository).filter((e) => e.patientId === currentPatient.id);
  const records = useStore(medicalRecordRepository.records());
  const documents = useStore(medicalRecordRepository.documents());
  const orders = useStore(clinicalOrderRepository.orders());
  const results = useStore(clinicalOrderRepository.results());
  const tasks = useStore(workflowRepository.tasks());
  useStore(auditRepository);
  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(encounters[0]?.id);
  const [addendumText, setAddendumText] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [breakGlassGranted, setBreakGlassGranted] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('');

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];
  if (!encounter) return <Text type="secondary">Chưa có lượt khám nào.</Text>;

  const NORMAL_ACCESS_ROLES = ['patient', 'doctor', 'medical_administrator'];
  if (!NORMAL_ACCESS_ROLES.includes(role) && !breakGlassGranted) {
    return (
      <Card style={{ maxWidth: 520 }}>
        <ShieldAlert size={28} color="var(--warning)" style={{ marginBottom: 12 }} />
        <Title level={5}>Yêu cầu quyền truy cập khẩn cấp (Break-glass)</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Vai trò của bạn không có quyền xem hồ sơ bệnh án này trong điều kiện bình thường. Bạn có thể yêu cầu truy cập khẩn cấp — hành động này bắt buộc phải nêu lý do và sẽ được ghi vào nhật ký kiểm toán ở mức nghiêm trọng.
        </Paragraph>
        <Input.TextArea rows={2} placeholder="Lý do truy cập khẩn cấp (bắt buộc)..." value={breakGlassReason} onChange={(e) => setBreakGlassReason(e.target.value)} style={{ marginBottom: 12 }} />
        <Button
          danger type="primary"
          onClick={() => {
            if (!breakGlassReason.trim()) return;
            auditService.log({ actorId: currentUser.id, action: 'BREAK_GLASS_ACCESS_GRANTED', entityType: 'MedicalRecord', entityId: encounter.id, reason: breakGlassReason, patientId: encounter.patientId, encounterId: encounter.id, sourceModule: 'EMR', severity: 'critical' });
            setBreakGlassGranted(true);
          }}
        >Xác nhận truy cập khẩn cấp</Button>
        <Button type="link" icon={<Home size={13} />} style={{ paddingLeft: 4 }} onClick={() => navigate('/app/dashboard')}>Về trang tổng quan</Button>
      </Card>
    );
  }

  const record = records.find((r) => r.encounterId === encounter.id);
  const encounterOrders = orders.filter((o) => o.encounterId === encounter.id);
  const encounterDocs = documents.filter((d) => d.encounterId === encounter.id);
  const encounterTasks = tasks.filter((t) => t.encounterId === encounter.id);
  const encounterAudit = auditService.listByEncounter(encounter.id);

  const isDoctor = role === 'doctor';
  const isAdmin = role === 'medical_administrator';

  const guarded = (fn: () => void) => {
    setError(null);
    try { fn(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };

  const uploadMockDocument = () => guarded(() => {
    medicalRecordService.uploadDocument(encounter.id, currentUser.id, { type: 'other', fileName: `tai-lieu-${Date.now()}.pdf` });
  });
  const sign = () => guarded(() => {
    if (!record) throw new Error('Chưa có hồ sơ để ký.');
    medicalRecordService.signRecord(record.id, currentUser.id);
  });
  const addAddendum = () => guarded(() => {
    if (!record) throw new Error('Chưa có hồ sơ.');
    if (!addendumText.trim()) throw new Error('Vui lòng nhập nội dung bổ sung.');
    medicalRecordService.addAddendum(record.id, currentUser.id, addendumText);
    setAddendumText('');
  });
  const reopen = () => guarded(() => {
    if (!record) throw new Error('Chưa có hồ sơ.');
    if (!reopenReason.trim()) throw new Error('Vui lòng nhập lý do mở lại hồ sơ.');
    medicalRecordService.reopenRecord(record.id, currentUser.id, reopenReason);
    setReopenReason('');
  });

  const completion = record ? medicalRecordService.checkCompletionRequirements(record) : { ok: false, missing: ['Chưa tạo hồ sơ'] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card size="small">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select style={{ minWidth: 260 }} value={encounter.id} onChange={(v) => setSelectedId(v as EncounterId)} options={encounters.map((e) => ({ value: e.id, label: `${e.id} — ${ENCOUNTER_STATUS_LABEL[e.status]}` }))} />
          <Tag color={record?.status === 'signed' ? 'success' : 'warning'}>{record ? RECORD_STATUS_LABEL[record.status] : 'Chưa tạo hồ sơ'}</Tag>
          {record?.status === 'signed' && <Text type="secondary" style={{ fontSize: 12 }}><Lock size={12} style={{ verticalAlign: -1 }} /> Hồ sơ đã ký — chỉ đọc</Text>}
        </div>
      </Card>

      {error && <FriendlyErrorInline error={error} onClose={() => setError(null)} />}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Tóm tắt hồ sơ" size="small">
            <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>Bệnh nhân: <Text strong>{currentPatient.name}</Text> ({currentPatient.code})</div>
              <div>Chẩn đoán: <Text strong>{record?.diagnosisId ?? '— chưa có —'}</Text></div>
              <div>Đơn thuốc: {record?.prescriptionId ?? '— chưa có —'}</div>
              <div>Hướng dẫn xuất viện: {record?.discharge?.instructions.join('; ') ?? '— chưa có —'}</div>
              <div>Kế hoạch theo dõi: {record?.followUp?.description ?? '— chưa có —'}</div>
            </div>

            {!completion.ok && (
              <Alert type="warning" showIcon style={{ marginTop: 12 }} message={`Còn thiếu để hoàn tất: ${completion.missing.join(', ')}`} />
            )}

            {isDoctor && record && record.status !== 'signed' && (
              <Button type="primary" style={{ marginTop: 12 }} disabled={!completion.ok} icon={<FileSignature size={14} />} onClick={sign}>Ký hồ sơ</Button>
            )}

            {isDoctor && record?.status === 'signed' && (
              <div style={{ marginTop: 12 }}>
                <Input.TextArea rows={2} placeholder="Nội dung bổ sung (addendum)..." value={addendumText} onChange={(e) => setAddendumText(e.target.value)} />
                <Button style={{ marginTop: 8 }} onClick={addAddendum}>Thêm ghi chú bổ sung</Button>
              </div>
            )}

            {isAdmin && record && record.status === 'signed' && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-default)', paddingTop: 12 }}>
                <Input placeholder="Lý do mở lại hồ sơ..." value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                <Button style={{ marginTop: 8 }} onClick={reopen}>Mở lại hồ sơ (có kiểm toán)</Button>
              </div>
            )}

            {record && record.addenda.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-default)', paddingTop: 12 }}>
                <Text strong style={{ fontSize: 12.5, display: 'block', marginBottom: 6 }}>Ghi chú bổ sung</Text>
                {record.addenda.map((a) => <Text key={a.id} type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{a.text}</Text>)}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Chỉ định & kết quả cận lâm sàng" size="small">
              <List
                size="small"
                dataSource={encounterOrders}
                locale={{ emptyText: <ProfessionalEmpty compact title="Chưa có chỉ định" description="Chỉ định cận lâm sàng sẽ xuất hiện sau khi bác sĩ tạo yêu cầu." showActions={false} /> }}
                renderItem={(o) => {
                  const result = o.resultId ? results.find((r) => r.id === o.resultId) : undefined;
                  return <List.Item>{o.type} — {o.status}{result ? `: ${result.summary}` : ''}</List.Item>;
                }}
              />
            </Card>

            <Card title="Tài liệu lâm sàng" size="small" extra={<Button size="small" icon={<Upload size={13} />} onClick={uploadMockDocument}>Tải lên (mô phỏng)</Button>}>
              <List
                size="small"
                dataSource={encounterDocs}
                locale={{ emptyText: <ProfessionalEmpty compact title="Chưa có tài liệu" description="Tải tài liệu lâm sàng đầu tiên cho lượt khám này." showActions={false} /> }}
                renderItem={(d) => (
                  <List.Item extra={<Tag>{d.reviewStatus} · {d.signatureStatus}</Tag>}>{d.fileName} (v{d.version})</List.Item>
                )}
              />
            </Card>

            <Card title={<span><History size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Lịch sử thực hiện quy trình & kiểm toán</span>} size="small">
              {encounterTasks.map((t) => <Text key={t.id} type="secondary" style={{ fontSize: 12, display: 'block' }}>{t.name}: {t.status}</Text>)}
              <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto' }}>
                {encounterAudit.map((a) => <Text key={a.id} type="secondary" style={{ fontSize: 11.5, display: 'block' }}>{new Date(a.at).toLocaleString('vi-VN')} — {a.action}</Text>)}
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}

function TreatmentPlanKanban() {
  const { message } = AntApp.useApp();
  const [tasks, setTasks] = useState<PlanTask[]>(INIT);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const add = () => {
    if (!title.trim()) return;
    setTasks((p) => [...p, { id: Date.now(), col: 'todo', title, type: 'Theo dõi', date: 'Hôm nay', desc, priority: 'medium' }]);
    setTitle(''); setDesc(''); setModal(false);
  };
  const del = (id: number) => setTasks((p) => p.filter((t) => t.id !== id));
  const move = (id: number, col: string) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, col } : t)));

  const done = tasks.filter((t) => t.col === 'done').length;
  const pct = Math.round((done / tasks.length) * 100);

  const handleDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const target = e.over?.id as string | undefined;
    if (!target) return;
    move(Number(e.active.id), target);
    message.success('Đã cập nhật trạng thái bước điều trị.');
  };
  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<Plus size={15} />} onClick={() => setModal(true)}>Thêm bước mới</Button>
      </div>

      <Row gutter={12}>
        {[
          { label: 'Cần thực hiện', val: tasks.filter((t) => t.col === 'todo').length },
          { label: 'Đang thực hiện', val: tasks.filter((t) => t.col === 'in_progress').length },
          { label: 'Đã hoàn thành', val: done },
          { label: 'Tỉ lệ hoàn thành', val: `${pct}%` },
        ].map((s) => (
          <Col xs={24} sm={12} md={6} key={s.label}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--medical-blue-700)' }}>{s.val}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Row gutter={12}>
          {COLS.map((col) => (
            <Col xs={24} sm={12} md={8} key={col.id}>
              <PlanColumn colId={col.id} label={col.label} tasks={tasks.filter((t) => t.col === col.id)} onDelete={del} />
            </Col>
          ))}
        </Row>
        <DragOverlay>{activeTask ? <div style={{ width: 260 }}><PlanCard task={activeTask} onDelete={() => {}} /></div> : null}</DragOverlay>
      </DndContext>

      <Modal title="Thêm Bước Điều Trị Mới" open={modal} onCancel={() => setModal(false)} onOk={add} okText="Thêm bước" cancelText="Hủy">
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên bước *</Text>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Uống thuốc kháng viêm..." />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ghi chú</Text>
          <Input.TextArea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Chi tiết thêm..." />
        </div>
      </Modal>
    </div>
  );
}

export default function Records() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Hành trình điều trị & Hồ sơ bệnh án</Text>
        <Title level={3} style={{ margin: '4px 0 0' }}>Hành Trình Điều Trị</Title>
        <Text type="secondary">Quản lý kế hoạch chăm sóc hằng ngày và xem hồ sơ bệnh án (EMR) theo từng lượt khám.</Text>
      </div>

      <Tabs
        defaultActiveKey="plan"
        items={[
          { key: 'plan', label: 'Kế hoạch điều trị', children: <TreatmentPlanKanban /> },
          { key: 'emr', label: 'Hồ sơ bệnh án (EMR)', children: <EMRWorkspace /> },
        ]}
      />
    </div>
  );
}
