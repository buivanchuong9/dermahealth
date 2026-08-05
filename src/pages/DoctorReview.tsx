import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Card, Select, Alert, Tag, Button, Input, Checkbox, Typography, Space, Skeleton, List, Image, Progress } from 'antd';
import { Brain, CheckCircle, ClipboardList, FlaskConical, FileCheck2, GitBranch, RefreshCw, ShieldCheck, UserRound, Images } from 'lucide-react';
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
import { searchPatientDetails, type ApiPatient } from '../api/clinical';
import {
  getSkinAnalysisCase,
  listSkinAnalysisCases,
  reviewSkinCase,
  type SkinAnalysisCaseDetail,
  type SkinAnalysisCaseSummary,
  type SkinPrediction,
} from '../api/skinAnalysis';
import { formatSkinLabel } from '../domain/skinLabels';

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

function formatCaseLabel(item: SkinAnalysisCaseSummary) {
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(item.generatedAt));
  return `${item.bodyRegion} · ${date}${item.reviewedAt ? ' · Đã duyệt' : ' · Chờ duyệt'}`;
}

function predictionName(prediction: SkinPrediction) {
  const label = formatSkinLabel(prediction.label);
  return label === 'Chưa xác định' ? 'Chưa có tên bệnh trong bộ nhãn' : label;
}

