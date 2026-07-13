import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position, MiniMap, Panel, type Node, type Edge, type NodeProps, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { App as AntApp, Card, Input, Select, InputNumber, Checkbox, Button, Tag, Alert, Typography, Result, Grid } from 'antd';
import { Plus, Trash2, Upload, Archive, ArrowLeft, Lock, GripVertical, SearchX, Bot, Stethoscope, HeartPulse, UserRoundCheck, FlaskConical, ScanLine, Pill, CreditCard, LogOut, ClipboardCheck, Activity } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { workflowRepository } from '../../domain/repositories';
import { workflowService } from '../../domain/services/workflowService';
import { layoutByPrerequisites } from '../../domain/flowLayout';
import { ROLE_LABEL } from '../../domain/core/enums';
import type { UserRole } from '../../domain/core/enums';
import type { WorkflowTemplateId } from '../../domain/core/ids';
import type { WorkflowStepDefinition } from '../../domain/core/entities';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../../components/feedback/ProfessionalEmpty';

const { Text } = Typography;
const ROLE_OPTIONS: UserRole[] = ['nurse', 'doctor', 'lab_technician', 'imaging_technician', 'pharmacist', 'receptionist', 'care_coordinator'];

type StepIcon = NonNullable<WorkflowStepDefinition['icon']>;
const ICON_META: Record<StepIcon, { label: string; icon: typeof Bot; color: string }> = {
  robot: { label: 'AI / Robot', icon: Bot, color: '#6f42c1' },
  doctor: { label: 'Bác sĩ', icon: Stethoscope, color: '#1769aa' },
  nurse: { label: 'Điều dưỡng', icon: HeartPulse, color: '#d14f7b' },
  reception: { label: 'Lễ tân / Tiếp đón', icon: UserRoundCheck, color: '#2878c8' },
  laboratory: { label: 'Xét nghiệm', icon: FlaskConical, color: '#00897b' },
  imaging: { label: 'Chẩn đoán hình ảnh', icon: ScanLine, color: '#5c6bc0' },
  pharmacy: { label: 'Dược / Cấp thuốc', icon: Pill, color: '#2e7d32' },
  cashier: { label: 'Thu ngân / Thanh toán', icon: CreditCard, color: '#b7791f' },
  procedure: { label: 'Thủ thuật', icon: Activity, color: '#c83e4d' },
  discharge: { label: 'Xuất viện', icon: LogOut, color: '#455a64' },
  task: { label: 'Tác vụ chung', icon: ClipboardCheck, color: '#607d8b' },
};
const defaultIconForRole = (role: UserRole): StepIcon => ({ doctor: 'doctor', nurse: 'nurse', receptionist: 'reception', lab_technician: 'laboratory', imaging_technician: 'imaging', pharmacist: 'pharmacy' } as Partial<Record<UserRole, StepIcon>>)[role] ?? 'task';
function StepIconView({ step, size = 22 }: { step: WorkflowStepDefinition; size?: number }) {
  const meta = ICON_META[step.icon ?? defaultIconForRole(step.responsibleRole)];
  const Icon = meta.icon;
  return <span title={meta.label} style={{ width: size + 14, height: size + 14, borderRadius: 10, background: `${meta.color}16`, color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={size} strokeWidth={2.1}/></span>;
}

const EMPTY_STEP: WorkflowStepDefinition = {
  code: '', icon: 'nurse', name: '', description: '', taskType: 'clinical', responsibleRole: 'nurse', department: '',
  mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 20, skipPermission: [], prerequisiteStepCodes: [],
};

function StepFlowNode({ data }: NodeProps) {
  const step = data.step as WorkflowStepDefinition;
  const color = step.mandatory ? '#1e5e9e' : '#8792a2';
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: '8px 12px', minWidth: 170, boxShadow: 'var(--shadow-card)' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff', border: `3px solid ${color}`, width: 13, height: 13 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><StepIconView step={step} size={26}/><div><Text strong style={{ fontSize: 12.5, display: 'block' }}>{step.name || 'Bước chưa đặt tên'}</Text><Text type="secondary" style={{ fontSize: 10.5 }}>{ROLE_LABEL[step.responsibleRole]}</Text></div></div>
      <div style={{ marginTop: 4 }}><Tag color={step.mandatory ? 'blue' : 'default'} style={{ fontSize: 10, margin: 0 }}>{step.mandatory ? 'Bắt buộc' : 'Tuỳ chọn'}</Tag></div>
      <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff', width: 13, height: 13 }} />
    </div>
  );
}
const nodeTypes = { stepNode: StepFlowNode };

function SortableStepRow({ step, canDesign, onToggleMandatory, onIconChange, onRemove }: { step: WorkflowStepDefinition; canDesign: boolean; onToggleMandatory: (v: boolean) => void; onIconChange: (v: StepIcon) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.code });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, padding: 10, background: 'var(--surface-subtle)', borderRadius: 8, border: '1px solid var(--border-default)', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canDesign && <span {...attributes} {...listeners} role="button" tabIndex={0} aria-label={`Kéo để sắp xếp lại bước "${step.name || step.code}"`} style={{ cursor: 'grab', color: 'var(--text-muted)', touchAction: 'none' }}><GripVertical size={14} /></span>}
          {canDesign ? <Select size="small" value={step.icon ?? defaultIconForRole(step.responsibleRole)} onChange={onIconChange} style={{width:150}} popupMatchSelectWidth={220} options={(Object.entries(ICON_META) as [StepIcon, (typeof ICON_META)[StepIcon]][]).map(([value,meta])=>{const Icon=meta.icon;return {value,label:<span title={meta.label} style={{display:'inline-flex',alignItems:'center',gap:6,color:meta.color}}><Icon size={16}/><span style={{color:'var(--text-primary)'}}>{meta.label}</span></span>};})}/> : <StepIconView step={step} size={17}/>}<Text strong style={{ fontSize: 13 }}>{step.name}</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox checked={step.mandatory} disabled={!canDesign} onChange={(e) => onToggleMandatory(e.target.checked)} style={{ fontSize: 12 }}>Bắt buộc</Checkbox>
          {canDesign && <Button size="small" danger type="text" icon={<Trash2 size={13} />} onClick={onRemove} />}
        </div>
      </div>
      <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 4 }}>{step.description}</Text>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
        {ROLE_LABEL[step.responsibleRole]} · {step.department} · SLA {step.maxWaitingMinutes}p
        {step.prerequisiteStepCodes.length > 0 && ` · phụ thuộc: ${step.prerequisiteStepCodes.join(', ')}`}
      </Text>
    </div>
  );
}

