import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { App as AntApp, Alert, Card, Checkbox, Input, Modal, Select, Space, Table, Tag, Typography, Button } from 'antd';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners,
  useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { Zap, ShieldCheck, TriangleAlert } from 'lucide-react';
import { DragHandle } from '../components/common/DragHandle';
import { DragConfirmDialog, type PendingDrop } from '../components/common/DragConfirmDialog';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { clinicalOrderRepository, workflowRepository, encounterRepository, patientRepository, userRepository } from '../domain/repositories';
import {
  listWorkflowTasks,
  acceptWorkflowTask,
  startWorkflowTask,
  completeWorkflowTask,
  escalateWorkflowTask,
  reassignWorkflowTask,
} from '../api/workflowTask';
import { TASK_STATUS_LABEL } from '../domain/core/enums';
import { hasRoleAccess, ROLE_LABEL } from '../domain/core/role';
import type { WorkflowTaskStatus, Priority, Urgency } from '../domain/core/enums';
import type { ClinicalOrder, WorkflowTask } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import {
  listAssignedClinicalOrders,
  markClinicalOrderInvalidSample,
  recordClinicalOrderResult,
} from '../api/clinicalOrder';

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

function columnFor(task: WorkflowTask): ColumnKey | null {
  if (task.status === 'completed') return 'completed';
  if (task.status === 'escalated') return 'escalated';
  if (task.status === 'ready' || task.status === 'pending' || (task.status === 'assigned' && !task.assigneeId)) return 'ready';
  if (['assigned', 'accepted', 'in_progress', 'waiting_for_patient', 'waiting_for_result', 'waiting_for_approval'].includes(task.status)) return 'in_progress';
  return 'ready';
}

