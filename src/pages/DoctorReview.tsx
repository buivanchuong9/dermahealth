import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Card, Select, Alert, Tag, Button, Input, Checkbox, Typography, Space, Skeleton, List, Collapse } from 'antd';
import { Brain, CheckCircle, ClipboardList, FlaskConical, FileCheck2, GitBranch, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, aiAssessmentRepository, clinicalOrderRepository, diagnosisRepository, workflowRepository } from '../domain/repositories';
import { encounterService } from '../domain/services/encounterService';
import {
  submitAssessmentReview,
  createEncounterDiagnosis,
  createEncounterClinicalPlan,
  getEncounterClinicalPlan,
  getEncounterDiagnoses,
  getEncounterReviews,
} from '../api/doctorDecision';
import {
  acknowledgeCriticalClinicalResult,
  createClinicalOrder,
  getClinicalOrderResult,
  getEncounterClinicalOrders,
} from '../api/clinicalOrder';
import { activateEncounterWorkflow, getEncounter, mapEncounter } from '../api/encounters';
import { getEncounterAIAssessments } from '../api/aiAssessment';
import { listWorkflowInstances } from '../api/workflowInstance';
import { listWorkflowTemplates, listWorkflowTemplateVersions } from '../api/workflowTemplate';
import { ENCOUNTER_STATUS_LABEL } from '../domain/core/enums';
import { hasRoleAccess } from '../domain/core/role';
import type { EncounterId } from '../domain/core/ids';
import type { ClinicalOrder, ConfidenceBand } from '../domain/core/entities';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { AccessDenied } from '../components/feedback/AccessDenied';
import { SYMPTOM_OPTIONS } from '../domain/services/aiAssessmentService';

const { Title, Text, Paragraph } = Typography;

const BAND_COLOR: Record<ConfidenceBand, string> = { high: 'red', moderate: 'gold', low: 'default' };
const BAND_LABEL: Record<ConfidenceBand, string> = { high: 'Phù hợp cao', moderate: 'Phù hợp vừa', low: 'Phù hợp thấp' };
const SYMPTOM_LABEL = Object.fromEntries(SYMPTOM_OPTIONS.map((item) => [item.key, item.label]));
const humanizeEvidence = (items: string[]) =>
  items.map((item) => SYMPTOM_LABEL[item] ?? item.replaceAll('_', ' ')).join(', ');

function formatEncounterLabel(createdAt: string, status: keyof typeof ENCOUNTER_STATUS_LABEL) {
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt));
  return `Ca da liễu · ${date} · ${ENCOUNTER_STATUS_LABEL[status]}`;
}

