import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Activity, FileText, Trash2, Upload, FileSignature, History, ShieldAlert, Lock,
  Home, ExternalLink, FileHeart, CalendarDays, Building2, Stethoscope, CheckCircle2,
  CircleAlert, ClipboardCheck, Layers3, UserRoundCheck, Pill, GitBranch, LockKeyhole,
} from 'lucide-react';
import { DragHandle } from '../components/common/DragHandle';
import { IconActionButton } from '../components/common/IconActionButton';
import { DragConfirmDialog, type PendingDrop } from '../components/common/DragConfirmDialog';
import {
  Card, Row, Col, Tag, Button, Modal, Input, Select, Alert, Typography, List, Space, App as AntApp,
} from 'antd';
import { TabPanel } from '../components/common/TabPanel';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners,
  useDroppable, useDraggable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, medicalRecordRepository, clinicalOrderRepository, workflowRepository, auditRepository } from '../domain/repositories';
import {
  getEncounterMedicalRecord,
  getEncounterDocuments,
  getEncounterPrescriptions,
  getMedicalRecordCompletionCheck,
  createEncounterDocument,
  signMedicalRecord,
  addMedicalRecordAddendum,
  reopenMedicalRecord,
  requestEncounterMedicalRecordBreakGlass,
  endMedicalRecordBreakGlass,
  type MedicalRecordCompletionCheck,
  type MedicalRecordBreakGlassGrant,
} from '../api/medicalRecord';
import {
  getEncounterClinicalPlan,
  getEncounterClinicalPlanRevisions,
  getEncounterDiagnoses,
} from '../api/doctorDecision';
import { ApiError } from '../api/http';
import { activateEncounterWorkflow, getEncounter, mapEncounter } from '../api/encounters';
import { getEncounterAuditTrail } from '../api/audit';
import { auditService } from '../domain/services/auditService';
import {
  RECORD_STATUS_LABEL,
  ENCOUNTER_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type ClinicalOrderStatus,
  type WorkflowInstanceStatus,
} from '../domain/core/enums';
import { hasRoleAccess, type UserRole } from '../domain/core/role';
import type { EncounterId } from '../domain/core/ids';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { LifetimeMedicalRecord } from '../components/medical-record/LifetimeMedicalRecord';
import { getWorkflowInstanceForEncounter, listWorkflowInstances } from '../api/workflowInstance';
import { listWorkflowTemplates, listWorkflowTemplateVersions } from '../api/workflowTemplate';
import {
  acceptWorkflowTask,
  cancelAdHocWorkflowTask,
  completeWorkflowTask,
  createAdHocWorkflowTask,
  listWorkflowTasks,
  startWorkflowTask,
} from '../api/workflowTask';
import { ROLE_LABEL } from '../domain/core/role';
import type {
  ClinicalPlan,
  ClinicalPlanRevision,
  DoctorDiagnosis,
  Prescription,
  WorkflowTemplateVersion,
  WorkflowTask,
} from '../domain/core/entities';
import type { MedicalEncounter } from '../domain/core/entities';
import './Records.css';

const { Title, Text, Paragraph } = Typography;

const ENCOUNTER_TYPE_LABEL: Record<MedicalEncounter['type'], string> = {
  standard: 'Khám chuyên khoa',
  emergency: 'Cấp cứu',
  follow_up: 'Tái khám',
  remote: 'Khám từ xa',
};

const WORKFLOW_STATUS_LABEL: Record<WorkflowInstanceStatus, string> = {
  created: 'Chờ kích hoạt',
  active: 'Đang thực hiện',
  suspended: 'Tạm dừng',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
};

const ORDER_STATUS_LABEL: Record<ClinicalOrderStatus, string> = {
  requested: 'Đã chỉ định',
  in_progress: 'Đang thực hiện',
  invalid_sample: 'Cần lấy lại mẫu',
  result_ready: 'Đã có kết quả',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
};

const MEDICATION_EVENT_LABEL: Record<string, string> = {
  prescribed: 'Đã kê',
  dispensed: 'Đã cấp phát',
  administered: 'Đã sử dụng',
  adherence_confirmed: 'Đã xác nhận tuân thủ',
  adherence_note: 'Ghi nhận dùng thuốc',
};

const ENCOUNTER_AUDIT_LABEL: Record<string, string> = {
  medical_record_signed: 'Bác sĩ ký hồ sơ',
  medical_record_reopened: 'Mở lại hồ sơ',
  medical_record_addendum_added: 'Bổ sung ghi chú',
  document_uploaded: 'Tải lên tài liệu lâm sàng',
  workflow_task_started: 'Bắt đầu bước điều trị',
  workflow_task_completed: 'Hoàn thành bước điều trị',
};

const formatEncounterDate = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const encounterDisplayName = (encounter: MedicalEncounter) =>
  `${ENCOUNTER_TYPE_LABEL[encounter.type]} · ${encounter.department} · ${formatEncounterDate(encounter.createdAt)}`;

interface PlanTask {
  id: string;
  col: string;
  title: string;
  type: string;
  date: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  source: WorkflowTask;
  preview?: boolean;
  stepNumber?: number;
  dependencyText?: string;
}

const COLS = [
  { id: 'todo', label: 'Cần thực hiện' },
  { id: 'in_progress', label: 'Đang thực hiện' },
  { id: 'done', label: 'Đã hoàn thành' },
];

const TYPE_ICON: Record<string, typeof Activity> = { 'Bước bổ sung': Plus };
const PRIO_COLOR: Record<string, string> = { high: 'red', medium: 'gold', low: 'default' };
const PRIO_LABEL: Record<string, string> = { high: 'Quan trọng', medium: 'Trung bình', low: 'Bình thường' };

function PlanCard({ task, onDelete, canDelete, ghost, registerNode }: { task: PlanTask; onDelete: () => void; canDelete: boolean; ghost?: boolean; registerNode?: (node: HTMLDivElement | null) => void }) {
  // Lưu ý: KHÔNG áp `transform` lên thẻ gốc — DragOverlay đã là bản ghost bay
  // theo chuột; nếu transform cả thẻ gốc sẽ có 2 thẻ cùng di chuyển và thẻ gốc
  // bị mép cột (overflow) cắt cụt. `ghost` = bản copy trong DragOverlay: hiển
  // thị nét, không đăng ký ref draggable trùng id.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: ghost,
  });
  const Icon = TYPE_ICON[task.type] || FileText;
  return (
    <div
      className="records-kanban-card"
      ref={(node) => {
        if (!ghost) setNodeRef(node);
        registerNode?.(node);
      }}
      style={{
        visibility: !ghost && isDragging ? 'hidden' : 'visible',
        background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8,
        padding: '10px 12px', marginBottom: 8, boxShadow: 'none', width: '100%', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 6 }}>
        <Tag
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon size={12} />
          {task.stepNumber ? `Bước ${task.stepNumber}` : task.type}
        </Tag>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <DragHandle attributes={attributes} listeners={listeners} label={`Kéo để di chuyển bước "${task.title}" sang cột khác`} />
          {canDelete && <IconActionButton icon={<Trash2 size={14} />} label="Xóa bước riêng" danger onClick={onDelete} />}
        </div>
      </div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{task.title}</Text>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }} ellipsis={{ rows: 2 }}>{task.desc}</Paragraph>
      {task.dependencyText && (
        <div className={`records-task-dependency${task.source.status === 'pending' || task.source.status === 'blocked' ? ' is-blocked' : ''}`}>
          {task.source.status === 'pending' || task.source.status === 'blocked' ? <LockKeyhole size={12} /> : <GitBranch size={12} />}
          <span>{task.dependencyText}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Tag color={PRIO_COLOR[task.priority]}>{PRIO_LABEL[task.priority]}</Tag>
        <Text type="secondary" style={{ fontSize: 11.5 }}>{task.date}</Text>
      </div>
    </div>
  );
}

