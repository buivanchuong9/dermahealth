import { createContext, useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position, MiniMap, Panel, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Node, type Edge, type NodeProps, type EdgeProps, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { App as AntApp, Card, Input, Select, InputNumber, Checkbox, Button, Tag, Alert, Typography, Result, Grid, Modal, Popconfirm, Drawer, Collapse, Spin, Tooltip } from 'antd';
import { Plus, Trash2, Archive, ArrowLeft, Lock, SearchX, Bot, Stethoscope, HeartPulse, UserRoundCheck, FlaskConical, ScanLine, Pill, CreditCard, LogOut, ClipboardCheck, Activity, Pencil, Rocket, ListChecks, Maximize2, Minimize2, UserRound, GitBranch, Timer, ServerCog, Headphones, ShieldCheck, Play, Check, X, CheckCircle2 } from 'lucide-react';
import { DragHandle } from '../../components/common/DragHandle';
import { IconActionButton } from '../../components/common/IconActionButton';
import { useAppState } from '../../state/useAppState';
import { useStore } from '../../state/useStore';
import { encounterRepository, patientRepository, workflowRepository } from '../../domain/repositories';
import { workflowService } from '../../domain/services/workflowService';
import {
  listWorkflowTemplates,
  listWorkflowTemplateVersions,
  updateWorkflowTemplate,
  createWorkflowTemplateVersion,
  addWorkflowTemplateVersionStep,
  updateWorkflowTemplateVersionStep,
  deleteWorkflowTemplateVersionStep,
  reorderWorkflowTemplateVersionSteps,
  connectWorkflowTemplateVersionSteps,
  disconnectWorkflowTemplateVersionSteps,
  saveWorkflowTemplateVersionGraphLayout,
  publishWorkflowTemplateVersion,
  archiveWorkflowTemplateVersion,
  getWorkflowTemplateVersion,
} from '../../api/workflowTemplate';
import { activateEncounterWorkflow } from '../../api/encounters';
import { listWorkflowInstances } from '../../api/workflowInstance';
import { layoutByPrerequisites } from '../../domain/flowLayout';
import { buildWorkflowSimulationSequence, validateWorkflowGraph } from '../../domain/workflowValidation';
import { hasRoleAccess, type UserRole } from '../../domain/core/role';
import type { EncounterId, WorkflowTemplateId } from '../../domain/core/ids';
import type { WorkflowExecutorType, WorkflowStepDefinition, WorkflowTemplateVersion } from '../../domain/core/entities';
import { useFriendlyError } from '../../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../../components/feedback/ProfessionalEmpty';

const { Text } = Typography;
const WORKFLOW_AUTHOR_ROLES: readonly UserRole[] = ['clinical_process_designer', 'medical_administrator'];
const graphSaveQueues = new Map<string, Promise<void>>();
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
const executorMetaForStep = (step: WorkflowStepDefinition) => {
  const storedType = step.executorType as string | undefined;
  return (storedType ? EXECUTOR_META[storedType as WorkflowExecutorType] : undefined)
    ?? EXECUTOR_META[executorForRole(step.responsibleRole)]
    ?? EXECUTOR_META.care_coordinator;
};
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
  const storedIcon = step.icon as string | undefined;
  const meta = (storedIcon ? ICON_META[storedIcon as StepIcon] : undefined)
    ?? ICON_META[defaultIconForRole(step.responsibleRole)]
    ?? ICON_META.task;
  const Icon = meta.icon;
  return <span title={meta.label} style={{ width: size + 14, height: size + 14, borderRadius: 10, background: `${meta.color}16`, color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={size} strokeWidth={2.1}/></span>;
}

const EMPTY_STEP: WorkflowStepDefinition = {
  code: '', icon: 'nurse', executorType: 'nurse', name: '', description: '', taskType: 'clinical', responsibleRole: 'nurse', department: '',
  mandatory: true, estimatedDurationMinutes: 10, maxWaitingMinutes: 20, skipPermission: [], prerequisiteStepCodes: [],
};

const SimulationContext = createContext<{
  activeNode?: string;
  completedNodes: Set<string>;
}>({ completedNodes: new Set() });

function NodeDeleteButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      className="nodrag"
      aria-label={label}
      onClick={(event) => { event.stopPropagation(); onRemove(); }}
      style={{
        position: 'absolute', top: -7, right: -7, width: 19, height: 19, borderRadius: '50%',
        border: '1.5px solid #fff', background: '#8f2f34', color: '#fff', padding: 0,
        display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,47,77,.35)',
      }}
    >
      <X size={11} strokeWidth={2.5} />
    </button>
  );
}

