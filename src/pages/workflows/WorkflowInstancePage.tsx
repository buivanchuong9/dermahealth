import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, type Node, type Edge, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Tag, Input, Typography, Result } from 'antd';
import { ArrowLeft, Play, CheckCircle, RotateCcw, XCircle, TriangleAlert, PauseCircle, PlayCircle, Ban, SkipForward, UserPlus, SearchX } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { workflowRepository } from '../../domain/repositories';
import { workflowService } from '../../domain/services/workflowService';
import { layoutByPrerequisites } from '../../domain/flowLayout';
import { TASK_STATUS_LABEL, ROLE_LABEL } from '../../domain/core/enums';
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
  const { currentUser } = useAppState();
  const instances = useStore(workflowRepository.instances());
  const tasks = useStore(workflowRepository.tasks());
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<WorkflowTaskId | null>(null);

  const instance = instances.find((i) => i.id === instanceId);
  const instanceTasks = useMemo(() => tasks.filter((t) => t.instanceId === instanceId), [tasks, instanceId]);

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

  const guarded = (fn: () => void) => {
    try { fn(); } catch (err) { showError(err); }
  };

  const reason = (taskId: WorkflowTaskId) => reasonDraft[taskId] || 'Lý do mô phỏng (demo)';
  const selectedTask = instanceTasks.find((t) => t.id === selectedTaskId) ?? instanceTasks[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/app/work-queue" style={{ fontSize: 12.5, color: 'var(--medical-blue-600)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><ArrowLeft size={13} /> Quay lại hàng đợi</Link>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Quy Trình {instance.id}</div>
          <Text type="secondary">Lượt khám {instance.encounterId} · Trạng thái: <strong>{instance.status}</strong></Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {instance.status === 'active' && <Button icon={<PauseCircle size={14} />} onClick={() => guarded(() => workflowService.suspendInstance(instance.id, currentUser.id, 'Tạm dừng theo yêu cầu'))}>Tạm dừng</Button>}
          {instance.status === 'suspended' && <Button icon={<PlayCircle size={14} />} onClick={() => guarded(() => workflowService.resumeInstance(instance.id, currentUser.id))}>Tiếp tục</Button>}
          {(instance.status === 'active' || instance.status === 'suspended') && <Button icon={<Ban size={14} />} onClick={() => guarded(() => workflowService.cancelInstance(instance.id, currentUser.id, 'Hủy theo yêu cầu'))}>Hủy quy trình</Button>}
          {instance.status === 'active' && <Button type="primary" icon={<CheckCircle size={14} />} onClick={() => guarded(() => workflowService.checkAndCompleteInstance(instance.id, currentUser.id))}>Kiểm tra hoàn tất</Button>}
        </div>
      </div>

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
              {selectedTask.status === 'ready' && <Button size="small" icon={<UserPlus size={13} />} onClick={() => guarded(() => workflowService.acceptTask(selectedTask.id, currentUser.id))}>Nhận việc</Button>}
              {(selectedTask.status === 'accepted' || selectedTask.status === 'assigned') && <Button size="small" icon={<Play size={13} />} onClick={() => guarded(() => workflowService.startTask(selectedTask.id, currentUser.id))}>Bắt đầu</Button>}
              {selectedTask.status === 'in_progress' && <Button size="small" type="primary" icon={<CheckCircle size={13} />} onClick={() => guarded(() => workflowService.completeTask(selectedTask.id, currentUser.id))}>Hoàn thành</Button>}
              {(selectedTask.status === 'in_progress' || selectedTask.status === 'completed') && (
                <Button size="small" icon={<RotateCcw size={13} />} onClick={() => guarded(() => workflowService.requestRedo(selectedTask.id, currentUser.id, reason(selectedTask.id)))}>Yêu cầu làm lại</Button>
              )}
              {selectedTask.status !== 'completed' && selectedTask.status !== 'skipped' && selectedTask.status !== 'cancelled' && (
                <Button size="small" danger icon={<TriangleAlert size={13} />} onClick={() => guarded(() => workflowService.escalateTask(selectedTask.id, currentUser.id, reason(selectedTask.id)))}>Báo cáo bất thường</Button>
              )}
              {(selectedTask.status === 'pending' || selectedTask.status === 'blocked' || selectedTask.status === 'ready') && (
                <Button size="small" icon={<SkipForward size={13} />} onClick={() => guarded(() => workflowService.skipTask(selectedTask.id, currentUser.id, reason(selectedTask.id)))}>Bỏ qua (nếu không bắt buộc)</Button>
              )}
              {selectedTask.status === 'in_progress' && (
                <Button size="small" icon={<XCircle size={13} />} onClick={() => guarded(() => workflowService.rejectResult(selectedTask.id, currentUser.id, reason(selectedTask.id)))}>Từ chối kết quả</Button>
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
