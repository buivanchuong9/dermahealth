import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Divider,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tooltip,
  App as AntApp,
} from 'antd';
import {
  ShieldAlert,
  CheckCircle2,
  Plus,
  Activity,
  User,
  AlertTriangle,
  Heart,
  Weight,
  Ruler,
  FlaskConical,
  HelpCircle,
  Building2,
  Clock,
  Pill,
  Stethoscope,
  Pencil,
  Ban,
} from 'lucide-react';
import type {
  AllergyIntolerance,
  AllergyKnowledgeState,
  LifetimeMedicalRecord,
  VitalObservation,
} from '../../api/lifetimeMedicalRecord';
import {
  createAllergy,
  verifyAllergy,
  updateNarrative,
  addProblemEntry,
  updateProblemEntry,
  addCurrentMedication,
  updateCurrentMedication,
} from '../../api/lifetimeMedicalRecord';

const { Text, Title } = Typography;

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  medication: 'Thuốc',
  food: 'Thực phẩm',
  environment: 'Môi trường',
  contact: 'Tiếp xúc',
  biologic: 'Sinh phẩm',
  other: 'Khác',
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'gold',
  moderate: 'orange',
  severe: 'volcano',
  life_threatening: 'red',
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nặng',
  life_threatening: 'Đe dọa tính mạng',
};

const PROBLEM_STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Không hoạt động',
  resolved: 'Đã khỏi',
};

const PROBLEM_STATUS_COLOR: Record<string, string> = {
  active: 'red',
  inactive: 'default',
  resolved: 'green',
};

const SEVERITY_LABEL_SHORT: Record<string, string> = {
  mild: 'Nhẹ',
  moderate: 'TB',
  severe: 'Nặng',
  critical: 'Nguy kịch',
};

const VITAL_LABEL: Record<string, string> = {
  height_cm: 'Chiều cao',
  weight_kg: 'Cân nặng',
  bmi: 'BMI',
  systolic_bp: 'HA tâm thu',
  diastolic_bp: 'HA tâm trương',
  heart_rate: 'Nhịp tim',
  respiratory_rate: 'Nhịp thở',
  temperature_c: 'Nhiệt độ',
  spo2: 'SpO₂',
  blood_glucose: 'Đường huyết',
};

const VITAL_ICON: Record<string, React.ReactNode> = {
  height_cm: <Ruler size={15} />,
  weight_kg: <Weight size={15} />,
  bmi: <Activity size={15} />,
  heart_rate: <Heart size={15} />,
};

const SOURCE_LABEL: Record<string, string> = {
  clinical_measurement: 'Đo lâm sàng',
  patient_reported: 'Bệnh nhân tự khai',
  device_imported: 'Thiết bị nhập',
  ehr_imported: 'Hệ thống khác',
  legacy_backfill: 'Dữ liệu cũ',
};

// ---------------------------------------------------------------------------
// Authority label helpers (PART 6)
// ---------------------------------------------------------------------------