export default function DoctorReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, currentPatient, role } = useAppState();
  const allEncounters = useStore(encounterRepository).filter((e) => e.status !== 'closed');
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
  const requestedEncounter = allEncounters.find((row) => row.id === requestedEncounterId);
  const requestedTemplateId = searchParams.get('templateId') ?? undefined;
  const returnTo = searchParams.get('returnTo');
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const patientSearchRequest = useRef(0);
  const patientSearchTimer = useRef<number | undefined>(undefined);
  const [patientLoading, setPatientLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    requestedEncounter?.patientId ?? currentPatient?.id ?? '',
  );
  const encounters = allEncounters.filter((e) => e.patientId === selectedPatientId);
  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(
    requestedEncounterId ?? encounters[0]?.id,
  );
  const [skinCases, setSkinCases] = useState<SkinAnalysisCaseSummary[]>([]);
  const [selectedSkinCaseId, setSelectedSkinCaseId] = useState<string>();
  const [skinCase, setSkinCase] = useState<SkinAnalysisCaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(true);
  const [rationale, setRationale] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [isAdditional, setIsAdditional] = useState(false);
  const [selectedCandidateCode, setSelectedCandidateCode] = useState<string>();
  const [selectedSkinLabel, setSelectedSkinLabel] = useState<string>();
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
    let active = true;
    const request = ++patientSearchRequest.current;
    searchPatientDetails()
      .then((rows) => {
        if (active && request === patientSearchRequest.current) setPatients(rows);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách bệnh nhân.');
      })
      .finally(() => {
        if (active) setPatientLoading(false);
      });
    return () => {
      active = false;
      if (patientSearchTimer.current) window.clearTimeout(patientSearchTimer.current);
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let active = true;
    listSkinAnalysisCases({ patientId: selectedPatientId })
      .then((rows) => {
        if (!active) return;
        setSkinCases(rows);
        const linked = rows.find((row) => row.encounterId === selectedId);
        setSelectedSkinCaseId(linked?.caseId ?? rows[0]?.caseId);
        if (!rows.length) setSkinCase(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được ca phân tích ảnh.');
      })
      .finally(() => {
        if (active) setCaseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPatientId, selectedId, reloadKey]);

  useEffect(() => {
    if (!selectedSkinCaseId) return;
    let active = true;
    getSkinAnalysisCase(selectedSkinCaseId)
      .then((row) => {
        if (active) setSkinCase(row);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được ảnh của ca.');
      })
      .finally(() => {
        if (active) setCaseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSkinCaseId, reloadKey]);

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

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: `${patient.name} · ${patient.code}${patient.userId ? ` · ID ${patient.userId}` : ''}`,
  }));

  const selectPatient = (patientId: string) => {
    const firstEncounter = allEncounters.find((item) => item.patientId === patientId);
    setSelectedPatientId(patientId);
    setCaseLoading(true);
    setSelectedId(firstEncounter?.id);
    setSelectedSkinCaseId(undefined);
    setSkinCase(null);
    setSelectedTemplateId(undefined);
    setSelectedCandidateCode(undefined);
    setSelectedSkinLabel(undefined);
    setDiagnosisName('');
    setDiagnosisCode('');
    setIsAdditional(false);
    setRationale('');
    setError(null);
  };

  const searchPatients = (query: string) => {
    if (patientSearchTimer.current) window.clearTimeout(patientSearchTimer.current);
    setPatientLoading(true);
    patientSearchTimer.current = window.setTimeout(() => {
      const request = ++patientSearchRequest.current;
      searchPatientDetails(query)
        .then((rows) => {
          if (request === patientSearchRequest.current) setPatients(rows);
        })
        .catch((cause: unknown) => {
          if (request === patientSearchRequest.current) {
            setError(cause instanceof Error ? cause.message : 'Không tìm được bệnh nhân.');
          }
        })
        .finally(() => {
          if (request === patientSearchRequest.current) setPatientLoading(false);
        });
    }, 250);
  };

  if (!encounter) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Xem xét AI và ra quyết định lâm sàng</Title>
          <Text type="secondary">Tìm bệnh nhân theo tên, mã bệnh nhân hoặc ID tài khoản.</Text>
        </div>
        <Card size="small">
          <Select
            showSearch
            filterOption={false}
            onSearch={searchPatients}
            loading={patientLoading}
            value={selectedPatientId}
            onChange={selectPatient}
            options={patientOptions}
            placeholder="Nhập tên hoặc ID tài khoản"
            style={{ width: '100%', maxWidth: 620 }}
            suffixIcon={<UserRound size={15} />}
          />
        </Card>
        <Card>
          <ProfessionalEmpty
            title="Bệnh nhân chưa có lượt khám để bác sĩ kết luận"
            description="Ca phân tích ảnh phải được gắn với một lượt khám đang hoạt động trước khi xác nhận chẩn đoán."
            primaryLabel="Mở hàng đợi"
            primaryHref="/app/work-queue"
          />
        </Card>
      </div>
    );
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
  const skinPredictions = skinCase?.aggregate.predictions.slice(0, 3) ?? [];
  const hasNamedSkinPredictions = skinPredictions.some(
    (prediction) => predictionName(prediction) !== 'Chưa có tên bệnh trong bộ nhãn',
  );

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
      selectedSkinLabel &&
      diagnosisName.trim().toLocaleLowerCase('vi') !== selectedSkinLabel.toLocaleLowerCase('vi') &&
      !rationale.trim()
    ) {
      throw new Error('Cần ghi nhận định lâm sàng khi bác sĩ điều chỉnh chẩn đoán AI.');
    }
    if (
      status === 'confirmed' &&
      skinCase &&
      !skinCase.reviewedAt &&
      (!selectedSkinLabel ||
        diagnosisName.trim().toLocaleLowerCase('vi') !== selectedSkinLabel.toLocaleLowerCase('vi')) &&
      !rationale.trim()
    ) {
      throw new Error('Cần ghi nhận định lâm sàng khi kết luận khác với gợi ý AI.');
    }
    if (
      selectedCandidateCode &&
      !selectedCandidateCode.startsWith('skin:') &&
      selectedCandidateCode !== assessment?.candidateConditions[0]?.code &&
      !rationale.trim()
    ) {
      throw new Error('Cần ghi nhận định lâm sàng khi chọn gợi ý không xếp hạng đầu tiên.');
    }
    if (
      assessment &&
      !selectedCandidateCode?.startsWith('skin:') &&
      !reviews.some((review) => review.aiAssessmentId === assessment.id)
    ) {
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
      conditionName: diagnosisName,
      conditionCode: diagnosisCode || undefined,
      aiAssessmentId: selectedCandidateCode?.startsWith('skin:') ? undefined : assessment?.id,
      isAdditionalToAI: isAdditional, rationale: rationale || undefined, status,
    });
    diagnosisRepository.diagnoses().upsert(diagnosis);
    if (status === 'confirmed') {
      if (skinCase && !skinCase.reviewedAt) {
        const accepted =
          !!selectedSkinLabel &&
          diagnosisName.trim().toLocaleLowerCase('vi') === selectedSkinLabel.toLocaleLowerCase('vi');
        await reviewSkinCase(skinCase.caseId, {
          decision: accepted ? 'accepted' : 'different_diagnosis',
          diagnosis: accepted ? undefined : diagnosisName.trim(),
          note: accepted ? undefined : rationale.trim(),
        });
      }
      const freshEncounter = mapEncounter(await getEncounter(encounter.id), encounter.events);
      encounterRepository.upsert(freshEncounter);
    }
    setDiagnosisName(''); setDiagnosisCode(''); setIsAdditional(false); setSelectedCandidateCode(undefined); setSelectedSkinLabel(undefined); setRationale('');
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
        <Space wrap align="start">
          <Select
            showSearch
            filterOption={false}
            onSearch={searchPatients}
            loading={patientLoading}
            value={selectedPatientId}
            onChange={selectPatient}
            options={patientOptions}
            placeholder="Tìm theo tên hoặc ID tài khoản"
            style={{ minWidth: 360, maxWidth: 520 }}
            suffixIcon={<UserRound size={15} />}
            aria-label="Chọn bệnh nhân theo tên hoặc ID tài khoản"
          />
          <Select
            loading={caseLoading}
            value={selectedSkinCaseId}
            onChange={(caseId) => {
              const selectedCase = skinCases.find((item) => item.caseId === caseId);
              setSelectedSkinCaseId(caseId);
              setCaseLoading(true);
              setSelectedCandidateCode(undefined);
              setSelectedSkinLabel(undefined);
              setDiagnosisName('');
              setDiagnosisCode('');
              setRationale('');
              if (selectedCase?.encounterId) {
                setSelectedId(selectedCase.encounterId as EncounterId);
              }
            }}
            options={skinCases.map((item) => ({
              value: item.caseId,
              label: formatCaseLabel(item),
            }))}
            placeholder={skinCases.length ? 'Chọn ca AI' : 'Chưa có ca AI'}
            style={{ minWidth: 280 }}
            suffixIcon={<Images size={15} />}
            aria-label="Chọn ca phân tích ảnh"
            notFoundContent="Bệnh nhân chưa có ca phân tích ảnh"
          />
          <Select
            style={{ minWidth: 260 }}
            value={encounter.id}
            onChange={(value) => {
              setDataLoading(true);
              setCaseLoading(true);
              setError(null);
              setSelectedTemplateId(undefined);
              setSelectedCandidateCode(undefined);
              setSelectedSkinLabel(undefined);
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

      {skinCase && (
        <Card
          size="small"
          title={<span><Images size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Ảnh của ca đã chọn</span>}
          extra={
            <Space size={6}>
              <Tag>{skinCase.bodyRegion}</Tag>
              <Tag color={skinCase.reviewedAt ? 'success' : 'processing'}>
                {skinCase.reviewedAt ? 'Đã được bác sĩ duyệt' : 'Chờ bác sĩ duyệt'}
              </Tag>
            </Space>
          }
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {skinCase.patient?.name} · {skinCase.patient?.code}
            {skinCase.patient?.userId ? ` · ID tài khoản ${skinCase.patient.userId}` : ''}
            {' · '}
            {new Date(skinCase.generatedAt).toLocaleString('vi-VN')}
          </Text>
          {skinCase.images.some((item) => item.original?.dataUrl) ? (
            <Image.PreviewGroup>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                {skinCase.images.map((item) => (
                  <div key={item.role} style={{ border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', fontWeight: 600, fontSize: 13 }}>
                      {item.role === 'closeup' ? 'Ảnh cận cảnh' : item.role === 'overview' ? 'Ảnh toàn vùng' : 'Ảnh góc khác'}
                    </div>
                    {item.original?.dataUrl ? (
                      <Image
                        src={item.original.dataUrl}
                        alt={`Ảnh ${item.role} của ca da liễu`}
                        width="100%"
                        height={220}
                        style={{ display: 'block', objectFit: 'contain', background: '#111827' }}
                      />
                    ) : (
                      <div style={{ height: 220, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
                        Không có ảnh xem xét
                      </div>
                    )}
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Chất lượng ảnh {Math.round(item.quality.score * 100)}%
                      {item.quality.usable ? ' · Đạt' : ' · Cần chụp lại'}
                    </div>
                    {item.heatmap?.dataUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 10px' }}>
                        <Image
                          src={item.heatmap.dataUrl}
                          alt={`Vùng AI tham chiếu trên ảnh ${item.role}`}
                          width={54}
                          height={54}
                          style={{ objectFit: 'cover', borderRadius: 6 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Vùng hệ thống dùng để tham chiếu
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Ca cũ chưa lưu bản ảnh xem xét"
              description="Các ca quét mới sẽ tự động gắn ảnh đã khử thông tin EXIF vào lượt khám."
            />
          )}
        </Card>
      )}

      <Skeleton active loading={dataLoading}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card
            title={<span><Brain size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Gợi ý từ AI</span>}
            extra={(skinCase || assessment) && <Tag color="warning">3 khả năng tham khảo</Tag>}
            size="small"
          >
            {skinCase && skinCase.triage.level !== 'routine' && (
              <Alert
                type={skinCase.triage.level === 'emergency' ? 'error' : 'warning'}
                showIcon
                style={{ marginBottom: 12 }}
                message={skinCase.triage.level === 'emergency' ? 'Có dấu hiệu cần xử trí ngay' : 'Có dấu hiệu cần ưu tiên khám'}
                description={skinCase.triage.reasons.join('; ')}
              />
            )}

            {skinCase && !hasNamedSkinPredictions && (
              <Alert
                type="error"
                showIcon
                message="Bộ nhãn bệnh chưa được cấu hình"
                description="Hệ thống không hiển thị mã class kỹ thuật cho bác sĩ. Cần triển khai checkpoint có tên bệnh trước khi dùng kết quả này."
              />
            )}

            {skinCase && hasNamedSkinPredictions && skinPredictions.map((prediction, index) => {
              const name = predictionName(prediction);
              const code = `skin:${prediction.classIndex}`;
              if (name === 'Chưa có tên bệnh trong bộ nhãn') return null;
              return (
                <div
                  key={code}
                  style={{
                    padding: 12,
                    background: selectedCandidateCode === code ? 'var(--surface-selected)' : 'var(--surface-subtle)',
                    borderRadius: 8,
                    border: `1px solid ${selectedCandidateCode === code ? 'var(--medical-blue-500)' : 'var(--border-default)'}`,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <Text strong>{index + 1}. {name}</Text>
                    <Text strong>{Math.round(prediction.probability * 100)}%</Text>
                  </div>
                  <Progress
                    percent={Math.round(prediction.probability * 100)}
                    showInfo={false}
                    size="small"
                    strokeColor="#2563eb"
                  />
                  <Button
                    size="small"
                    type={selectedCandidateCode === code ? 'primary' : 'default'}
                    icon={<CheckCircle size={13} />}
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      setSelectedCandidateCode(code);
                      setSelectedSkinLabel(name);
                      setDiagnosisName(name);
                      setDiagnosisCode('');
                      setIsAdditional(false);
                    }}
                  >
                    {selectedCandidateCode === code ? 'Đã chọn' : 'Dùng làm chẩn đoán'}
                  </Button>
                </div>
              );
            })}

            {!skinCase && !assessment && <Text type="secondary">Ca này chưa có kết quả phân tích ảnh hoặc đánh giá triệu chứng.</Text>}

            {!skinCase && assessment?.redFlag.triggered && (
              <Alert type="error" showIcon style={{ marginBottom: 12 }} message={`Cờ đỏ (${assessment.redFlag.urgency}): ${assessment.redFlag.reasons.join('; ')}`} />
            )}

            {!skinCase && assessment?.candidateConditionsUnavailableReason && (
              <Alert
                type="warning"
                showIcon
                message="Chưa có gợi ý chẩn đoán phân biệt từ AI"
                description={assessment.candidateConditionsUnavailableReason}
              />
            )}

            {!skinCase && assessment?.status === 'completed' && assessment.candidateConditions.map((c) => (
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
                    setSelectedSkinLabel(undefined);
                    setDiagnosisName(c.name);
                    setDiagnosisCode(c.code);
                    setIsAdditional(false);
                  }}
                >
                  {selectedCandidateCode === c.code ? 'Đã chọn làm chẩn đoán' : 'Chọn gợi ý này'}
                </Button>
              </div>
            ))}

            {!skinCase && assessment?.status === 'completed' && reviews.length > 0 && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                Đã ghi nhận {reviews.length} lần xem xét trước.
              </Text>
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
                  if (e.target.checked) {
                    setSelectedCandidateCode(undefined);
                    setSelectedSkinLabel(undefined);
                  }
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
