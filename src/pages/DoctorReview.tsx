import { useState } from 'react';
import { Row, Col, Card, Select, Alert, Tag, Button, Input, Checkbox, Typography, Space } from 'antd';
import { Brain, CheckCircle, XCircle, MinusCircle, ClipboardList, FlaskConical, FileCheck2 } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, aiAssessmentRepository, clinicalOrderRepository } from '../domain/repositories';
import { doctorDecisionService } from '../domain/services/doctorDecisionService';
import { clinicalOrderService } from '../domain/services/clinicalOrderService';
import { type AIHumanReviewStatus } from '../domain/core/enums';
import { hasRoleAccess } from '../domain/core/role';
import type { EncounterId, AIAssessmentId } from '../domain/core/ids';
import type { ClinicalOrder, ConfidenceBand } from '../domain/core/entities';
import { FriendlyErrorInline } from '../components/feedback/FriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { AccessDenied } from '../components/feedback/AccessDenied';

const { Title, Text, Paragraph } = Typography;

const BAND_COLOR: Record<ConfidenceBand, string> = { high: 'red', moderate: 'gold', low: 'default' };
const BAND_LABEL: Record<ConfidenceBand, string> = { high: 'Khả năng cao', moderate: 'Khả năng trung bình', low: 'Khả năng thấp' };