function allergyAuthorityLabel(a: AllergyIntolerance): {
  label: string;
  color: string;
  tooltip: string;
} {
  switch (a.verificationStatus) {
    case 'clinician_verified':
      return { label: 'Đã được bác sĩ xác nhận', color: 'green', tooltip: `Xác nhận lúc ${a.verifiedAt ? formatDate(a.verifiedAt) : '—'}` };
    case 'organization_verified':
      return { label: 'Đã được tổ chức xác nhận', color: 'cyan', tooltip: 'Được xác nhận bởi cơ sở y tế' };
    case 'imported_unverified':
      return { label: 'Dữ liệu từ cơ sở khác', color: 'purple', tooltip: 'Chưa được xác minh bởi bác sĩ tại đây' };
    case 'superseded':
      return { label: 'Thông tin cũ đã được thay thế', color: 'default', tooltip: 'Bản ghi này đã được cập nhật bằng thông tin mới hơn' };
    case 'entered_in_error':
      return { label: 'Đã xác định nhập sai', color: 'default', tooltip: 'Bản ghi bị đánh dấu nhập nhầm' };
    case 'patient_reported':
      return { label: 'Bạn đã cung cấp', color: 'orange', tooltip: 'Chờ nhân viên y tế xác nhận' };
    default:
      return { label: 'Chờ nhân viên y tế xác nhận', color: 'default', tooltip: 'Chưa được xác minh' };
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Allergy knowledge state display (PART 1 + PART 6)
// ---------------------------------------------------------------------------

interface AllergyKnowledgeBannerProps {
  state: AllergyKnowledgeState;
  assessedAt?: string | null;
  activeAllergyCount: number;
}

function AllergyKnowledgeBanner({ state, assessedAt, activeAllergyCount }: AllergyKnowledgeBannerProps) {
  if (state === 'no_known_allergies') {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
        <Space>
          <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
          <Text style={{ color: '#15803d', fontSize: 12, fontWeight: 600 }}>
            NKA — Không có tiền sử dị ứng đã biết
          </Text>
        </Space>
        {assessedAt && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
            Được đánh giá bởi nhân viên y tế: {formatDate(assessedAt)}
          </Text>
        )}
      </div>
    );
  }

  if (state === 'unknown' && activeAllergyCount === 0) {
    // CRITICAL: zero rows ≠ NKA — show UNKNOWN explicitly
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
        <Space>
          <HelpCircle size={14} style={{ color: '#d97706' }} />
          <Text style={{ color: '#92400e', fontSize: 12, fontWeight: 600 }}>
            Tình trạng dị ứng chưa được đánh giá
          </Text>
        </Space>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
          Chưa có thông tin — không đồng nghĩa với không dị ứng. Cần được nhân viên y tế đánh giá.
        </Text>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// BMI helpers (PART 4 — do not calculate when source observations missing)
// ---------------------------------------------------------------------------

const BMI_WINDOW_DAYS = 365;

interface BmiResult {
  value: number;
  heightObs: VitalObservation;
  weightObs: VitalObservation;
}

function deriveBmi(vitals: VitalObservation[]): BmiResult | null {
  const heights = vitals
    .filter((v) => v.type === 'height_cm')
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const weights = vitals
    .filter((v) => v.type === 'weight_kg')
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

  if (heights.length === 0 || weights.length === 0) return null;

  const h = heights[0];
  const w = weights[0];

  // Require both observations to be within the acceptable time window.
  const diffMs = Math.abs(
    new Date(h.observedAt).getTime() - new Date(w.observedAt).getTime(),
  );
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > BMI_WINDOW_DAYS) return null;

  const heightM = h.value / 100;
  if (heightM <= 0) return null;
  const bmiValue = +(w.value / (heightM * heightM)).toFixed(1);
  return { value: bmiValue, heightObs: h, weightObs: w };
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 23) return 'Bình thường';
  if (bmi < 25) return 'Thừa cân';
  return 'Béo phì';
}

function latestVital(vitals: VitalObservation[], type: string): VitalObservation | undefined {
  return vitals
    .filter((v) => v.type === type)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  record?: LifetimeMedicalRecord;
  patientId: string;
  onRecordUpdated?: () => void;
}