export default function WorkflowTemplateEditor() {
  const { id, templateId } = useParams<{ id: string; templateId: string }>();
  const resolvedId = id ?? templateId;
  const navigate = useNavigate();
  const canonicalTemplateId = resolvedId as WorkflowTemplateId;
  const { message } = AntApp.useApp();
  const showError = useFriendlyError();
  const { currentUser, role } = useAppState();
  const screens = Grid.useBreakpoint();
  const isStacked = screens.lg === false;
  const templates = useStore(workflowRepository.templates());
  const versions = useStore(workflowRepository.versions());
  const [draftStep, setDraftStep] = useState(EMPTY_STEP);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const template = templates.find((t) => t.id === canonicalTemplateId);
  const templateVersions = versions.filter((v) => v.templateId === canonicalTemplateId).sort((a, b) => a.version - b.version);
  const draft = templateVersions.find((v) => v.status === 'draft');
  const canDesign = role === 'clinical_process_designer' || role === 'medical_administrator';

  const flowSteps = draft?.steps ?? [];
  const flowPositions = layoutByPrerequisites(flowSteps.map((s) => ({ code: s.code, prerequisiteCodes: s.prerequisiteStepCodes })));
  const nodes: Node[] = flowSteps.map((s) => ({ id: s.code, type: 'stepNode', position: flowPositions[s.code] ?? { x: 0, y: 0 }, data: { step: s } }));
  const edges: Edge[] = [];
  flowSteps.forEach((s) => s.prerequisiteStepCodes.forEach((prereq) => {
      if (flowSteps.some((x) => x.code === prereq)) edges.push({ id: `${prereq}-${s.code}`, source: prereq, target: s.code, type: 'smoothstep', animated: true, deletable: canDesign, style: { stroke: '#2878c8', strokeWidth: 2.5 } });
  }));

  if (!resolvedId || !template) {
    return (
      <Result
        icon={<SearchX size={40} color="var(--text-muted)" />}
        title="Không tìm thấy quy trình"
        subTitle={`Mã quy trình "${resolvedId ?? ''}" không tồn tại hoặc đã bị xóa. Vui lòng chọn lại từ danh sách.`}
        extra={<Button type="primary" onClick={() => navigate('/app/workflows/templates')}>Về danh sách quy trình</Button>}
      />
    );
  }

  const guarded = (fn: () => void) => {
    try { fn(); } catch (err) { showError(err); }
  };

  const addStep = () => guarded(() => {
    if (!draftStep.code.trim() || !draftStep.name.trim()) throw new Error('Cần nhập mã bước và tên bước.');
    workflowService.addStep(canonicalTemplateId, { ...draftStep, department: draftStep.department || template.specialty }, currentUser.id);
    setDraftStep(EMPTY_STEP);
  });

  const removeStep = (code: string) => guarded(() => workflowService.removeStep(canonicalTemplateId, code, currentUser.id));
  const toggleMandatory = (code: string, mandatory: boolean) => guarded(() => workflowService.editStep(canonicalTemplateId, code, { mandatory }, currentUser.id));
  const startNewDraft = () => guarded(() => workflowService.startNewDraftFromPublished(canonicalTemplateId, currentUser.id));
  const publish = () => guarded(() => { workflowService.publishVersion(canonicalTemplateId, currentUser.id); message.success('Đã xuất bản phiên bản mới.'); });
  const archive = (versionId: string) => guarded(() => workflowService.archiveVersion(versionId, currentUser.id));
  const connect = (connection: Connection) => guarded(() => {
    if (!connection.source || !connection.target) throw new Error('Cần chọn đủ bước nguồn và bước đích.');
    workflowService.connectSteps(canonicalTemplateId, connection.source, connection.target, currentUser.id);
    message.success('Đã nối hai bước và lưu quan hệ phụ thuộc.');
  });
  const deleteEdges = (deleted: Edge[]) => guarded(() => {
    deleted.forEach((edge) => workflowService.disconnectSteps(canonicalTemplateId, edge.source, edge.target, currentUser.id));
    message.success('Đã xóa dây nối.');
  });

  const handleDragEnd = (e: DragEndEvent) => {
    if (!draft || !canDesign) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const codes = draft.steps.map((s) => s.code);
    const oldIndex = codes.indexOf(String(active.id));
    const newIndex = codes.indexOf(String(over.id));
    const reordered = arrayMove(codes, oldIndex, newIndex);
    guarded(() => workflowService.reorderSteps(canonicalTemplateId, reordered, currentUser.id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Link to="/app/workflows/templates" style={{ fontSize: 12.5, color: 'var(--medical-blue-600)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><ArrowLeft size={13} /> Quay lại danh sách</Link>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{template.name}</div>
        <Text type="secondary">{template.specialty} · {template.description}</Text>
      </div>

      {!canDesign && (
        <Alert type="warning" showIcon icon={<Lock size={15} />} message="Chỉ xem — cần vai trò Chuyên viên thiết kế quy trình hoặc Quản trị viên y tế để chỉnh sửa." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isStacked ? '1fr' : '1fr 380px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card size="small" title={draft ? `Sơ đồ quy trình — bản nháp v${draft.version}` : 'Không có bản nháp'} styles={{ body: { padding: 0 } }}>
            {!draft && canDesign && <div style={{ padding: 16 }}><Button icon={<Plus size={14} />} onClick={startNewDraft}>Tạo phiên bản mới từ bản đã xuất bản</Button></div>}
            {draft && draft.steps.length > 0 && (
              <div style={{ height: 340 }}>
                <ReactFlow
                  key={flowSteps.map((step) => `${step.code}:${step.prerequisiteStepCodes.join(',')}`).join('|')}
                  defaultNodes={nodes}
                  defaultEdges={edges}
                  nodeTypes={nodeTypes}
                  onConnect={canDesign ? connect : undefined}
                  onEdgesDelete={canDesign ? deleteEdges : undefined}
                  nodesDraggable={canDesign}
                  nodesConnectable={canDesign}
                  edgesReconnectable={false}
                  deleteKeyCode={['Backspace', 'Delete']}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={16} color="#e9eff4" />
                  <Controls />
                  <MiniMap pannable zoomable />
                  {canDesign && <Panel position="top-left"><div style={{background:'rgba(255,255,255,.94)',padding:'7px 10px',borderRadius:6,fontSize:12,boxShadow:'var(--shadow-card)'}}>Kéo chấm xanh bên phải → chấm trắng bên trái để nối. Chọn dây rồi nhấn Delete để xóa.</div></Panel>}
                </ReactFlow>
              </div>
            )}
            {draft && draft.steps.length === 0 && (
              <div style={{ padding: 24 }}>
                <ProfessionalEmpty compact title="Chưa có bước workflow" description="Dùng biểu mẫu bên phải để thêm bước đầu tiên." showActions={false} />
              </div>
            )}
            {!draft && !canDesign && (
              <div style={{ padding: 24 }}>
                <ProfessionalEmpty compact title="Chưa có bản nháp" description="Tạo phiên bản mới từ bản đã xuất bản để tiếp tục thiết kế." showActions={false} />
              </div>
            )}
          </Card>

          <Card size="small" title="Lịch sử phiên bản">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templateVersions.map((v) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-subtle)', borderRadius: 8, fontSize: 13 }}>
                  <span>v{v.version} — {v.steps.length} bước</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color={v.status === 'published' ? 'success' : v.status === 'draft' ? 'warning' : 'default'}>{v.status}</Tag>
                    {canDesign && v.status !== 'archived' && v.status !== 'draft' && <Button size="small" type="text" icon={<Archive size={13} />} onClick={() => archive(v.id)} title="Lưu trữ" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {draft && (
            <Card size="small" title="Danh sách bước (kéo để sắp xếp lại)">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={draft.steps.map((s) => s.code)} strategy={verticalListSortingStrategy}>
                  {draft.steps.map((s) => (
                    <SortableStepRow key={s.code} step={s} canDesign={canDesign} onToggleMandatory={(v) => toggleMandatory(s.code, v)} onIconChange={(icon) => guarded(() => workflowService.editStep(canonicalTemplateId, s.code, { icon }, currentUser.id))} onRemove={() => removeStep(s.code)} />
                  ))}
                </SortableContext>
              </DndContext>
              {draft.steps.length === 0 && <ProfessionalEmpty compact title="Chưa có bước nào" description="Thêm bước mới bằng biểu mẫu phía dưới." showActions={false} />}
            </Card>
          )}

          {draft && canDesign && (
            <Card size="small" title="Thêm bước mới">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input placeholder="Mã bước (VD: XRAY)" value={draftStep.code} onChange={(e) => setDraftStep((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
                <Input placeholder="Tên bước" value={draftStep.name} onChange={(e) => setDraftStep((p) => ({ ...p, name: e.target.value }))} />
                <Select
                  value={draftStep.icon}
                  onChange={(v: StepIcon) => setDraftStep((p) => ({ ...p, icon: v }))}
                  options={(Object.entries(ICON_META) as [StepIcon, (typeof ICON_META)[StepIcon]][]).map(([value, meta]) => { const Icon = meta.icon; return { value, label: <span style={{display:'inline-flex',alignItems:'center',gap:8,color:meta.color}}><Icon size={17}/><span style={{color:'var(--text-primary)'}}>{meta.label}</span></span> }; })}
                  placeholder="Chọn biểu tượng cho bước"
                />
                <Select value={draftStep.responsibleRole} onChange={(v) => setDraftStep((p) => ({ ...p, responsibleRole: v, icon: p.icon ?? defaultIconForRole(v) }))} options={ROLE_OPTIONS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
                <Input placeholder="Bộ phận" value={draftStep.department} onChange={(e) => setDraftStep((p) => ({ ...p, department: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <InputNumber style={{ width: '100%' }} placeholder="Thời lượng (phút)" value={draftStep.estimatedDurationMinutes} onChange={(v) => setDraftStep((p) => ({ ...p, estimatedDurationMinutes: v ?? 0 }))} />
                  <InputNumber style={{ width: '100%' }} placeholder="SLA chờ tối đa (phút)" value={draftStep.maxWaitingMinutes} onChange={(v) => setDraftStep((p) => ({ ...p, maxWaitingMinutes: v ?? 0 }))} />
                </div>
                <Input placeholder="Bước tiền đề (mã, cách nhau bằng dấu phẩy)" value={draftStep.prerequisiteStepCodes.join(',')} onChange={(e) => setDraftStep((p) => ({ ...p, prerequisiteStepCodes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
                <Checkbox checked={draftStep.mandatory} onChange={(e) => setDraftStep((p) => ({ ...p, mandatory: e.target.checked }))}>Bước bắt buộc</Checkbox>
                <Button icon={<Plus size={14} />} onClick={addStep}>Thêm bước</Button>
              </div>
            </Card>
          )}

          {draft && canDesign && (
            <Button type="primary" block icon={<Upload size={15} />} onClick={publish}>Xuất bản phiên bản này</Button>
          )}
        </div>
      </div>
    </div>
  );
}
