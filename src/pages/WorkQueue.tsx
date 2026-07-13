import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { App as AntApp, Card, Select, Table, Tag, Typography, Button } from 'antd';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners,
  useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Zap, ShieldCheck, TriangleAlert, Hand } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { workflowRepository, encounterRepository } from '../domain/repositories';
import { workflowService } from '../domain/services/workflowService';
import { hasRoleAccess, TASK_STATUS_LABEL, ROLE_LABEL } from '../domain/core/enums';
import type { WorkflowTaskStatus, Priority, Urgency } from '../domain/core/enums';
import type { WorkflowTask } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const { Title, Text } = Typography;

type ColumnKey = 'ready' | 'in_progress' | 'completed' | 'escalated';

const COLUMNS: { key: ColumnKey; title: string; hint: string }[] = [
  { key: 'ready', title: 'Sẵn sàng / Chưa nhận', hint: 'Kéo vào "Đang thực hiện" để nhận việc' },
  { key: 'in_progress', title: 'Đang thực hiện (của tôi)', hint: 'Kéo sang "Hoàn thành" khi xong' },
  { key: 'completed', title: 'Hoàn thành', hint: 'Chỉ nhận tác vụ đang thực hiện' },
  { key: 'escalated', title: 'Báo cáo bất thường', hint: 'Giám sát viên kéo ngược lại để mở lại' },
];

function overdueMinutes(task: WorkflowTask): number | null {
  const created = new Date(task.createdAt.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).getTime();
  if (Number.isNaN(created)) return null;
  return Math.round((created + task.slaMinutes * 60_000 - Date.now()) / 60_000);
}

function columnFor(task: WorkflowTask, myUserId: string): ColumnKey | null {
  if (task.status === 'completed') return 'completed';
  if (task.status === 'escalated') return 'escalated';
  if (task.status === 'ready' && !task.assigneeId) return 'ready';
  if (task.assigneeId === myUserId && ['assigned', 'accepted', 'in_progress', 'waiting_for_patient', 'waiting_for_result', 'waiting_for_approval'].includes(task.status)) return 'in_progress';
  return null;
}

