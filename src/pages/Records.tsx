import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Activity, FileText, Trash2, Upload, FileSignature, History, ShieldAlert, Lock, Home, ExternalLink, FileHeart,
} from 'lucide-react';
import { DragHandle } from '../components/common/DragHandle';
import { IconActionButton } from '../components/common/IconActionButton';
import { DragConfirmDialog, type PendingDrop } from '../components/common/DragConfirmDialog';
import {
  Card, Row, Col, Tag, Button, Modal, Input, Select, Alert, Typography, List, App as AntApp,
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
import { getEncounterAuditTrail } from '../api/audit';
import { auditService } from '../domain/services/auditService';
import { RECORD_STATUS_LABEL, ENCOUNTER_STATUS_LABEL } from '../domain/core/enums';
import { hasRoleAccess, type UserRole } from '../domain/core/role';
import type { EncounterId } from '../domain/core/ids';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { LifetimeMedicalRecord } from '../components/medical-record/LifetimeMedicalRecord';
import { getWorkflowInstanceForEncounter } from '../api/workflowInstance';
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
  WorkflowTask,
} from '../domain/core/entities';

const { Title, Text, Paragraph } = Typography;

interface PlanTask {
  id: string;
  col: string;
  title: string;
  type: string;
  date: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  source: WorkflowTask;
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: ghost });
  const Icon = TYPE_ICON[task.type] || FileText;
  return (
    <div
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
          {task.type}
        </Tag>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <DragHandle attributes={attributes} listeners={listeners} label={`Kéo để di chuyển bước "${task.title}" sang cột khác`} />
          {canDelete && <IconActionButton icon={<Trash2 size={14} />} label="Xóa bước riêng" danger onClick={onDelete} />}
        </div>
      </div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{task.title}</Text>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }} ellipsis={{ rows: 2 }}>{task.desc}</Paragraph>
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
  const { currentPatient, role } = useAppState();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card size="small">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select style={{ minWidth: 260 }} value={encounter.id} onChange={(v) => setSelectedId(v as EncounterId)} options={encounters.map((e) => ({ value: e.id, label: `${e.id} — ${ENCOUNTER_STATUS_LABEL[e.status]}` }))} />
          <Tag color={record?.status === 'signed' ? 'success' : 'warning'}>{record ? RECORD_STATUS_LABEL[record.status] : 'Chưa tạo hồ sơ'}</Tag>
          {record?.status === 'signed' && (
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Lock size={12} />
              Hồ sơ đã ký — chỉ đọc
            </Text>
          )}
          {breakGlassGrant && (
            <Tag color="red" icon={<ShieldAlert size={12} />}>
              Break-glass — hết hạn {new Date(breakGlassGrant.expiresAt).toLocaleTimeString('vi-VN')}
            </Tag>
          )}
          {breakGlassGrant && (
            <Button size="small" onClick={endBreakGlass}>Kết thúc truy cập khẩn cấp</Button>
          )}
        </div>
      </Card>

      {error && <FriendlyErrorInline error={error} onClose={() => setError(null)} />}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Tóm tắt hồ sơ" size="small">
            <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>Bệnh nhân: <Text strong>{currentPatient.name}</Text> ({currentPatient.code})</div>
              <div>Chẩn đoán: <Text strong>{displayedDiagnosis?.conditionName ?? '— chưa có —'}</Text></div>
              <div>
                Đơn thuốc: {prescribedMedications.length > 0
                  ? prescribedMedications.map((medication) => `${medication.name} ${medication.dose}`).join('; ')
                  : '— chưa có —'}
              </div>
              <div>Hướng dẫn xuất viện: {record?.discharge?.instructions.join('; ') ?? '— chưa có —'}</div>
              <div>Kế hoạch theo dõi: {record?.followUp?.description ?? '— chưa có —'}</div>
            </div>

            {clinicalPlan && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Kế hoạch lâm sàng đã ký</Text>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <Tag color="blue">{clinicalPlan.currentStage}</Tag>
                  <Tag>v{clinicalPlan.version}</Tag>
                  <Tag>{planRevisions.length} phiên bản lưu vết</Tag>
                  {clinicalPlan.protocolRef && (
                    <Tag color="geekblue">
                      BPM {clinicalPlan.protocolRef.templateVersionId}
                    </Tag>
                  )}
                </div>
                <Paragraph style={{ marginBottom: 8 }}>{clinicalPlan.summary}</Paragraph>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  Mục tiêu: {clinicalPlan.measurableGoals.join('; ') || 'Chưa khai báo'}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  Chỉ số theo dõi: {clinicalPlan.monitoringMetrics.join('; ') || 'Chưa khai báo'}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  Tiêu chí dừng/đổi: {clinicalPlan.stopOrChangeCriteria || 'Chưa khai báo'}
                </Text>
              </div>
            )}

            {prescriptions.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Đơn thuốc và lịch sử thực hiện</Text>
                {prescriptions.flatMap((prescription) => prescription.medicationOrders).map((order) => (
                  <div key={order.id} style={{ marginBottom: 8 }}>
                    <Text>{order.medicationName} — {order.dose}</Text>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {order.events.map((event) => (
                        <Tag key={event.id}>{event.type} · {new Date(event.occurredAt).toLocaleString('vi-VN')}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!completion.ok && (
              <Alert type="warning" showIcon style={{ marginTop: 12 }} message={`Còn thiếu để hoàn tất: ${completion.missing.map((item) => item.message).join(', ')}`} />
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

            <Card title="Tài liệu lâm sàng" size="small" extra={<Button size="small" icon={<Upload size={13} />} onClick={uploadDocument}>Tải lên</Button>}>
              <List
                size="small"
                dataSource={encounterDocs}
                locale={{ emptyText: <ProfessionalEmpty compact title="Chưa có tài liệu" description="Tải tài liệu lâm sàng đầu tiên cho lượt khám này." showActions={false} /> }}
                renderItem={(d) => (
                  <List.Item extra={<Tag>{d.reviewStatus} · {d.signatureStatus}</Tag>}>{d.fileName} (v{d.version})</List.Item>
                )}
              />
            </Card>

            <Card
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <History size={14} />
                  Lịch sử thực hiện quy trình & kiểm toán
                </span>
              }
              size="small"
            >
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
  const navigate = useNavigate();
  const { currentPatient, role } = useAppState();
  const patientEncounters = useStore(encounterRepository)
    .filter((row) => row.patientId === currentPatient.id)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const instances = useStore(workflowRepository.instances());
  const workflowTasks = useStore(workflowRepository.tasks());
  const [selectedEncounterId, setSelectedEncounterId] = useState<EncounterId | undefined>(
    patientEncounters[0]?.id,
  );
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Khám bệnh');
  const [responsibleRole, setResponsibleRole] = useState<UserRole>('doctor');
  const [slaMinutes, setSlaMinutes] = useState(30);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [loading, setLoading] = useState(Boolean(patientEncounters[0]));
  const cardNodes = useRef(new Map<string, HTMLDivElement>());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canManage = hasRoleAccess(role, ['doctor', 'medical_administrator']);

  const selectedEncounter =
    patientEncounters.find((row) => row.id === selectedEncounterId) ?? patientEncounters[0];
  const instance = instances.find((row) => row.encounterId === selectedEncounter?.id);

  const toColumn = (status: WorkflowTask['status']) => {
    if (['completed', 'skipped', 'cancelled'].includes(status)) return 'done';
    if (['assigned', 'accepted', 'in_progress', 'waiting_for_patient', 'waiting_for_result', 'waiting_for_approval'].includes(status)) return 'in_progress';
    return 'todo';
  };
  const tasks: PlanTask[] = workflowTasks
    .filter((task) => task.instanceId === instance?.id)
    .map((task) => ({
      id: task.id,
      col: toColumn(task.status),
      title: task.name,
      type: task.origin === 'ad_hoc' ? 'Bước bổ sung' : 'Bước BPM',
      date: task.completedAt
        ? new Date(task.completedAt).toLocaleDateString('vi-VN')
        : `SLA ${task.slaMinutes} phút`,
      desc: `${ROLE_LABEL[task.responsibleRole]} · ${task.department}${task.blockedReason ? ` · ${task.blockedReason}` : ''}`,
      priority: task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
      source: task,
    }));

  const refresh = async () => {
    if (!selectedEncounter) return;
    const [instanceResult, taskResult] = await Promise.allSettled([
      getWorkflowInstanceForEncounter(selectedEncounter.id),
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
    if (!selectedEncounter) return;
    refresh()
      .catch((error: unknown) => message.error(error instanceof Error ? error.message : 'Không tải được kế hoạch điều trị.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient.id, selectedEncounter?.id]);

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
  const encounterSelector = (
    <Card size="small">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Text strong>Lượt khám áp dụng</Text>
        <Select
          style={{ minWidth: 320 }}
          value={selectedEncounter?.id}
          onChange={(value) => {
            setLoading(true);
            setSelectedEncounterId(value as EncounterId);
          }}
          options={patientEncounters.map((row) => ({
            value: row.id,
            label: `${row.id} — ${ENCOUNTER_STATUS_LABEL[row.status]}`,
          }))}
          placeholder="Chọn lượt khám"
        />
        {instance && <Tag color="blue">{instance.instanceCode}</Tag>}
      </div>
    </Card>
  );

  if (!loading && !instance) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {encounterSelector}
        <ProfessionalEmpty
          title="Lượt khám này chưa có quy trình điều trị"
          description="Kế hoạch điều trị chỉ lấy các bước BPM gắn chính xác với lượt khám đã chọn, không tự lấy quy trình mới nhất của bệnh nhân."
          primaryLabel={canManage ? 'Mở quy trình BPM' : undefined}
          primaryHref={canManage ? '/app/workflows/templates' : undefined}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {encounterSelector}
      <Alert
        type="info"
        showIcon
        message="Kế hoạch này đồng bộ trực tiếp với quy trình BPM của lượt khám"
        description="Bước bổ sung của bác sĩ chỉ áp dụng cho bệnh nhân này; mẫu BPM gốc và các bệnh nhân khác không bị thay đổi."
        action={instance && <Button size="small" icon={<ExternalLink size={13} />} onClick={() => navigate(`/app/workflows/instances/${instance.id}`)}>Mở toàn bộ quy trình</Button>}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {canManage && instance?.status === 'active' && <Button loading={loading} type="primary" icon={<Plus size={15} />} onClick={() => setModal(true)}>Thêm bước riêng</Button>}
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
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

      {pendingDrop && <DragConfirmDialog pending={pendingDrop} onCancel={() => setPendingDrop(null)} />}
    </div>
  );
}

export default function Records() {
  const [activeTab, setActiveTab] = useState('lifetime');
  const navigate = useNavigate();
  const { currentPatient } = useAppState();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Hồ sơ sức khỏe</Title>
          <Text type="secondary">
            Theo dõi lịch sử khám chữa bệnh xuyên suốt và kế hoạch điều trị hiện tại.
          </Text>
        </div>
        <Button icon={<FileHeart size={15} />} onClick={() => navigate(`/app/patients/${currentPatient.id}/clinical-workspace`)}>
          Mở hồ sơ lâm sàng 360°
        </Button>
      </div>
      <TabPanel
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'lifetime', label: 'Bệnh án trọn đời', children: <LifetimeMedicalRecord /> },
          { key: 'plan', label: 'Kế hoạch điều trị', children: <TreatmentPlanKanban /> },
          { key: 'emr', label: 'Chi tiết lượt khám', children: <EMRWorkspace /> },
        ]}
      />
    </div>
  );
}