const COL_STYLES: Record<string, { bg: string; border: string; bgOver: string }> = {
  todo: {
    bg: '#ffffff',
    border: 'var(--border-default)',
    bgOver: 'var(--surface-hover)',
  },
  in_progress: {
    bg: 'var(--warning-bg)',
    border: '#ffe58f',
    bgOver: '#fff2e8',
  },
  done: {
    bg: 'var(--success-bg)',
    border: '#b7eb8f',
    bgOver: '#d9f7be',
  },
};

function PlanColumn({ colId, label, tasks, onDelete, canManage, registerCardNode }: { colId: string; label: string; tasks: PlanTask[]; onDelete: (task: PlanTask) => void; canManage: boolean; registerCardNode: (id: string, node: HTMLDivElement | null) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const styles = COL_STYLES[colId] || { bg: 'var(--surface-subtle)', border: 'var(--border-default)', bgOver: 'var(--surface-selected)' };
  return (
    <div
      className={`records-kanban-column records-kanban-column--${colId}`}
      ref={setNodeRef}
      style={{
        background: isOver ? styles.bgOver : styles.bg,
        borderRadius: 10,
        padding: 12,
        minHeight: 400,
        border: `1px dashed ${isOver ? 'var(--medical-blue-500)' : styles.border}`,
        flex: '1 0 260px',
        minWidth: 260,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <Tag>{tasks.length}</Tag>
      </div>
      {tasks.map((t) => <PlanCard key={t.id} task={t} onDelete={() => onDelete(t)} canDelete={canManage && t.source.origin === 'ad_hoc' && ['pending', 'blocked', 'ready'].includes(t.source.status)} registerNode={(node) => registerCardNode(t.id, node)} />)}
      {tasks.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Thả thẻ vào đây</Text>}
    </div>
  );
}

function EMRWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository)
    .filter((e) => e.patientId === currentPatient.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const records = useStore(medicalRecordRepository.records());
  const documents = useStore(medicalRecordRepository.documents());
  const orders = useStore(clinicalOrderRepository.orders());
  const results = useStore(clinicalOrderRepository.results());
  const tasks = useStore(workflowRepository.tasks());
  useStore(auditRepository);
  const requestedEncounterId = searchParams.get('encounterId') as EncounterId | null;
  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(
    encounters.some((row) => row.id === requestedEncounterId)
      ? requestedEncounterId ?? undefined
      : encounters[0]?.id,
  );
  const [addendumText, setAddendumText] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [breakGlassGrant, setBreakGlassGrant] = useState<MedicalRecordBreakGlassGrant | null>(null);
  const [breakGlassReason, setBreakGlassReason] = useState('');
  const [breakGlassMfaCode, setBreakGlassMfaCode] = useState('');
  const [breakGlassLoading, setBreakGlassLoading] = useState(false);
  const [completion, setCompletion] = useState<MedicalRecordCompletionCheck>({
    ok: false,
    missing: [{ code: 'RECORD_NOT_LOADED', message: 'Chưa tải hồ sơ' }],
    checkedAt: '',
    recordVersion: 0,
  });
  const [clinicalPlan, setClinicalPlan] = useState<ClinicalPlan>();
  const [planRevisions, setPlanRevisions] = useState<ClinicalPlanRevision[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [diagnoses, setDiagnoses] = useState<DoctorDiagnosis[]>([]);

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];

  useEffect(() => {
    if (!encounter) return;
    let active = true;
    const encounterId = encounter.id;
    const recordWithCompletion = getEncounterMedicalRecord(encounterId).then(async (record) => ({
      record,
      completion: await getMedicalRecordCompletionCheck(record.id),
    }));

    Promise.allSettled([
      recordWithCompletion,
      getEncounterDocuments(encounterId),
      getEncounterAuditTrail(encounterId),
      getEncounterClinicalPlan(encounterId),
      getEncounterClinicalPlanRevisions(encounterId),
      getEncounterPrescriptions(encounterId),
      getEncounterDiagnoses(encounterId),
    ]).then(
      ([
        recordResult,
        documentResult,
        auditResult,
        planResult,
        revisionResult,
        prescriptionResult,
        diagnosisResult,
      ]) => {
        if (!active) return;
        if (recordResult.status === 'fulfilled') {
          medicalRecordRepository.records().upsert(recordResult.value.record);
          setCompletion(recordResult.value.completion);
        }
        if (documentResult.status === 'fulfilled') {
          documentResult.value.forEach((row) => medicalRecordRepository.documents().upsert(row));
        }
        if (auditResult.status === 'fulfilled') {
          auditResult.value.forEach((row) => auditRepository.upsert(row));
        }
        setClinicalPlan(planResult.status === 'fulfilled' ? planResult.value : undefined);
        setPlanRevisions(revisionResult.status === 'fulfilled' ? revisionResult.value : []);
        setPrescriptions(
          prescriptionResult.status === 'fulfilled' ? prescriptionResult.value : [],
        );
        setDiagnoses(diagnosisResult.status === 'fulfilled' ? diagnosisResult.value : []);
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter?.id]);

  if (!encounter) return <Text type="secondary">Chưa có lượt khám nào.</Text>;

  const NORMAL_ACCESS_ROLES: UserRole[] = ['patient', 'doctor', 'medical_administrator'];
  if (!hasRoleAccess(role, NORMAL_ACCESS_ROLES) && !breakGlassGrant) {
    const requestBreakGlassAccess = () => {
      if (!breakGlassReason.trim() || !breakGlassMfaCode.trim()) {
        setError('Vui lòng nhập lý do và mã MFA.');
        return;
      }
      setError(null);
      setBreakGlassLoading(true);
      requestEncounterMedicalRecordBreakGlass(encounter.id, {
        reason: breakGlassReason.trim(),
        mfaCode: breakGlassMfaCode.trim(),
      })
        .then((grant) => {
          setBreakGlassGrant(grant);
          setBreakGlassReason('');
          setBreakGlassMfaCode('');
          return getEncounterAuditTrail(encounter.id).then((rows) =>
            rows.forEach((row) => auditRepository.upsert(row)),
          );
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setBreakGlassLoading(false));
    };
    return (
      <Card style={{ maxWidth: 520 }}>
        <ShieldAlert size={28} color="var(--warning)" style={{ marginBottom: 12 }} />
        <Title level={5}>Yêu cầu quyền truy cập khẩn cấp (Break-glass)</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Vai trò của bạn không có quyền xem hồ sơ bệnh án này trong điều kiện bình thường. Bạn có thể yêu cầu truy cập khẩn cấp — hành động này bắt buộc phải nêu lý do, xác thực bằng mã MFA, và sẽ được ghi vào nhật ký kiểm toán ở mức nghiêm trọng. Quyền truy cập có hiệu lực trong 15 phút.
        </Paragraph>
        {error && <FriendlyErrorInline error={error} onClose={() => setError(null)} />}
        <Input.TextArea rows={2} placeholder="Lý do truy cập khẩn cấp (bắt buộc)..." value={breakGlassReason} onChange={(e) => setBreakGlassReason(e.target.value)} style={{ marginBottom: 12 }} />
        <Input.Password placeholder="Mã MFA (bắt buộc)" value={breakGlassMfaCode} onChange={(e) => setBreakGlassMfaCode(e.target.value)} style={{ marginBottom: 12 }} />
        <Button
          danger type="primary"
          loading={breakGlassLoading}
          onClick={requestBreakGlassAccess}
        >Xác nhận truy cập khẩn cấp</Button>
        <Button type="link" icon={<Home size={13} />} style={{ paddingLeft: 4 }} onClick={() => navigate('/app/dashboard')}>Về trang tổng quan</Button>
      </Card>
    );
  }

  const record = records.find((r) => r.encounterId === encounter.id);
  const displayedDiagnosis =
    diagnoses.find((row) => row.id === record?.diagnosisId) ??
    diagnoses.find((row) => row.status === 'confirmed');
  const prescribedMedications = prescriptions.flatMap((row) => row.medications);
  const encounterOrders = orders.filter((o) => o.encounterId === encounter.id);
  const encounterDocs = documents.filter((d) => d.encounterId === encounter.id);
  const encounterTasks = tasks.filter((t) => t.encounterId === encounter.id);
  const encounterAudit = auditService.listByEncounter(encounter.id);

  const isDoctor = hasRoleAccess(role, ['doctor']);
  const isAdmin = hasRoleAccess(role, ['medical_administrator']);

  const uploadDocument = () => {
    setError(null);
    createEncounterDocument(encounter.id, { type: 'other', fileName: `tai-lieu-${Date.now()}.pdf` })
      .then((row) => medicalRecordRepository.documents().upsert(row))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };
  const refreshRecord = () =>
    getEncounterMedicalRecord(encounter.id)
      .then(async (row) => {
        medicalRecordRepository.records().upsert(row);
        setCompletion(await getMedicalRecordCompletionCheck(row.id));
      })
      .catch(() => undefined);

  const guardedAsync = (fn: () => Promise<void>) => {
    setError(null);
    fn().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };

  const sign = () => guardedAsync(async () => {
    if (!record) throw new Error('Chưa có hồ sơ để ký.');
    await signMedicalRecord(record.id);
    await refreshRecord();
  });
  const addAddendum = () => guardedAsync(async () => {
    if (!record) throw new Error('Chưa có hồ sơ.');
    if (!addendumText.trim()) throw new Error('Vui lòng nhập nội dung bổ sung.');
    await addMedicalRecordAddendum(record.id, addendumText);
    await refreshRecord();
    setAddendumText('');
  });
  const reopen = () => guardedAsync(async () => {
    if (!record) throw new Error('Chưa có hồ sơ.');
    if (!reopenReason.trim()) throw new Error('Vui lòng nhập lý do mở lại hồ sơ.');
    await reopenMedicalRecord(record.id, reopenReason);
    await refreshRecord();
    setReopenReason('');
  });
  const endBreakGlass = () => guardedAsync(async () => {
    if (!breakGlassGrant) return;
    await endMedicalRecordBreakGlass(breakGlassGrant.id);
    setBreakGlassGrant(null);
  });

  const clinicalReadiness = [
    {
      label: 'Chẩn đoán xác định',
      ready: Boolean(displayedDiagnosis),
      detail: displayedDiagnosis?.conditionName ?? 'Chưa được bác sĩ xác nhận',
    },
    {
      label: 'Kế hoạch điều trị',
      ready: Boolean(clinicalPlan),
      detail: clinicalPlan?.summary ?? 'Chưa lập kế hoạch lâm sàng',
    },
    {
      label: 'Chỉ định và kết quả',
      ready: encounterOrders.every((order) => !order.resultId || results.some((result) => result.id === order.resultId)),
      detail: encounterOrders.length
        ? `${encounterOrders.length} chỉ định · ${encounterOrders.filter((order) => order.resultId).length} có kết quả`
        : 'Không có chỉ định cận lâm sàng',
    },
    {
      label: 'Điều kiện ký hồ sơ',
      ready: completion.ok,
      detail: completion.ok ? 'Đã đủ điều kiện ký số' : `${completion.missing.length} nội dung cần hoàn thiện`,
    },
  ];

  return (
    <div className="records-workspace">
      <section className="records-context-selector">
        <div className="records-context-selector__label">
          <CalendarDays size={16} />
          <div>
            <Text strong>Lượt khám đang xem</Text>
            <Text type="secondary">Chọn theo thời gian và chuyên khoa</Text>
          </div>
        </div>
        <Select
          value={encounter.id}
          onChange={(value) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', 'emr');
            next.set('encounterId', value);
            setSearchParams(next, { replace: true });
            setSelectedId(value as EncounterId);
          }}
          options={encounters.map((row) => ({ value: row.id, label: encounterDisplayName(row) }))}
          optionRender={(option) => {
            const row = encounters.find((item) => item.id === option.value);
            return row ? (
              <div className="records-encounter-option">
                <span>{ENCOUNTER_TYPE_LABEL[row.type]} · {row.department}</span>
                <small>{formatEncounterDate(row.createdAt)} · {ENCOUNTER_STATUS_LABEL[row.status]}</small>
              </div>
            ) : option.label;
          }}
        />
        <Tag color={record?.status === 'signed' ? 'success' : 'gold'} bordered={false}>
          {record ? RECORD_STATUS_LABEL[record.status] : 'Chưa tạo hồ sơ'}
        </Tag>
      </section>

      <section className="records-encounter-hero">
        <div className="records-encounter-hero__icon"><Stethoscope size={23} /></div>
        <div className="records-encounter-hero__main">
          <div className="records-eyebrow">Chi tiết lượt khám</div>
          <Title level={3}>{ENCOUNTER_TYPE_LABEL[encounter.type]} · {encounter.department}</Title>
          <Space size={[14, 6]} wrap>
            <span><CalendarDays size={14} /> {formatEncounterDate(encounter.createdAt)}</span>
            <span><Building2 size={14} /> {encounter.room ? `Phòng ${encounter.room}` : encounter.department}</span>
            <span><UserRoundCheck size={14} /> {currentPatient.name} · {currentPatient.code}</span>
          </Space>
        </div>
        <div className="records-encounter-hero__status">
          <Tag color={encounter.status === 'closed' || encounter.status === 'record_signed' ? 'green' : 'blue'} bordered={false}>
            {ENCOUNTER_STATUS_LABEL[encounter.status]}
          </Tag>
          {record?.status === 'signed' && <span><Lock size={13} /> Hồ sơ đã khóa sau ký</span>}
        </div>
      </section>

      {breakGlassGrant && (
        <Alert
          type="error"
          showIcon
          message={`Đang truy cập khẩn cấp · hết hạn ${new Date(breakGlassGrant.expiresAt).toLocaleTimeString('vi-VN')}`}
          action={<Button size="small" danger onClick={endBreakGlass}>Kết thúc truy cập</Button>}
        />
      )}

      {error && <FriendlyErrorInline error={error} onClose={() => setError(null)} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card className="records-clinical-summary" title={<span className="records-card-title"><FileHeart size={16} /> Tóm tắt lâm sàng</span>}>
            <div className="records-diagnosis-banner">
              <div>
                <span className="records-field-label">Chẩn đoán chính</span>
                <strong>{displayedDiagnosis?.conditionName ?? 'Chưa có chẩn đoán xác định'}</strong>
                {displayedDiagnosis?.conditionCode && <small>Mã bệnh {displayedDiagnosis.conditionCode}</small>}
              </div>
              <Tag color={displayedDiagnosis ? 'green' : 'gold'} bordered={false}>
                {displayedDiagnosis ? 'Đã xác nhận' : 'Cần hoàn thiện'}
              </Tag>
            </div>

            <div className="records-clinical-grid">
              <div className="records-clinical-block">
                <span className="records-field-label"><Pill size={13} /> Thuốc điều trị</span>
                {prescribedMedications.length ? prescribedMedications.map((medication) => (
                  <div className="records-clinical-line" key={medication.id}>
                    <strong>{medication.name}</strong>
                    <span>{medication.dose}{medication.frequency ? ` · ${medication.frequency}` : ''}</span>
                  </div>
                )) : <Text type="secondary">Chưa kê đơn trong lượt khám này</Text>}
              </div>
              <div className="records-clinical-block">
                <span className="records-field-label"><ClipboardCheck size={13} /> Sau khám & theo dõi</span>
                <div className="records-clinical-line">
                  <strong>Hướng dẫn ra viện</strong>
                  <span>{record?.discharge?.instructions.join('; ') || 'Chưa cập nhật'}</span>
                </div>
                <div className="records-clinical-line">
                  <strong>Kế hoạch tái khám</strong>
                  <span>{record?.followUp?.description || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {clinicalPlan && (
              <div className="records-plan-summary">
                <div className="records-plan-summary__heading">
                  <div>
                    <span className="records-field-label">Kế hoạch điều trị đã duyệt</span>
                    <strong>{clinicalPlan.summary}</strong>
                  </div>
                  <Space size={5} wrap>
                    <Tag color="blue" bordered={false}>
                      {clinicalPlan.currentStage === 'induction' ? 'Khởi trị'
                        : clinicalPlan.currentStage === 'monitoring' ? 'Theo dõi'
                          : clinicalPlan.currentStage === 'response_assessment' ? 'Đánh giá đáp ứng'
                            : 'Duy trì'}
                    </Tag>
                    <Tag bordered={false}>{planRevisions.length} lần cập nhật</Tag>
                    {clinicalPlan.protocolRef && <Tag color="geekblue" bordered={false}>Đã liên kết quy trình chuẩn</Tag>}
                  </Space>
                </div>
                <Row gutter={[12, 10]}>
                  <Col xs={24} md={8}><span className="records-field-label">Mục tiêu</span><Text>{clinicalPlan.measurableGoals.join('; ') || 'Chưa khai báo'}</Text></Col>
                  <Col xs={24} md={8}><span className="records-field-label">Chỉ số theo dõi</span><Text>{clinicalPlan.monitoringMetrics.join('; ') || 'Chưa khai báo'}</Text></Col>
                  <Col xs={24} md={8}><span className="records-field-label">Tiêu chí đổi / dừng</span><Text>{clinicalPlan.stopOrChangeCriteria || 'Chưa khai báo'}</Text></Col>
                </Row>
              </div>
            )}

            {prescriptions.length > 0 && (
              <div className="records-medication-history">
                <span className="records-field-label">Lịch sử thực hiện đơn thuốc</span>
                {prescriptions.flatMap((prescription) => prescription.medicationOrders).map((order) => (
                  <div key={order.id} className="records-medication-order">
                    <Text strong>{order.medicationName} · {order.dose}</Text>
                    <div className="records-chip-list">
                      {order.events.map((event) => (
                        <Tag key={event.id} bordered={false}>{MEDICATION_EVENT_LABEL[event.type] ?? 'Cập nhật dùng thuốc'} · {new Date(event.occurredAt).toLocaleString('vi-VN')}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!completion.ok && (
              <Alert
                type="warning"
                showIcon
                className="records-completion-alert"
                message="Hồ sơ chưa đủ điều kiện ký"
                description={completion.missing.map((item) => item.message).join(' · ')}
                action={isDoctor && !displayedDiagnosis ? (
                  <Button
                    size="small"
                    onClick={() => {
                      const returnTo = `/app/records?tab=emr&encounterId=${encodeURIComponent(encounter.id)}`;
                      navigate(
                        `/app/doctor-review?encounterId=${encodeURIComponent(encounter.id)}`
                        + `&returnTo=${encodeURIComponent(returnTo)}`,
                      );
                    }}
                  >
                    Hoàn thiện chẩn đoán
                  </Button>
                ) : undefined}
              />
            )}

            {isDoctor && record && record.status !== 'signed' && (
              <Button type="primary" disabled={!completion.ok} icon={<FileSignature size={14} />} onClick={sign}>Ký và khóa hồ sơ</Button>
            )}

            {isDoctor && record?.status === 'signed' && (
              <div className="records-record-action">
                <Input.TextArea rows={2} placeholder="Nội dung bổ sung sau ký..." value={addendumText} onChange={(e) => setAddendumText(e.target.value)} />
                <Button style={{ marginTop: 8 }} onClick={addAddendum}>Thêm ghi chú bổ sung</Button>
              </div>
            )}

            {isAdmin && record && record.status === 'signed' && (
              <div className="records-record-action">
                <Input placeholder="Lý do mở lại hồ sơ..." value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                <Button style={{ marginTop: 8 }} onClick={reopen}>Mở lại hồ sơ (có kiểm toán)</Button>
              </div>
            )}

            {record && record.addenda.length > 0 && (
              <div className="records-record-action">
                <span className="records-field-label">Ghi chú bổ sung sau ký</span>
                {record.addenda.map((addendum) => <Text key={addendum.id} type="secondary" className="records-addendum">{addendum.text}</Text>)}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <div className="records-workspace__side">
            <Card title={<span className="records-card-title"><ClipboardCheck size={16} /> Mức độ hoàn thiện</span>}>
              <div className="records-readiness-list">
                {clinicalReadiness.map((item) => (
                  <div className="records-readiness-item" key={item.label}>
                    <span className={item.ready ? 'is-ready' : 'is-pending'}>{item.ready ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span>
                    <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={<span className="records-card-title"><Activity size={16} /> Chỉ định & kết quả</span>}>
              <List
                size="small"
                dataSource={encounterOrders}
                locale={{ emptyText: <ProfessionalEmpty compact title="Chưa có chỉ định" description="Chỉ định cận lâm sàng sẽ xuất hiện sau khi bác sĩ tạo yêu cầu." showActions={false} /> }}
                renderItem={(order) => {
                  const result = order.resultId ? results.find((row) => row.id === order.resultId) : undefined;
                  return (
                    <List.Item className="records-list-item">
                      <div>
                        <Text strong>{order.type === 'laboratory' ? 'Xét nghiệm' : order.type === 'imaging' ? 'Chẩn đoán hình ảnh' : 'Hội chẩn'}</Text>
                        <Text type="secondary">{result?.summary || order.justification || 'Chưa có kết quả'}</Text>
                      </div>
                      <Tag color={result ? 'green' : 'blue'} bordered={false}>{ORDER_STATUS_LABEL[order.status]}</Tag>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Card title={<span className="records-card-title"><FileText size={16} /> Tài liệu lâm sàng</span>} extra={<Button size="small" icon={<Upload size={13} />} onClick={uploadDocument}>Tải lên</Button>}>
              <List
                size="small"
                dataSource={encounterDocs}
                locale={{ emptyText: <ProfessionalEmpty compact title="Chưa có tài liệu" description="Tải tài liệu lâm sàng đầu tiên cho lượt khám này." showActions={false} /> }}
                renderItem={(document) => (
                  <List.Item className="records-list-item" extra={<Tag bordered={false}>{document.signatureStatus === 'signed' ? 'Đã ký' : 'Chưa ký'}</Tag>}>
                    <div><Text strong>{document.fileName}</Text><Text type="secondary">Phiên bản {document.version} · {document.reviewStatus === 'reviewed' ? 'Đã duyệt' : 'Chờ duyệt'}</Text></div>
                  </List.Item>
                )}
              />
            </Card>

            <Card title={<span className="records-card-title"><History size={16} /> Hoạt động gần đây</span>}>
              <div className="records-activity-list">
                {encounterTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="records-activity-item">
                    <span><Layers3 size={14} /></span>
                    <div><strong>{task.name}</strong><small>{TASK_STATUS_LABEL[task.status]}</small></div>
                  </div>
                ))}
                {encounterAudit.slice(0, 6).map((audit) => (
                  <div key={audit.id} className="records-activity-item">
                    <span><History size={14} /></span>
                    <div><strong>{ENCOUNTER_AUDIT_LABEL[audit.action] ?? 'Cập nhật hồ sơ'}</strong><small>{new Date(audit.at).toLocaleString('vi-VN')}</small></div>
                  </div>
                ))}
                {!encounterTasks.length && !encounterAudit.length && <Text type="secondary">Chưa có hoạt động được ghi nhận.</Text>}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentPatient, role } = useAppState();
  const patientEncounters = useStore(encounterRepository)
    .filter((row) => row.patientId === currentPatient.id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const instances = useStore(workflowRepository.instances());
  const workflowTasks = useStore(workflowRepository.tasks());
  const templates = useStore(workflowRepository.templates());
  const templateVersions = useStore(workflowRepository.versions());
  const requestedEncounterId = searchParams.get('encounterId') as EncounterId | null;
  const [selectedEncounterId, setSelectedEncounterId] = useState<EncounterId | undefined>(
    requestedEncounterId ?? undefined,
  );
  const [selectedClinicalPlan, setSelectedClinicalPlan] = useState<ClinicalPlan>();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [previewTemplateId, setPreviewTemplateId] = useState<string>();
  const [previewTaskColumns, setPreviewTaskColumns] = useState<Record<string, string>>({});
  const [activating, setActivating] = useState(false);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Khám bệnh');
  const [responsibleRole, setResponsibleRole] = useState<UserRole>('doctor');
  const [slaMinutes, setSlaMinutes] = useState(30);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [loading, setLoading] = useState(true);
  const cardNodes = useRef(new Map<string, HTMLDivElement>());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canManage = hasRoleAccess(role, ['doctor', 'medical_administrator']);

  const selectedEncounter =
    patientEncounters.find((row) => row.id === selectedEncounterId) ?? patientEncounters[0];
  const instance = instances.find((row) => row.encounterId === selectedEncounter?.id);
  const template = templates.find((row) => row.id === instance?.templateId);
  const publishedTemplates = templates
    .map((row) => {
      const version = templateVersions.find(
        (candidate) =>
          candidate.id === row.latestPublishedVersionId &&
          candidate.templateId === row.id &&
          candidate.status === 'published',
      );
      return version ? { template: row, version } : undefined;
    })
    .filter(
      (row): row is { template: (typeof templates)[number]; version: WorkflowTemplateVersion } =>
        Boolean(row),
    )
    .sort((left, right) => {
      const department = selectedEncounter?.department.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim() ?? '';
      const score = (specialty: string) => {
        const normalized = specialty.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim();
        return normalized === department ? 2 : normalized.includes(department) || department.includes(normalized) ? 1 : 0;
      };
      return score(right.template.specialty) - score(left.template.specialty);
    });
  const selectedPublishedTemplate = publishedTemplates.find(
    (row) => row.template.id === selectedTemplateId,
  );
  const previewTemplate = publishedTemplates.find(
    (row) => row.template.id === previewTemplateId,
  );

  const toColumn = (status: WorkflowTask['status']) => {
    if (['completed', 'skipped', 'cancelled'].includes(status)) return 'done';
    if (['assigned', 'accepted', 'in_progress', 'waiting_for_patient', 'waiting_for_result', 'waiting_for_approval'].includes(status)) return 'in_progress';
    return 'todo';
  };
  const runtimeVersion = templateVersions.find(
    (row) => row.id === instance?.templateVersionId,
  );
  const runtimeTasks: PlanTask[] = workflowTasks
    .filter((task) => task.instanceId === instance?.id)
    .map((task) => {
      const stepIndex = runtimeVersion?.steps.findIndex((step) => step.code === task.stepCode) ?? -1;
      const dependencyNames = task.dependsOnStepCodes.map(
        (code) => runtimeVersion?.steps.find((step) => step.code === code)?.name ?? code,
      );
      return {
        id: task.id,
        col: toColumn(task.status),
        title: task.name,
        type: task.origin === 'ad_hoc' ? 'Bước bổ sung' : 'Bước quy trình',
        date: task.completedAt
          ? new Date(task.completedAt).toLocaleDateString('vi-VN')
          : `SLA ${task.slaMinutes} phút`,
        desc: `${ROLE_LABEL[task.responsibleRole]} · ${task.department}${task.blockedReason ? ` · ${task.blockedReason}` : ''}`,
        priority: task.priority === 'high' ? 'high' as const : task.priority === 'medium' ? 'medium' as const : 'low' as const,
        source: task,
        stepNumber: stepIndex >= 0 ? stepIndex + 1 : undefined,
        dependencyText: dependencyNames.length
          ? `Sau khi hoàn thành: ${dependencyNames.join(', ')}`
          : task.origin === 'ad_hoc' ? 'Bước bổ sung độc lập' : 'Bước khởi đầu',
      };
    });
  const previewTasks: PlanTask[] = !instance && selectedEncounter && previewTemplate
    ? previewTemplate.version.steps.map((step) => {
        const previewColumn = previewTaskColumns[step.code] ?? 'todo';
        const dependencyNames = step.prerequisiteStepCodes.map(
          (code) => previewTemplate.version.steps.find((candidate) => candidate.code === code)?.name ?? code,
        );
        const source = {
          id: `preview-${step.code}` as WorkflowTask['id'],
          instanceId: 'preview' as WorkflowTask['instanceId'],
          encounterId: selectedEncounter.id,
          stepCode: step.code,
          name: step.name,
          responsibleRole: step.responsibleRole,
          department: step.department,
          status: previewColumn === 'done'
            ? 'completed'
            : previewColumn === 'in_progress'
              ? 'in_progress'
              : step.prerequisiteStepCodes.length ? 'pending' : 'ready',
          dependsOnStepCodes: step.prerequisiteStepCodes,
          slaMinutes: step.maxWaitingMinutes,
          priority: 'medium',
          urgency: 'routine',
          createdAt: previewTemplate.version.publishedAt ?? previewTemplate.version.createdAt,
          reworkCount: 0,
          origin: 'template',
        } as WorkflowTask;
        return {
          id: source.id,
          col: previewColumn,
          title: step.name,
          type: 'Bước quy trình',
          date: `SLA ${step.maxWaitingMinutes} phút`,
          desc: `${ROLE_LABEL[step.responsibleRole]} · ${step.department}`,
          priority: 'medium' as const,
          source,
          preview: true,
          stepNumber: previewTemplate.version.steps.findIndex((candidate) => candidate.code === step.code) + 1,
          dependencyText: dependencyNames.length
            ? `Sau khi hoàn thành: ${dependencyNames.join(', ')}`
            : 'Bước khởi đầu',
        };
      })
    : [];
  const tasks = instance ? runtimeTasks : previewTasks;

  const refresh = async (encounterId = selectedEncounter?.id) => {
    if (!encounterId) return;
    const [instanceResult, taskResult] = await Promise.allSettled([
      getWorkflowInstanceForEncounter(encounterId),
      listWorkflowTasks(),
    ]);
    if (instanceResult.status === 'fulfilled') {
      workflowRepository.instances().upsert(instanceResult.value);
    } else if (
      !(instanceResult.reason instanceof ApiError && instanceResult.reason.status === 404)
    ) {
      throw instanceResult.reason;
    }
    if (taskResult.status === 'fulfilled') {
      taskResult.value.forEach((row) => workflowRepository.tasks().upsert(row));
    }
    if (taskResult.status === 'rejected') throw taskResult.reason;
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      Promise.allSettled([
        listWorkflowInstances(currentPatient.id),
        listWorkflowTasks(),
        listWorkflowTemplates(),
      ]).then(async ([instanceResult, taskResult, templateResult]) => {
        if (!active) return;
        const loadedInstances = instanceResult.status === 'fulfilled' ? instanceResult.value : [];
        loadedInstances.forEach((row) => workflowRepository.instances().upsert(row));
        if (taskResult.status === 'fulfilled') {
          taskResult.value.forEach((row) => workflowRepository.tasks().upsert(row));
        }
        if (templateResult.status === 'fulfilled') {
          templateResult.value.forEach((row) => workflowRepository.templates().upsert(row));
          const versionGroups = await Promise.allSettled(
            templateResult.value.map((row) => listWorkflowTemplateVersions(row.id)),
          );
          if (!active) return;
          versionGroups.forEach((result) => {
            if (result.status === 'fulfilled') {
              result.value.forEach((row) => workflowRepository.versions().upsert(row));
            }
          });
        }
        const encounterIds = new Set(patientEncounters.map((row) => row.id));
        const preferred = [...loadedInstances]
          .filter((row) => encounterIds.has(row.encounterId))
          .sort((left, right) => {
            const statusScore = Number(right.status === 'active') - Number(left.status === 'active');
            return statusScore || right.activatedAt.localeCompare(left.activatedAt);
          })[0];
        const requested = requestedEncounterId && encounterIds.has(requestedEncounterId)
          ? requestedEncounterId
          : undefined;
        setSelectedEncounterId(requested ?? preferred?.encounterId ?? patientEncounters[0]?.id);
        if (instanceResult.status === 'rejected') {
          message.error(instanceResult.reason instanceof Error ? instanceResult.reason.message : 'Không tải được quy trình điều trị.');
        }
        if (taskResult.status === 'rejected') {
          message.error(taskResult.reason instanceof Error ? taskResult.reason.message : 'Không tải được các bước điều trị.');
        }
        if (templateResult.status === 'rejected') {
          message.error(templateResult.reason instanceof Error ? templateResult.reason.message : 'Không tải được danh mục quy trình.');
        }
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient.id]);

  useEffect(() => {
    if (!selectedEncounterId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      Promise.allSettled([
        refresh(selectedEncounterId),
        getEncounterClinicalPlan(selectedEncounterId),
      ]).then(([workflowResult, planResult]) => {
        if (!active) return;
        if (workflowResult.status === 'rejected') {
          message.error(workflowResult.reason instanceof Error ? workflowResult.reason.message : 'Không tải được kế hoạch điều trị.');
        }
        setSelectedClinicalPlan(planResult.status === 'fulfilled' ? planResult.value : undefined);
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEncounterId]);

  const add = async () => {
    if (!instance || !title.trim() || !department.trim()) return;
    setLoading(true);
    try {
      await createAdHocWorkflowTask(instance.id, {
        name: title.trim(),
        responsibleRole,
        department: department.trim(),
        slaMinutes,
      });
      await refresh();
      setTitle('');
      setModal(false);
      message.success('Đã thêm bước riêng vào quy trình của bệnh nhân này.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm bước.');
    } finally {
      setLoading(false);
    }
  };
  const del = async (task: PlanTask) => {
    setLoading(true);
    try {
      await cancelAdHocWorkflowTask(task.id, task.source.version ?? 0);
      await refresh();
      message.success('Đã xóa bước riêng khỏi kế hoạch bệnh nhân.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xóa bước.');
    } finally {
      setLoading(false);
    }
  };
  const openTemplatePicker = () => {
    const preferredId =
      previewTemplateId ??
      selectedClinicalPlan?.protocolRef?.templateId ??
      publishedTemplates[0]?.template.id;
    setSelectedTemplateId(preferredId);
    setTemplatePickerOpen(true);
  };
  const activateSelectedTemplate = async () => {
    if (!selectedEncounter || !selectedPublishedTemplate) return;
    if (!selectedClinicalPlan) {
      setPreviewTemplateId(selectedPublishedTemplate.template.id);
      setPreviewTaskColumns({});
      setTemplatePickerOpen(false);
      message.success(`Đã hiển thị Kanban “${selectedPublishedTemplate.template.name}”.`);
      return;
    }
    setActivating(true);
    try {
      const freshEncounter = mapEncounter(
        await getEncounter(selectedEncounter.id),
        selectedEncounter.events,
      );
      encounterRepository.upsert(freshEncounter);
      await activateEncounterWorkflow(selectedEncounter.id, {
        templateId: selectedPublishedTemplate.template.id,
        encounterVersion: Math.max(1, freshEncounter.version ?? 1),
      });
      const [createdInstance, refreshedTasks] = await Promise.all([
        getWorkflowInstanceForEncounter(selectedEncounter.id),
        listWorkflowTasks(),
      ]);
      workflowRepository.instances().upsert(createdInstance);
      refreshedTasks.forEach((row) => workflowRepository.tasks().upsert(row));
      setPreviewTemplateId(undefined);
      setTemplatePickerOpen(false);
      message.success(`Đã kích hoạt “${selectedPublishedTemplate.template.name}”. Kanban đã sẵn sàng.`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể kích hoạt quy trình.');
    } finally {
      setActivating(false);
    }
  };
  const registerCardNode = (id: string, node: HTMLDivElement | null) => {
    if (node) cardNodes.current.set(id, node);
    else cardNodes.current.delete(id);
  };

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    // Ghost trong DragOverlay không nằm trong cột nên không tự co giãn theo
    // bề rộng cột — đo bề rộng thẻ gốc lúc bắt đầu kéo để ghost to đúng bằng
    // thẻ thật, tránh bị hẹp lại khiến mô tả bị cắt cụt sớm.
    setDragWidth(cardNodes.current.get(id)?.getBoundingClientRect().width ?? e.active.rect.current.initial?.width ?? null);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setDragWidth(null);
    const target = e.over?.id as string | undefined;
    const id = String(e.active.id);
    const task = tasks.find((t) => t.id === id);
    if (!target || !task || task.col === target) return;
    const col = COLS.find((c) => c.id === target)!;
    if (task.preview) {
      if (target === 'in_progress') {
        const incompleteDependencies = task.source.dependsOnStepCodes
          .map((code) => tasks.find((candidate) => candidate.source.stepCode === code))
          .filter((dependency) => !dependency || dependency.col !== 'done');
        if (incompleteDependencies.length) {
          message.warning(
            `Chưa thể bắt đầu “${task.title}”. Cần hoàn thành: ${incompleteDependencies.map((item) => item?.title ?? 'bước trước').join(', ')}.`,
          );
          return;
        }
      }
      if (target === 'done' && task.col !== 'in_progress') {
        message.warning('Cần chuyển bước sang “Đang thực hiện” trước khi hoàn thành.');
        return;
      }
      setPreviewTaskColumns((current) => ({
        ...current,
        [task.source.stepCode]: target,
      }));
      return;
    }
    const action =
      target === 'in_progress' && task.source.status === 'ready'
        ? () => acceptWorkflowTask(task.id, task.source.version ?? 0)
        : target === 'in_progress' && ['accepted', 'assigned'].includes(task.source.status)
          ? () => startWorkflowTask(task.id, task.source.version ?? 0)
          : target === 'done' && task.source.status === 'in_progress'
            ? () => completeWorkflowTask(task.id, task.source.version ?? 0)
            : null;
    if (!action) {
      message.warning('Bước này chưa đủ điều kiện chuyển trạng thái. Hãy mở quy trình để xem bước phụ thuộc.');
      return;
    }
    setPendingDrop({
      title: 'Xác nhận chuyển bước điều trị',
      question: `Chuyển bước "${task.title}" sang "${col.label}"?`,
      confirmLabel: 'Xác nhận',
      run: async () => {
        setLoading(true);
        try {
          await action();
          await refresh();
          message.success('Đã cập nhật trạng thái trên quy trình BPM.');
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.');
        } finally {
          setLoading(false);
          setPendingDrop(null);
        }
      },
    });
  };
  const activeTask = tasks.find((t) => t.id === activeId);
  const completedCount = tasks.filter((task) => task.col === 'done').length;
  const selectedTemplateHasSteps = Boolean(selectedPublishedTemplate?.version.steps.length);
  const templatePicker = (
    <Modal
      title="Áp dụng quy trình cho lượt khám"
      open={templatePickerOpen}
      onCancel={() => setTemplatePickerOpen(false)}
      onOk={() => void activateSelectedTemplate()}
      confirmLoading={activating}
      okText={selectedClinicalPlan ? 'Kích hoạt Kanban' : 'Hiển thị Kanban'}
      cancelText="Hủy"
      okButtonProps={{ disabled: !selectedPublishedTemplate || !selectedTemplateHasSteps }}
      width={720}
      destroyOnHidden
    >
      <div className="records-template-picker">
        <div className="records-template-picker__encounter">
          <Text strong>{selectedEncounter ? encounterDisplayName(selectedEncounter) : 'Lượt khám'}</Text>
          <Tag color={selectedClinicalPlan ? 'green' : 'gold'} bordered={false}>
            {selectedClinicalPlan ? 'Đã có kế hoạch lâm sàng' : 'Chưa có kế hoạch lâm sàng'}
          </Tag>
        </div>

        {!selectedClinicalPlan && (
          <Alert
            type="warning"
            showIcon
            message="Kanban sẽ hiển thị ở chế độ dự kiến"
            description="Có thể xem toàn bộ bước ngay. Chuyển trạng thái chỉ được mở sau khi lượt khám có kế hoạch lâm sàng được duyệt."
          />
        )}

        {selectedClinicalPlan?.protocolRef && (
          <Alert
            type="info"
            showIcon
            message="Quy trình phải khớp kế hoạch đã duyệt"
            description="Để bảo đảm truy vết lâm sàng, không thể đổi sang mẫu khác mà không sửa và duyệt lại kế hoạch."
          />
        )}

        <div>
          <Text strong className="records-template-picker__label">Quy trình đã xuất bản</Text>
          <Select
            showSearch
            optionFilterProp="label"
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            style={{ width: '100%' }}
            placeholder="Chọn quy trình chuyên môn"
            notFoundContent="Chưa có quy trình đã xuất bản"
            options={publishedTemplates.map((row) => ({
              value: row.template.id,
              label: `${row.template.name} · ${row.template.specialty} · ${row.version.steps.length} bước`,
              disabled: Boolean(
                selectedClinicalPlan?.protocolRef &&
                selectedClinicalPlan.protocolRef.templateId !== row.template.id,
              ),
            }))}
          />
        </div>

        {selectedPublishedTemplate && (
          <div className="records-template-preview">
            <div className="records-template-preview__header">
              <div>
                <Text strong>{selectedPublishedTemplate.template.name}</Text>
                <Text type="secondary">{selectedPublishedTemplate.template.description || selectedPublishedTemplate.template.specialty}</Text>
              </div>
              <Space size={5}>
                <Tag color="blue" bordered={false}>Phiên bản {selectedPublishedTemplate.version.version}</Tag>
                <Tag bordered={false}>{selectedPublishedTemplate.version.steps.length} bước</Tag>
              </Space>
            </div>
            {selectedPublishedTemplate.version.steps.length ? (
              <List
                size="small"
                dataSource={selectedPublishedTemplate.version.steps}
                className="records-template-preview__steps"
                renderItem={(step, index) => (
                  <List.Item>
                    <span className="records-template-step__number">{index + 1}</span>
                    <div>
                      <Text strong>{step.name}</Text>
                      <Text type="secondary">{step.department} · {ROLE_LABEL[step.responsibleRole]}</Text>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Alert type="error" showIcon message="Quy trình chưa có bước thực hiện nên không thể tạo Kanban." />
            )}
          </div>
        )}

        {!publishedTemplates.length && (
          <Alert
            type="error"
            showIcon
            message="Chưa có quy trình sẵn sàng áp dụng"
            description="Quản trị viên cần hoàn thiện ít nhất một quy trình có bước và xuất bản trước khi bác sĩ có thể chọn."
            action={role === 'medical_administrator' ? (
              <Button size="small" onClick={() => navigate('/app/workflows/templates')}>Quản lý mẫu</Button>
            ) : undefined}
          />
        )}
      </div>
    </Modal>
  );
  const encounterSelector = (
    <section className="records-context-selector">
      <div className="records-context-selector__label">
        <Layers3 size={16} />
        <div>
          <Text strong>Hồ sơ điều trị đang theo dõi</Text>
          <Text type="secondary">Chọn đúng lượt khám để xem lộ trình</Text>
        </div>
      </div>
      <Select
        value={selectedEncounter?.id}
        onChange={(value) => {
          const next = new URLSearchParams(searchParams);
          next.set('tab', 'plan');
          next.set('encounterId', value);
          setSearchParams(next, { replace: true });
          setPreviewTemplateId(undefined);
          setPreviewTaskColumns({});
          setSelectedEncounterId(value as EncounterId);
        }}
        options={patientEncounters.map((row) => ({
          value: row.id,
          label: encounterDisplayName(row),
        }))}
        optionRender={(option) => {
          const row = patientEncounters.find((item) => item.id === option.value);
          const hasWorkflow = instances.some((workflow) => workflow.encounterId === option.value);
          return row ? (
            <div className="records-encounter-option">
              <span>{ENCOUNTER_TYPE_LABEL[row.type]} · {row.department}</span>
              <small>{formatEncounterDate(row.createdAt)} · {hasWorkflow ? 'Có lộ trình điều trị' : 'Chưa khởi tạo lộ trình'}</small>
            </div>
          ) : option.label;
        }}
        placeholder="Chọn lượt khám"
      />
      {instance ? (
        <Tag color="blue" bordered={false}>{WORKFLOW_STATUS_LABEL[instance.status]}</Tag>
      ) : previewTemplate ? (
        <Tag color="gold" bordered={false}>Kanban dự kiến</Tag>
      ) : (
        <Tag bordered={false}>Chưa có lộ trình</Tag>
      )}
    </section>
  );

  if (loading && !selectedEncounterId) {
    return <Card loading className="records-loading-card" />;
  }

  if (!loading && !instance && !previewTemplate) {
    return (
      <div className="records-treatment">
        {encounterSelector}
        <Card
          title={<span className="records-card-title"><Layers3 size={16} /> Chưa có quy trình điều trị</span>}
          extra={canManage && (
            <Button type="primary" onClick={openTemplatePicker}>Chọn và áp dụng quy trình</Button>
          )}
        >
          <Alert
            type="warning"
            showIcon
            message={selectedClinicalPlan ? 'Đã có kế hoạch, chưa kích hoạt quy trình' : 'Chưa đủ điều kiện kích hoạt'}
            description={selectedClinicalPlan
              ? 'Chọn một quy trình đã xuất bản để tạo các bước Kanban cho đúng lượt khám này.'
              : 'Lượt khám cần chẩn đoán xác định và kế hoạch lâm sàng được bác sĩ duyệt.'}
            style={{ marginBottom: 16 }}
          />
          <div className="records-activation-checklist">
            <div className={selectedClinicalPlan ? 'is-complete' : 'is-current'}>
              {selectedClinicalPlan ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
              <div><strong>1. Kế hoạch lâm sàng</strong><small>{selectedClinicalPlan ? selectedClinicalPlan.summary : 'Bác sĩ chưa duyệt kế hoạch cho lượt khám này'}</small></div>
            </div>
            <div>
              <CircleAlert size={17} />
              <div><strong>2. Chọn quy trình đã xuất bản</strong><small>Kiểm tra phiên bản và các bước trước khi áp dụng</small></div>
            </div>
            <div>
              <Layers3 size={17} />
              <div><strong>3. Kích hoạt Kanban</strong><small>Các bước được sao chép riêng cho lượt khám, không sửa mẫu gốc</small></div>
            </div>
          </div>
        </Card>
        {templatePicker}
      </div>
    );
  }

  return (
    <div className="records-treatment">
      {encounterSelector}

      <section className="records-kanban-toolbar">
        <div className="records-kanban-toolbar__title">
          <Layers3 size={17} />
          <div>
            <Text strong>{template?.name || previewTemplate?.template.name || 'Quy trình điều trị'}</Text>
            <Text type="secondary">
              {tasks.length} bước · {completedCount} hoàn thành
              {!instance ? ' · Chế độ dự kiến' : ''}
            </Text>
          </div>
        </div>
        <div className="records-kanban-toolbar__actions">
          {!instance && selectedClinicalPlan && (
            <Button type="primary" size="small" loading={activating} onClick={() => void activateSelectedTemplate()}>
              Kích hoạt quy trình
            </Button>
          )}
          {!instance && previewTemplate && <Button size="small" onClick={openTemplatePicker}>Đổi quy trình</Button>}
          {instance && (
            <Button size="small" icon={<ExternalLink size={13} />} onClick={() => navigate(`/app/workflows/instances/${instance.id}`)}>
              Xem quy trình
            </Button>
          )}
          {canManage && instance?.status === 'active' && (
            <Button size="small" icon={<Plus size={14} />} onClick={() => setModal(true)}>
              Thêm bước
            </Button>
          )}
        </div>
      </section>
      
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="records-kanban-board">
          {COLS.map((col) => (
            <PlanColumn key={col.id} colId={col.id} label={col.label} tasks={tasks.filter((t) => t.col === col.id)} onDelete={del} canManage={canManage} registerCardNode={registerCardNode} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <div style={{ width: dragWidth ?? 260, boxSizing: 'border-box' }}><PlanCard task={activeTask} onDelete={() => {}} canDelete={false} ghost /></div> : null}</DragOverlay>
      </DndContext>

      <Modal title="Thêm bước riêng cho bệnh nhân" open={modal} confirmLoading={loading} onCancel={() => setModal(false)} onOk={add} okText="Thêm vào quy trình" cancelText="Hủy">
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên bước *</Text>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Uống thuốc kháng viêm..." />
        </div>
        <Row gutter={12}>
          <Col span={12}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Người thực hiện</Text>
            <Select style={{ width: '100%' }} value={responsibleRole} onChange={setResponsibleRole} options={(['doctor', 'nurse', 'lab_technician', 'imaging_technician', 'pharmacist', 'care_coordinator'] as UserRole[]).map((value) => ({ value, label: ROLE_LABEL[value] }))} />
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>SLA (phút)</Text>
            <Input type="number" min={1} value={slaMinutes} onChange={(e) => setSlaMinutes(Math.max(1, Number(e.target.value) || 1))} />
          </Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Bộ phận phụ trách *</Text>
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="VD: Khám bệnh" />
        </div>
      </Modal>

      {templatePicker}
      {pendingDrop && <DragConfirmDialog pending={pendingDrop} onCancel={() => setPendingDrop(null)} />}
    </div>
  );
}

export default function Records() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentPatient } = useAppState();
  const requestedTab = searchParams.get('tab');
  const activeTab = ['lifetime', 'plan', 'emr'].includes(requestedTab ?? '')
    ? requestedTab!
    : 'lifetime';
  const changeTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    if (key === 'lifetime') next.delete('encounterId');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="records-page">
      <div className="records-page-header">
        <div>
          <Title level={3}>Hồ sơ bệnh án</Title>
          <Text type="secondary">
            Bệnh nhân {currentPatient.name} · {currentPatient.code}
          </Text>
        </div>
        <Button type="primary" ghost icon={<FileHeart size={15} />} onClick={() => navigate(`/app/patients/${currentPatient.id}/clinical-workspace`)}>
          Mở hồ sơ lâm sàng 360°
        </Button>
      </div>
      <TabPanel
        activeKey={activeTab}
        onChange={changeTab}
        items={[
          { key: 'lifetime', label: 'Bệnh án trọn đời', children: <LifetimeMedicalRecord /> },
          { key: 'plan', label: 'Kế hoạch điều trị', children: <TreatmentPlanKanban /> },
          { key: 'emr', label: 'Chi tiết lượt khám', children: <EMRWorkspace /> },
        ]}
      />
    </div>
  );
}