function StepFlowNode({ id, data }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const step = data.step as WorkflowStepDefinition;
  const onEdit = data.onEdit as (() => void) | undefined;
  const onRemove = data.onRemove as (() => void) | undefined;
  const executorLabel = executorMetaForStep(step).label;
  const color = step.mandatory ? '#1e5e9e' : '#8792a2';
  const simulation = useContext(SimulationContext);
  const active = simulation.activeNode === id;
  const completed = simulation.completedNodes.has(id);
  const isGateway = step.executorType === 'decision';
  if (isGateway) {
    return (
      <div
        title="Điểm quyết định — kéo để di chuyển, nối nhiều nhánh từ các cổng ra"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative', width: 86, height: 86, display: 'grid', placeItems: 'center', cursor: 'grab' }}
      >
        <Handle id="target-left" type="target" position={Position.Left} style={{ background: '#fff', border: '2px solid #7b1fa2', width: 10, height: 10 }} />
        <Handle id="target-top" type="target" position={Position.Top} style={{ background: '#fff', border: '2px solid #7b1fa2', width: 10, height: 10 }} />
        <div style={{ position: 'absolute', inset: 13, transform: 'rotate(45deg)', borderRadius: 8, background: active ? '#f5eafa' : completed ? '#ecfdf5' : '#fff', border: `2px solid ${completed ? '#16856b' : '#7b1fa2'}`, boxShadow: active ? '0 0 0 5px rgba(123,31,162,.18)' : '0 2px 7px rgba(74,20,91,.16)' }} />
        <div style={{ position: 'relative', zIndex: 1, width: 74, textAlign: 'center', pointerEvents: 'none' }}>
          <GitBranch size={18} color="#7b1fa2" />
          <Text strong style={{ display: 'block', fontSize: 10.5, lineHeight: 1.15 }}>{step.name || 'Điều kiện'}</Text>
        </div>
        {onEdit && <button type="button" className="nodrag" aria-label={`Sửa ${step.name}`} onClick={(event) => { event.stopPropagation(); onEdit(); }} style={{ position: 'absolute', zIndex: 3, right: -3, top: -3, border: 0, borderRadius: '50%', background: '#fff', color: '#7b1fa2', padding: 4, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.18)', display: 'inline-flex' }}><Pencil size={12}/></button>}
        <Handle id="source-right" type="source" position={Position.Right} style={{ background: '#7b1fa2', border: '2px solid #fff', width: 11, height: 11 }} />
        <Handle id="source-bottom" type="source" position={Position.Bottom} style={{ background: '#7b1fa2', border: '2px solid #fff', width: 11, height: 11 }} />
        {onRemove && hovered && <NodeDeleteButton label={`Xóa ${step.name}`} onRemove={onRemove} />}
      </div>
    );
  }
  return (
    <div
      title="Kéo để di chuyển bước"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', background: active ? '#e8fbfb' : completed ? '#f0faf6' : '#fff', border: `2px solid ${active ? '#0f9f9f' : completed ? '#2f9b72' : color}`, borderRadius: 8, padding: '8px 12px', minWidth: 170, boxShadow: active ? '0 0 0 5px rgba(19,168,168,.18), 0 8px 20px rgba(19,168,168,.18)' : '0 1px 3px rgba(15,47,77,.1)', cursor: 'grab', transition: 'all .2s ease' }}
    >
      <Handle id="target-left" type="target" position={Position.Left} style={{ background: '#fff', border: `2px solid ${color}`, width: 10, height: 10 }} />
      <Handle id="target-top" type="target" position={Position.Top} style={{ background: '#fff', border: `2px solid ${color}`, width: 9, height: 9 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><StepIconView step={step} size={26}/><div style={{ minWidth: 0, flex: 1 }}><Text strong style={{ fontSize: 12.5, display: 'block' }}>{step.name || 'Bước chưa đặt tên'}</Text><Text type="secondary" style={{ fontSize: 10.5 }}>{executorLabel}{step.location ? ` · ${step.location}` : ''}</Text></div>{onEdit && <button type="button" className="nodrag" aria-label={`Sửa bước ${step.name}`} onClick={(event) => { event.stopPropagation(); onEdit(); }} style={{ border: 0, background: 'transparent', color: '#607d8b', padding: 3, cursor: 'pointer', display: 'inline-flex' }}><Pencil size={13}/></button>}</div>
      <div style={{ marginTop: 4, display: 'flex', gap: 5 }}>
        <Tag color={step.mandatory ? 'blue' : 'default'} style={{ fontSize: 10, margin: 0 }}>{step.mandatory ? 'Bắt buộc' : 'Tuỳ chọn'}</Tag>
        {active && <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>Đang xử lý</Tag>}
        {completed && <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Đã qua</Tag>}
      </div>
      <Handle id="source-right" type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff', width: 10, height: 10 }} />
      <Handle id="source-bottom" type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #fff', width: 9, height: 9 }} />
      {onRemove && hovered && <NodeDeleteButton label={`Xóa bước ${step.name}`} onRemove={onRemove} />}
    </div>
  );
}

function TerminalFlowNode({ id, data }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const isStart = data.kind === 'start';
  const color = isStart ? '#16856b' : '#b44552';
  const Icon = isStart ? Play : Check;
  const simulation = useContext(SimulationContext);
  const active = simulation.activeNode === id;
  const completed = simulation.completedNodes.has(id);
  const onRemove = data.onRemove as (() => void) | undefined;
  return (
    <div
      title={`${String(data.label)} — ${String(data.subtitle)}. Kéo để đặt vị trí.`}
      aria-label={`${String(data.label)}. ${String(data.subtitle)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', width: 50, height: 50, borderRadius: '50%', background: completed ? '#2f9b72' : color, color: '#fff', boxShadow: active ? `0 0 0 6px ${color}35, 0 8px 20px ${color}30` : '0 1px 4px rgba(15,47,77,.22)', display: 'grid', placeItems: 'center', cursor: 'grab', transition: 'all .2s ease' }}
    >
      {isStart ? (
        <>
          <Handle id="start-right" type="source" position={Position.Right} style={{ background: color, border: '2px solid #fff', width: 11, height: 11 }} />
          <Handle id="start-bottom" type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #fff', width: 11, height: 11 }} />
        </>
      ) : (
        <>
          <Handle id="end-left" type="target" position={Position.Left} style={{ background: '#fff', border: `2px solid ${color}`, width: 11, height: 11 }} />
          <Handle id="end-top" type="target" position={Position.Top} style={{ background: '#fff', border: `2px solid ${color}`, width: 11, height: 11 }} />
        </>
      )}
      <Icon size={20} strokeWidth={2} fill={isStart ? 'currentColor' : 'none'} />
      {onRemove && hovered && <NodeDeleteButton label={`Xóa ${String(data.label)}`} onRemove={onRemove} />}
    </div>
  );
}
const nodeTypes = { stepNode: StepFlowNode, terminalNode: TerminalFlowNode };

function SimulationFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });
  const active = Boolean(data?.simulationActive);

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: '2px 5px',
              borderRadius: 4,
              background: 'rgba(255,255,255,.94)',
              color: '#46586a',
              fontSize: 11,
              pointerEvents: 'all',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {active && (
        <g style={{ pointerEvents: 'none' }}>
          <circle r="10" fill="#20d5d2" opacity=".18">
            <animateMotion dur="1.15s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="5" fill="#f5ffff" stroke="#0f9f9f" strokeWidth="2">
            <animateMotion dur="1.15s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2" fill="#0f9f9f">
            <animateMotion dur="1.15s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </g>
      )}
    </>
  );
}

const edgeTypes = { simulationFlow: SimulationFlowEdge };

function SortableStepRow({ step, canDesign, onToggleMandatory, onIconChange, onRemove }: { step: WorkflowStepDefinition; canDesign: boolean; onToggleMandatory: (v: boolean) => void; onIconChange: (v: StepIcon) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.code });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, padding: 10, background: 'var(--surface-subtle)', borderRadius: 8, border: '1px solid var(--border-default)', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canDesign && <DragHandle attributes={attributes} listeners={listeners} label={`Kéo để sắp xếp lại bước "${step.name || step.code}"`} />}
          {canDesign ? <Select size="small" value={step.icon ?? defaultIconForRole(step.responsibleRole)} onChange={onIconChange} style={{width:150}} popupMatchSelectWidth={220} options={(Object.entries(ICON_META) as [StepIcon, (typeof ICON_META)[StepIcon]][]).map(([value,meta])=>{const Icon=meta.icon;return {value,label:<span title={meta.label} style={{display:'inline-flex',alignItems:'center',gap:6,color:meta.color}}><Icon size={16}/><span style={{color:'var(--text-primary)'}}>{meta.label}</span></span>};})}/> : <StepIconView step={step} size={17}/>}<Text strong style={{ fontSize: 13 }}>{step.name}</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Checkbox checked={step.mandatory} disabled={!canDesign} onChange={(e) => onToggleMandatory(e.target.checked)} style={{ fontSize: 12 }}>Bắt buộc</Checkbox>
          {canDesign && <IconActionButton icon={<Trash2 size={14} />} label="Xóa bước" danger onClick={onRemove} />}
        </div>
      </div>
      <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 4 }}>{step.description}</Text>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
        {executorMetaForStep(step).label} · {step.department || 'Chưa gán khoa/phòng'} · SLA {step.maxWaitingMinutes}p
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
  const [editorLoading, setEditorLoading] = useState(true);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (!resolvedId) return;
    Promise.all([
      listWorkflowTemplates(),
      listWorkflowTemplateVersions(resolvedId),
    ])
      .then(([templateRows, versionRows]) => {
        templateRows.forEach((row) => workflowRepository.templates().upsert(row));
        versionRows.forEach((row) => workflowRepository.versions().upsert(row));
      })
      .catch((err: unknown) => { showError(err); })
      .finally(() => setEditorLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  const template = templates.find((t) => t.id === canonicalTemplateId);
  const templateVersions = versions.filter((v) => v.templateId === canonicalTemplateId).sort((a, b) => a.version - b.version);
  const draft = templateVersions.find((v) => v.status === 'draft');
  const latestPublished = templateVersions.find((v) => v.id === template?.latestPublishedVersionId);
  const systemNodePositions = (() => {
    if (!draft) return {};
    const storageKey = `dermahealth:workflow-layout:${draft.id}:system-nodes`;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, { x: number; y: number }>;
      const merged = {
        ...stored,
        ...(draft.nodePositions?.__START__ ? { __START__: draft.nodePositions.__START__ } : {}),
        ...(draft.nodePositions?.__END__ ? { __END__: draft.nodePositions.__END__ } : {}),
      };
      return Object.fromEntries(
        Object.entries(merged).filter(([, position]) =>
          Number.isFinite(position?.x)
          && Number.isFinite(position?.y)
          && Math.abs(position.x) < 100_000
          && Math.abs(position.y) < 100_000,
        ),
      );
    } catch {
      return {};
    }
  })();
  const canDesign = hasRoleAccess(role, WORKFLOW_AUTHOR_ROLES);
  const canPublish = hasRoleAccess(role, ['medical_administrator']);
  const normalizedSpecialty = template?.specialty.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim() ?? '';
  const eligibleEncounters = encounters.filter((encounter) => {
    const department = encounter.department.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim();
    return !!encounter.clinicalPlanId && !encounter.workflowInstanceId && (department.includes(normalizedSpecialty) || normalizedSpecialty.includes(department));
  });

  const flowSteps = draft?.steps ?? [];
  const canSubmitDraftStep = Boolean(draftStep.name.trim() && draftStep.description.trim());
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
  const startPosition = systemNodePositions.__START__ ?? { x: minX - 230, y: averageY(rootSteps) + 4 };
  const endPosition = systemNodePositions.__END__ ?? { x: maxX + 280, y: averageY(leafSteps) + 4 };
  const hasStartNode = Boolean(systemNodePositions.__START__);
  const hasEndNode = Boolean(systemNodePositions.__END__);
  const terminalEdges = (() => {
    if (!draft) return [];
    if (draft.terminalEdges?.length) return draft.terminalEdges;
    try {
      const stored = JSON.parse(localStorage.getItem(`dermahealth:workflow-layout:${draft.id}:terminal-edges`) ?? '[]') as Array<{ source: string; target: string }>;
      const validNodeIds = new Set(['__START__', '__END__', ...flowSteps.map((step) => step.code)]);
      return stored.filter((edge) =>
        validNodeIds.has(edge.source)
        && validNodeIds.has(edge.target)
        && edge.source !== edge.target
        && edge.source !== '__END__'
        && edge.target !== '__START__',
      );
    } catch {
      return [];
    }
  })();
  const validationReport = validateWorkflowGraph({
    steps: flowSteps,
    hasStartNode,
    hasEndNode,
    terminalEdges,
  });
  const nodeLabel = (code: string) => {
    if (code === '__START__') return 'Bắt đầu';
    if (code === '__END__') return 'Kết thúc';
    return flowSteps.find((step) => step.code === code)?.name ?? code;
  };
  const validationGuidance = (issue: (typeof validationReport.errors)[number]) => {
    const affectedSteps = (issue.nodeCodes ?? [])
      .filter((code) => code !== '__START__' && code !== '__END__')
      .map(nodeLabel);
    switch (issue.code) {
      case 'end_boundary_mismatch':
      case 'cannot_reach_end':
        return affectedSteps.length
          ? `Nối ${affectedSteps.join(', ')} với điểm Kết thúc.`
          : 'Nối bước cuối cùng với điểm Kết thúc.';
      case 'start_boundary_mismatch':
      case 'unreachable_from_start':
        return affectedSteps.length
          ? `Tạo đường đi từ điểm Bắt đầu tới ${affectedSteps.join(', ')}.`
          : 'Nối điểm Bắt đầu với bước đầu tiên.';
      case 'missing_start':
        return 'Thêm điểm Bắt đầu vào sơ đồ.';
      case 'missing_end':
        return 'Thêm điểm Kết thúc vào sơ đồ.';
      case 'start_without_outgoing':
        return 'Kéo một đường nối từ Bắt đầu tới bước đầu tiên.';
      case 'end_without_incoming':
        return 'Kéo một đường nối từ bước cuối cùng tới Kết thúc.';
      case 'cycle':
        return 'Xóa đường nối khiến quy trình quay lại bước đã đi qua.';
      default:
        return issue.message;
    }
  };
  const simulationSequence = buildWorkflowSimulationSequence({
    steps: flowSteps,
    hasStartNode,
    hasEndNode,
    terminalEdges,
  });
  const activeSimulationNode = simulationRunning ? simulationSequence[simulationIndex] : undefined;
  const activeSimulationStep = flowSteps.find((step) => step.code === activeSimulationNode);
  const completedSimulationNodes = new Set(
    simulationCompleted
      ? simulationSequence
      : simulationRunning
        ? simulationSequence.slice(0, simulationIndex)
        : [],
  );
  const nextSimulationNode = simulationRunning ? simulationSequence[simulationIndex + 1] : undefined;
  const nextSimulationStep = flowSteps.find((step) => step.code === nextSimulationNode);
  useEffect(() => {
    if (!simulationRunning) return;
    const timer = window.setInterval(() => {
      setSimulationIndex((current) => {
        if (current >= simulationSequence.length - 1) {
          setSimulationRunning(false);
          setSimulationCompleted(true);
          message.success('Mô phỏng đã đi hết quy trình.');
          return current;
        }
        return current + 1;
      });
    }, 1400);
    return () => window.clearInterval(timer);
  }, [message, simulationRunning, simulationSequence.length]);
  const nodes: Node[] = [
    ...(hasStartNode ? [{ id: '__START__', type: 'terminalNode', position: startPosition, data: { kind: 'start', label: 'Bắt đầu', subtitle: 'Điểm khởi tạo quy trình', active: activeSimulationNode === '__START__', completed: completedSimulationNodes.has('__START__'), onRemove: canDesign ? () => removeTerminalNode('__START__') : undefined }, draggable: canDesign, connectable: canDesign, deletable: false }] : []),
    ...flowSteps.map((step) => ({ id: step.code, type: 'stepNode', position: stepPositions[step.code], data: { step, active: activeSimulationNode === step.code, completed: completedSimulationNodes.has(step.code), onEdit: canDesign ? () => openStepEditor(step.code) : undefined, onRemove: canDesign ? () => removeStep(step.code) : undefined } })),
    ...(hasEndNode ? [{ id: '__END__', type: 'terminalNode', position: endPosition, data: { kind: 'end', label: 'Kết thúc', subtitle: 'Điểm hoàn tất quy trình', active: activeSimulationNode === '__END__', completed: completedSimulationNodes.has('__END__'), onRemove: canDesign ? () => removeTerminalNode('__END__') : undefined }, draggable: canDesign, connectable: canDesign, deletable: false }] : []),
  ];
  const edgeSimulationStyle = (source: string, target: string) => {
    const edgeIndex = simulationSequence.findIndex(
      (nodeId, index) => nodeId === source && simulationSequence[index + 1] === target,
    );
    const belongsToSimulationPath = edgeIndex >= 0;
    const completed = belongsToSimulationPath
      && (simulationCompleted || (simulationRunning && edgeIndex < simulationIndex));
    const active = simulationRunning && belongsToSimulationPath && edgeIndex === simulationIndex - 1;
    const pending = simulationRunning && !active && !completed;
    return {
      animated: false,
      data: { simulationActive: active },
      style: {
        stroke: active ? '#0f9f9f' : completed ? '#2f9b72' : simulationRunning ? '#b7c3cf' : '#2878c8',
        strokeWidth: active ? 4 : completed ? 3 : 2.2,
        strokeDasharray: pending ? '7 7' : undefined,
        opacity: pending ? 0.62 : 1,
        transition: 'stroke .22s ease, stroke-width .22s ease, opacity .22s ease',
      },
    };
  };
  const edges: Edge[] = [];
  flowSteps.forEach((s) => s.prerequisiteStepCodes.forEach((prereq) => {
      if (flowSteps.some((x) => x.code === prereq)) edges.push({ id: `${prereq}-${s.code}`, source: prereq, target: s.code, type: 'simulationFlow', ...edgeSimulationStyle(prereq, s.code), deletable: canDesign, label: s.conditionalRule || undefined, labelStyle: { fontSize: 11, fill: '#46586a' }, labelBgStyle: { fill: '#fff', fillOpacity: 0.94 } });
  }));
  terminalEdges.forEach((edge) => edges.push({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'simulationFlow',
    ...edgeSimulationStyle(edge.source, edge.target),
    deletable: canDesign,
  }));

  if (editorLoading) {
    return (
      <div style={{ minHeight: 520, display: 'grid', placeItems: 'center' }}>
        <Spin size="large" tip="Đang tải trình thiết kế quy trình…" />
      </div>
    );
  }

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

  const guardedAsync = (fn: () => Promise<void>) => {
    fn().catch((err: unknown) => { showError(err); });
  };

  const refreshVersion = (versionId: string, local: WorkflowTemplateVersion) => {
    getWorkflowTemplateVersion(versionId)
      .then((fresh) => workflowRepository.versions().upsert({
        ...local,
        ...fresh,
        nodePositions: fresh.nodePositions ?? local.nodePositions,
        terminalEdges: fresh.terminalEdges ?? local.terminalEdges,
      }))
      .catch((err: unknown) => { showError(err); });
  };

  const syncStepPatch = (versionId: string, code: string, patch: Partial<WorkflowStepDefinition>, local: WorkflowTemplateVersion) => {
    updateWorkflowTemplateVersionStep(versionId, code, patch, Math.max(1, local.rowVersion ?? 1))
      .then(() => refreshVersion(versionId, local))
      .catch((err: unknown) => { showError(err); });
  };

  const syncStepRemoval = (versionId: string, code: string, local: WorkflowTemplateVersion) => {
    deleteWorkflowTemplateVersionStep(versionId, code, Math.max(1, local.rowVersion ?? 1))
      .then(() => refreshVersion(versionId, local))
      .catch((err: unknown) => { showError(err); });
  };

  const syncReorder = (versionId: string, orderedCodes: string[], local: WorkflowTemplateVersion) => {
    reorderWorkflowTemplateVersionSteps(versionId, orderedCodes, Math.max(1, local.rowVersion ?? 1))
      .then(() => refreshVersion(versionId, local))
      .catch((err: unknown) => { showError(err); });
  };

  const syncConnect = (versionId: string, sourceCode: string, targetCode: string, local: WorkflowTemplateVersion) => {
    connectWorkflowTemplateVersionSteps(versionId, sourceCode, targetCode, Math.max(1, local.rowVersion ?? 1))
      .then(() => refreshVersion(versionId, local))
      .catch((err: unknown) => { showError(err); });
  };

  const syncDisconnect = (versionId: string, edges: Array<{ source: string; target: string }>, local: WorkflowTemplateVersion) => {
    // Deleting multiple selected edges in parallel would reuse one rowVersion
    // and make every request after the first a guaranteed stale write.
    edges.reduce<Promise<WorkflowTemplateVersion>>(async (pending, edge) => {
      const current = await pending;
      await disconnectWorkflowTemplateVersionSteps(
        versionId,
        edge.source,
        edge.target,
        Math.max(1, current.rowVersion ?? 1),
      );
      return getWorkflowTemplateVersion(versionId);
    }, Promise.resolve(local))
      .then((fresh) => workflowRepository.versions().upsert({
        ...local,
        ...fresh,
        nodePositions: fresh.nodePositions ?? local.nodePositions,
      }))
      .catch((err: unknown) => { showError(err); });
  };

  const persistGraphLayout = (
    versionId: string,
    positions: Record<string, { x: number; y: number }>,
    nextTerminalEdges: Array<{ source: string; target: string }>,
    local: WorkflowTemplateVersion,
  ) => {
    const nextSave = (graphSaveQueues.get(versionId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        const latest = await getWorkflowTemplateVersion(versionId);
        const fresh = await saveWorkflowTemplateVersionGraphLayout(
          versionId,
          positions,
          nextTerminalEdges,
          Math.max(1, latest.rowVersion ?? 1),
        );
        workflowRepository.versions().upsert({
          ...local,
          ...fresh,
          nodePositions: fresh.nodePositions ?? positions,
          terminalEdges: fresh.terminalEdges ?? nextTerminalEdges,
        });
        localStorage.removeItem(`dermahealth:workflow-layout:${versionId}:system-nodes`);
        localStorage.removeItem(`dermahealth:workflow-layout:${versionId}:terminal-edges`);
      })
      .catch((err: unknown) => {
        showError(err);
        throw err;
      });
    graphSaveQueues.set(versionId, nextSave.then(() => undefined, () => undefined));
    return nextSave;
  };

  const addStep = () => guardedAsync(async () => {
    if (!draft) throw new Error('Không có phiên bản nháp để thêm bước.');
    if (!draftStep.name.trim()) throw new Error('Vui lòng nhập tên bước.');
    if (!draftStep.description.trim()) throw new Error('Vui lòng mô tả mục tiêu hoặc kết quả cần đạt của bước.');
    const code = makeStepCode(draftStep.name, draft?.steps.map((step) => step.code) ?? []);
    const executorType = draftStep.executorType ?? executorForRole(draftStep.responsibleRole);
    const executor = EXECUTOR_META[executorType];
    const newStep: WorkflowStepDefinition = {
      ...draftStep,
      code,
      name: draftStep.name.trim(),
      description: draftStep.description.trim(),
      executorType,
      responsibleRole: executor.role,
      icon: executor.icon,
      department: executor.department || template.specialty,
    };
    const latestBeforeCreate = await getWorkflowTemplateVersion(draft.id);
    await addWorkflowTemplateVersionStep(
      draft.id,
      newStep,
      Math.max(1, latestBeforeCreate.rowVersion ?? 1),
    );
    const fresh = await getWorkflowTemplateVersion(draft.id);
    workflowRepository.versions().upsert({ ...draft, ...fresh });
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
      description: preset.step.description
        ?? `Thực hiện ${String(preset.step.name ?? preset.label).toLocaleLowerCase('vi')} và ghi nhận đầy đủ kết quả đầu ra.`,
      executorType,
      responsibleRole: executor.role,
      icon: executor.icon,
      department: executor.department,
    }));
  };

  const removeStep = (code: string) => guarded(() => {
    const updated = workflowService.removeStep(canonicalTemplateId, code, currentUser.id);
    syncStepRemoval(updated.id, code, updated);
  });
  const toggleMandatory = (code: string, mandatory: boolean) => guarded(() => {
    const updated = workflowService.editStep(canonicalTemplateId, code, { mandatory }, currentUser.id);
    syncStepPatch(updated.id, code, { mandatory }, updated);
  });
  const startNewDraft = () => guardedAsync(async () => {
    const version = await createWorkflowTemplateVersion(canonicalTemplateId);
    workflowRepository.versions().upsert(version);
    workflowRepository.templates().upsert({
      ...template,
      versionIds: [...new Set([...template.versionIds, version.id])],
    });
    message.success('Đã tạo bản chỉnh sửa mới. Quy trình đang dùng không bị ảnh hưởng.');
  });
  const publish = () => guardedAsync(async () => {
    if (!draft) {
      throw new Error('Không có phiên bản nháp để đưa vào sử dụng.');
    }
    if (!validationReport.valid) {
      setValidationOpen(true);
      return;
    }
    await (graphSaveQueues.get(draft.id) ?? Promise.resolve());
    const latest = await getWorkflowTemplateVersion(draft.id);
    const published = await publishWorkflowTemplateVersion(
      draft.id,
      Math.max(1, latest.rowVersion ?? 1),
    );
    workflowRepository.versions().upsert(published);
    const templateRows = await listWorkflowTemplates();
    templateRows.forEach((row) => workflowRepository.templates().upsert(row));
    setDeploymentEncounterId(eligibleEncounters[0]?.id);
    setDeploymentOpen(true);
    message.success('Quy trình đã sẵn sàng để sử dụng.');
  });
  const deployNow = () => guardedAsync(async () => {
    if (!deploymentEncounterId) throw new Error('Vui lòng chọn lượt khám cần khởi chạy.');
    const targetEncounter = encounters.find((e) => e.id === deploymentEncounterId);
    await activateEncounterWorkflow(deploymentEncounterId, {
      templateId: canonicalTemplateId,
      encounterVersion: targetEncounter?.version ?? 0,
    });
    const instances = await listWorkflowInstances(targetEncounter!.patientId);
    instances.forEach((row) => workflowRepository.instances().upsert(row));
    const created = instances.find((i) => i.encounterId === deploymentEncounterId);
    setDeploymentOpen(false);
    if (created) navigate(`/app/workflows/instances/${created.id}`);
  });
  const archive = (versionId: string) => guardedAsync(async () => {
    const latest = await getWorkflowTemplateVersion(versionId);
    const archived = await archiveWorkflowTemplateVersion(
      versionId,
      Math.max(1, latest.rowVersion ?? 1),
    );
    workflowRepository.versions().upsert(archived);
  });
  const openDetails = () => {
    setEditedName(template.name);
    setEditedSpecialty(template.specialty);
    setEditedDescription(template.description);
    setDetailsOpen(true);
  };
  const saveDetails = () => guardedAsync(async () => {
    if (!editedName.trim() || !editedSpecialty.trim()) throw new Error('Vui lòng nhập tên quy trình và chuyên khoa.');
    const updated = await updateWorkflowTemplate(canonicalTemplateId, {
      name: editedName.trim(),
      specialty: editedSpecialty.trim(),
      description: editedDescription.trim(),
      version: template.version ?? 0,
    });
    workflowRepository.templates().upsert(updated);
    setDetailsOpen(false);
    message.success('Đã cập nhật thông tin quy trình.');
  });
  const saveEditedStep = () => guarded(() => {
    if (!editingStep?.name.trim()) throw new Error('Vui lòng nhập tên bước.');
    if (!editingStep.description.trim()) throw new Error('Vui lòng mô tả mục tiêu hoặc kết quả cần đạt của bước.');
    const executorType = editingStep.executorType ?? executorForRole(editingStep.responsibleRole);
    const executor = EXECUTOR_META[executorType];
    const patch: Partial<WorkflowStepDefinition> = {
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
    };
    const updated = workflowService.editStep(canonicalTemplateId, editingStep.code, patch, currentUser.id);
    syncStepPatch(updated.id, editingStep.code, patch, updated);
    setEditingStep(null);
    setSidePanel(null);
    message.success('Đã cập nhật bước trong quy trình.');
  });
  const connect = (connection: Connection) => guardedAsync(async () => {
    if (!connection.source || !connection.target) throw new Error('Cần chọn đủ bước nguồn và bước đích.');
    if (connection.source === '__END__' || connection.target === '__START__') {
      throw new Error('Kết thúc không thể phát luồng và Bắt đầu không thể nhận luồng.');
    }
    if (connection.source === '__START__' || connection.target === '__END__') {
      if (!draft) throw new Error('Không có phiên bản nháp để chỉnh sửa.');
      if (terminalEdges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
        message.info('Hai node này đã được nối.');
        return;
      }
      const next = [...terminalEdges, { source: connection.source, target: connection.target }];
      await persistGraphLayout(
        draft.id,
        { ...stepPositions, ...systemNodePositions },
        next,
        draft,
      );
      message.success('Đã nối hai node theo lựa chọn của bạn.');
      return;
    }
    const updated = workflowService.connectSteps(canonicalTemplateId, connection.source, connection.target, currentUser.id);
    syncConnect(updated.id, connection.source, connection.target, updated);
    const sourceStep = flowSteps.find((step) => step.code === connection.source);
    const targetStep = flowSteps.find((step) => step.code === connection.target);
    if (sourceStep?.executorType === 'decision' && targetStep) {
      setEditingStep({
        ...targetStep,
        prerequisiteStepCodes: [...targetStep.prerequisiteStepCodes, connection.source].filter((code, index, values) => values.indexOf(code) === index),
        skipPermission: [...targetStep.skipPermission],
      });
      setSidePanel('edit');
      message.info('Đã tạo nhánh. Nhập điều kiện đi theo nhánh này ở bảng bên phải.');
    } else {
      message.success('Đã nối hai bước và lưu quan hệ phụ thuộc.');
    }
  });
  const deleteEdges = (deleted: Edge[]) => guardedAsync(async () => {
    if (!draft) throw new Error('Không có phiên bản nháp để chỉnh sửa.');
    const deletedIds = new Set(deleted.map((edge) => `${edge.source}-${edge.target}`));
    const nextTerminalEdges = terminalEdges.filter((edge) => !deletedIds.has(`${edge.source}-${edge.target}`));
    if (nextTerminalEdges.length !== terminalEdges.length) {
      await persistGraphLayout(
        draft.id,
        { ...stepPositions, ...systemNodePositions },
        nextTerminalEdges,
        draft,
      );
    }
    let updated: WorkflowTemplateVersion | undefined;
    const businessEdges = deleted.filter((edge) => edge.source !== '__START__' && edge.target !== '__END__');
    businessEdges.forEach((edge) => { updated = workflowService.disconnectSteps(canonicalTemplateId, edge.source, edge.target, currentUser.id); });
    if (updated) syncDisconnect(updated.id, businessEdges.map((edge) => ({ source: edge.source, target: edge.target })), updated);
    message.success('Đã xóa dây nối.');
  });
  const reconnect = (oldEdge: Edge, connection: Connection) => guardedAsync(async () => {
    if (!draft || !connection.source || !connection.target) throw new Error('Cần chọn đủ node nguồn và node đích.');
    if (connection.source === connection.target) throw new Error('Không thể nối một node vào chính nó.');
    if (connection.source === '__END__' || connection.target === '__START__') {
      throw new Error('Kết thúc không thể phát luồng và Bắt đầu không thể nhận luồng.');
    }

    const oldIsTerminal = oldEdge.source === '__START__' || oldEdge.target === '__END__';
    const newIsTerminal = connection.source === '__START__' || connection.target === '__END__';
    let latest = await getWorkflowTemplateVersion(draft.id);

    if (!oldIsTerminal) {
      await disconnectWorkflowTemplateVersionSteps(
        draft.id,
        oldEdge.source,
        oldEdge.target,
        Math.max(1, latest.rowVersion ?? 1),
      );
      latest = await getWorkflowTemplateVersion(draft.id);
    }
    if (!newIsTerminal) {
      await connectWorkflowTemplateVersionSteps(
        draft.id,
        connection.source,
        connection.target,
        Math.max(1, latest.rowVersion ?? 1),
      );
      latest = await getWorkflowTemplateVersion(draft.id);
      workflowRepository.versions().upsert({ ...draft, ...latest });
    }

    const withoutOld = terminalEdges.filter((edge) => !(edge.source === oldEdge.source && edge.target === oldEdge.target));
    const nextTerminalEdges = newIsTerminal
      ? [...withoutOld, { source: connection.source, target: connection.target }]
      : withoutOld;
    await persistGraphLayout(
      draft.id,
      { ...stepPositions, ...systemNodePositions },
      nextTerminalEdges,
      { ...draft, ...latest },
    );
    if (oldIsTerminal && !newIsTerminal) workflowRepository.versions().upsert({ ...draft, ...latest });
    setSelectedEdge(null);
    message.success('Đã chuyển dây nối sang node mới.');
  });
  const addTerminalNode = (nodeId: '__START__' | '__END__') => guardedAsync(async () => {
    if (!draft) throw new Error('Không có phiên bản nháp để chỉnh sửa.');
    if (systemNodePositions[nodeId]) {
      message.info(nodeId === '__START__' ? 'Sơ đồ đã có điểm Bắt đầu.' : 'Sơ đồ đã có điểm Kết thúc.');
      return;
    }
    const position = nodeId === '__START__'
      ? { x: minX - 230, y: averageY(rootSteps) + 4 }
      : { x: maxX + 280, y: averageY(leafSteps) + 4 };
    const next = { ...systemNodePositions, [nodeId]: position };
    await persistGraphLayout(draft.id, { ...stepPositions, ...next }, terminalEdges, draft);
    message.success(nodeId === '__START__' ? 'Đã đặt điểm Bắt đầu lên canvas.' : 'Đã đặt điểm Kết thúc lên canvas.');
  });
  const removeTerminalNode = (nodeId: '__START__' | '__END__') => guardedAsync(async () => {
    if (!draft) throw new Error('Không có phiên bản nháp để chỉnh sửa.');
    const next = { ...systemNodePositions };
    delete next[nodeId];
    const nextEdges = terminalEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    await persistGraphLayout(draft.id, { ...stepPositions, ...next }, nextEdges, draft);
    message.success(nodeId === '__START__' ? 'Đã xóa điểm Bắt đầu khỏi sơ đồ.' : 'Đã xóa điểm Kết thúc khỏi sơ đồ.');
  });

  const handleDragEnd = (e: DragEndEvent) => {
    if (!draft || !canDesign) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const codes = draft.steps.map((s) => s.code);
    const oldIndex = codes.indexOf(String(active.id));
    const newIndex = codes.indexOf(String(over.id));
    const reordered = arrayMove(codes, oldIndex, newIndex);
    guarded(() => {
      const updated = workflowService.reorderSteps(canonicalTemplateId, reordered, currentUser.id);
      syncReorder(updated.id, reordered, updated);
    });
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
            {draft && (
              <Button
                size="small"
                danger={validationReport.errors.length > 0}
                icon={<ShieldCheck size={14} />}
                onClick={() => setValidationOpen(true)}
              >
                Kiểm tra ({validationReport.errors.length + validationReport.warnings.length})
              </Button>
            )}
            {draft && draft.steps.length > 0 && (
              <Button
                size="small"
                icon={<Activity size={14} />}
                disabled={!validationReport.valid}
                title={!validationReport.valid ? 'Cần sửa lỗi cấu trúc trước khi mô phỏng' : 'Mô phỏng thứ tự cấu trúc; điều kiện lâm sàng không được tự suy đoán'}
                onClick={() => {
                  setSimulationIndex(0);
                  setSimulationCompleted(false);
                  setSimulationRunning((running) => !running);
                }}
              >
                {simulationRunning ? 'Dừng mô phỏng' : 'Mô phỏng luồng'}
              </Button>
            )}
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
            <SimulationContext.Provider value={{
              activeNode: activeSimulationNode,
              completedNodes: completedSimulationNodes,
            }}>
            <ReactFlow
              // React Flow only consumes defaultNodes on mount. Terminal nodes
              // are added locally, so the old key left the canvas with stale
              // internal state: the toolbar said "already exists" while no
              // node was rendered. Include the complete layout identity to
              // remount and fit the viewport whenever nodes are added/removed.
              key={`${draft.id}:${JSON.stringify(flowSteps)}:${JSON.stringify(systemNodePositions)}:${JSON.stringify(terminalEdges)}`}
              defaultNodes={nodes}
              edges={edges}
              onNodeDragStop={(_, node) => guardedAsync(async () => {
                const nextPositions = {
                  ...stepPositions,
                  ...systemNodePositions,
                  [node.id]: { x: node.position.x, y: node.position.y },
                };
                await persistGraphLayout(draft.id, nextPositions, terminalEdges, draft);
              })}
              onNodeDoubleClick={(_, node) => node.type === 'stepNode' && openStepEditor(node.id)}
              onPaneClick={() => setSelectedEdge(null)}
              onEdgeClick={(_, edge) => setSelectedEdge(edge)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onConnect={canDesign ? connect : undefined}
              onEdgesDelete={canDesign ? deleteEdges : undefined}
              onReconnect={canDesign ? reconnect : undefined}
              nodesDraggable={canDesign}
              nodesConnectable={canDesign}
              edgesReconnectable={canDesign}
              edgesFocusable={canDesign}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} color="#e9eff4" />
              <Controls />
              <MiniMap pannable zoomable />
              {canDesign && !simulationRunning && <Panel position="top-left"><div style={{background:'rgba(255,255,255,.94)',padding:'7px 10px',borderRadius:6,fontSize:12,boxShadow:'var(--shadow-card)'}}>Kéo mọi node, kể cả Bắt đầu/Kết thúc, để tự bố trí. Nối từ chấm xanh sang chấm trắng; vòng lặp và tự nối vẫn được chặn để bảo vệ luồng khám.</div></Panel>}
              {canDesign && selectedEdge && (
                <Panel position="bottom-center">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(8,38,64,.96)', color: '#fff', padding: '9px 11px', borderRadius: 9, boxShadow: '0 8px 24px rgba(8,38,64,.24)' }}>
                    <GitBranch size={15} color="#7dd3fc" />
                    <span style={{ fontSize: 12 }}>Đã chọn dây · kéo đầu dây để đổi node đích</span>
                    <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => deleteEdges([selectedEdge])}>Xóa dây</Button>
                    <Button size="small" onClick={() => setSelectedEdge(null)}>Bỏ chọn</Button>
                  </div>
                </Panel>
              )}
              {canDesign && (
                <Panel position="top-right">
                  <div style={{ background: 'rgba(255,255,255,.98)', padding: 10, borderRadius: 8, border: '1px solid #dce3e9', boxShadow: '0 5px 16px rgba(15,47,77,.09)', width: 184 }}>
                    <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>Công cụ sơ đồ</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { key: 'start', label: 'Đặt điểm Bắt đầu', icon: Play, action: () => addTerminalNode('__START__'), disabled: hasStartNode },
                        { key: 'end', label: 'Đặt điểm Kết thúc', icon: Check, action: () => addTerminalNode('__END__'), disabled: hasEndNode },
                        { key: 'edge', label: 'Nối hai bước', icon: GitBranch, action: () => message.info('Kéo từ cổng ra của node nguồn sang cổng vào của node đích.') },
                      ].map((tool) => {
                        const ToolIcon = tool.icon;
                        return (
                          <Tooltip key={tool.key} title={tool.disabled ? `${tool.label} — đã có trên sơ đồ` : tool.label} placement="left">
                            <button
                              type="button"
                              aria-label={tool.label}
                              disabled={tool.disabled}
                              onClick={tool.action}
                              style={{ width: 48, height: 42, padding: 0, borderRadius: 6, border: '1px solid #d6dde4', background: tool.disabled ? '#f5f6f7' : '#fff', color: tool.disabled ? '#aab2ba' : '#344454', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: tool.disabled ? 'not-allowed' : 'pointer' }}
                            >
                              <ToolIcon size={19} strokeWidth={1.8} />
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <div style={{ height: 1, background: '#e6ebef', margin: '10px 0' }} />
                    <Text type="secondary" style={{ display: 'block', fontSize: 10.5, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Bước nghiệp vụ</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {CLINIC_STEP_PRESETS.slice(0, 6).map((preset) => {
                        const role = preset.step.responsibleRole ?? 'nurse';
                        const executorType = preset.step.executorType ?? PRESET_EXECUTOR[preset.value] ?? executorForRole(role);
                        const executor = EXECUTOR_META[executorType];
                        const iconMeta = ICON_META[executor.icon];
                        const PresetIcon = iconMeta.icon;
                        return (
                          <Tooltip key={preset.value} title={preset.label} placement="left">
                            <button
                              type="button"
                              aria-label={`Thêm bước ${preset.step.name}`}
                              onClick={() => {
                                applyStepPreset(preset.value);
                                setSidePanel('add');
                              }}
                              style={{
                                width: 50,
                                height: 48,
                                padding: 0,
                                borderRadius: 6,
                                border: '1px solid #d6dde4',
                                background: '#fff',
                                color: '#344454',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <PresetIcon size={22} strokeWidth={1.9} />
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <Button size="small" type="link" icon={<Plus size={13} />} onClick={() => setSidePanel('add')} style={{ paddingInline: 0, marginTop: 7, fontSize: 11.5 }}>
                      Tất cả loại bước
                    </Button>
                  </div>
                </Panel>
              )}
              {simulationRunning && (
                <Panel position="bottom-left">
                  <div style={{ background: 'rgba(8,38,64,.96)', color: '#fff', width: 330, padding: '13px 15px', borderRadius: 11, boxShadow: '0 12px 34px rgba(8,38,64,.28)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Activity size={16} color="#5eead4" />
                      <strong style={{ fontSize: 12.5 }}>Đang mô phỏng lượt khám</strong>
                      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .78 }}>Bước {simulationIndex + 1}/{simulationSequence.length}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.16)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${((simulationIndex + 1) / Math.max(1, simulationSequence.length)) * 100}%`,
                          height: '100%',
                          background: '#5eead4',
                          borderRadius: 999,
                          transition: 'width .25s ease',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: '#99f6e4', textTransform: 'uppercase', letterSpacing: '.05em' }}>Đang xử lý tại</div>
                    <div style={{ marginTop: 3, fontSize: 14, fontWeight: 650 }}>
                      {activeSimulationStep?.name ?? (activeSimulationNode === '__START__' ? 'Khởi tạo lượt khám' : 'Hoàn tất quy trình')}
                    </div>
                    {activeSimulationStep?.conditionalRule && <div style={{ marginTop: 4, fontSize: 11, color: '#bae6fd' }}>Điều kiện: {activeSimulationStep.conditionalRule}</div>}
                    {activeSimulationStep?.requiredOutput && <div style={{ marginTop: 3, fontSize: 11, opacity: .78 }}>Dữ liệu đầu ra: {activeSimulationStep.requiredOutput}</div>}
                    {nextSimulationNode && (
                      <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.14)', fontSize: 11.5, opacity: .86 }}>
                        Tiếp theo: <strong>{nextSimulationStep?.name ?? (nextSimulationNode === '__END__' ? 'Kết thúc quy trình' : 'Bước tiếp theo')}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10.5, opacity: .78 }}>
                      <span>● Xanh lá: đã qua</span>
                      <span>● Xanh ngọc: đang xử lý</span>
                    </div>
                  </div>
                </Panel>
              )}
              {simulationCompleted && (
                <Panel position="bottom-center">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(240,250,246,.98)', border: '1px solid #86c9ae', color: '#135f48', padding: '10px 12px', borderRadius: 10, boxShadow: '0 10px 28px rgba(19,95,72,.18)', marginBottom: 10 }}>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong style={{ display: 'block', fontSize: 12.5 }}>Mô phỏng hoàn tất</strong>
                      <span style={{ fontSize: 11.5 }}>Đã đi qua {simulationSequence.length} điểm trong luồng.</span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        setSimulationIndex(0);
                        setSimulationCompleted(false);
                        setSimulationRunning(true);
                      }}
                    >
                      Chạy lại
                    </Button>
                    <Button size="small" onClick={() => setSimulationCompleted(false)}>Đóng</Button>
                  </div>
                </Panel>
              )}
              {nodes.length === 0 && <Panel position="top-center"><div style={{background:'rgba(255,255,255,.96)',padding:'9px 13px',borderRadius:8,fontSize:12.5,boxShadow:'var(--shadow-card)'}}>Canvas đang trống. Chọn Bắt đầu, bước nghiệp vụ và Kết thúc từ thanh công cụ để tự dựng luồng.</div></Panel>}
            </ReactFlow>
            </SimulationContext.Provider>
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
                  <SortableStepRow key={s.code} step={s} canDesign={canDesign} onToggleMandatory={(v) => toggleMandatory(s.code, v)} onIconChange={(icon) => guarded(() => {
                    const updated = workflowService.editStep(canonicalTemplateId, s.code, { icon }, currentUser.id);
                    syncStepPatch(updated.id, s.code, { icon }, updated);
                  })} onRemove={() => removeStep(s.code)} />
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
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Mô tả mục tiêu <Text type="danger">*</Text></Text>
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
            {!canSubmitDraftStep && (
              <Alert
                type="info"
                showIcon
                message="Nhập tên bước và mô tả mục tiêu để tiếp tục"
                style={{ paddingBlock: 7 }}
              />
            )}
            <Button disabled={!canSubmitDraftStep} type="primary" size="large" icon={<Plus size={15} />} onClick={addStep}>Thêm bước vào sơ đồ</Button>
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
        title="Kiểm tra an toàn quy trình"
        open={validationOpen}
        onCancel={() => setValidationOpen(false)}
        footer={<Button type="primary" onClick={() => setValidationOpen(false)}>Đóng</Button>}
        width={720}
      >
        <Alert
          type={validationReport.valid ? (validationReport.warnings.length > 0 ? 'warning' : 'success') : 'error'}
          showIcon
          message={
            validationReport.valid
              ? 'Không phát hiện lỗi cấu trúc chặn phát hành'
              : `${validationReport.errors.length} lỗi phải sửa trước khi đưa quy trình vào sử dụng`
          }
          description={
            validationReport.valid
              ? 'Quy trình đã có đường đi đầy đủ từ Bắt đầu đến Kết thúc.'
              : 'Sửa các mục bên dưới rồi kiểm tra lại.'
          }
          style={{ marginBottom: 16 }}
        />

        {validationReport.errors.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#b42318' }}>
              Việc cần làm
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {validationReport.errors.map((issue, index) => (
                <div key={`${issue.code}-${index}`} style={{ padding: '10px 12px', border: '1px solid #f3c4c1', borderRadius: 8, background: '#fff7f6' }}>
                  <Text strong style={{ display: 'block', fontSize: 13 }}>{validationGuidance(issue)}</Text>
                  {issue.nodeCodes?.length ? (
                    <Collapse
                      ghost
                      size="small"
                      items={[{
                        key: 'details',
                        label: 'Chi tiết',
                        children: <Text type="secondary">{issue.nodeCodes.map(nodeLabel).join(', ')}</Text>,
                      }]}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {validationReport.warnings.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#9a6700' }}>Nên kiểm tra thêm</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {validationReport.warnings.map((issue, index) => (
                <div key={`${issue.code}-${index}`} style={{ padding: '10px 12px', border: '1px solid #f1d59c', borderRadius: 8, background: '#fffaf0' }}>
                  <Text strong style={{ display: 'block', fontSize: 13 }}>{validationGuidance(issue)}</Text>
                  {issue.nodeCodes?.length ? (
                    <Collapse
                      ghost
                      size="small"
                      items={[{
                        key: 'details',
                        label: 'Chi tiết',
                        children: <Text type="secondary">{issue.nodeCodes.map(nodeLabel).join(', ')}</Text>,
                      }]}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

      </Modal>

      <Modal
        title="Đã đưa quy trình vào sử dụng"
        open={deploymentOpen}
        onCancel={() => setDeploymentOpen(false)}
        width={520}
        footer={eligibleEncounters.length > 0
          ? [
              <Button key="later" onClick={() => setDeploymentOpen(false)}>Để sau</Button>,
              <Button key="deploy" type="primary" icon={<Rocket size={15} />} onClick={deployNow}>
                Áp dụng cho lượt khám đã chọn
              </Button>,
            ]
          : <Button type="primary" onClick={() => setDeploymentOpen(false)}>Hoàn tất</Button>}
      >
        <Alert
          type="success"
          showIcon
          message="Phiên bản mới đang hoạt động"
          description={eligibleEncounters.length > 0
            ? 'Quy trình sẽ tự áp dụng cho các lượt khám phù hợp. Bạn cũng có thể chọn một lượt khám bên dưới để áp dụng ngay.'
            : 'Chưa có lượt khám phù hợp ở thời điểm này. Hệ thống sẽ tự áp dụng khi có lượt khám cùng chuyên khoa được bác sĩ duyệt phác đồ.'}
          style={{ marginBottom: 16 }}
        />
        {eligibleEncounters.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 7 }}>Áp dụng ngay cho</Text>
            <Select
              style={{ width: '100%' }}
              value={deploymentEncounterId}
              onChange={(value: EncounterId) => setDeploymentEncounterId(value)}
              options={eligibleEncounters.map((encounter) => {
                const patient = patients.find((item) => item.id === encounter.patientId);
                return { value: encounter.id, label: `${patient?.name ?? 'Bệnh nhân'} · ${patient?.code ?? encounter.patientId} · ${encounter.department}` };
              })}
            />
          </div>
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
