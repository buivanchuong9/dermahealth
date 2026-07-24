import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, type Node, type Edge, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Tag, Input, Typography, Result, Descriptions } from 'antd';
import { ArrowLeft, Play, CheckCircle, RotateCcw, XCircle, TriangleAlert, PauseCircle, PlayCircle, Ban, SkipForward, UserPlus, SearchX, ShieldCheck } from 'lucide-react';
import { useStore } from '../../state/useStore';
import { encounterRepository, patientRepository, workflowRepository } from '../../domain/repositories';
import {
  getWorkflowInstance,
  verifyWorkflowInstanceIdentity,
  suspendWorkflowInstance,
  resumeWorkflowInstance,
  cancelWorkflowInstance,
  completeWorkflowInstance,
} from '../../api/workflowInstance';
import {
  listWorkflowTasks,
  acceptWorkflowTask,
  startWorkflowTask,
  completeWorkflowTask,
  redoWorkflowTask,
  rejectWorkflowTask,
  escalateWorkflowTask,
  skipWorkflowTask,
} from '../../api/workflowTask';
import { layoutByPrerequisites } from '../../domain/flowLayout';
import { TASK_STATUS_LABEL } from '../../domain/core/enums';
import { ROLE_LABEL } from '../../domain/core/role';
import type { WorkflowInstanceId, WorkflowTaskId } from '../../domain/core/ids';
import type { WorkflowTask } from '../../domain/core/entities';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../../components/feedback/ProfessionalEmpty';

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  completed: '#238a57', skipped: '#8792a2', cancelled: '#8792a2', pending: '#c6d2de',
  blocked: '#c6d2de', ready: '#2878c8', assigned: '#2878c8', accepted: '#2878c8',
  in_progress: '#b7791f', waiting_for_patient: '#b7791f', waiting_for_result: '#b7791f',
  waiting_for_approval: '#b7791f', failed: '#c83e4d', rejected: '#c83e4d',
  redo_required: '#c83e4d', expired: '#c83e4d', escalated: '#c83e4d',
};

function TaskFlowNode({ data }: NodeProps) {
  const task = data.task as WorkflowTask;
  const color = STATUS_COLOR[task.status] ?? '#8792a2';
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: '8px 12px', minWidth: 170, boxShadow: 'var(--shadow-card)' }}>
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Text strong style={{ fontSize: 12.5, display: 'block' }}>{task.name}</Text>
      <Text type="secondary" style={{ fontSize: 10.5 }}>{ROLE_LABEL[task.responsibleRole]}</Text>
      <div style={{ marginTop: 4 }}>
        <Tag color={color} style={{ fontSize: 10, margin: 0 }}>{TASK_STATUS_LABEL[task.status]}</Tag>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { taskNode: TaskFlowNode };