function TaskCard({ task, encounterLabel, ghost, readOnly }: { task: WorkflowTask; encounterLabel: string; ghost?: boolean; readOnly?: boolean }) {
  // Không áp `transform` lên thẻ gốc — DragOverlay là bản ghost bay theo chuột;
  // transform cả thẻ gốc sẽ tạo 2 thẻ cùng di chuyển, thẻ gốc bị overflow cắt.
  // `ghost` = bản copy trong DragOverlay: hiển thị nét, không đăng ký ref trùng id.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task }, disabled: ghost || readOnly });
  const minutesLeft = overdueMinutes(task);
  return (
    <div
      ref={ghost ? undefined : setNodeRef}
      style={{
        visibility: !ghost && isDragging ? 'hidden' : 'visible',
        background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8,
        padding: '10px 12px', marginBottom: 8, cursor: readOnly ? 'default' : 'grab',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <Link to={`/app/workflows/instances/${task.instanceId}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--medical-blue-700)' }}>{task.name}</Link>
        {!readOnly && (
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            label={`Kéo để chuyển tác vụ "${task.name}" sang cột khác`}
          />
        )}
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

function Column({ col, tasks, encounterLabelFor, readOnly }: { col: (typeof COLUMNS)[number]; tasks: WorkflowTask[]; encounterLabelFor: (t: WorkflowTask) => string; readOnly?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key, disabled: readOnly });
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
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10 }}>{readOnly ? 'Chỉ xem — vai trò của bạn không thao tác trực tiếp tác vụ lâm sàng.' : col.hint}</Text>
      {tasks.map((t) => <TaskCard key={t.id} task={t} encounterLabel={encounterLabelFor(t)} readOnly={readOnly} />)}
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
  const clinicalOrders = useStore(clinicalOrderRepository.orders());
  const [department, setDepartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState<WorkflowTaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'all'>('all');
  const [activeTask, setActiveTask] = useState<WorkflowTask | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [resultOrder, setResultOrder] = useState<ClinicalOrder | null>(null);
  const [resultSummary, setResultSummary] = useState('');
  const [resultAbnormal, setResultAbnormal] = useState(false);
  const [resultCritical, setResultCritical] = useState(false);
  const [criticalReason, setCriticalReason] = useState('');
  const [invalidSampleOrder, setInvalidSampleOrder] = useState<ClinicalOrder | null>(null);
  const [invalidSampleReason, setInvalidSampleReason] = useState('');
  const [clinicalOrderBusy, setClinicalOrderBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  // Backend chặn tuyệt đối claim/start/complete/escalate/reassign cho
  // super_administrator (workflow-policies.ts assertCanActOnTask — không có
  // bypass, vì thao tác tác vụ lâm sàng không thuộc phạm vi quản trị nền
  // tảng). Vai trò này chỉ được xem toàn bộ hàng đợi, không thao tác được.
  const canAct = role !== 'super_administrator';
  const departments = useMemo(() => Array.from(new Set(tasks.map((t) => t.department))), [tasks]);
  const visibleForRole = tasks.filter((t) =>
    hasRoleAccess(role, ['medical_administrator', 'system_administrator', 'super_administrator', 'doctor', 'nurse', 'receptionist']) || t.responsibleRole === role
  );
  const filtered = visibleForRole.filter((t) =>
    (department === 'all' || t.department === department) &&
    (statusFilter === 'all' || t.status === statusFilter) &&
    (priorityFilter === 'all' || t.priority === priorityFilter) &&
    (urgencyFilter === 'all' || t.urgency === urgencyFilter),
  );

  const patients = useStore(patientRepository);
  const users = useStore(userRepository);

  const encounterLabelFor = (t: WorkflowTask | { encounterId: string }) => {
    const enc = encounters.find((e) => e.id === t.encounterId);
    if (!enc) return `Lượt khám #${t.encounterId.slice(0, 8)}`;
    const patient = patients.find((p) => p.id === enc.patientId);
    const patientName = patient ? patient.name : 'Bệnh nhân';
    return `${patientName} (${enc.department})`;
  };

  const byColumn = (key: ColumnKey) => filtered.filter((t) => columnFor(t) === key);

  const refreshTasks = () =>
    listWorkflowTasks().then((rows) => workflowRepository.tasks().replaceAll(rows)).catch((err: unknown) => { showError(err); });
  const refreshClinicalOrders = () =>
    listAssignedClinicalOrders()
      .then((rows) => clinicalOrderRepository.orders().replaceAll(rows))
      .catch((err: unknown) => { showError(err); });

  useEffect(() => {
    refreshTasks();
    refreshClinicalOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitClinicalResult = async () => {
    if (!resultOrder) return;
    if (!resultSummary.trim()) {
      message.error('Cần nhập kết quả chuyên môn.');
      return;
    }
    if (resultCritical && !resultAbnormal) {
      message.error('Kết quả nguy cấp bắt buộc phải được đánh dấu bất thường.');
      return;
    }
    if (resultCritical && !criticalReason.trim()) {
      message.error('Cần ghi rõ lý do xác định kết quả nguy cấp.');
      return;
    }
    setClinicalOrderBusy(true);
    try {
      const result = await recordClinicalOrderResult(resultOrder.id, {
        summary: resultSummary.trim(),
        abnormal: resultAbnormal,
        critical: resultCritical,
        criticalReason: resultCritical ? criticalReason.trim() : undefined,
        version: Math.max(1, resultOrder.version ?? 1),
      });
      clinicalOrderRepository.results().upsert(result);
      await refreshClinicalOrders();
      setResultOrder(null);
      setResultSummary('');
      setResultAbnormal(false);
      setResultCritical(false);
      setCriticalReason('');
      message.success(resultCritical ? 'Đã gửi kết quả nguy cấp và kích hoạt quy trình xác nhận.' : 'Đã ghi nhận kết quả.');
    } catch (err) {
      showError(err);
    } finally {
      setClinicalOrderBusy(false);
    }
  };

  const submitInvalidSample = async () => {
    if (!invalidSampleOrder) return;
    if (invalidSampleReason.trim().length < 3) {
      message.error('Cần ghi rõ nguyên nhân mẫu không hợp lệ.');
      return;
    }
    setClinicalOrderBusy(true);
    try {
      await markClinicalOrderInvalidSample(invalidSampleOrder.id, {
        reason: invalidSampleReason.trim(),
        version: Math.max(1, invalidSampleOrder.version ?? 1),
      });
      await refreshClinicalOrders();
      setInvalidSampleOrder(null);
      setInvalidSampleReason('');
      message.success('Đã báo mẫu không hợp lệ để điều phối lấy lại.');
    } catch (err) {
      showError(err);
    } finally {
      setClinicalOrderBusy(false);
    }
  };

  const autoAssign = () => {
    const candidates = tasks.filter((t) => t.responsibleRole === role && t.status === 'ready' && !t.assigneeId);
    if (candidates.length === 0) { message.info('Không có tác vụ nào phù hợp để tự động phân công.'); return; }
    Promise.all(candidates.map((t) => reassignWorkflowTask(t.id, { assigneeId: currentUser.id, version: t.version ?? 0 })))
      .then(() => {
        refreshTasks();
        message.success(`Đã tự động phân công ${candidates.length} tác vụ cho bạn.`);
      })
      .catch((err: unknown) => { showError(err); });
  };

  const handleDragStart = (e: DragStartEvent) => {
    const t = tasks.find((task) => task.id === e.active.id);
    setActiveTask(t ?? null);
    // Đo bề rộng thẻ gốc để ghost trong DragOverlay to đúng bằng thẻ thật,
    // tránh bị ép hẹp lại 260px khiến nội dung mô tả bị cắt cụt sớm.
    setDragWidth(e.active.rect.current.initial?.width ?? null);
  };

  const dropError = (task: WorkflowTask, target: ColumnKey): string | null => {
    if (target === 'in_progress') {
      if (task.status === 'escalated') return 'Chưa hỗ trợ mở lại tác vụ đã báo cáo bất thường qua API — vui lòng xử lý ngoài hệ thống.';
      if (task.status === 'ready' || task.status === 'accepted' || task.status === 'assigned') return null;
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
    const version = task.version ?? 0;
    const action = target === 'in_progress'
      ? (task.status === 'ready' ? acceptWorkflowTask(task.id, version) : startWorkflowTask(task.id, version))
      : target === 'completed'
        ? completeWorkflowTask(task.id, version)
        : escalateWorkflowTask(task.id, { reason: 'Chuyển bằng kéo thả trong hàng đợi công việc', version });

    action
      .then(() => {
        refreshTasks();
        message.success(`Đã cập nhật trạng thái tác vụ "${task.name}".`);
      })
      .catch((err: unknown) => { showError(err); })
      .finally(() => setPendingDrop(null));
  };

  const dropDescription = (task: WorkflowTask, target: ColumnKey): { question: string; confirmLabel: string } => {
    const col = COLUMNS.find((c) => c.key === target)!;
    if (target === 'in_progress') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Xác nhận' };
    if (target === 'completed') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Hoàn thành' };
    if (target === 'escalated') return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Báo cáo' };
    return { question: `Chuyển tác vụ "${task.name}" sang "${col.title}"?`, confirmLabel: 'Xác nhận' };
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    setDragWidth(null);
    const target = e.over?.id as ColumnKey | undefined;
    const task = tasks.find((t) => t.id === e.active.id);
    if (!task || !target) return;
    const source = columnFor(task);
    if (source === target) return;

    const error = dropError(task, target);
    if (error) { message.error(error); return; }

    const { question, confirmLabel } = dropDescription(task, target);
    setPendingDrop({ title: 'Xác nhận chuyển tác vụ', question, confirmLabel, run: () => applyDrop(task, target) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Hàng Đợi Công Việc</Title>
        </div>
        {canAct && <Button type="primary" icon={<Zap size={15} />} onClick={autoAssign}>Tự động phân công</Button>}
      </div>

      <Card size="small">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Select style={{ width: 200 }} value={department} onChange={setDepartment} options={[{ value: 'all', label: 'Tất cả bộ phận' }, ...departments.map((d) => ({ value: d, label: d }))]} />
          <Select style={{ width: 200 }} value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(TASK_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))]} />
          <Select style={{ width: 160 }} value={priorityFilter} onChange={setPriorityFilter} options={[{ value: 'all', label: 'Mọi mức ưu tiên' }, { value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }]} />
          <Select style={{ width: 160 }} value={urgencyFilter} onChange={setUrgencyFilter} options={[{ value: 'all', label: 'Mọi mức độ' }, { value: 'routine', label: 'Thường quy' }, { value: 'urgent', label: 'Khẩn' }, { value: 'emergency', label: 'Cấp cứu' }]} />
        </div>
      </Card>

      <Card
        title="Y lệnh cận lâm sàng cần thực hiện"
        size="small"
        extra={<Tag color="blue">{clinicalOrders.filter((order) => order.status === 'requested' || order.status === 'in_progress').length} đang chờ</Tag>}
      >
        <Table
          size="small"
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 6 }}
          dataSource={clinicalOrders}
          locale={{ emptyText: 'Không có y lệnh trong phạm vi vai trò hiện tại.' }}
          columns={[
            {
              title: 'Loại',
              dataIndex: 'type',
              render: (value: ClinicalOrder['type']) =>
                value === 'laboratory' ? 'Xét nghiệm' : value === 'imaging' ? 'Chẩn đoán hình ảnh' : 'Hội chẩn',
            },
            {
              title: 'Lượt khám',
              dataIndex: 'encounterId',
              render: (_: string, order: ClinicalOrder) => encounterLabelFor(order),
            },
            { title: 'Lý do chỉ định', dataIndex: 'justification' },
            {
              title: 'Trạng thái',
              render: (_: unknown, order: ClinicalOrder) => (
                <Tag color={order.status === 'invalid_sample' ? 'error' : order.status === 'completed' ? 'success' : order.status === 'result_ready' ? 'warning' : 'processing'}>
                  {order.status === 'requested' ? 'Chờ thực hiện' : order.status === 'in_progress' ? 'Đang thực hiện' : order.status === 'invalid_sample' ? 'Mẫu không hợp lệ' : order.status === 'result_ready' ? 'Có kết quả bất thường' : order.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                </Tag>
              ),
            },
            {
              title: 'Thao tác',
              fixed: 'right',
              render: (_: unknown, order: ClinicalOrder) => {
                const actionable =
                  canAct &&
                  order.assignedRole === role &&
                  (order.status === 'requested' || order.status === 'in_progress');
                if (!actionable) return <Text type="secondary">Chỉ xem</Text>;
                return (
                  <Space wrap>
                    <Button size="small" type="primary" onClick={() => setResultOrder(order)}>Nhập kết quả</Button>
                    {order.type === 'laboratory' && (
                      <Button size="small" danger onClick={() => setInvalidSampleOrder(order)}>Mẫu không hợp lệ</Button>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {COLUMNS.map((col) => <Column key={col.key} col={col} tasks={byColumn(col.key)} encounterLabelFor={encounterLabelFor} readOnly={!canAct} />)}
        </div>
        <DragOverlay>
          {activeTask ? <div style={{ width: dragWidth ?? 260 }}><TaskCard task={activeTask} encounterLabel={encounterLabelFor(activeTask)} ghost /></div> : null}
        </DragOverlay>
      </DndContext>

      <Card title="Danh sách tổng hợp tất cả tác vụ trong hệ thống" size="small" extra={<ShieldCheck size={15} color="var(--text-muted)" />}>
        <Table
          size="small"
          scroll={{ x: 'max-content' }}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          dataSource={filtered}
          columns={[
            { title: 'Tác vụ', dataIndex: 'name', render: (v: string, t) => <Link to={`/app/workflows/instances/${t.instanceId}`}>{v}</Link> },
            { title: 'Lượt khám', render: (_, t) => encounterLabelFor(t) },
            { title: 'Vai trò', dataIndex: 'responsibleRole', render: (v: WorkflowTask['responsibleRole']) => ROLE_LABEL[v] },
            { title: 'Trạng thái', dataIndex: 'status', render: (v: WorkflowTaskStatus) => <Tag>{TASK_STATUS_LABEL[v]}</Tag> },
            {
              title: 'Người phụ trách',
              dataIndex: 'assigneeId',
              render: (assigneeId?: string) => {
                if (!assigneeId) return <Text type="secondary">Chưa phân công</Text>;
                const staff = users.find((u) => u.id === assigneeId);
                return staff ? staff.name : assigneeId;
              },
            },
          ]}
        />
      </Card>

      {pendingDrop && <DragConfirmDialog pending={pendingDrop} onCancel={() => setPendingDrop(null)} />}

      <Modal
        title="Ghi nhận kết quả cận lâm sàng"
        open={Boolean(resultOrder)}
        onCancel={() => setResultOrder(null)}
        onOk={() => void submitClinicalResult()}
        okText="Gửi kết quả"
        cancelText="Hủy"
        confirmLoading={clinicalOrderBusy}
      >
        <Alert
          type="info"
          showIcon
          message="Kết quả đã gửi là dữ liệu lâm sàng có audit"
          description="Không đánh dấu nguy cấp chỉ để ưu tiên hàng đợi. Nếu nguy cấp, bác sĩ bắt buộc phải xác nhận đã tiếp nhận và xử trí trước khi đóng lượt khám."
          style={{ marginBottom: 12 }}
        />
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Input.TextArea
            rows={4}
            value={resultSummary}
            onChange={(event) => setResultSummary(event.target.value)}
            placeholder="Kết quả, giá trị đo, đơn vị, khoảng tham chiếu và nhận xét..."
          />
          <Checkbox
            checked={resultAbnormal}
            onChange={(event) => {
              setResultAbnormal(event.target.checked);
              if (!event.target.checked) setResultCritical(false);
            }}
          >
            Kết quả bất thường
          </Checkbox>
          <Checkbox
            checked={resultCritical}
            disabled={!resultAbnormal}
            onChange={(event) => setResultCritical(event.target.checked)}
          >
            Kết quả nguy cấp — cần bác sĩ xác nhận ngay
          </Checkbox>
          {resultCritical && (
            <Input.TextArea
              rows={2}
              value={criticalReason}
              onChange={(event) => setCriticalReason(event.target.value)}
              placeholder="Lý do/ngưỡng nguy cấp và yêu cầu xử trí tức thời..."
            />
          )}
        </Space>
      </Modal>

      <Modal
        title="Báo mẫu không hợp lệ"
        open={Boolean(invalidSampleOrder)}
        onCancel={() => setInvalidSampleOrder(null)}
        onOk={() => void submitInvalidSample()}
        okText="Xác nhận cần lấy lại"
        cancelText="Hủy"
        confirmLoading={clinicalOrderBusy}
      >
        <Input.TextArea
          rows={3}
          value={invalidSampleReason}
          onChange={(event) => setInvalidSampleReason(event.target.value)}
          placeholder="Ví dụ: mẫu đông, sai ống, thiếu thể tích..."
        />
      </Modal>
    </div>
  );
}