export default function DoctorReview() {
  const { currentUser, currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository).filter((e) => e.patientId === currentPatient.id && e.status !== 'closed');
  const assessments = useStore(aiAssessmentRepository);
  const orders = useStore(clinicalOrderRepository.orders());

  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(encounters[0]?.id);
  const [rationale, setRationale] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [isAdditional, setIsAdditional] = useState(false);
  const [planSummary, setPlanSummary] = useState('');
  const [orderType, setOrderType] = useState<ClinicalOrder['type']>('laboratory');
  const [orderJustification, setOrderJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];

  if (!hasRoleAccess(role, ['doctor'])) {
    return <AccessDenied featureName="Xem xét và chẩn đoán" allowedRoles={['doctor']} />;
  }

  if (!encounter) {
    return <Card><ProfessionalEmpty title="Không có lượt khám cần xem xét" description="Các lượt khám mới sẽ xuất hiện sau khi bệnh nhân check-in và hoàn thành đánh giá sơ bộ." primaryLabel="Mở hàng đợi" primaryHref="/app/work-queue" /></Card>;
  }

  const assessment = encounter.aiAssessmentIds.length
    ? assessments.find((a) => a.id === encounter.aiAssessmentIds[encounter.aiAssessmentIds.length - 1])
    : undefined;
  const reviews = doctorDecisionService.listReviews(encounter.id);
  const diagnoses = doctorDecisionService.listDiagnoses(encounter.id);
  const plan = doctorDecisionService.getPlan(encounter.id);
  const confirmedDiagnosis = diagnoses.find((d) => d.status === 'confirmed' || d.status === 'revised');
  const encounterOrders = orders.filter((o) => o.encounterId === encounter.id);

  const runGuarded = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReview = (aiAssessmentId: AIAssessmentId, action: AIHumanReviewStatus, code?: string) => runGuarded(() => {
    doctorDecisionService.reviewAssessment(encounter.id, aiAssessmentId, currentUser.id, action, code, rationale || undefined);
    setRationale('');
  });

  const handleRecordDiagnosis = (status: 'provisional' | 'confirmed') => runGuarded(() => {
    if (!diagnosisName.trim()) throw new Error('Vui lòng nhập tên chẩn đoán.');
    doctorDecisionService.recordDiagnosis(encounter.id, currentUser.id, {
      conditionName: diagnosisName, conditionCode: diagnosisCode || undefined, aiAssessmentId: assessment?.id,
      isAdditionalToAI: isAdditional, rationale: rationale || undefined, status,
    });
    setDiagnosisName(''); setDiagnosisCode(''); setIsAdditional(false); setRationale('');
  });

  const handleApprovePlan = () => runGuarded(() => {
    if (!confirmedDiagnosis) throw new Error('Cần xác nhận chẩn đoán trước khi duyệt phác đồ.');
    if (!planSummary.trim()) throw new Error('Vui lòng nhập nội dung phác đồ.');
    doctorDecisionService.approveClinicalPlan(encounter.id, currentUser.id, confirmedDiagnosis.id, planSummary);
    setPlanSummary('');
  });

  const handleCreateOrder = () => runGuarded(() => {
    if (!orderJustification.trim()) throw new Error('Vui lòng nhập lý do chỉ định.');
    clinicalOrderService.createOrder(encounter.id, currentUser.id, { type: orderType, justification: orderJustification, assignedRole: orderType === 'laboratory' ? 'lab_technician' : orderType === 'imaging' ? 'imaging_technician' : 'doctor' });
    setOrderJustification('');
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Xem Xét AI & Ra Quyết Định Lâm Sàng</Title>
        </div>
        <Select style={{ minWidth: 220 }} value={encounter.id} onChange={(v) => setSelectedId(v as EncounterId)} options={encounters.map((e) => ({ value: e.id, label: `${e.id} — ${e.status}` }))} />
      </div>

      {error && <FriendlyErrorInline error={error} onClose={() => setError(null)} />}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card
            title={<span><Brain size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Đánh Giá Sơ Bộ AI</span>}
            extra={assessment && <Tag color="warning">{assessment.status === 'completed' ? 'Top 3 Ứng Viên Chẩn Đoán' : 'Không đủ dữ liệu'}</Tag>}
            size="small"
          >
            {!assessment && <Text type="secondary">Chưa có đánh giá AI cho lượt khám này.</Text>}

            {assessment?.redFlag.triggered && (
              <Alert type="error" showIcon style={{ marginBottom: 12 }} message={`Cờ đỏ (${assessment.redFlag.urgency}): ${assessment.redFlag.reasons.join('; ')}`} />
            )}

            {assessment?.status === 'completed' && assessment.candidateConditions.map((c) => (
              <div key={c.code} style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 8, border: '1px solid var(--border-default)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text strong>{c.name}</Text>
                  <Tag color={BAND_COLOR[c.confidenceBand]}>{BAND_LABEL[c.confidenceBand]}</Tag>
                </div>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 6 }}>{c.rationale}</Paragraph>
                <Text type="success" style={{ fontSize: 12 }}>Ủng hộ: {c.supportingEvidence.join(', ')}</Text>
                {c.conflictingEvidence.length > 0 && <Text type="danger" style={{ fontSize: 12, display: 'block' }}>Trái ngược: {c.conflictingEvidence.join(', ')}</Text>}
                <Space style={{ marginTop: 10 }} size={6}>
                  <Button size="small" type="primary" ghost icon={<CheckCircle size={13} />} onClick={() => handleReview(assessment.id, 'accepted', c.code)}>Chấp nhận</Button>
                  <Button size="small" icon={<MinusCircle size={13} />} onClick={() => handleReview(assessment.id, 'partial', c.code)}>Chấp nhận một phần</Button>
                  <Button size="small" danger icon={<XCircle size={13} />} onClick={() => handleReview(assessment.id, 'rejected', c.code)}>Từ chối</Button>
                </Space>
              </div>
            ))}

            {assessment?.status === 'completed' && (
              <>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Lý do (bắt buộc nếu không chọn gợi ý xếp hạng cao nhất)</Text>
                <Input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="VD: Phân bố tổn thương điển hình hơn cho..." style={{ marginBottom: 12 }} />
                <Text type="secondary" style={{ fontSize: 11, display: 'block', borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>
                  Mô hình: {assessment.modelVersion} · {assessment.inputSnapshotId} · {new Date(assessment.generatedAt).toLocaleString('vi-VN')}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', display: 'block', marginTop: 4 }}>
                  Đây là hỗ trợ ra quyết định của AI (AI Preliminary Assessment), không phải chẩn đoán xác định. Chẩn đoán cuối cùng luôn do bác sĩ quyết định.
                </Text>
              </>
            )}

            {reviews.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-default)', paddingTop: 10 }}>
                <Text strong style={{ fontSize: 12.5, display: 'block', marginBottom: 6 }}>Lịch sử xem xét</Text>
                {reviews.map((r) => (
                  <Text key={r.id} type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    {r.action} — {r.acceptedConditionCode ?? '—'} {r.rationale ? `(${r.rationale})` : ''}
                  </Text>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={<span><ClipboardList size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Chẩn đoán của bác sĩ</span>} size="small">
              {diagnoses.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {diagnoses.map((d) => (
                    <div key={d.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                      <Text strong>{d.conditionName}</Text> — <Tag>{d.status}</Tag>
                    </div>
                  ))}
                </div>
              )}
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên chẩn đoán *</Text>
              <Input value={diagnosisName} onChange={(e) => setDiagnosisName(e.target.value)} style={{ marginBottom: 10 }} />
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mã (tuỳ chọn)</Text>
              <Input value={diagnosisCode} onChange={(e) => setDiagnosisCode(e.target.value)} style={{ marginBottom: 10 }} />
              <Checkbox checked={isAdditional} onChange={(e) => setIsAdditional(e.target.checked)} style={{ marginBottom: 12, fontSize: 13 }}>Chẩn đoán này không nằm trong gợi ý của AI</Checkbox>
              <Space>
                <Button onClick={() => handleRecordDiagnosis('provisional')}>Lưu tạm thời</Button>
                <Button type="primary" icon={<FileCheck2 size={14} />} onClick={() => handleRecordDiagnosis('confirmed')}>Xác nhận chẩn đoán</Button>
              </Space>
            </Card>

            <Card title="Phác đồ điều trị" size="small">
              {plan ? (
                <Paragraph style={{ fontSize: 13, background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, marginBottom: 0 }}>{plan.summary}</Paragraph>
              ) : (
                <>
                  <Input.TextArea rows={3} value={planSummary} onChange={(e) => setPlanSummary(e.target.value)} placeholder="Nội dung phác đồ điều trị..." style={{ marginBottom: 10 }} />
                  <Button type="primary" disabled={!confirmedDiagnosis} onClick={handleApprovePlan}>Duyệt phác đồ</Button>
                  {!confirmedDiagnosis && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>Cần xác nhận chẩn đoán trước.</Text>}
                </>
              )}
            </Card>

            <Card title={<span><FlaskConical size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Chỉ định cận lâm sàng</span>} size="small">
              {encounterOrders.map((o) => (
                <div key={o.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{o.type} — {o.justification}</span>
                  <Tag>{o.status}</Tag>
                </div>
              ))}
              <Select style={{ width: '100%', marginTop: 10, marginBottom: 10 }} value={orderType} onChange={(v) => setOrderType(v)} options={[
                { value: 'laboratory', label: 'Xét nghiệm' },
                { value: 'imaging', label: 'Chẩn đoán hình ảnh' },
                { value: 'consultation', label: 'Hội chẩn chuyên khoa' },
              ]} />
              <Input value={orderJustification} onChange={(e) => setOrderJustification(e.target.value)} placeholder="Lý do chỉ định..." style={{ marginBottom: 10 }} />
              <Button onClick={handleCreateOrder}>Tạo chỉ định</Button>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
