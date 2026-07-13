import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position, MiniMap, Panel, type Node, type Edge, type NodeProps, type Connection, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { App as AntApp, Card, Input, Select, InputNumber, Checkbox, Button, Tag, Alert, Typography, Result, Grid, Modal, Popconfirm, Drawer, Collapse } from 'antd';
import { Plus, Trash2, Archive, ArrowLeft, Lock, GripVertical, SearchX, Bot, Stethoscope, HeartPulse, UserRoundCheck, FlaskConical, ScanLine, Pill, CreditCard, LogOut, ClipboardCheck, Activity, Pencil, Rocket, ListChecks, Maximize2, Minimize2, UserRound, GitBranch, Timer, ServerCog, Headphones, ShieldCheck } from 'lucide-react';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { encounterRepository, patientRepository, workflowRepository } from '../../domain/repositories';
import { workflowService } from '../../domain/services/workflowService';
import { layoutByPrerequisites } from '../../domain/flowLayout';
import { hasRoleAccess, type UserRole } from '../../domain/core/enums';
import type { EncounterId, WorkflowTemplateId } from '../../domain/core/ids';
import type { WorkflowExecutorType, WorkflowStepDefinition } from '../../domain/core/entities';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../../components/feedback/ProfessionalEmpty';

const { Text } = Typography;
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
  patient: { label: 'Bệnh nhân', icon: UserRound, color: '#00838f' },
  decision: { label: 'Điểm quyết định', icon: GitBranch, color: '#7b1fa2' },
  waiting: { label: 'Chờ sự kiện / kết quả', icon: Timer, color: '#b7791f' },
  system: { label: 'Hệ thống tự động', icon: ServerCog, color: '#546e7a' },
  customer_care: { label: 'Chăm sóc khách hàng', icon: Headphones, color: '#00897b' },
  manager: { label: 'Quản lý phòng khám', icon: ShieldCheck, color: '#5c6bc0' },
  task: { label: 'Tác vụ chung', icon: ClipboardCheck, color: '#607d8b' },
};
const defaultIconForRole = (role: UserRole): StepIcon => ({ doctor: 'doctor', nurse: 'nurse', receptionist: 'reception', lab_technician: 'laboratory', imaging_technician: 'imaging', pharmacist: 'pharmacy' } as Partial<Record<UserRole, StepIcon>>)[role] ?? 'task';
const EXECUTOR_META: Record<WorkflowExecutorType, { label: string; icon: StepIcon; role: UserRole; department: string; taskType: string }> = {
  patient: { label: 'Bệnh nhân', icon: 'patient', role: 'patient', department: 'Bệnh nhân tự thực hiện', taskType: 'patient_action' },
  receptionist: { label: 'Lễ tân / Tiếp đón', icon: 'reception', role: 'receptionist', department: 'Tiếp đón', taskType: 'administrative' },
  nurse: { label: 'Điều dưỡng', icon: 'nurse', role: 'nurse', department: 'Điều dưỡng', taskType: 'clinical' },
  doctor: { label: 'Bác sĩ', icon: 'doctor', role: 'doctor', department: 'Phòng khám', taskType: 'clinical' },
  lab_technician: { label: 'Kỹ thuật viên xét nghiệm', icon: 'laboratory', role: 'lab_technician', department: 'Xét nghiệm', taskType: 'diagnostic' },
  imaging_technician: { label: 'Kỹ thuật viên chẩn đoán hình ảnh', icon: 'imaging', role: 'imaging_technician', department: 'Chẩn đoán hình ảnh', taskType: 'diagnostic' },
  pharmacist: { label: 'Dược sĩ', icon: 'pharmacy', role: 'pharmacist', department: 'Dược', taskType: 'medication' },
  procedure_team: { label: 'Ê-kíp thủ thuật', icon: 'procedure', role: 'nurse', department: 'Phòng thủ thuật', taskType: 'procedure' },
  cashier: { label: 'Thu ngân', icon: 'cashier', role: 'receptionist', department: 'Thu ngân', taskType: 'payment' },
  care_coordinator: { label: 'Điều phối viên chăm sóc', icon: 'task', role: 'care_coordinator', department: 'Điều phối chăm sóc', taskType: 'follow_up' },
  customer_care: { label: 'Nhân viên chăm sóc khách hàng', icon: 'customer_care', role: 'customer_care_employee', department: 'Chăm sóc khách hàng', taskType: 'follow_up' },
  clinic_manager: { label: 'Quản lý phòng khám', icon: 'manager', role: 'medical_administrator', department: 'Quản lý phòng khám', taskType: 'approval' },
  ai_automation: { label: 'AI tự động', icon: 'robot', role: 'care_coordinator', department: 'Nền tảng AI', taskType: 'automation' },
  system_automation: { label: 'Hệ thống / Tích hợp tự động', icon: 'system', role: 'system_administrator', department: 'Hệ thống', taskType: 'automation' },
  decision: { label: 'Điểm quyết định / Rẽ nhánh', icon: 'decision', role: 'medical_administrator', department: 'Quy tắc quy trình', taskType: 'decision' },
  waiting: { label: 'Chờ bệnh nhân / Chờ kết quả', icon: 'waiting', role: 'care_coordinator', department: 'Điều phối chăm sóc', taskType: 'waiting' },
};
const EXECUTOR_GROUPS: Array<{ label: string; values: WorkflowExecutorType[] }> = [
  { label: 'Người tham gia', values: ['patient', 'receptionist', 'nurse', 'doctor', 'lab_technician', 'imaging_technician', 'pharmacist', 'procedure_team', 'cashier', 'care_coordinator', 'customer_care', 'clinic_manager'] },
  { label: 'Tự động hóa', values: ['ai_automation', 'system_automation'] },
  { label: 'Điều khiển luồng', values: ['decision', 'waiting'] },
];
const executorForRole = (role: UserRole): WorkflowExecutorType => ({ patient: 'patient', receptionist: 'receptionist', nurse: 'nurse', doctor: 'doctor', lab_technician: 'lab_technician', imaging_technician: 'imaging_technician', pharmacist: 'pharmacist', care_coordinator: 'care_coordinator', customer_care_employee: 'customer_care', medical_administrator: 'clinic_manager', system_administrator: 'system_automation' } as Partial<Record<UserRole, WorkflowExecutorType>>)[role] ?? 'care_coordinator';
const executorOptions = EXECUTOR_GROUPS.map((group) => ({
  label: group.label,
  options: group.values.map((value) => {
    const executor = EXECUTOR_META[value];
    const icon = ICON_META[executor.icon];
    const Icon = icon.icon;
    return { value, label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon size={17} color={icon.color} /><span>{executor.label}</span></span> };
  }),
}));
const PRESET_EXECUTOR: Partial<Record<string, WorkflowExecutorType>> = { reception: 'receptionist', vitals: 'nurse', consultation: 'doctor', laboratory: 'lab_technician', imaging: 'imaging_technician', procedure: 'procedure_team', pharmacy: 'pharmacist', payment: 'cashier', follow_up: 'care_coordinator' };
const CLINIC_STEP_TYPES = [
  { value: 'patient_action', label: 'Bệnh nhân tự thực hiện' },
  { value: 'administrative', label: 'Tiếp đón / Hành chính' },
  { value: 'clinical', label: 'Khám và chăm sóc lâm sàng' },
  { value: 'diagnostic', label: 'Xét nghiệm / Chẩn đoán hình ảnh' },
  { value: 'procedure', label: 'Thủ thuật / Điều trị' },
  { value: 'medication', label: 'Cấp thuốc' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'follow_up', label: 'Dặn dò / Chăm sóc sau khám' },
  { value: 'approval', label: 'Phê duyệt / Kiểm soát' },
  { value: 'automation', label: 'Tự động hóa' },
  { value: 'decision', label: 'Điểm quyết định / Rẽ nhánh' },
  { value: 'waiting', label: 'Chờ bệnh nhân / Chờ kết quả' },
];
const CLINIC_LOCATIONS = ['Quầy tiếp đón', 'Khu đo sinh hiệu', 'Phòng khám', 'Phòng thủ thuật', 'Phòng lấy mẫu', 'Khu xét nghiệm', 'Phòng chẩn đoán hình ảnh', 'Nhà thuốc', 'Quầy thu ngân', 'Khu tư vấn sau khám'];
const CLINIC_STEP_PRESETS: Array<{ value: string; label: string; step: Partial<WorkflowStepDefinition> }> = [
  { value: 'reception', label: 'Tiếp nhận và xác minh bệnh nhân', step: { name: 'Tiếp nhận bệnh nhân', taskType: 'administrative', responsibleRole: 'receptionist', location: 'Quầy tiếp đón', estimatedDurationMinutes: 5, maxWaitingMinutes: 15, requiredOutput: 'Danh tính và lịch hẹn đã được xác nhận' } },
  { value: 'vitals', label: 'Đo sinh hiệu', step: { name: 'Đo sinh hiệu', taskType: 'clinical', responsibleRole: 'nurse', location: 'Khu đo sinh hiệu', estimatedDurationMinutes: 10, maxWaitingMinutes: 20, requiredOutput: 'Các chỉ số sinh hiệu' } },
  { value: 'consultation', label: 'Bác sĩ thăm khám', step: { name: 'Bác sĩ thăm khám', taskType: 'clinical', responsibleRole: 'doctor', location: 'Phòng khám', estimatedDurationMinutes: 20, maxWaitingMinutes: 30, requiredOutput: 'Chẩn đoán và kế hoạch điều trị' } },
  { value: 'laboratory', label: 'Lấy mẫu xét nghiệm', step: { name: 'Lấy mẫu xét nghiệm', taskType: 'diagnostic', responsibleRole: 'lab_technician', location: 'Phòng lấy mẫu', estimatedDurationMinutes: 10, maxWaitingMinutes: 30, requiredOutput: 'Mẫu hợp lệ và kết quả xét nghiệm', reworkRule: 'Mẫu không đạt phải lấy lại và thông báo người phụ trách' } },
  { value: 'imaging', label: 'Chẩn đoán hình ảnh', step: { name: 'Chẩn đoán hình ảnh', taskType: 'diagnostic', responsibleRole: 'imaging_technician', location: 'Phòng chẩn đoán hình ảnh', estimatedDurationMinutes: 15, maxWaitingMinutes: 30, requiredOutput: 'Báo cáo chẩn đoán hình ảnh' } },
  { value: 'procedure', label: 'Thực hiện thủ thuật', step: { name: 'Thực hiện thủ thuật', taskType: 'procedure', responsibleRole: 'doctor', location: 'Phòng thủ thuật', estimatedDurationMinutes: 30, maxWaitingMinutes: 30, requiredOutput: 'Biên bản thủ thuật và theo dõi sau thủ thuật' } },
  { value: 'pharmacy', label: 'Cấp phát và hướng dẫn dùng thuốc', step: { name: 'Cấp phát thuốc', taskType: 'medication', responsibleRole: 'pharmacist', location: 'Nhà thuốc', estimatedDurationMinutes: 10, maxWaitingMinutes: 20, requiredOutput: 'Xác nhận cấp phát và hướng dẫn dùng thuốc' } },
  { value: 'payment', label: 'Thanh toán', step: { name: 'Thanh toán', taskType: 'payment', responsibleRole: 'receptionist', location: 'Quầy thu ngân', estimatedDurationMinutes: 5, maxWaitingMinutes: 15, requiredOutput: 'Thanh toán đã hoàn tất' } },
  { value: 'follow_up', label: 'Dặn dò và hẹn tái khám', step: { name: 'Dặn dò sau khám', taskType: 'follow_up', responsibleRole: 'care_coordinator', location: 'Khu tư vấn sau khám', estimatedDurationMinutes: 10, maxWaitingMinutes: 20, requiredOutput: 'Hướng dẫn và lịch tái khám đã được gửi' } },
];
const makeStepCode = (name: string, existingCodes: string[]): string => {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'BUOC';
  let code = base;
  let suffix = 2;
  while (existingCodes.includes(code)) code = `${base}_${suffix++}`;
  return code;
};
function StepIconView({ step, size = 22 }: { step: WorkflowStepDefinition; size?: number }) {
  const meta = ICON_META[step.icon ?? defaultIconForRole(step.responsibleRole)];
  const Icon = meta.icon;
  return <span title={meta.label} style={{ width: size + 14, height: size + 14, borderRadius: 10, background: `${meta.color}16`, color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={size} strokeWidth={2.1}/></span>;
}

const EMPTY_STEP: WorkflowStepDefinition = {
  code: '', icon: 'nurse', executorType: 'nurse', name: '', description: '', taskType: 'clinical', responsibleRole: 'nurse', department: '',
  mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 20, skipPermission: [], prerequisiteStepCodes: [],
};

function StepFlowNode({ data }: NodeProps) {
  const step = data.step as WorkflowStepDefinition;
  const onEdit = data.onEdit as (() => void) | undefined;
  const executorLabel = EXECUTOR_META[step.executorType ?? executorForRole(step.responsibleRole)].label;
  const color = step.mandatory ? '#1e5e9e' : '#8792a2';
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: 8, padding: '8px 12px', minWidth: 170, boxShadow: 'var(--shadow-card)' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff', border: `3px solid ${color}`, width: 13, height: 13 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><StepIconView step={step} size={26}/><div style={{ minWidth: 0, flex: 1 }}><Text strong style={{ fontSize: 12.5, display: 'block' }}>{step.name || 'Bước chưa đặt tên'}</Text><Text type="secondary" style={{ fontSize: 10.5 }}>{executorLabel}{step.location ? ` · ${step.location}` : ''}</Text></div>{onEdit && <button type="button" className="nodrag" aria-label={`Sửa bước ${step.name}`} onClick={(event) => { event.stopPropagation(); onEdit(); }} style={{ border: 0, background: 'transparent', color: '#607d8b', padding: 3, cursor: 'pointer', display: 'inline-flex' }}><Pencil size={13}/></button>}</div>
      <div style={{ marginTop: 4 }}><Tag color={step.mandatory ? 'blue' : 'default'} style={{ fontSize: 10, margin: 0 }}>{step.mandatory ? 'Bắt buộc' : 'Tuỳ chọn'}</Tag></div>
      <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff', width: 13, height: 13 }} />
    </div>
  );
}

function TerminalFlowNode({ data }: NodeProps) {
  const isStart = data.kind === 'start';
  const color = isStart ? '#16856b' : '#b44552';
  return (
    <div style={{ minWidth: 142, padding: '12px 16px', borderRadius: 28, background: '#fff', border: `2px solid ${color}`, boxShadow: 'var(--shadow-card)', textAlign: 'center' }}>
      {!isStart && <Handle type="target" position={Position.Left} style={{ background: '#fff', border: `3px solid ${color}`, width: 13, height: 13 }} />}
      <Text strong style={{ display: 'block', color, fontSize: 13 }}>{String(data.label)}</Text>
      <Text type="secondary" style={{ fontSize: 10.5 }}>{String(data.subtitle)}</Text>
      {isStart && <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff', width: 13, height: 13 }} />}
    </div>
  );
}
const nodeTypes = { stepNode: StepFlowNode, terminalNode: TerminalFlowNode };

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
        {EXECUTOR_META[step.executorType ?? executorForRole(step.responsibleRole)].label} · {step.department} · SLA {step.maxWaitingMinutes}p
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
  const encounters = useStore(encounterRepository);
  const patients = useStore(patientRepository);
  const [draftStep, setDraftStep] = useState(EMPTY_STEP);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedSpecialty, setEditedSpecialty] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [sidePanel, setSidePanel] = useState<'steps' | 'add' | 'edit' | null>(null);
  const [flowFullscreen, setFlowFullscreen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStepDefinition | null>(null);
  const [deploymentOpen, setDeploymentOpen] = useState(false);
  const [deploymentEncounterId, setDeploymentEncounterId] = useState<EncounterId | undefined>();
  const flowInstanceRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const template = templates.find((t) => t.id === canonicalTemplateId);
  const templateVersions = versions.filter((v) => v.templateId === canonicalTemplateId).sort((a, b) => a.version - b.version);
  const draft = templateVersions.find((v) => v.status === 'draft');
  const latestPublished = templateVersions.find((v) => v.id === template?.latestPublishedVersionId);
  const canDesign = hasRoleAccess(role, ['clinical_process_designer', 'medical_administrator']);
  const canPublish = hasRoleAccess(role, ['medical_administrator']);
  const normalizedSpecialty = template?.specialty.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim() ?? '';
  const eligibleEncounters = encounters.filter((encounter) => {
    const department = encounter.department.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim();
    return !!encounter.clinicalPlanId && !encounter.workflowInstanceId && (department.includes(normalizedSpecialty) || normalizedSpecialty.includes(department));
  });

  const flowSteps = draft?.steps ?? [];
  const flowPositions = layoutByPrerequisites(flowSteps.map((s) => ({ code: s.code, prerequisiteCodes: s.prerequisiteStepCodes })));
  const openStepEditor = (code: string) => {
    const step = flowSteps.find((item) => item.code === code);
    if (!step || !canDesign) return;
    setEditingStep({ ...step, prerequisiteStepCodes: [...step.prerequisiteStepCodes], skipPermission: [...step.skipPermission] });
    setSidePanel('edit');
  };
  const stepPositions = Object.fromEntries(flowSteps.map((step) => [step.code, draft?.nodePositions?.[step.code] ?? flowPositions[step.code] ?? { x: 0, y: 0 }]));
  const rootSteps = flowSteps.filter((step) => step.prerequisiteStepCodes.length === 0);
  const referencedCodes = new Set(flowSteps.flatMap((step) => step.prerequisiteStepCodes));
  const leafSteps = flowSteps.filter((step) => !referencedCodes.has(step.code));
  const allPositions = Object.values(stepPositions);
  const minX = allPositions.length ? Math.min(...allPositions.map((position) => position.x)) : 240;
  const maxX = allPositions.length ? Math.max(...allPositions.map((position) => position.x)) : 240;
  const averageY = (steps: WorkflowStepDefinition[]) => steps.length ? steps.reduce((sum, step) => sum + (stepPositions[step.code]?.y ?? 0), 0) / steps.length : 0;
  const nodes: Node[] = [
    { id: '__START__', type: 'terminalNode', position: { x: minX - 230, y: averageY(rootSteps) + 4 }, data: { kind: 'start', label: 'Bắt đầu', subtitle: 'Tiếp nhận' }, draggable: false, connectable: false, deletable: false },
    ...flowSteps.map((step) => ({ id: step.code, type: 'stepNode', position: stepPositions[step.code], data: { step, onEdit: canDesign ? () => openStepEditor(step.code) : undefined } })),
    { id: '__END__', type: 'terminalNode', position: { x: maxX + 280, y: averageY(leafSteps) + 4 }, data: { kind: 'end', label: 'Kết thúc', subtitle: 'Hoàn tất quy trình' }, draggable: false, connectable: false, deletable: false },
  ];
  const edges: Edge[] = [];
  flowSteps.forEach((s) => s.prerequisiteStepCodes.forEach((prereq) => {
      if (flowSteps.some((x) => x.code === prereq)) edges.push({ id: `${prereq}-${s.code}`, source: prereq, target: s.code, type: 'smoothstep', animated: true, deletable: canDesign, label: s.conditionalRule || undefined, labelStyle: { fontSize: 11, fill: '#46586a' }, labelBgStyle: { fill: '#fff', fillOpacity: 0.94 }, style: { stroke: '#2878c8', strokeWidth: 2.5 } });
  }));
  if (flowSteps.length === 0) edges.push({ id: '__START__-__END__', source: '__START__', target: '__END__', type: 'smoothstep', deletable: false, style: { stroke: '#9aabb9', strokeWidth: 2 } });
  rootSteps.forEach((step) => edges.push({ id: `__START__-${step.code}`, source: '__START__', target: step.code, type: 'smoothstep', deletable: false, style: { stroke: '#16856b', strokeWidth: 2.2 } }));
  leafSteps.forEach((step) => edges.push({ id: `${step.code}-__END__`, source: step.code, target: '__END__', type: 'smoothstep', deletable: false, style: { stroke: '#b44552', strokeWidth: 2.2 } }));

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
    if (!draftStep.name.trim()) throw new Error('Vui lòng nhập tên bước.');
    const code = makeStepCode(draftStep.name, draft?.steps.map((step) => step.code) ?? []);
    const executorType = draftStep.executorType ?? executorForRole(draftStep.responsibleRole);
    const executor = EXECUTOR_META[executorType];
    workflowService.addStep(canonicalTemplateId, {
      ...draftStep,
      code,
      executorType,
      responsibleRole: executor.role,
      icon: executor.icon,
      department: executor.department || template.specialty,
    }, currentUser.id);
    setDraftStep(EMPTY_STEP);
    setSidePanel('steps');
    message.success('Đã thêm bước vào quy trình.');
  });
  const applyStepPreset = (presetValue: string) => {
    const preset = CLINIC_STEP_PRESETS.find((item) => item.value === presetValue);
    if (!preset) return;
    const responsibleRole = preset.step.responsibleRole ?? 'nurse';
    const executorType = preset.step.executorType ?? PRESET_EXECUTOR[presetValue] ?? executorForRole(responsibleRole);
    const executor = EXECUTOR_META[executorType];
    setDraftStep((previous) => ({
      ...previous,
      ...preset.step,
      executorType,
      responsibleRole: executor.role,
      icon: executor.icon,
      department: executor.department,
    }));
  };

  const removeStep = (code: string) => guarded(() => workflowService.removeStep(canonicalTemplateId, code, currentUser.id));
  const toggleMandatory = (code: string, mandatory: boolean) => guarded(() => workflowService.editStep(canonicalTemplateId, code, { mandatory }, currentUser.id));
  const startNewDraft = () => guarded(() => {
    workflowService.startNewDraftFromPublished(canonicalTemplateId, currentUser.id);
    message.success('Đã tạo bản chỉnh sửa mới. Quy trình đang dùng không bị ảnh hưởng.');
  });
  const publish = () => guarded(() => {
    workflowService.publishVersion(canonicalTemplateId, currentUser.id);
    setDeploymentEncounterId(eligibleEncounters[0]?.id);
    setDeploymentOpen(true);
    message.success('Quy trình đã sẵn sàng để sử dụng.');
  });
  const deployNow = () => guarded(() => {
    if (!deploymentEncounterId) throw new Error('Vui lòng chọn lượt khám cần khởi chạy.');
    const instance = workflowService.activateWorkflow(deploymentEncounterId, canonicalTemplateId, currentUser.id);
    setDeploymentOpen(false);
    navigate(`/app/workflows/instances/${instance.id}`);
  });
  const archive = (versionId: string) => guarded(() => workflowService.archiveVersion(versionId, currentUser.id));
  const openDetails = () => {
    setEditedName(template.name);
    setEditedSpecialty(template.specialty);
    setEditedDescription(template.description);
    setDetailsOpen(true);
  };
  const saveDetails = () => guarded(() => {
    workflowService.updateTemplateDetails(canonicalTemplateId, { name: editedName, specialty: editedSpecialty, description: editedDescription }, currentUser.id);
    setDetailsOpen(false);
    message.success('Đã cập nhật thông tin quy trình.');
  });
  const saveEditedStep = () => guarded(() => {
    if (!editingStep?.name.trim()) throw new Error('Vui lòng nhập tên bước.');
    const executorType = editingStep.executorType ?? executorForRole(editingStep.responsibleRole);
    const executor = EXECUTOR_META[executorType];
    workflowService.editStep(canonicalTemplateId, editingStep.code, {
      name: editingStep.name.trim(),
      description: editingStep.description.trim(),
      taskType: editingStep.taskType,
      executorType,
      responsibleRole: executor.role,
      department: executor.department,
      icon: executor.icon,
      location: editingStep.location?.trim() || undefined,
      requiredOutput: editingStep.requiredOutput?.trim() || undefined,
      escalationRule: editingStep.escalationRule?.trim() || undefined,
      reworkRule: editingStep.reworkRule?.trim() || undefined,
      notificationRule: editingStep.notificationRule?.trim() || undefined,
      mandatory: editingStep.mandatory,
      estimatedDurationMinutes: editingStep.estimatedDurationMinutes,
      maxWaitingMinutes: editingStep.maxWaitingMinutes,
      prerequisiteStepCodes: editingStep.prerequisiteStepCodes,
      conditionalRule: editingStep.conditionalRule?.trim() || undefined,
    }, currentUser.id);
    setEditingStep(null);
    setSidePanel(null);
    message.success('Đã cập nhật bước trong quy trình.');
  });
  const saveCurrentNodePositions = () => {
    const currentNodes = (flowInstanceRef.current?.getNodes() ?? []).filter((node) => node.type === 'stepNode');
    if (currentNodes.length === 0) return;
    workflowService.saveNodePositions(
      canonicalTemplateId,
      Object.fromEntries(currentNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])),
      currentUser.id,
    );
  };
  const connect = (connection: Connection) => guarded(() => {
    if (!connection.source || !connection.target) throw new Error('Cần chọn đủ bước nguồn và bước đích.');
    saveCurrentNodePositions();
    workflowService.connectSteps(canonicalTemplateId, connection.source, connection.target, currentUser.id);
    message.success('Đã nối hai bước và lưu quan hệ phụ thuộc.');
  });
  const deleteEdges = (deleted: Edge[]) => guarded(() => {
    saveCurrentNodePositions();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: -14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{template.name}</div>
            <Tag color="blue" style={{ margin: 0 }}>{template.specialty}</Tag>
          </div>
          {template.description && <Text type="secondary" style={{ display: 'block', marginTop: 3 }}>{template.description}</Text>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/app/workflows/templates')}>Danh sách quy trình</Button>
          {canDesign && <Button icon={<Pencil size={14} />} onClick={openDetails}>Sửa thông tin</Button>}
        </div>
      </div>

      {!canDesign && (
        <Alert type="warning" showIcon icon={<Lock size={15} />} message="Chỉ xem — cần vai trò Chuyên viên thiết kế quy trình hoặc Quản trị viên y tế để chỉnh sửa." />
      )}

      <Card
        size="small"
        title={draft ? `Bản đang chỉnh sửa · v${draft.version}` : latestPublished ? `Phiên bản đang sử dụng · v${latestPublished.version}` : 'Chưa có phiên bản chỉnh sửa'}
        extra={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {draft && <Button size="small" icon={<ListChecks size={14} />} onClick={() => setSidePanel('steps')}>Các bước ({draft.steps.length})</Button>}
            {draft && canDesign && <Button size="small" type="primary" icon={<Plus size={14} />} onClick={() => setSidePanel('add')}>Thêm bước</Button>}
            <Button size="small" icon={flowFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} onClick={() => setFlowFullscreen((value) => !value)}>{flowFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</Button>
            {draft && canPublish && (
              <Popconfirm
                title="Đưa quy trình mới vào sử dụng?"
                description="Phiên bản hiện tại sẽ được giữ trong lịch sử và các lượt khám mới sẽ dùng phiên bản này."
                okText="Xác nhận đưa vào sử dụng"
                cancelText="Tiếp tục chỉnh sửa"
                onConfirm={publish}
              >
                <Button size="small" type="primary" icon={<Rocket size={14} />}>Đưa vào sử dụng</Button>
              </Popconfirm>
            )}
          </div>
        )}
        style={flowFullscreen ? { position: 'fixed', inset: 14, zIndex: 999, boxShadow: '0 18px 60px rgba(15,47,77,.24)' } : undefined}
        styles={{ body: { padding: 0 } }}
      >
        {!draft && canDesign && (
          <div style={{ minHeight: flowFullscreen ? 'calc(100vh - 88px)' : 520, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 620, textAlign: 'center' }}>
              <Text strong style={{ display: 'block', fontSize: 16 }}>Bạn vẫn có thể điều chỉnh quy trình này</Text>
              <Text type="secondary" style={{ display: 'block', margin: '7px 0 16px' }}>Hệ thống tạo một bản chỉnh sửa riêng; phiên bản đang dùng tiếp tục hoạt động cho đến khi bản mới được duyệt.</Text>
              <Button type="primary" icon={<Pencil size={14} />} onClick={startNewDraft}>Tạo bản chỉnh sửa</Button>
            </div>
          </div>
        )}
        {draft && (
          <div style={{ height: flowFullscreen ? 'calc(100vh - 78px)' : 'clamp(520px, calc(100vh - 290px), 760px)' }}>
            <ReactFlow
              key={`${draft.id}:${JSON.stringify(flowSteps)}`}
              defaultNodes={nodes}
              defaultEdges={edges}
              onInit={(instance) => { flowInstanceRef.current = instance; }}
              onNodeDragStop={(_, node) => node.type === 'stepNode' && guarded(() => workflowService.saveNodePositions(canonicalTemplateId, { [node.id]: { x: node.position.x, y: node.position.y } }, currentUser.id))}
              onNodeDoubleClick={(_, node) => node.type === 'stepNode' && openStepEditor(node.id)}
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
              {flowSteps.length === 0 && <Panel position="top-center"><div style={{background:'rgba(255,255,255,.96)',padding:'9px 13px',borderRadius:8,fontSize:12.5,boxShadow:'var(--shadow-card)'}}>Quy trình đã có điểm bắt đầu và kết thúc. Bấm “Thêm bước” để chèn bước xử lý đầu tiên.</div></Panel>}
            </ReactFlow>
          </div>
        )}
        {!draft && !canDesign && (
          <div style={{ minHeight: 520, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProfessionalEmpty compact title="Chưa có bản chỉnh sửa" description="Người có quyền thiết kế có thể tạo phiên bản mới từ quy trình đang sử dụng." showActions={false} />
          </div>
        )}
      </Card>

      <Card size="small" title="Lịch sử phiên bản">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templateVersions.map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-subtle)', borderRadius: 8, fontSize: 13 }}>
              <span>v{v.version} — {v.steps.length} bước</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag color={v.status === 'published' ? 'success' : v.status === 'draft' ? 'warning' : 'default'}>{v.status === 'published' ? 'Đang sử dụng' : v.status === 'draft' ? 'Đang chỉnh sửa' : v.status === 'deprecated' ? 'Phiên bản cũ' : 'Đã lưu trữ'}</Tag>
                {canDesign && v.status !== 'archived' && v.status !== 'draft' && <Button size="small" type="text" icon={<Archive size={13} />} onClick={() => archive(v.id)} title="Lưu trữ" />}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Drawer
        title={sidePanel === 'steps' ? `Các bước trong quy trình (${draft?.steps.length ?? 0})` : sidePanel === 'edit' ? 'Chỉnh sửa bước' : 'Thêm bước mới'}
        open={sidePanel !== null}
        onClose={() => setSidePanel(null)}
        width={isStacked ? '100%' : 460}
      >
        {sidePanel === 'steps' && draft && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draft.steps.map((s) => s.code)} strategy={verticalListSortingStrategy}>
                {draft.steps.map((s) => (
                  <SortableStepRow key={s.code} step={s} canDesign={canDesign} onToggleMandatory={(v) => toggleMandatory(s.code, v)} onIconChange={(icon) => guarded(() => workflowService.editStep(canonicalTemplateId, s.code, { icon }, currentUser.id))} onRemove={() => removeStep(s.code)} />
                ))}
              </SortableContext>
            </DndContext>
            {draft.steps.length === 0 && <ProfessionalEmpty compact title="Chưa có bước nào" description="Chuyển sang “Thêm bước” để bắt đầu thiết kế." showActions={false} />}
            {canDesign && <Button type="primary" block icon={<Plus size={14} />} onClick={() => setSidePanel('add')} style={{ marginTop: 12 }}>Thêm bước mới</Button>}
          </>
        )}
        {sidePanel === 'add' && draft && canDesign && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Bắt đầu nhanh từ mẫu phòng khám</Text>
              <Select allowClear style={{ width: '100%' }} placeholder="Chọn mẫu hoặc tự thiết kế" options={CLINIC_STEP_PRESETS.map(({ value, label }) => ({ value, label }))} onChange={(value) => value && applyStepPreset(value)} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Tên bước</Text>
              <Input size="large" placeholder="Ví dụ: Tiếp nhận bệnh nhân" value={draftStep.name} onChange={(e) => setDraftStep((p) => ({ ...p, name: e.target.value }))} />
              <Text type="secondary" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>Mã kỹ thuật sẽ được hệ thống tự tạo từ tên bước.</Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Loại hoạt động</Text>
              <Select style={{ width: '100%' }} value={draftStep.taskType} options={CLINIC_STEP_TYPES} onChange={(taskType) => setDraftStep((step) => ({ ...step, taskType }))} />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Ai hoặc hệ thống thực hiện?</Text>
              <Select
                size="large"
                style={{ width: '100%' }}
                value={draftStep.executorType ?? executorForRole(draftStep.responsibleRole)}
                onChange={(executorType: WorkflowExecutorType) => {
                  const executor = EXECUTOR_META[executorType];
                  setDraftStep((previous) => ({ ...previous, executorType, responsibleRole: executor.role, icon: executor.icon, department: executor.department, taskType: executor.taskType }));
                }}
                options={executorOptions}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>Bao gồm nhân viên, bệnh nhân, AI, hệ thống và node điều khiển luồng.</Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Phòng hoặc khu vực thực hiện</Text>
              <Select showSearch allowClear style={{ width: '100%' }} placeholder="Ví dụ: Phòng khám" value={draftStep.location} options={CLINIC_LOCATIONS.map((location) => ({ value: location, label: location }))} onChange={(location) => setDraftStep((step) => ({ ...step, location }))} />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Mô tả ngắn <Text type="secondary" style={{ fontWeight: 400 }}>(không bắt buộc)</Text></Text>
              <Input.TextArea rows={3} placeholder="Nhân viên cần làm gì ở bước này?" value={draftStep.description} onChange={(e) => setDraftStep((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Kết quả cần ghi nhận</Text>
              <Input placeholder="Ví dụ: Chẩn đoán và kế hoạch điều trị" value={draftStep.requiredOutput} onChange={(e) => setDraftStep((step) => ({ ...step, requiredOutput: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12.5 }}>Thời gian thực hiện</Text>
                <InputNumber min={1} addonAfter="phút" style={{ width: '100%' }} value={draftStep.estimatedDurationMinutes} onChange={(v) => setDraftStep((p) => ({ ...p, estimatedDurationMinutes: v ?? 1 }))} />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12.5 }}>Cảnh báo nếu chờ quá</Text>
                <InputNumber min={1} addonAfter="phút" style={{ width: '100%' }} value={draftStep.maxWaitingMinutes} onChange={(v) => setDraftStep((p) => ({ ...p, maxWaitingMinutes: v ?? 1 }))} />
              </div>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Thực hiện sau bước nào?</Text>
              {draft.steps.length > 0 ? (
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Chọn một hoặc nhiều bước trước đó"
                  value={draftStep.prerequisiteStepCodes}
                  onChange={(codes: string[]) => setDraftStep((p) => ({ ...p, prerequisiteStepCodes: codes }))}
                  options={draft.steps.map((step) => ({ value: step.code, label: step.name }))}
                />
              ) : (
                <Text type="secondary" style={{ display: 'block', padding: '9px 11px', background: 'var(--surface-subtle)', borderRadius: 8, fontSize: 12.5 }}>Đây là bước đầu tiên nên không cần chọn bước phía trước.</Text>
              )}
            </div>

            {draftStep.prerequisiteStepCodes.length > 0 && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>Điều kiện để đi vào bước này <Text type="secondary" style={{ fontWeight: 400 }}>(không bắt buộc)</Text></Text>
                <Input placeholder="Ví dụ: Chỉ khi bác sĩ có chỉ định xét nghiệm" value={draftStep.conditionalRule} onChange={(e) => setDraftStep((p) => ({ ...p, conditionalRule: e.target.value }))} />
                <Text type="secondary" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>Điều kiện sẽ hiển thị ngay trên dây nối để người xem hiểu nhánh xử lý.</Text>
              </div>
            )}

            <Collapse
              size="small"
              items={[{
                key: 'operation-rules',
                label: 'Quy tắc vận hành nâng cao',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Nếu quá thời gian chờ</Text><Input placeholder="Ví dụ: Báo điều phối viên chăm sóc" value={draftStep.escalationRule} onChange={(e) => setDraftStep((step) => ({ ...step, escalationRule: e.target.value }))} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Nếu kết quả không đạt</Text><Input placeholder="Ví dụ: Yêu cầu lấy lại mẫu, tối đa 2 lần" value={draftStep.reworkRule} onChange={(e) => setDraftStep((step) => ({ ...step, reworkRule: e.target.value }))} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Thông báo khi hoàn thành</Text><Input placeholder="Ví dụ: Báo bác sĩ phụ trách" value={draftStep.notificationRule} onChange={(e) => setDraftStep((step) => ({ ...step, notificationRule: e.target.value }))} /></div>
                  </div>
                ),
              }]}
            />

            <div style={{ padding: '11px 13px', border: '1px solid var(--border-default)', borderRadius: 9, background: 'var(--surface-subtle)' }}>
              <Checkbox checked={draftStep.mandatory} onChange={(e) => setDraftStep((p) => ({ ...p, mandatory: e.target.checked }))}>
                <Text strong>Bắt buộc phải hoàn thành bước này</Text>
              </Checkbox>
            </div>
            <Button type="primary" size="large" icon={<Plus size={15} />} onClick={addStep}>Thêm bước vào sơ đồ</Button>
          </div>
        )}
        {sidePanel === 'edit' && draft && canDesign && editingStep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Tên bước</Text>
              <Input size="large" value={editingStep.name} onChange={(e) => setEditingStep((step) => step ? { ...step, name: e.target.value } : step)} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Loại hoạt động</Text>
              <Select style={{ width: '100%' }} value={editingStep.taskType} options={CLINIC_STEP_TYPES} onChange={(taskType) => setEditingStep((step) => step ? { ...step, taskType } : step)} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Ai hoặc hệ thống thực hiện?</Text>
              <Select
                size="large"
                style={{ width: '100%' }}
                value={editingStep.executorType ?? executorForRole(editingStep.responsibleRole)}
                onChange={(executorType: WorkflowExecutorType) => {
                  const executor = EXECUTOR_META[executorType];
                  setEditingStep((step) => step ? { ...step, executorType, responsibleRole: executor.role, icon: executor.icon, department: executor.department, taskType: executor.taskType } : step);
                }}
                options={executorOptions}
              />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Phòng hoặc khu vực thực hiện</Text>
              <Select showSearch allowClear style={{ width: '100%' }} value={editingStep.location} placeholder="Chọn khu vực phục vụ" options={CLINIC_LOCATIONS.map((location) => ({ value: location, label: location }))} onChange={(location) => setEditingStep((step) => step ? { ...step, location } : step)} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Mô tả ngắn</Text>
              <Input.TextArea rows={3} value={editingStep.description} onChange={(e) => setEditingStep((step) => step ? { ...step, description: e.target.value } : step)} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Kết quả cần ghi nhận</Text>
              <Input value={editingStep.requiredOutput} placeholder="Kết quả bắt buộc trước khi hoàn thành bước" onChange={(e) => setEditingStep((step) => step ? { ...step, requiredOutput: e.target.value } : step)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12.5 }}>Thời gian thực hiện</Text><InputNumber min={1} addonAfter="phút" style={{ width: '100%' }} value={editingStep.estimatedDurationMinutes} onChange={(value) => setEditingStep((step) => step ? { ...step, estimatedDurationMinutes: value ?? 1 } : step)} /></div>
              <div><Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12.5 }}>Cảnh báo nếu chờ quá</Text><InputNumber min={1} addonAfter="phút" style={{ width: '100%' }} value={editingStep.maxWaitingMinutes} onChange={(value) => setEditingStep((step) => step ? { ...step, maxWaitingMinutes: value ?? 1 } : step)} /></div>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Thực hiện sau bước nào?</Text>
              <Select
                mode="multiple"
                allowClear
                style={{ width: '100%' }}
                placeholder="Không chọn nếu đây là bước đầu tiên"
                value={editingStep.prerequisiteStepCodes}
                onChange={(codes: string[]) => setEditingStep((step) => step ? { ...step, prerequisiteStepCodes: codes } : step)}
                options={draft.steps.filter((step) => step.code !== editingStep.code).map((step) => ({ value: step.code, label: step.name }))}
              />
            </div>
            {editingStep.prerequisiteStepCodes.length > 0 && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>Điều kiện để đi vào bước này</Text>
                <Input placeholder="Ví dụ: Kết quả sàng lọc cần bác sĩ đánh giá" value={editingStep.conditionalRule} onChange={(e) => setEditingStep((step) => step ? { ...step, conditionalRule: e.target.value } : step)} />
              </div>
            )}
            <Collapse
              size="small"
              items={[{
                key: 'edit-operation-rules',
                label: 'Quy tắc vận hành nâng cao',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Nếu quá thời gian chờ</Text><Input value={editingStep.escalationRule} placeholder="Hành động cảnh báo hoặc chuyển cấp" onChange={(e) => setEditingStep((step) => step ? { ...step, escalationRule: e.target.value } : step)} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Nếu kết quả không đạt</Text><Input value={editingStep.reworkRule} placeholder="Cách thực hiện lại bước" onChange={(e) => setEditingStep((step) => step ? { ...step, reworkRule: e.target.value } : step)} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 5, fontSize: 12.5 }}>Thông báo khi hoàn thành</Text><Input value={editingStep.notificationRule} placeholder="Người cần nhận thông báo" onChange={(e) => setEditingStep((step) => step ? { ...step, notificationRule: e.target.value } : step)} /></div>
                  </div>
                ),
              }]}
            />
            <div style={{ padding: '11px 13px', border: '1px solid var(--border-default)', borderRadius: 9, background: 'var(--surface-subtle)' }}>
              <Checkbox checked={editingStep.mandatory} onChange={(e) => setEditingStep((step) => step ? { ...step, mandatory: e.target.checked } : step)}><Text strong>Bắt buộc phải hoàn thành bước này</Text></Checkbox>
            </div>
            <Button type="primary" size="large" icon={<Pencil size={15} />} onClick={saveEditedStep}>Lưu thay đổi</Button>
          </div>
        )}
      </Drawer>

      <Modal
        title="Quy trình đã sẵn sàng"
        open={deploymentOpen}
        onCancel={() => setDeploymentOpen(false)}
        footer={[
          <Button key="later" onClick={() => setDeploymentOpen(false)}>Dùng cho lượt khám sau</Button>,
          <Button key="deploy" type="primary" icon={<Rocket size={15} />} disabled={!deploymentEncounterId} onClick={deployNow}>Khởi chạy ngay</Button>,
        ]}
      >
        <Alert
          type="success"
          showIcon
          message="Đã đưa quy trình vào sử dụng"
          description="Từ bây giờ, hệ thống sẽ tự chọn phiên bản này cho lượt khám cùng chuyên khoa sau khi bác sĩ duyệt phác đồ."
          style={{ marginBottom: 16 }}
        />
        {eligibleEncounters.length > 0 ? (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 7 }}>Chọn bệnh nhân và lượt khám để áp dụng</Text>
            <Select
              style={{ width: '100%' }}
              value={deploymentEncounterId}
              onChange={(value: EncounterId) => setDeploymentEncounterId(value)}
              options={eligibleEncounters.map((encounter) => {
                const patient = patients.find((item) => item.id === encounter.patientId);
                return { value: encounter.id, label: `${patient?.name ?? 'Bệnh nhân'} · ${patient?.code ?? encounter.patientId} · ${encounter.department}` };
              })}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 7, fontSize: 12 }}>Hệ thống sẽ tạo một phiên quy trình riêng, khóa theo bệnh nhân, lượt khám và phiên bản mẫu đang xuất bản.</Text>
          </div>
        ) : (
          <ProfessionalEmpty compact title="Chưa có lượt khám phù hợp để khởi chạy ngay" description="Quy trình vẫn đang hoạt động và sẽ được hệ thống tự áp dụng khi có lượt khám cùng chuyên khoa được bác sĩ duyệt phác đồ." showActions={false} />
        )}
      </Modal>

      <Modal
        title="Sửa thông tin quy trình"
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        onOk={saveDetails}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
          <div><Text strong style={{ fontSize: 12 }}>Tên quy trình</Text><Input value={editedName} onChange={(e) => setEditedName(e.target.value)} style={{ marginTop: 5 }} /></div>
          <div><Text strong style={{ fontSize: 12 }}>Chuyên khoa</Text><Input value={editedSpecialty} onChange={(e) => setEditedSpecialty(e.target.value)} style={{ marginTop: 5 }} /></div>
          <div><Text strong style={{ fontSize: 12 }}>Mô tả ngắn</Text><Input.TextArea rows={3} value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} style={{ marginTop: 5 }} /></div>
        </div>
      </Modal>
    </div>
  );
}