export default function WorkflowInstancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const instanceId = id as WorkflowInstanceId;
  const showError = useFriendlyError();
  const instances = useStore(workflowRepository.instances());
  const tasks = useStore(workflowRepository.tasks());
  const encounters = useStore(encounterRepository);
  const patients = useStore(patientRepository);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<WorkflowTaskId | null>(null);
  const [identityValid, setIdentityValid] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshInstance = () => {
    if (!id) return;
    getWorkflowInstance(id).then((row) => workflowRepository.instances().upsert(row)).catch((err: unknown) => { showError(err); });
  };
  const refreshTasks = () => {
    listWorkflowTasks().then((rows) => rows.forEach((row) => workflowRepository.tasks().upsert(row))).catch((err: unknown) => { showError(err); });
  };

  useEffect(() => {
    if (!id) return;
    refreshInstance();
    refreshTasks();
    verifyWorkflowInstanceIdentity(id)
      .then(() => setIdentityValid(true))
      .catch(() => setIdentityValid(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const instance = instances.find((i) => i.id === instanceId);
  const instanceTasks = useMemo(() => tasks.filter((t) => t.instanceId === instanceId), [tasks, instanceId]);
  const encounter = encounters.find((item) => item.id === instance?.encounterId);
  const patient = patients.find((item) => item.id === (instance?.patientId ?? encounter?.patientId));

  const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = useMemo(() => {
    const positions = layoutByPrerequisites(instanceTasks.map((t) => ({ code: t.stepCode, prerequisiteCodes: t.dependsOnStepCodes })));
    const codeToId = new Map(instanceTasks.map((t) => [t.stepCode, t.id]));
    const n: Node[] = instanceTasks.map((t) => ({
      id: t.id, type: 'taskNode', position: positions[t.stepCode] ?? { x: 0, y: 0 }, data: { task: t },
    }));
    const e: Edge[] = [];
    instanceTasks.forEach((t) => {
      t.dependsOnStepCodes.forEach((prereq) => {
        const sourceId = codeToId.get(prereq);
        if (sourceId) {
          e.push({ id: `${sourceId}-${t.id}`, source: sourceId, target: t.id, animated: t.status === 'in_progress', style: { stroke: '#c6d2de' } });
        }
      });
    });
    return { nodes: n, edges: e };
  }, [instanceTasks]);

  if (!id || !instance) {
    return (
      <Result
        icon={<SearchX size={40} color="var(--text-muted)" />}
        title="Không tìm thấy quy trình đang chạy"
        subTitle={`Mã quy trình "${id ?? ''}" không tồn tại, đã bị hủy, hoặc đã hoàn tất và không còn trong danh sách đang chạy. Vui lòng chọn lại từ hàng đợi công việc.`}
        extra={<Button type="primary" onClick={() => navigate('/app/work-queue')}>Về hàng đợi công việc</Button>}
      />
    );
  }

  const runInstanceAction = (action: () => Promise<unknown>) => {
    setBusy(true);
    action().then(refreshInstance).catch((err: unknown) => { showError(err); }).finally(() => setBusy(false));
  };
  const runTaskAction = (action: () => Promise<unknown>) => {
    setBusy(true);
    action().then(refreshTasks).catch((err: unknown) => { showError(err); }).finally(() => setBusy(false));
  };

  const reason = (taskId: WorkflowTaskId) => reasonDraft[taskId] || 'Lý do mô phỏng (demo)';
  const selectedTask = instanceTasks.find((t) => t.id === selectedTaskId) ?? instanceTasks[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/app/work-queue" style={{ fontSize: 12.5, color: 'var(--medical-blue-600)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><ArrowLeft size={13} /> Quay lại hàng đợi</Link>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Quy trình của {patient?.name ?? 'bệnh nhân'}</div>
          <Text type="secondary">Mã vận hành: <strong>{instance.instanceCode ?? instance.id}</strong></Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {instance.status === 'active' && <Button loading={busy} icon={<PauseCircle size={14} />} onClick={() => runInstanceAction(() => suspendWorkflowInstance(instance.id, { reason: 'Tạm dừng theo yêu cầu', version: instance.version ?? 0 }))}>Tạm dừng</Button>}
          {instance.status === 'suspended' && <Button loading={busy} icon={<PlayCircle size={14} />} onClick={() => runInstanceAction(() => resumeWorkflowInstance(instance.id, instance.version ?? 0))}>Tiếp tục</Button>}
          {(instance.status === 'active' || instance.status === 'suspended') && <Button loading={busy} icon={<Ban size={14} />} onClick={() => runInstanceAction(() => cancelWorkflowInstance(instance.id, { reason: 'Hủy theo yêu cầu', version: instance.version ?? 0 }))}>Hủy quy trình</Button>}
          {instance.status === 'active' && <Button type="primary" loading={busy} icon={<CheckCircle size={14} />} onClick={() => runInstanceAction(() => completeWorkflowInstance(instance.id, instance.version ?? 0))}>Kiểm tra hoàn tất</Button>}
        </div>
      </div>

      <Card size="small">
        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small" items={[
          { key: 'patient', label: 'Bệnh nhân', children: patient ? `${patient.name} · ${patient.code}` : 'Không xác định' },
          { key: 'encounter', label: 'Lượt khám', children: instance.encounterId },
          { key: 'version', label: 'Phiên bản mẫu', children: instance.templateVersionId },
          { key: 'seal', label: 'Liên kết dữ liệu', children: <Tag icon={<ShieldCheck size={12} />} color={identityValid ? 'success' : 'error'}>{identityValid ? 'Đã đối soát' : 'Cần kiểm tra'}</Tag> },
        ]} />
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <div style={{ height: 380 }}>
          {instanceTasks.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProfessionalEmpty title="Quy trình chưa có tác vụ" description="Tác vụ sẽ được tạo khi workflow được kích hoạt từ phiên bản đã xuất bản." primaryLabel="Xem mẫu quy trình" primaryHref="/app/workflows/templates" />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedTaskId(node.id as WorkflowTaskId)}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} color="#e9eff4" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable style={{ background: 'var(--surface-subtle)' }} />
            </ReactFlow>
          )}
        </div>
      </Card>

      <Card size="small" title="Chi tiết & hành động tác vụ">
        {!selectedTask && <ProfessionalEmpty compact title="Chưa chọn tác vụ" description="Chọn một bước trên sơ đồ để xem thông tin và thao tác." showActions={false} />}
        {selectedTask && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14 }}>{selectedTask.name}</Text>
              <Tag color={STATUS_COLOR[selectedTask.status]}>{TASK_STATUS_LABEL[selectedTask.status]}</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 12.5, display: 'block', marginBottom: 4 }}>{ROLE_LABEL[selectedTask.responsibleRole]} · {selectedTask.department}</Text>
            {selectedTask.dependsOnStepCodes.length > 0 && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Phụ thuộc: {selectedTask.dependsOnStepCodes.join(', ')}</Text>}
            {selectedTask.clinicalWarning && <Text type="warning" style={{ fontSize: 12.5, display: 'block', marginBottom: 8 }}><TriangleAlert size={12} style={{ verticalAlign: -1 }} /> {selectedTask.clinicalWarning}</Text>}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Người phụ trách: {selectedTask.assigneeId ?? '— chưa phân công —'} · SLA {selectedTask.slaMinutes} phút{selectedTask.reworkCount > 0 ? ` · đã làm lại ${selectedTask.reworkCount} lần` : ''}
            </Text>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {selectedTask.status === 'ready' && <Button size="small" loading={busy} icon={<UserPlus size={13} />} onClick={() => runTaskAction(() => acceptWorkflowTask(selectedTask.id, selectedTask.version ?? 0))}>Nhận việc</Button>}
              {(selectedTask.status === 'accepted' || selectedTask.status === 'assigned') && <Button size="small" loading={busy} icon={<Play size={13} />} onClick={() => runTaskAction(() => startWorkflowTask(selectedTask.id, selectedTask.version ?? 0))}>Bắt đầu</Button>}
              {selectedTask.status === 'in_progress' && <Button size="small" type="primary" loading={busy} icon={<CheckCircle size={13} />} onClick={() => runTaskAction(() => completeWorkflowTask(selectedTask.id, selectedTask.version ?? 0))}>Hoàn thành</Button>}
              {(selectedTask.status === 'in_progress' || selectedTask.status === 'completed') && (
                <Button size="small" loading={busy} icon={<RotateCcw size={13} />} onClick={() => runTaskAction(() => redoWorkflowTask(selectedTask.id, { reason: reason(selectedTask.id), version: selectedTask.version ?? 0 }))}>Yêu cầu làm lại</Button>
              )}
              {selectedTask.status !== 'completed' && selectedTask.status !== 'skipped' && selectedTask.status !== 'cancelled' && (
                <Button size="small" danger loading={busy} icon={<TriangleAlert size={13} />} onClick={() => runTaskAction(() => escalateWorkflowTask(selectedTask.id, { reason: reason(selectedTask.id), version: selectedTask.version ?? 0 }))}>Báo cáo bất thường</Button>
              )}
              {(selectedTask.status === 'pending' || selectedTask.status === 'blocked' || selectedTask.status === 'ready') && (
                <Button size="small" loading={busy} icon={<SkipForward size={13} />} onClick={() => runTaskAction(() => skipWorkflowTask(selectedTask.id, { reason: reason(selectedTask.id), version: selectedTask.version ?? 0 }))}>Bỏ qua (nếu không bắt buộc)</Button>
              )}
              {selectedTask.status === 'in_progress' && (
                <Button size="small" loading={busy} icon={<XCircle size={13} />} onClick={() => runTaskAction(() => rejectWorkflowTask(selectedTask.id, { reason: reason(selectedTask.id), version: selectedTask.version ?? 0 }))}>Từ chối kết quả</Button>
              )}
            </div>
            <Input
              size="small"
              placeholder="Lý do (dùng cho làm lại / báo cáo bất thường / bỏ qua)"
              value={reasonDraft[selectedTask.id] ?? ''}
              onChange={(e) => setReasonDraft((p) => ({ ...p, [selectedTask.id]: e.target.value }))}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
