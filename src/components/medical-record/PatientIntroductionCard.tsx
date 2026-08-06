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
} from 'lucide-react';
import type {
  AllergyIntolerance,
  AllergyKnowledgeState,
  LifetimeMedicalRecord,
  VitalObservation,
} from '../../api/lifetimeMedicalRecord';
import { createAllergy, verifyAllergy } from '../../api/lifetimeMedicalRecord';

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
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const allergies = record?.allergies ?? [];
  const vitals = record?.vitals ?? [];
  const narrative = record?.narrative;
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

  async function handleVerify(allergyId: string) {
    try {
      await verifyAllergy(patientId, allergyId);
      void message.success('Đã xác nhận lâm sàng');
      onRecordUpdated?.();
    } catch {
      void message.error('Không thể xác nhận. Vui lòng thử lại.');
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
              <Space style={{ marginBottom: 10 }}>
                <Text strong style={{ fontSize: 13 }}>Thông tin bệnh nhân tự khai</Text>
                <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>
                  Bạn đã cung cấp
                </Tag>
              </Space>
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
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '5px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#64748b', minWidth: 160, flexShrink: 0 }}>{label}:</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: value ? '#0f172a' : '#94a3b8',
                      fontStyle: value ? 'normal' : 'italic',
                    }}
                  >
                    {value || 'Chưa ghi nhận'}
                  </Text>
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
    </>
  );
};