function TaskCard({ task, encounterLabel }: { task: WorkflowTask; encounterLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const minutesLeft = overdueMinutes(task);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1,
        background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8,
        padding: '10px 12px', marginBottom: 8, cursor: 'grab',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <Link to={`/app/workflows/instances/${task.instanceId}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--medical-blue-700)' }}>{task.name}</Link>
        <span
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-label={`Kéo để chuyển tác vụ "${task.name}" sang cột khác`}
          style={{
            touchAction: 'none', color: 'var(--medical-blue-600)', cursor: 'grab',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6, background: 'var(--surface-subtle)',
            border: '1px solid var(--border-default)', flexShrink: 0,
          }}
        ><Hand size={16} /></span>
      </div>
      <Text type="secondary" style={{ fontSize: 11.5, display: 'block', margin: '4px 0' }}>{encounterLabel} · {ROLE_LABEL[task.responsibleRole]}</Text>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Tag color={task.urgency === 'emergency' ? 'red' : task.urgency === 'urgent' ? 'orange' : 'default'} style={{ fontSize: 10.5 }}>{task.urgency}</Tag>
        <Tag style={{ fontSize: 10.5 }}>{task.priority}</Tag>
        {minutesLeft !== null && <Tag color={minutesLeft < 0 ? 'red' : minutesLeft < 15 ? 'gold' : 'default'} style={{ fontSize: 10.5 }}>{minutesLeft < 0 ? `Quá hạn ${Math.abs(minutesLeft)}p` : `Còn ${minutesLeft}p`}</Tag>}
      </div>
      {task.clinicalWarning && <Text type="warning" style={{ fontSize: 11, display: 'block', marginTop: 4 }}><TriangleAlert size={11} style={{ verticalAlign: -1 }} /> {task.clinicalWarning}</Text>}
    </div>
  );
}

type PendingDrop = { task: WorkflowTask; question: string; confirmLabel: string; run: () => void };

function DropConfirmDialog({ pending, onCancel }: { pending: PendingDrop; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)', borderRadius: 12, padding: '20px 22px', width: 360,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)', border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Hand size={18} color="var(--medical-blue-600)" />
          <Text strong style={{ fontSize: 15 }}>Xác nhận chuyển tác vụ</Text>
        </div>
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 18 }}>{pending.question}</Text>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" onClick={pending.run}>{pending.confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function Column({ col, tasks, encounterLabelFor }: { col: (typeof COLUMNS)[number]; tasks: WorkflowTask[]; encounterLabelFor: (t: WorkflowTask) => string }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'var(--surface-selected)' : 'var(--surface-subtle)', borderRadius: 10, padding: 12,
        minHeight: 320, border: `1px dashed ${isOver ? 'var(--medical-blue-500)' : 'var(--border-default)'}`,
        flex: '1 0 240px', minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 13 }}>{col.title}</Text>
        <Tag>{tasks.length}</Tag>
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10 }}>{col.hint}</Text>
      {tasks.map((t) => <TaskCard key={t.id} task={t} encounterLabel={encounterLabelFor(t)} />)}
      {tasks.length === 0 && <ProfessionalEmpty compact title="Không có tác vụ" description="Cột này chưa có công việc phù hợp." />}
    </div>
  );
}

export default function WorkQueue() {
  const { message } = AntApp.useApp();
  const showError = useFriendlyError();
  const { currentUser, role } = useAppState();
  const tasks = useStore(workflowRepository.tasks());
  const encounters = useStore(encounterRepository);
  const [department, setDepartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState<WorkflowTaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'all'>('all');
  const [activeTask, setActiveTask] = useState<WorkflowTask | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canSupervise = hasRoleAccess(role, ['medical_administrator', 'care_coordinator']);

  const departments = useMemo(() => Array.from(new Set(tasks.map((t) => t.department))), [tasks]);
  const visibleForRole = tasks.filter((t) => hasRoleAccess(role, ['medical_administrator', 'system_administrator']) || t.responsibleRole === role);
  const filtered = visibleForRole.filter((t) =>
    (department === 'all' || t.department === department) &&
    (statusFilter === 'all' || t.status === statusFilter) &&
    (priorityFilter === 'all' || t.priority === priorityFilter) &&
    (urgencyFilter === 'all' || t.urgency === urgencyFilter),
  );

  const encounterLabelFor = (t: WorkflowTask) => {
    const enc = encounters.find((e) => e.id === t.encounterId);
    return enc ? `${enc.id} (${enc.department})` : t.encounterId;
  };

  const byColumn = (key: ColumnKey) => filtered.filter((t) => columnFor(t, currentUser.id) === key);
  const otherTasks = filtered.filter((t) => columnFor(t, currentUser.id) === null);

  const autoAssign = () => {
    const candidates = tasks.filter((t) => t.responsibleRole === role && t.status === 'ready' && !t.assigneeId);
    if (candidates.length === 0) { message.info('Không có tác vụ nào phù hợp để tự động phân công.'); return; }
    candidates.forEach((t) => workflowService.reassignTask(t.id, currentUser.id, currentUser.id));
    message.success(`Đã tự động phân công ${candidates.length} tác vụ cho bạn.`);
  };

  const handleDragStart = (e: DragStartEvent) => {
    const t = tasks.find((task) => task.id === e.active.id);
    setActiveTask(t ?? null);
  };

  const dropError = (task: WorkflowTask, target: ColumnKey): string | null => {
    if (target === 'in_progress') {
      if (task.status === 'escalated' && !canSupervise) return 'Chỉ giám sát viên (Điều phối viên chăm sóc / Quản trị viên y tế) mới có thể mở lại tác vụ đã báo cáo bất thường.';
      if (task.status === 'ready' || task.status === 'accepted' || task.status === 'assigned' || task.status === 'escalated') return null;
      return `Không thể chuyển tác vụ "${task.name}" sang Đang thực hiện từ trạng thái hiện tại.`;
    }
    if (target === 'completed') {
      if (task.status !== 'in_progress') return 'Chỉ có thể hoàn thành tác vụ đang ở trạng thái "Đang thực hiện".';
      return null;
    }
    if (target === 'ready') return 'Không thể kéo tác vụ trở lại trạng thái "Sẵn sàng" thủ công.';
    return null;
  };

  const applyDrop = (task: WorkflowTask, target: ColumnKey) => {
    try {
      if (target === 'in_progress') {
        if (task.status === 'escalated') workflowService.transitionTask(task.id, 'ready', currentUser.id, { reason: 'Giám sát viên đã xem xét và mở lại tác vụ' });
        else if (task.status === 'ready') workflowService.acceptTask(task.id, currentUser.id);
        else workflowService.startTask(task.id, currentUser.id);
      } else if (target === 'completed') {
        workflowService.completeTask(task.id, currentUser.id);
      } else if (target === 'escalated') {
        workflowService.escalateTask(task.id, currentUser.id, 'Chuyển bằng kéo thả trong hàng đợi công việc');
      }
      message.success(`Đã cập nhật trạng thái tác vụ "${task.name}".`);
    } catch (err) {
      showError(err);
    } finally {
      setPendingDrop(null);
    }
  };

  const dropDescription = (task: WorkflowTask, target: ColumnKey): { question: string; confirmLabel: string } => {
    const col = COLUMNS.find((c) => c.key === target)!;
    if (target === 'in_progress' && task.status === 'escalated') {
      return { question: `Mở lại tác vụ "${task.name}" và đưa về hàng "Sẵn sàng"?`, confirmLabel: 'Mở lại tác vụ' };
    }
    if (target === 'in_progress') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Xác nhận' };
    if (target === 'completed') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Hoàn thành' };
    if (target === 'escalated') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Báo cáo' };
    return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Xác nhận' };
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const target = e.over?.id as ColumnKey | undefined;
    const task = tasks.find((t) => t.id === e.active.id);
    if (!task || !target) return;
    const source = columnFor(task, currentUser.id);
    if (source === target) return;

    const error = dropError(task, target);
    if (error) { message.error(error); return; }

    const { question, confirmLabel } = dropDescription(task, target);
    setPendingDrop({ task, question, confirmLabel, run: () => applyDrop(task, target) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Vận hành</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>Hàng Đợi Công Việc</Title>
          <Text type="secondary">{currentUser.name} · {ROLE_LABEL[role]}</Text>
        </div>
        <Button type="primary" icon={<Zap size={15} />} onClick={autoAssign}>Tự động phân công</Button>
      </div>

      <Card size="small">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Select style={{ width: 200 }} value={department} onChange={setDepartment} options={[{ value: 'all', label: 'Tất cả bộ phận' }, ...departments.map((d) => ({ value: d, label: d }))]} />
          <Select style={{ width: 200 }} value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(TASK_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))]} />
          <Select style={{ width: 160 }} value={priorityFilter} onChange={setPriorityFilter} options={[{ value: 'all', label: 'Mọi mức ưu tiên' }, { value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }]} />
          <Select style={{ width: 160 }} value={urgencyFilter} onChange={setUrgencyFilter} options={[{ value: 'all', label: 'Mọi mức độ' }, { value: 'routine', label: 'Thường quy' }, { value: 'urgent', label: 'Khẩn' }, { value: 'emergency', label: 'Cấp cứu' }]} />
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {COLUMNS.map((col) => <Column key={col.key} col={col} tasks={byColumn(col.key)} encounterLabelFor={encounterLabelFor} />)}
        </div>
        <DragOverlay>
          {activeTask ? <div style={{ width: 260 }}><TaskCard task={activeTask} encounterLabel={encounterLabelFor(activeTask)} /></div> : null}
        </DragOverlay>
      </DndContext>

      <Card title="Tất cả tác vụ khác (không thuộc luồng kéo-thả trực tiếp)" size="small" extra={<ShieldCheck size={15} color="var(--text-muted)" />}>
        <Table
          size="small"
          scroll={{ x: 'max-content' }}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          dataSource={otherTasks}
          columns={[
            { title: 'Tác vụ', dataIndex: 'name', render: (v: string, t) => <Link to={`/app/workflows/instances/${t.instanceId}`}>{v}</Link> },
            { title: 'Lượt khám', render: (_, t) => encounterLabelFor(t) },
            { title: 'Vai trò', dataIndex: 'responsibleRole', render: (v: WorkflowTask['responsibleRole']) => ROLE_LABEL[v] },
            { title: 'Trạng thái', dataIndex: 'status', render: (v: WorkflowTaskStatus) => <Tag>{TASK_STATUS_LABEL[v]}</Tag> },
            { title: 'Người phụ trách', dataIndex: 'assigneeId', render: (v?: string) => v ?? '—' },
          ]}
        />
      </Card>

      {pendingDrop && <DropConfirmDialog pending={pendingDrop} onCancel={() => setPendingDrop(null)} />}
    </div>
  );
}