export const PatientIntroductionCard: React.FC<Props> = ({ record, patientId, onRecordUpdated }) => {
  const { message } = AntApp.useApp();
  const [addAllergyOpen, setAddAllergyOpen] = useState(false);
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [addProblemOpen, setAddProblemOpen] = useState(false);
  const [editProblemId, setEditProblemId] = useState<string | null>(null);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [editMedId, setEditMedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [narrativeSaving, setNarrativeSaving] = useState(false);
  const [problemSaving, setProblemSaving] = useState(false);
  const [medSaving, setMedSaving] = useState(false);
  const [form] = Form.useForm();
  const [narrativeForm] = Form.useForm();
  const [problemForm] = Form.useForm();
  const [medForm] = Form.useForm();

  const allergies = record?.allergies ?? [];
  const vitals = record?.vitals ?? [];
  const narrative = record?.narrative;
  const problemList = record?.problemList ?? [];
  const currentMedications = record?.currentMedications ?? [];
  const knowledgeState = record?.summary.allergyKnowledgeState ?? { state: 'unknown' as const };

  // Only show non-superseded, non-entered-in-error allergies as "active"
  const activeAllergies = allergies.filter(
    (a) =>
      a.active &&
      a.verificationStatus !== 'superseded' &&
      a.verificationStatus !== 'entered_in_error',
  );

  // Critical verified allergies shown first
  const sortedAllergies = [...activeAllergies].sort((a, b) => {
    const aVerified = a.verificationStatus === 'clinician_verified' || a.verificationStatus === 'organization_verified';
    const bVerified = b.verificationStatus === 'clinician_verified' || b.verificationStatus === 'organization_verified';
    const aSevere = a.severity === 'life_threatening' || a.severity === 'severe';
    const bSevere = b.severity === 'life_threatening' || b.severity === 'severe';
    if (aSevere && aVerified && !(bSevere && bVerified)) return -1;
    if (bSevere && bVerified && !(aSevere && aVerified)) return 1;
    return 0;
  });

  const heightObs = latestVital(vitals, 'height_cm');
  const weightObs = latestVital(vitals, 'weight_kg');
  const bmiResult = deriveBmi(vitals);

  async function handleAddAllergy() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await createAllergy(patientId, values as Parameters<typeof createAllergy>[1]);
      void message.success('Đã ghi nhận thông tin dị ứng');
      setAddAllergyOpen(false);
      form.resetFields();
      onRecordUpdated?.();
    } catch {
      // form validation error shown inline
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNarrative() {
    try {
      const values = await narrativeForm.validateFields();
      setNarrativeSaving(true);
      await updateNarrative(patientId, values as Parameters<typeof updateNarrative>[1]);
      void message.success('Đã lưu thông tin');
      setNarrativeOpen(false);
      onRecordUpdated?.();
    } catch {
      // form validation errors shown inline
    } finally {
      setNarrativeSaving(false);
    }
  }

  async function handleVerify(allergyId: string) {
    try {
      await verifyAllergy(patientId, allergyId);
      void message.success('Đã xác nhận lâm sàng');
      onRecordUpdated?.();
    } catch {
      void message.error('Không thể xác nhận. Vui lòng thử lại.');
    }
  }

  async function handleSaveProblem() {
    try {
      const values = await problemForm.validateFields();
      setProblemSaving(true);
      if (editProblemId) {
        await updateProblemEntry(patientId, editProblemId, values as Parameters<typeof updateProblemEntry>[2]);
        void message.success('Đã cập nhật danh sách vấn đề');
      } else {
        await addProblemEntry(patientId, values as Parameters<typeof addProblemEntry>[1]);
        void message.success('Đã thêm vào danh sách vấn đề');
      }
      setAddProblemOpen(false);
      setEditProblemId(null);
      problemForm.resetFields();
      onRecordUpdated?.();
    } catch {
      // validation error shown inline
    } finally {
      setProblemSaving(false);
    }
  }

  async function handleResolveProblem(entryId: string) {
    try {
      await updateProblemEntry(patientId, entryId, { status: 'resolved' });
      void message.success('Đã đánh dấu đã khỏi');
      onRecordUpdated?.();
    } catch {
      void message.error('Không thể cập nhật. Vui lòng thử lại.');
    }
  }

  async function handleSaveMedication() {
    try {
      const values = await medForm.validateFields();
      setMedSaving(true);
      if (editMedId) {
        await updateCurrentMedication(patientId, editMedId, values as Parameters<typeof updateCurrentMedication>[2]);
        void message.success('Đã cập nhật thuốc đang dùng');
      } else {
        await addCurrentMedication(patientId, values as Parameters<typeof addCurrentMedication>[1]);
        void message.success('Đã thêm thuốc đang dùng');
      }
      setAddMedOpen(false);
      setEditMedId(null);
      medForm.resetFields();
      onRecordUpdated?.();
    } catch {
      // validation error shown inline
    } finally {
      setMedSaving(false);
    }
  }

  async function handleStopMedication(medId: string) {
    try {
      await updateCurrentMedication(patientId, medId, { active: false });
      void message.success('Đã đánh dấu ngừng thuốc');
      onRecordUpdated?.();
    } catch {
      void message.error('Không thể cập nhật. Vui lòng thử lại.');
    }
  }

  return (
    <>
      <Card bordered={false} className="emr-card" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: '0 0 16px', color: '#0f172a', fontWeight: 700, fontSize: 15 }}>
          <User size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Giới thiệu về tôi
        </Title>

        <Row gutter={[24, 16]}>
          {/* Vitals snapshot */}
          <Col xs={24} md={10}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
              <Text strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
                Thể trạng cơ bản
              </Text>
              <Row gutter={[12, 12]}>
                {[
                  {
                    type: 'height_cm',
                    obs: heightObs,
                    unit: 'cm',
                    label: 'Chiều cao',
                    icon: <Ruler size={14} />,
                  },
                  {
                    type: 'weight_kg',
                    obs: weightObs,
                    unit: 'kg',
                    label: 'Cân nặng',
                    icon: <Weight size={14} />,
                  },
                ].map(({ type, obs, unit, label, icon }) => (
                  <Col span={8} key={type}>
                    <div style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '10px 6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#3b82f6', marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                        {obs ? obs.value : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{label}{unit ? ` (${unit})` : ''}</div>
                      {obs && (
                        <Tooltip title={`${SOURCE_LABEL[obs.sourceType] ?? obs.sourceType} · ${formatDate(obs.observedAt)}`}>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, cursor: 'help' }}>
                            <Clock size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                            {formatDate(obs.observedAt)}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </Col>
                ))}

                {/* BMI — only show when derivable from compatible observations */}
                <Col span={8}>
                  <div style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '10px 6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#3b82f6', marginBottom: 4 }}><Activity size={14} /></div>
                    {bmiResult ? (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                          {bmiResult.value}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>BMI</div>
                        <Tag color={bmiResult.value >= 25 ? 'orange' : bmiResult.value < 18.5 ? 'blue' : 'green'} style={{ fontSize: 10, marginTop: 2, padding: '0 4px' }}>
                          {bmiCategory(bmiResult.value)}
                        </Tag>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8', lineHeight: 1.1 }}>—</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>BMI</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                          {heightObs && weightObs ? 'Cần đo trong vòng 1 năm' : 'Thiếu số đo'}
                        </div>
                      </>
                    )}
                  </div>
                </Col>
              </Row>

              {/* Other vitals with observedAt date + source */}
              {vitals
                .filter((v) => !['height_cm', 'weight_kg', 'bmi'].includes(v.type))
                .slice(0, 4)
                .map((v) => (
                  <div
                    key={v.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '6px 4px', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Space size={6}>
                      <span style={{ color: '#64748b' }}>{VITAL_ICON[v.type] ?? <FlaskConical size={14} />}</span>
                      <Text style={{ fontSize: 12, color: '#334155' }}>{VITAL_LABEL[v.type] ?? v.type}</Text>
                    </Space>
                    <Space size={4} direction="vertical" style={{ alignItems: 'flex-end' }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {v.value} <Text type="secondary" style={{ fontSize: 11 }}>{v.unit}</Text>
                      </Text>
                      <Tooltip title={`${SOURCE_LABEL[v.sourceType] ?? v.sourceType} · ${formatDateTime(v.observedAt)}`}>
                        <Text type="secondary" style={{ fontSize: 10, cursor: 'help' }}>
                          <Clock size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                          {formatDate(v.observedAt)}
                        </Text>
                      </Tooltip>
                    </Space>
                  </div>
                ))}

              {vitals.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8, fontStyle: 'italic' }}>
                  Chưa có đo lường thể trạng
                </Text>
              )}
            </div>
          </Col>

          {/* Allergies + Narrative */}
          <Col xs={24} md={14}>
            {/* Allergy section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space>
                  {activeAllergies.length > 0
                    ? <ShieldAlert size={15} style={{ color: '#ef4444' }} />
                    : knowledgeState.state === 'no_known_allergies'
                    ? <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
                    : <HelpCircle size={15} style={{ color: '#d97706' }} />}
                  <Text strong style={{ fontSize: 13 }}>
                    Dị ứng & phản vệ
                  </Text>
                  {activeAllergies.length > 0 && <Tag color="error">{activeAllergies.length}</Tag>}
                </Space>
                <Button
                  size="small"
                  type="dashed"
                  icon={<Plus size={12} />}
                  onClick={() => setAddAllergyOpen(true)}
                >
                  Thêm
                </Button>
              </div>

              {/* Knowledge state banner — shown when no active allergy rows */}
              {activeAllergies.length === 0 && (
                <AllergyKnowledgeBanner
                  state={knowledgeState.state}
                  assessedAt={knowledgeState.assessedAt}
                  activeAllergyCount={activeAllergies.length}
                />
              )}

              {/* Active allergy list (critical/verified first) */}
              {sortedAllergies.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: activeAllergies.length === 0 ? 0 : 0 }}>
                  {sortedAllergies.map((a) => {
                    const authority = allergyAuthorityLabel(a);
                    return (
                      <div
                        key={a.id}
                        style={{
                          background: '#fff5f5',
                          border: `1px solid ${a.verificationStatus === 'clinician_verified' ? '#fca5a5' : '#fecaca'}`,
                          borderRadius: 8,
                          padding: '8px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <Space size={4} wrap>
                              <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                              <Text strong style={{ fontSize: 13, color: '#dc2626' }}>{a.substance}</Text>
                              {a.severity && (
                                <Tag color={SEVERITY_COLORS[a.severity] ?? 'default'} style={{ fontSize: 10, padding: '0 4px' }}>
                                  {SEVERITY_LABELS[a.severity] ?? a.severity}
                                </Tag>
                              )}
                              <Tag color="default" style={{ fontSize: 10, padding: '0 4px' }}>
                                {CATEGORY_LABELS[a.category] ?? a.category}
                              </Tag>
                            </Space>
                            {a.reaction && (
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                Phản ứng: {a.reaction}
                              </Text>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <Tooltip title={authority.tooltip}>
                              <Tag
                                color={authority.color}
                                style={{ fontSize: 10, padding: '0 4px', cursor: 'help' }}
                              >
                                {authority.label}
                              </Tag>
                            </Tooltip>
                            {a.sourceType === 'imported_unverified' && (
                              <Tooltip title="Dữ liệu từ cơ sở khác — cần bác sĩ xác nhận tại đây">
                                <Tag color="purple" style={{ fontSize: 10, padding: '0 4px' }}>
                                  <Building2 size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                                  Cơ sở khác
                                </Tag>
                              </Tooltip>
                            )}
                            {a.verificationStatus === 'patient_reported' && (
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, fontSize: 11, height: 'auto' }}
                                onClick={() => handleVerify(a.id)}
                              >
                                Xác nhận lâm sàng
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Divider style={{ margin: '10px 0' }} />

            {/* Patient narrative — always marked as patient-provided */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space>
                  <Text strong style={{ fontSize: 13 }}>Thông tin bệnh nhân tự khai</Text>
                  <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>Bạn đã cung cấp</Tag>
                </Space>
                <Button
                  size="small"
                  type="dashed"
                  onClick={() => {
                    narrativeForm.setFieldsValue({
                      occupation: narrative?.occupation ?? '',
                      chiefComplaint: narrative?.chiefComplaint ?? '',
                      medicalHistory: narrative?.medicalHistory ?? '',
                      familyHistory: narrative?.familyHistory ?? '',
                      currentSymptoms: narrative?.currentSymptoms ?? '',
                      lifestyle: narrative?.lifestyle ?? '',
                      surgicalHistory: narrative?.surgicalHistory ?? '',
                      vaccinationNotes: narrative?.vaccinationNotes ?? '',
                    });
                    setNarrativeOpen(true);
                  }}
                >
                  Chỉnh sửa
                </Button>
              </div>
              {narrative && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                  Cập nhật lần cuối: {formatDateTime(narrative.updatedAt)}
                </Text>
              )}
              {[
                { label: 'Nghề nghiệp', value: narrative?.occupation },
                { label: 'Lý do đến khám chính', value: narrative?.chiefComplaint },
                { label: 'Tiền sử bệnh tật', value: narrative?.medicalHistory },
                { label: 'Tiền sử gia đình', value: narrative?.familyHistory },
                { label: 'Triệu chứng hiện tại', value: narrative?.currentSymptoms },
                { label: 'Lối sống', value: narrative?.lifestyle },
                { label: 'Tiền sử phẫu thuật', value: narrative?.surgicalHistory },
                { label: 'Tiêm chủng', value: narrative?.vaccinationNotes },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}
                >
                  <Text style={{ fontSize: 12, color: '#64748b', minWidth: 160, flexShrink: 0 }}>{label}:</Text>
                  <Text style={{ fontSize: 12, color: value ? '#0f172a' : '#94a3b8', fontStyle: value ? 'normal' : 'italic' }}>
                    {value || 'Chưa ghi nhận'}
                  </Text>
                </div>
              ))}
            </div>
          </Col>
        </Row>

        {/* Problem list + current medications — full width below the two columns */}
        <Divider style={{ margin: '16px 0' }} />
        <Row gutter={[24, 16]}>
          {/* Persistent problem list */}
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Space>
                <Stethoscope size={15} style={{ color: '#6366f1' }} />
                <Text strong style={{ fontSize: 13 }}>Danh sách vấn đề sức khỏe</Text>
                {problemList.filter((p) => p.status === 'active').length > 0 && (
                  <Tag color="red">{problemList.filter((p) => p.status === 'active').length} đang mắc</Tag>
                )}
              </Space>
              <Button
                size="small"
                type="dashed"
                icon={<Plus size={12} />}
                onClick={() => { problemForm.resetFields(); setEditProblemId(null); setAddProblemOpen(true); }}
              >
                Thêm
              </Button>
            </div>
            {problemList.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>Chưa có chẩn đoán bền vững nào được ghi nhận</Text>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {problemList.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: entry.status === 'active' ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${entry.status === 'active' ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    opacity: entry.status === 'resolved' ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Space size={4} wrap>
                        <Text strong style={{ fontSize: 13, color: entry.status === 'active' ? '#dc2626' : '#475569' }}>
                          {entry.conditionName}
                        </Text>
                        {entry.conditionCode && (
                          <Tag color="default" style={{ fontSize: 10, padding: '0 4px', fontFamily: 'monospace' }}>{entry.conditionCode}</Tag>
                        )}
                        <Tag color={PROBLEM_STATUS_COLOR[entry.status] ?? 'default'} style={{ fontSize: 10, padding: '0 4px' }}>
                          {PROBLEM_STATUS_LABEL[entry.status] ?? entry.status}
                        </Tag>
                        {entry.severity && (
                          <Tag color="orange" style={{ fontSize: 10, padding: '0 4px' }}>{SEVERITY_LABEL_SHORT[entry.severity] ?? entry.severity}</Tag>
                        )}
                      </Space>
                      {entry.onsetDate && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                          Khởi phát: {formatDate(entry.onsetDate)}
                        </Text>
                      )}
                      {entry.note && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{entry.note}</Text>
                      )}
                    </div>
                    <Space size={4} direction="vertical" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Tooltip title={`Thêm bởi: ${entry.addedByName ?? entry.addedByUserId} · ${formatDate(entry.addedAt)}`}>
                        <Text type="secondary" style={{ fontSize: 10, cursor: 'help' }}>BS ghi nhận</Text>
                      </Tooltip>
                      {entry.status === 'active' && (
                        <Space size={4}>
                          <Tooltip title="Chỉnh sửa">
                            <Button
                              type="text"
                              size="small"
                              icon={<Pencil size={11} />}
                              style={{ padding: '0 4px', height: 'auto' }}
                              onClick={() => {
                                problemForm.setFieldsValue({
                                  conditionName: entry.conditionName,
                                  conditionCode: entry.conditionCode ?? '',
                                  status: entry.status,
                                  onsetDate: entry.onsetDate ?? '',
                                  severity: entry.severity ?? undefined,
                                  note: entry.note ?? '',
                                });
                                setEditProblemId(entry.id);
                                setAddProblemOpen(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Đánh dấu đã khỏi">
                            <Button
                              type="text"
                              size="small"
                              icon={<CheckCircle2 size={11} style={{ color: '#16a34a' }} />}
                              style={{ padding: '0 4px', height: 'auto' }}
                              onClick={() => handleResolveProblem(entry.id)}
                            />
                          </Tooltip>
                        </Space>
                      )}
                    </Space>
                  </div>
                </div>
              ))}
            </div>
          </Col>

          {/* Current medications */}
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Space>
                <Pill size={15} style={{ color: '#0891b2' }} />
                <Text strong style={{ fontSize: 13 }}>Thuốc đang dùng thường xuyên</Text>
                {currentMedications.filter((m) => m.active).length > 0 && (
                  <Tag color="blue">{currentMedications.filter((m) => m.active).length}</Tag>
                )}
              </Space>
              <Button
                size="small"
                type="dashed"
                icon={<Plus size={12} />}
                onClick={() => { medForm.resetFields(); setEditMedId(null); setAddMedOpen(true); }}
              >
                Thêm
              </Button>
            </div>
            {currentMedications.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>Chưa có thuốc dùng thường xuyên nào được ghi nhận</Text>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentMedications.map((med) => (
                <div
                  key={med.id}
                  style={{
                    background: med.active ? '#f0f9ff' : '#f8fafc',
                    border: `1px solid ${med.active ? '#bae6fd' : '#e2e8f0'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    opacity: med.active ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Space size={4} wrap>
                        <Pill size={12} style={{ color: med.active ? '#0891b2' : '#94a3b8' }} />
                        <Text strong style={{ fontSize: 13, color: med.active ? '#0c4a6e' : '#475569' }}>
                          {med.medicationName}
                        </Text>
                        {!med.active && <Tag color="default" style={{ fontSize: 10, padding: '0 4px' }}>Đã ngừng</Tag>}
                      </Space>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        {med.dosage && <Text type="secondary" style={{ fontSize: 11 }}>Liều: {med.dosage}</Text>}
                        {med.frequency && <Text type="secondary" style={{ fontSize: 11 }}>{med.frequency}</Text>}
                        {med.route && <Text type="secondary" style={{ fontSize: 11 }}>({med.route})</Text>}
                      </div>
                      {med.startedAt && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                          Bắt đầu: {formatDate(med.startedAt)}
                        </Text>
                      )}
                      {med.note && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{med.note}</Text>
                      )}
                    </div>
                    <Space size={4} direction="vertical" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Tooltip title={`Ghi nhận bởi: ${med.addedByName ?? med.addedByUserId} · ${formatDate(med.addedAt)}`}>
                        <Text type="secondary" style={{ fontSize: 10, cursor: 'help' }}>BS ghi nhận</Text>
                      </Tooltip>
                      {med.active && (
                        <Space size={4}>
                          <Tooltip title="Chỉnh sửa">
                            <Button
                              type="text"
                              size="small"
                              icon={<Pencil size={11} />}
                              style={{ padding: '0 4px', height: 'auto' }}
                              onClick={() => {
                                medForm.setFieldsValue({
                                  medicationName: med.medicationName,
                                  dosage: med.dosage ?? '',
                                  frequency: med.frequency ?? '',
                                  route: med.route ?? '',
                                  startedAt: med.startedAt ?? '',
                                  note: med.note ?? '',
                                });
                                setEditMedId(med.id);
                                setAddMedOpen(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Đánh dấu ngừng thuốc">
                            <Button
                              type="text"
                              size="small"
                              icon={<Ban size={11} style={{ color: '#dc2626' }} />}
                              style={{ padding: '0 4px', height: 'auto' }}
                              onClick={() => handleStopMedication(med.id)}
                            />
                          </Tooltip>
                        </Space>
                      )}
                    </Space>
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Add Allergy Modal */}
      <Modal
        title="Ghi nhận thông tin dị ứng"
        open={addAllergyOpen}
        onOk={handleAddAllergy}
        onCancel={() => { setAddAllergyOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Huỷ"
        width={480}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Thông tin này sẽ được ghi nhận với trạng thái "Bạn đã cung cấp" cho đến khi nhân viên y tế xác nhận.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Loại dị ứng" rules={[{ required: true }]} initialValue="medication">
            <Select>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="substance" label="Chất / thứ gây dị ứng" rules={[{ required: true, message: 'Vui lòng nhập tên chất gây dị ứng' }]}>
            <Input placeholder="Ví dụ: Penicillin, Tôm, Phấn hoa..." />
          </Form.Item>
          <Form.Item name="reaction" label="Biểu hiện phản ứng">
            <Input placeholder="Ví dụ: Nổi mề đay, khó thở, sưng mặt..." />
          </Form.Item>
          <Form.Item name="severity" label="Mức độ nặng">
            <Select allowClear placeholder="Chọn mức độ">
              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Thông tin bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Narrative Modal */}
      <Modal
        title="Cập nhật thông tin tự khai"
        open={narrativeOpen}
        onOk={handleSaveNarrative}
        onCancel={() => setNarrativeOpen(false)}
        confirmLoading={narrativeSaving}
        okText="Lưu"
        cancelText="Huỷ"
        width={560}
      >
        <Form form={narrativeForm} layout="vertical">
          <Form.Item name="occupation" label="Nghề nghiệp">
            <Input placeholder="Ví dụ: Giáo viên, Kỹ sư, Nội trợ..." />
          </Form.Item>
          <Form.Item name="chiefComplaint" label="Lý do đến khám chính">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn lý do đến khám..." />
          </Form.Item>
          <Form.Item name="medicalHistory" label="Tiền sử bệnh tật">
            <Input.TextArea rows={3} placeholder="Các bệnh đã/đang mắc, phẫu thuật đã thực hiện..." />
          </Form.Item>
          <Form.Item name="familyHistory" label="Tiền sử gia đình">
            <Input.TextArea rows={2} placeholder="Bệnh di truyền, bệnh mạn tính trong gia đình..." />
          </Form.Item>
          <Form.Item name="currentSymptoms" label="Triệu chứng hiện tại">
            <Input.TextArea rows={2} placeholder="Các triệu chứng bạn đang gặp phải..." />
          </Form.Item>
          <Form.Item name="lifestyle" label="Lối sống">
            <Input.TextArea rows={2} placeholder="Thói quen ăn uống, vận động, hút thuốc, uống rượu..." />
          </Form.Item>
          <Form.Item name="surgicalHistory" label="Tiền sử phẫu thuật">
            <Input.TextArea rows={2} placeholder="Các phẫu thuật đã thực hiện, năm thực hiện..." />
          </Form.Item>
          <Form.Item name="vaccinationNotes" label="Tiêm chủng">
            <Input.TextArea rows={2} placeholder="Các vaccine đã tiêm, lịch tiêm nhắc lại..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Problem Entry Modal */}
      <Modal
        title={editProblemId ? 'Cập nhật vấn đề sức khỏe' : 'Thêm vấn đề sức khỏe bền vững'}
        open={addProblemOpen}
        onOk={handleSaveProblem}
        onCancel={() => { setAddProblemOpen(false); setEditProblemId(null); problemForm.resetFields(); }}
        confirmLoading={problemSaving}
        okText="Lưu"
        cancelText="Huỷ"
        width={480}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Các vấn đề sức khỏe được ghi nhận ở đây sẽ được lưu lâu dài và bác sĩ ở các cơ sở khác có thể thấy khi xem hồ sơ.
        </Text>
        <Form form={problemForm} layout="vertical">
          <Form.Item name="conditionName" label="Tên chẩn đoán / bệnh lý" rules={[{ required: true, message: 'Vui lòng nhập tên bệnh lý' }]}>
            <Input placeholder="Ví dụ: Đái tháo đường type 2, Tăng huyết áp..." />
          </Form.Item>
          <Form.Item name="conditionCode" label="Mã ICD-10 (nếu có)">
            <Input placeholder="Ví dụ: E11.9, I10..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select>
              <Select.Option value="active">Đang hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
              <Select.Option value="resolved">Đã khỏi</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="onsetDate" label="Ngày khởi phát">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Mức độ">
                <Select allowClear placeholder="Chọn mức độ">
                  <Select.Option value="mild">Nhẹ</Select.Option>
                  <Select.Option value="moderate">Trung bình</Select.Option>
                  <Select.Option value="severe">Nặng</Select.Option>
                  <Select.Option value="critical">Nguy kịch</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Thông tin bổ sung về chẩn đoán này..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Current Medication Modal */}
      <Modal
        title={editMedId ? 'Cập nhật thuốc đang dùng' : 'Thêm thuốc dùng thường xuyên'}
        open={addMedOpen}
        onOk={handleSaveMedication}
        onCancel={() => { setAddMedOpen(false); setEditMedId(null); medForm.resetFields(); }}
        confirmLoading={medSaving}
        okText="Lưu"
        cancelText="Huỷ"
        width={480}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Các thuốc ghi nhận ở đây là thuốc dùng dài hạn hoặc đang dùng hiện tại — không phải đơn thuốc từng lần khám.
        </Text>
        <Form form={medForm} layout="vertical">
          <Form.Item name="medicationName" label="Tên thuốc" rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}>
            <Input placeholder="Ví dụ: Metformin, Amlodipine, Atorvastatin..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dosage" label="Liều dùng">
                <Input placeholder="Ví dụ: 500mg, 5mg..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="frequency" label="Tần suất">
                <Input placeholder="Ví dụ: 2 lần/ngày, sáng tối..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="route" label="Đường dùng">
                <Input placeholder="Ví dụ: Uống, tiêm, bôi..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startedAt" label="Ngày bắt đầu">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Lý do dùng, chú ý đặc biệt..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