export default function DoctorReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository).filter((e) => e.patientId === currentPatient.id && e.status !== 'closed');
  const assessments = useStore(aiAssessmentRepository);
  const orders = useStore(clinicalOrderRepository.orders());
  const clinicalResults = useStore(clinicalOrderRepository.results());
  const allReviews = useStore(diagnosisRepository.reviews());
  const allDiagnoses = useStore(diagnosisRepository.diagnoses());
  const allPlans = useStore(diagnosisRepository.plans());
  const workflowTemplates = useStore(workflowRepository.templates());
  const workflowVersions = useStore(workflowRepository.versions());
  const workflowInstances = useStore(workflowRepository.instances());

  const requestedEncounterId = searchParams.get('encounterId') as EncounterId | null;
  const requestedTemplateId = searchParams.get('templateId') ?? undefined;
  const returnTo = searchParams.get('returnTo');
  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(
    encounters.some((row) => row.id === requestedEncounterId)
      ? requestedEncounterId ?? undefined
      : encounters[0]?.id,
  );
  const [rationale, setRationale] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [isAdditional, setIsAdditional] = useState(false);
  const [selectedCandidateCode, setSelectedCandidateCode] = useState<string>();
  const [planSummary, setPlanSummary] = useState('');
  const [orderType, setOrderType] = useState<ClinicalOrder['type']>('laboratory');
  const [orderJustification, setOrderJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    requestedTemplateId,
  );
  const [criticalAcknowledgementNotes, setCriticalAcknowledgementNotes] = useState<Record<string, string>>({});

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];

  useEffect(() => {
    if (!encounter) return;
    let active = true;
    Promise.allSettled([
      getEncounterAIAssessments(encounter.id),
      getEncounterReviews(encounter.id),
      getEncounterDiagnoses(encounter.id),
      getEncounterClinicalPlan(encounter.id),
      getEncounterClinicalOrders(encounter.id),
      listWorkflowInstances(encounter.patientId),
      listWorkflowTemplates(),
    ])
      .then(async ([assessmentRows, reviewRows, diagnosisRows, planRow, orderRows, instanceRows, templateRows]) => {
        if (!active) return;
        if (assessmentRows.status === 'fulfilled') {
          assessmentRows.value.forEach((item) => aiAssessmentRepository.upsert(item));
        }
        if (reviewRows.status === 'fulfilled') {
          reviewRows.value.forEach((item) => diagnosisRepository.reviews().upsert(item));
        }
        if (diagnosisRows.status === 'fulfilled') {
          diagnosisRows.value.forEach((item) => diagnosisRepository.diagnoses().upsert(item));
        }
        if (planRow.status === 'fulfilled') {
          diagnosisRepository.plans().upsert(planRow.value);
        }
        if (orderRows.status === 'fulfilled') {
          orderRows.value.forEach((item) => clinicalOrderRepository.orders().upsert(item));
          const resultRows = await Promise.allSettled(
            orderRows.value
              .filter((item) => item.status === 'result_ready' || item.status === 'completed')
              .map((item) => getClinicalOrderResult(item.id)),
          );
          if (!active) return;
          resultRows.forEach((result) => {
            if (result.status === 'fulfilled') {
              clinicalOrderRepository.results().upsert(result.value);
            }
          });
        }
        if (instanceRows.status === 'fulfilled') {
          instanceRows.value.forEach((item) => workflowRepository.instances().upsert(item));
        }
        if (templateRows.status === 'fulfilled') {
          templateRows.value.forEach((item) => workflowRepository.templates().upsert(item));
          const versionGroups = await Promise.allSettled(
            templateRows.value.map((template) => listWorkflowTemplateVersions(template.id)),
          );
          if (!active) return;
          versionGroups.forEach((result) => {
            if (result.status === 'fulfilled') {
              result.value.forEach((version) => workflowRepository.versions().upsert(version));
            }
          });
          const eligibleTemplates = templateRows.value.filter((template) => template.latestPublishedVersionId);
          const normalizedDepartment = encounter.department.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim();
          const recommended = eligibleTemplates.find((template) => {
            const specialty = template.specialty.toLocaleLowerCase('vi').replace(/^khoa\s+/, '').trim();
            return specialty === normalizedDepartment || specialty.includes(normalizedDepartment) || normalizedDepartment.includes(specialty);
          }) ?? eligibleTemplates[0];
          setSelectedTemplateId((current) => current ?? recommended?.id);
        }

        const requiredFailures = [assessmentRows, reviewRows, diagnosisRows, orderRows]
          .filter((result) => result.status === 'rejected').length;
        if (requiredFailures > 0) {
          setError('Một phần dữ liệu lâm sàng chưa đồng bộ. Hãy tải lại trước khi ra quyết định.');
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu lượt khám.');
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounter, reloadKey]);

  if (!hasRoleAccess(role, ['doctor'])) {
    return <AccessDenied featureName="Xem xét và chẩn đoán" allowedRoles={['doctor']} />;
  }

  if (!encounter) {
    return <Card><ProfessionalEmpty title="Không có lượt khám cần xem xét" description="Các lượt khám mới sẽ xuất hiện sau khi bệnh nhân check-in và hoàn thành đánh giá sơ bộ." primaryLabel="Mở hàng đợi" primaryHref="/app/work-queue" /></Card>;
  }

  const assessment = assessments
    .filter((item) => item.encounterId === encounter.id)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0];
  const reviews = allReviews.filter((r) => r.encounterId === encounter.id);
  const diagnoses = allDiagnoses.filter((d) => d.encounterId === encounter.id);
  const plan = allPlans.find((p) => p.encounterId === encounter.id);
  const confirmedDiagnosis = diagnoses.find((d) => ['confirmed', 'revised', 'signed'].includes(d.status));
  const encounterOrders = orders.filter((o) => o.encounterId === encounter.id);
  const activeWorkflowInstance = workflowInstances
    .filter((item) => item.encounterId === encounter.id)
    .sort((left, right) => right.activatedAt.localeCompare(left.activatedAt))[0];
  const publishedTemplates = workflowTemplates.filter((template) =>
    workflowVersions.some(
      (version) =>
        version.templateId === template.id &&
        version.status === 'published' &&
        version.id === template.latestPublishedVersionId,
    ),
  );
  const selectedTemplate = publishedTemplates.find((template) => template.id === selectedTemplateId);
  const selectedVersion = workflowVersions.find(
    (version) =>
      version.templateId === selectedTemplate?.id &&
      version.id === selectedTemplate?.latestPublishedVersionId &&
      version.status === 'published',
  );

  const protocolOptions = publishedTemplates.map((template) => ({
    value: template.id,
    label: `${template.name} · ${template.specialty}`,
  }));

  const runGuarded = (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    fn()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false));
  };

  const handleRecordDiagnosis = (status: 'provisional' | 'confirmed') => runGuarded(async () => {
    if (!diagnosisName.trim()) throw new Error('Vui lòng nhập tên chẩn đoán.');
    if (isAdditional && !rationale.trim()) {
      throw new Error('Cần ghi nhận định lâm sàng khi chẩn đoán nằm ngoài gợi ý của AI.');
    }
    if (
      selectedCandidateCode &&
      selectedCandidateCode !== assessment?.candidateConditions[0]?.code &&
      !rationale.trim()
    ) {
      throw new Error('Cần ghi nhận định lâm sàng khi chọn gợi ý không xếp hạng đầu tiên.');
    }
    if (assessment && !reviews.some((review) => review.aiAssessmentId === assessment.id)) {
      const review = await submitAssessmentReview(encounter.id, assessment.id, {
        action: selectedCandidateCode && !isAdditional ? 'accepted' : 'rejected',
        acceptedConditionCode: selectedCandidateCode && !isAdditional
          ? selectedCandidateCode
          : undefined,
        rationale: rationale || undefined,
      });
      diagnosisRepository.reviews().upsert(review);
    }
    const diagnosis = await createEncounterDiagnosis(encounter.id, {
      conditionName: diagnosisName, conditionCode: diagnosisCode || undefined, aiAssessmentId: assessment?.id,
      isAdditionalToAI: isAdditional, rationale: rationale || undefined, status,
    });
    diagnosisRepository.diagnoses().upsert(diagnosis);
    if (status === 'confirmed') {
      const freshEncounter = mapEncounter(await getEncounter(encounter.id), encounter.events);
      encounterRepository.upsert(freshEncounter);
    }
    setDiagnosisName(''); setDiagnosisCode(''); setIsAdditional(false); setSelectedCandidateCode(undefined); setRationale('');
  });

  const handleApprovePlan = () => runGuarded(async () => {
    if (!confirmedDiagnosis) throw new Error('Cần xác nhận chẩn đoán trước khi duyệt phác đồ.');
    if (!planSummary.trim()) throw new Error('Vui lòng nhập nội dung phác đồ.');
    if (!selectedTemplate || !selectedVersion) throw new Error('Vui lòng chọn một quy trình đã xuất bản để áp dụng.');
    const approvedPlan = await createEncounterClinicalPlan(encounter.id, {
      diagnosisId: confirmedDiagnosis.id,
      summary: planSummary,
      measurableGoals: [planSummary],
      protocolRef: {
        templateId: selectedTemplate.id,
        templateVersionId: selectedVersion.id,
      },
    });
    diagnosisRepository.plans().upsert(approvedPlan);
    const freshEncounter = mapEncounter(await getEncounter(encounter.id), encounter.events);
    encounterRepository.upsert(freshEncounter);
    const instances = await listWorkflowInstances(encounter.patientId);
    instances.forEach((item) => workflowRepository.instances().upsert(item));
    const existing = instances.find((item) => item.encounterId === encounter.id);
    if (existing && existing.templateId !== selectedTemplate.id) {
      throw new Error(
        'Backend đã tự kích hoạt một quy trình khác với lựa chọn của bác sĩ. Kế hoạch đã được lưu nhưng cần quản trị viên kiểm tra cấu hình tự động trước khi tiếp tục.',
      );
    }
    if (!existing) {
      await activateEncounterWorkflow(encounter.id, {
        templateId: selectedTemplate.id,
        encounterVersion: Math.max(1, freshEncounter.version ?? 1),
      });
      const refreshedInstances = await listWorkflowInstances(encounter.patientId);
      refreshedInstances.forEach((item) => workflowRepository.instances().upsert(item));
    }
    setPlanSummary('');
    if (returnTo?.startsWith('/app/')) navigate(returnTo);
  });

  const handleActivateExistingPlan = () => runGuarded(async () => {
    if (!plan) throw new Error('Chưa có kế hoạch đã duyệt.');
    if (!selectedTemplate) throw new Error('Vui lòng chọn một quy trình đã xuất bản.');
    if (activeWorkflowInstance) throw new Error('Lượt khám đã có quy trình đang áp dụng.');
    const freshEncounter = mapEncounter(await getEncounter(encounter.id), encounter.events);
    encounterRepository.upsert(freshEncounter);
    await activateEncounterWorkflow(encounter.id, {
      templateId: selectedTemplate.id,
      encounterVersion: Math.max(1, freshEncounter.version ?? 1),
    });
    const refreshedInstances = await listWorkflowInstances(encounter.patientId);
    refreshedInstances.forEach((item) => workflowRepository.instances().upsert(item));
    if (returnTo?.startsWith('/app/')) navigate(returnTo);
  });

  const handleCreateOrder = () => runGuarded(async () => {
    if (!orderJustification.trim()) throw new Error('Vui lòng nhập lý do chỉ định.');
    const order = await createClinicalOrder(encounter.id, {
      type: orderType,
      justification: orderJustification,
      assignedRole: orderType === 'laboratory' ? 'lab_technician' : orderType === 'imaging' ? 'imaging_technician' : 'doctor',
    });
    clinicalOrderRepository.orders().upsert(order);
    if (encounterService.canTransition(encounter.status, 'awaiting_results')) {
      encounterService.transitionStatus(encounter.id, 'awaiting_results', currentUser.id, { reason: `Chờ kết quả: ${orderType}` });
    }
    setOrderJustification('');
  });

  const handleAcknowledgeCriticalResult = (orderId: string) => runGuarded(async () => {
    const result = clinicalResults.find((item) => item.orderId === orderId);
    const note = criticalAcknowledgementNotes[orderId]?.trim();
    if (!result?.critical) throw new Error('Không tìm thấy kết quả nguy cấp cần xác nhận.');
    if (!note) throw new Error('Cần ghi rõ bác sĩ đã tiếp nhận và xử trí như thế nào.');
    const updated = await acknowledgeCriticalClinicalResult(orderId, {
      note,
      version: Math.max(1, result.version ?? 1),
    });
    clinicalOrderRepository.results().upsert(updated);
    setCriticalAcknowledgementNotes((current) => ({ ...current, [orderId]: '' }));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Xem xét AI và ra quyết định lâm sàng</Title>
          <Text type="secondary">
            Đối chiếu dữ liệu đầu vào, bằng chứng hình ảnh và nhận định AI trước khi xác nhận chẩn đoán.
          </Text>
        </div>
        <Space wrap>
          <Select
            style={{ minWidth: 260 }}
            value={encounter.id}
            onChange={(value) => {
              setDataLoading(true);
              setError(null);
              setSelectedTemplateId(undefined);
              setSelectedCandidateCode(undefined);
              setDiagnosisName('');
              setDiagnosisCode('');
              setIsAdditional(false);
              setRationale('');
              setSelectedId(value as EncounterId);
            }}
            aria-label="Chọn ca khám"
            options={encounters.map((item) => ({
              value: item.id,
              label: formatEncounterLabel(item.createdAt, item.status),
            }))}
          />
          <Button
            icon={<RefreshCw size={14} />}
            loading={dataLoading}
            onClick={() => {
              setDataLoading(true);
              setError(null);
              setReloadKey((value) => value + 1);
            }}
          >
            Tải lại
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message="Chưa thể hoàn tất"
          description={error}
          onClose={() => setError(null)}
        />
      )}

      <Skeleton active loading={dataLoading}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card
            title={<span><Brain size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Gợi ý từ AI</span>}
            extra={assessment && <Tag color="warning">{assessment.status === 'completed' ? '3 khả năng tham khảo' : 'Không đủ dữ liệu'}</Tag>}
            size="small"
          >
            {!assessment && <Text type="secondary">Chưa có đánh giá AI cho lượt khám này.</Text>}

            {assessment?.redFlag.triggered && (
              <Alert type="error" showIcon style={{ marginBottom: 12 }} message={`Cờ đỏ (${assessment.redFlag.urgency}): ${assessment.redFlag.reasons.join('; ')}`} />
            )}

            {assessment?.status === 'completed' && assessment.candidateConditions.map((c) => (
              <div
                key={c.code}
                style={{
                  padding: 12,
                  background: selectedCandidateCode === c.code ? 'var(--surface-selected)' : 'var(--surface-subtle)',
                  borderRadius: 8,
                  border: `1px solid ${selectedCandidateCode === c.code ? 'var(--medical-blue-500)' : 'var(--border-default)'}`,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text strong>{c.name}</Text>
                  <Tag color={BAND_COLOR[c.confidenceBand]}>{BAND_LABEL[c.confidenceBand]}</Tag>
                </div>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 6 }}>{c.rationale}</Paragraph>
                <Text type="success" style={{ fontSize: 12 }}>Dấu hiệu phù hợp: {humanizeEvidence(c.supportingEvidence)}</Text>
                {c.conflictingEvidence.length > 0 && <Text type="danger" style={{ fontSize: 12, display: 'block' }}>Dấu hiệu chưa phù hợp: {humanizeEvidence(c.conflictingEvidence)}</Text>}
                <Button
                  size="small"
                  type={selectedCandidateCode === c.code ? 'primary' : 'default'}
                  icon={<CheckCircle size={13} />}
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setSelectedCandidateCode(c.code);
                    setDiagnosisName(c.name);
                    setDiagnosisCode(c.code);
                    setIsAdditional(false);
                  }}
                >
                  {selectedCandidateCode === c.code ? 'Đã chọn làm chẩn đoán' : 'Chọn gợi ý này'}
                </Button>
              </div>
            ))}

            {assessment?.status === 'completed' && (
              <Collapse
                ghost
                size="small"
                items={[{
                  key: 'technical',
                  label: 'Thông tin kỹ thuật và lịch sử',
                  children: (
                    <>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        Model {assessment.modelVersion} · Tạo lúc {new Date(assessment.generatedAt).toLocaleString('vi-VN')}
                      </Text>
                      {reviews.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                          Đã ghi nhận {reviews.length} lần xem xét trước.
                        </Text>
                      )}
                    </>
                  ),
                }]}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={<span><ClipboardList size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Kết luận của bác sĩ</span>} size="small">
              {confirmedDiagnosis ? (
                <Alert
                  type="success"
                  showIcon
                  message="Chẩn đoán đã được xác nhận"
                  description={confirmedDiagnosis.conditionName}
                />
              ) : (
                <>
              <Alert
                type="info"
                showIcon
                message={selectedCandidateCode
                  ? 'Đã điền từ gợi ý AI. Bác sĩ có thể chỉnh sửa trước khi xác nhận.'
                  : 'Chọn một gợi ý bên trái hoặc tự nhập chẩn đoán bên dưới.'}
                style={{ marginBottom: 12 }}
              />
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên chẩn đoán *</Text>
              <Input
                value={diagnosisName}
                onChange={(e) => {
                  setDiagnosisName(e.target.value);
                  if (selectedCandidateCode) setIsAdditional(false);
                }}
                placeholder="Nhập chẩn đoán cuối cùng của bác sĩ"
                style={{ marginBottom: 10 }}
              />
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mã (tuỳ chọn)</Text>
              <Input value={diagnosisCode} onChange={(e) => setDiagnosisCode(e.target.value)} style={{ marginBottom: 10 }} />
              <Checkbox
                checked={isAdditional}
                onChange={(e) => {
                  setIsAdditional(e.target.checked);
                  if (e.target.checked) setSelectedCandidateCode(undefined);
                }}
                style={{ marginBottom: 12, fontSize: 13 }}
              >
                Đây là chẩn đoán khác với các gợi ý của AI
              </Checkbox>
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Nhận định lâm sàng {isAdditional ? '*' : '(tuỳ chọn)'}
              </Text>
              <Input.TextArea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Dấu hiệu và căn cứ dẫn đến kết luận của bác sĩ"
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginBottom: 12 }}
              />
              <Space>
                <Button loading={busy} onClick={() => handleRecordDiagnosis('provisional')}>Lưu nháp</Button>
                <Button type="primary" loading={busy} icon={<FileCheck2 size={14} />} onClick={() => handleRecordDiagnosis('confirmed')}>Xác nhận chẩn đoán</Button>
              </Space>
                </>
              )}
            </Card>

            {confirmedDiagnosis && <Card
              title={<span><GitBranch size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Kế hoạch điều trị</span>}
              size="small"
              extra={activeWorkflowInstance && <Tag color="success" icon={<ShieldCheck size={12} />}>Đã kích hoạt</Tag>}
            >
              {plan ? (
                <Alert
                  type="success"
                  showIcon
                  message="Kế hoạch đã được bác sĩ duyệt"
                  description={plan.summary}
                  style={{ marginBottom: 12 }}
                />
              ) : (
                <>
                  <Input.TextArea rows={3} value={planSummary} onChange={(e) => setPlanSummary(e.target.value)} placeholder="Nội dung phác đồ điều trị..." style={{ marginBottom: 10 }} />
                </>
              )}

              {!activeWorkflowInstance && (
                <>
                  <Text strong style={{ display: 'block', fontSize: 12, margin: '12px 0 6px' }}>
                    Quy trình chuyên môn sẽ áp dụng *
                  </Text>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                    options={protocolOptions}
                    placeholder="Chọn quy trình đã xuất bản"
                    style={{ width: '100%', marginBottom: 10 }}
                    notFoundContent="Chưa có quy trình đã xuất bản"
                  />
                </>
              )}

              {selectedTemplate && selectedVersion && !activeWorkflowInstance && (
                <div style={{ border: '1px solid var(--border-default)', borderRadius: 9, padding: 10, marginBottom: 10 }}>
                  <Space size={6} wrap>
                    <Text strong>{selectedTemplate.name}</Text>
                    <Tag color="blue">v{selectedVersion.version}</Tag>
                    <Tag>{selectedVersion.steps.length} bước</Tag>
                  </Space>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, margin: '4px 0 8px' }}>
                    {selectedTemplate.description || 'Quy trình chuyên môn đã được xuất bản.'}
                  </Text>
                  <List
                    size="small"
                    dataSource={selectedVersion.steps.slice(0, 6)}
                    renderItem={(step, index) => (
                      <List.Item style={{ paddingInline: 0 }}>
                        <Text style={{ fontSize: 12 }}>
                          {index + 1}. {step.name} · {step.department}
                        </Text>
                      </List.Item>
                    )}
                  />
                  {selectedVersion.steps.length > 6 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Và {selectedVersion.steps.length - 6} bước khác
                    </Text>
                  )}
                  <Alert
                    type="info"
                    showIcon
                    message="Quy trình mẫu không bị sửa"
                    description="Sau khi kích hoạt, bác sĩ có thể thêm bước riêng cho bệnh nhân trên trang điều hành mà không ảnh hưởng ca khác."
                    style={{ marginTop: 8 }}
                  />
                </div>
              )}

              {activeWorkflowInstance ? (
                <Button block href={`/app/workflows/instances/${activeWorkflowInstance.id}`}>
                  Mở và điều chỉnh quy trình của bệnh nhân
                </Button>
              ) : plan ? (
                <Button
                  type="primary"
                  block
                  loading={busy}
                  disabled={!selectedTemplate}
                  onClick={handleActivateExistingPlan}
                >
                  Áp dụng quy trình cho bệnh nhân
                </Button>
              ) : (
                <>
                  <Button
                    type="primary"
                    block
                    loading={busy}
                    disabled={!confirmedDiagnosis || !selectedTemplate}
                    onClick={handleApprovePlan}
                  >
                    Duyệt kế hoạch và kích hoạt quy trình
                  </Button>
                  {!confirmedDiagnosis && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>Cần xác nhận chẩn đoán trước.</Text>}
                </>
              )}
            </Card>}

            <Card title={<span><FlaskConical size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Chỉ định cận lâm sàng</span>} size="small">
              {encounterOrders.map((o) => (
                <div key={o.id} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{o.type} — {o.justification}</span>
                    <Tag>{o.status}</Tag>
                  </div>
                  {(() => {
                    const result = clinicalResults.find((item) => item.orderId === o.id);
                    if (!result) return null;
                    if (result.critical && !result.acknowledgedAt) {
                      return (
                        <Alert
                          type="error"
                          showIcon
                          style={{ marginTop: 8 }}
                          message="Kết quả nguy cấp chưa được bác sĩ xác nhận"
                          description={(
                            <div>
                              <div>{result.summary}</div>
                              {result.criticalReason && <div style={{ marginTop: 4 }}>Lý do: {result.criticalReason}</div>}
                              <Input.TextArea
                                rows={2}
                                value={criticalAcknowledgementNotes[o.id] ?? ''}
                                onChange={(event) => setCriticalAcknowledgementNotes((current) => ({
                                  ...current,
                                  [o.id]: event.target.value,
                                }))}
                                placeholder="Ghi hành động xử trí, người đã được thông báo..."
                                style={{ marginTop: 8 }}
                              />
                              <Button
                                danger
                                type="primary"
                                loading={busy}
                                style={{ marginTop: 8 }}
                                onClick={() => handleAcknowledgeCriticalResult(o.id)}
                              >
                                Xác nhận đã tiếp nhận và xử trí
                              </Button>
                            </div>
                          )}
                        />
                      );
                    }
                    return (
                      <Alert
                        type={result.critical ? 'warning' : result.abnormal ? 'warning' : 'success'}
                        showIcon
                        style={{ marginTop: 8 }}
                        message={result.critical ? 'Kết quả nguy cấp đã được xác nhận' : result.abnormal ? 'Kết quả bất thường' : 'Kết quả trong giới hạn'}
                        description={`${result.summary}${result.acknowledgementNote ? ` · Xử trí: ${result.acknowledgementNote}` : ''}`}
                      />
                    );
                  })()}
                </div>
              ))}
              <Select style={{ width: '100%', marginTop: 10, marginBottom: 10 }} value={orderType} onChange={(v) => setOrderType(v)} options={[
                { value: 'laboratory', label: 'Xét nghiệm' },
                { value: 'imaging', label: 'Chẩn đoán hình ảnh' },
                { value: 'consultation', label: 'Hội chẩn chuyên khoa' },
              ]} />
              <Input value={orderJustification} onChange={(e) => setOrderJustification(e.target.value)} placeholder="Lý do chỉ định..." style={{ marginBottom: 10 }} />
              <Button loading={busy} onClick={handleCreateOrder}>Tạo chỉ định</Button>
            </Card>
          </div>
        </Col>
      </Row>
      </Skeleton>
    </div>
  );
}
