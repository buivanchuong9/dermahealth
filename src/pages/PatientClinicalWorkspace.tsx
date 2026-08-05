import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Col, Collapse, Descriptions, Input, Modal, Row, Select, Skeleton, Space, Tag, Timeline, Typography,
} from 'antd';
import {
  Activity, ArrowLeft, CalendarDays, Camera, Droplets, FileHeart, HeartPulse,
  Mail, MapPin, Phone, Printer, Search, ShieldCheck, Stethoscope, UserRound, Eye
} from 'lucide-react';
import {
  getLifetimeMedicalRecord,
  type LifetimeMedicalRecord,
  type LifetimeRecordEvent,
  type LifetimeRecordEventType,
} from '../api/lifetimeMedicalRecord';
import { useAppState } from '../state/useAppState';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const DermaTimeline = lazy(() =>
  import('../components/medical-record/DermaTimeline').then((module) => ({
    default: module.DermaTimeline,
  })),
);

const { Title, Text, Paragraph } = Typography;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa cập nhật';

const EVENT_COLOR: Record<string, string> = {
  diagnosis: '#dc2626',
  prescription: '#0284c7',
  procedure: '#7c3aed',
  laboratory: '#d97706',
  imaging: '#0891b2',
  encounter: '#16a34a',
};

const EVENT_LABEL: Record<LifetimeRecordEventType, string> = {
  encounter: 'Lượt khám',
  diagnosis: 'Chẩn đoán',
  procedure: 'Thủ thuật',
  prescription: 'Đơn thuốc',
  laboratory: 'Xét nghiệm',
  imaging: 'Chẩn đoán hình ảnh',
  vaccination: 'Tiêm chủng',
  allergy: 'Dị ứng',
  document: 'Tài liệu',
  care_plan: 'Kế hoạch chăm sóc',
};

function ClinicalTimelineItem({ event }: { event: LifetimeRecordEvent }) {
  const verifiedAt = event.provenance.lastVerifiedAt;
  const sourceLabel = event.source.facilityName || event.source.organizationName;
  return (
    <div style={{ paddingBottom: 12 }}>
      <Space size={6} wrap>
        <Text strong style={{ fontSize: 13.5, color: '#0f172a' }}>{event.title}</Text>
        {event.status && <Tag className="emr-subtle-tag">{event.status}</Tag>}
        <Tag color={verifiedAt ? 'green' : 'default'} style={{ fontSize: 11 }}>
          {verifiedAt ? 'Nguồn đã đối soát' : 'Chưa đối soát nguồn'}
        </Tag>
      </Space>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 3 }}>
        {formatDate(event.occurredAt)}
        {event.practitionerName ? ` · BS. ${event.practitionerName}` : ''}
        {sourceLabel ? ` · ${sourceLabel}` : ''}
      </Text>
      {event.summary && (
        <Paragraph style={{ margin: '8px 0 0', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, color: '#334155' }}>
          {event.summary}
        </Paragraph>
      )}
      {(event.diagnoses.length > 0 || event.medications.length > 0) && (
        <Space size={[6, 6]} wrap style={{ marginTop: 8 }}>
          {event.diagnoses.map((item) => <Tag color="error" key={item.id}>{item.display}</Tag>)}
          {event.medications.map((item) => <Tag color="processing" key={item.id}>{item.display}</Tag>)}
        </Space>
      )}
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
        Nguồn: {event.provenance.sourceSystem || event.source.system || 'Hệ thống CSYT'}
        {event.provenance.sourceRecordId ? ` · Mã bản ghi: ${event.provenance.sourceRecordId}` : ''}
        {verifiedAt ? ` · Đối soát ngày ${formatDate(verifiedAt)}` : ''}
      </Text>
    </div>
  );
}

export default function PatientClinicalWorkspace() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const { currentPatient, currentUser, role } = useAppState();
  const effectivePatientId = patientId ?? currentPatient?.id ?? '';
  const [record, setRecord] = useState<LifetimeMedicalRecord>();
  const [loading, setLoading] = useState(() => Boolean(effectivePatientId));
  const [error, setError] = useState<string>();
  const [eventType, setEventType] = useState<LifetimeRecordEventType | 'all'>('all');
  const [sourceOrganizationId, setSourceOrganizationId] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [compareImageIds, setCompareImageIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // The patients API does not expose an avatar for arbitrary patient
  // records, only for the signed-in user's own account — so this can only
  // ever show a photo when the viewer is looking at their own chart.
  const avatarUrl =
    currentPatient?.id === effectivePatientId ? currentUser?.avatarUrl : undefined;

  useEffect(() => {
    if (!effectivePatientId) return;
    let active = true;
    getLifetimeMedicalRecord(effectivePatientId)
      .then((value) => { if (active) setRecord(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ lâm sàng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [effectivePatientId]);

  const sortedEvents = useMemo(
    () => [...(record?.events ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [record?.events],
  );
  const sourceOptions = useMemo(() => {
    const organizations = new Map<string, string>();
    sortedEvents.forEach((event) => {
      if (event.source.organizationId) {
        organizations.set(event.source.organizationId, event.source.organizationName || 'Đơn vị y tế');
      }
    });
    return [...organizations.entries()].map(([value, label]) => ({ value, label }));
  }, [sortedEvents]);

  const visibleEvents = useMemo(() => {
    const normalizedSearch = eventSearch.trim().toLocaleLowerCase('vi');
    return sortedEvents.filter((event) => {
      if (eventType !== 'all' && event.type !== eventType) return false;
      if (sourceOrganizationId !== 'all' && event.source.organizationId !== sourceOrganizationId) return false;
      if (!normalizedSearch) return true;
      const searchable = [
        event.title,
        event.summary,
        event.practitionerName,
        event.source.organizationName,
        event.source.facilityName,
        ...event.diagnoses.map((item) => item.display),
        ...event.medications.map((item) => item.display),
      ].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return searchable.includes(normalizedSearch);
    });
  }, [eventSearch, eventType, sortedEvents, sourceOrganizationId]);

  const clinicalImages = useMemo(
    () => sortedEvents.flatMap((event) =>
      event.documents
        .filter((document) => document.contentType?.startsWith('image/') && document.downloadUrl)
        .map((document) => ({
          ...document,
          occurredAt: event.occurredAt,
          eventTitle: event.title,
          sourceLabel: event.source.facilityName || event.source.organizationName,
        })),
    ).slice(0, 12),
    [sortedEvents],
  );

  const compareImages = clinicalImages.filter((image) => compareImageIds.includes(image.id));
  const patient = record?.patient;
  const isOwnPatientContext = Boolean(currentPatient) && effectivePatientId === currentPatient?.id;
  const livePatient =
    isOwnPatientContext && currentPatient && (!patient?.id || patient.id === currentPatient.id)
      ? currentPatient
      : undefined;
  const profile = livePatient?.profile;
  const canEditClinical = role === 'doctor' || role === 'medical_administrator';
  const unverifiedEventCount = sortedEvents.filter((event) => !event.provenance.lastVerifiedAt).length;

  const displayName = livePatient?.name || patient?.name || 'Bệnh nhân';
  const patientCode = livePatient?.code || patient?.code || '—';
  const patientGender = profile?.gender || patient?.gender || 'Chưa cập nhật';
  const patientDob = profile?.dob || patient?.dob;
  const patientBloodType = profile?.bloodType || patient?.bloodType || 'Chưa cập nhật';
  const patientPhone = profile?.phone || patient?.phone || '—';
  const patientEmail = profile?.email || patient?.email || '—';
  const patientAddress = profile?.address || patient?.address || '—';
  const initials = displayName
    .split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="emr-container" style={{ padding: '16px 20px 40px' }}>
      {/* Header Action Bar */}
      <div className="emr-header-toolbar" style={{ marginBottom: 16 }}>
        <Button className="emr-action-btn" icon={<ArrowLeft size={16} className="emr-btn-icon" />} onClick={() => navigate(-1)}>
          Quay lại hồ sơ
        </Button>
        <Space wrap>
          <Button className="emr-action-btn" icon={<Printer size={16} className="emr-btn-icon" />} onClick={() => window.print()}>
            In tóm tắt 360°
          </Button>
          {canEditClinical && (
            <Button type="primary" icon={<Stethoscope size={15} />} style={{ borderRadius: 8, fontWeight: 600, background: '#0f172a' }} onClick={() => navigate('/app/records')}>
              Cập nhật đợt khám mới
            </Button>
          )}
        </Space>
      </div>

      {error && <Alert type="warning" showIcon message="Thông báo dữ liệu lâm sàng" description={error} style={{ marginBottom: 16 }} />}

      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        {/* Patient Identity Header Banner */}
        <Card bordered={false} className="emr-card" style={{ marginBottom: 16 }}>
          <Row gutter={[20, 16]} align="middle">
            <Col>
              <Avatar
                shape="square"
                size={80}
                src={avatarUrl}
                style={{ borderRadius: 10, backgroundColor: '#334155', color: '#ffffff', fontSize: 24, fontWeight: 700 }}
              >
                {!avatarUrl && (initials || <UserRound size={32} />)}
              </Avatar>
            </Col>
            <Col flex="auto">
              <Space size={8} wrap align="center">
                <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {displayName}
                </Title>
                <Tag color={unverifiedEventCount === 0 && sortedEvents.length > 0 ? 'green' : 'blue'} icon={<ShieldCheck size={13} style={{ verticalAlign: -2 }} />}>
                  {unverifiedEventCount === 0 && sortedEvents.length > 0
                    ? 'Nguồn đối soát quốc gia'
                    : `Hồ sơ tổng hợp · ${record?.summary.organizationCount ?? 1} đơn vị`}
                </Tag>
              </Space>
              <Space size={[16, 6]} wrap style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: '#475569' }}><UserRound size={14} style={{ verticalAlign: -2, color: '#64748b' }} /> {patientGender}</Text>
                <Text style={{ fontSize: 13, color: '#475569' }}><CalendarDays size={14} style={{ verticalAlign: -2, color: '#64748b' }} /> {formatDate(patientDob)}</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>Mã BN: <strong style={{ color: '#0f172a' }}>{patientCode}</strong></Text>
                {patient?.nationalHealthId && <Text type="secondary" style={{ fontSize: 13 }}>VNeID: <strong>{patient.nationalHealthId}</strong></Text>}
              </Space>
              <Space size={[16, 6]} wrap style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12.5 }}><Phone size={13} style={{ verticalAlign: -2 }} /> {patientPhone}</Text>
                <Text type="secondary" style={{ fontSize: 12.5 }}><Mail size={13} style={{ verticalAlign: -2 }} /> {patientEmail}</Text>
                <Text type="secondary" style={{ fontSize: 12.5 }}><MapPin size={13} style={{ verticalAlign: -2 }} /> {patientAddress}</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {unverifiedEventCount > 0 && (
          <Alert
            type="info"
            showIcon
            message={`${unverifiedEventCount} sự kiện chưa có dấu đối soát nguồn dữ liệu`}
            description="Vẫn hiển thị đầy đủ để bác sĩ theo dõi toàn diện bối cảnh lâm sàng của bệnh nhân."
            style={{ marginBottom: 16 }}
          />
        )}

        <Collapse
          style={{ marginBottom: 16, background: '#ffffff' }}
          items={[{
            key: 'derma-timeline',
            label: 'DermaTimeline · Tiến triển tổn thương',
            children: (
              <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
                <DermaTimeline
                  patientId={effectivePatientId}
                  user={{ id: currentUser.id, name: currentUser.name, role }}
                />
              </Suspense>
            ),
          }]}
        />

        {/* Master Workspace Grid (Left 35% Summary / Right 65% Timeline & Images) */}
        <Row gutter={[16, 16]}>
          {/* Left Column: Safety & Chronic Summary */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card
                bordered={false}
                className="emr-card"
                title={
                  <div className="emr-card-header">
                    <HeartPulse size={17} className="emr-card-header__icon" />
                    <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Tóm tắt an toàn lâm sàng</Title>
                  </div>
                }
              >
                <Descriptions
                  size="small"
                  column={2}
                  layout="vertical"
                  items={[
                    { key: 'blood', label: <span style={{ color: '#64748b', fontSize: 12 }}>Nhóm máu</span>, children: <Text strong style={{ fontSize: 14 }}>{patientBloodType}</Text> },
                    { key: 'encounters', label: <span style={{ color: '#64748b', fontSize: 12 }}>Tổng lượt khám</span>, children: <Text strong style={{ fontSize: 14 }}>{record?.summary.encounterCount ?? 1}</Text> },
                    { key: 'last', label: <span style={{ color: '#64748b', fontSize: 12 }}>Cập nhật gần nhất</span>, span: 2, children: <Text style={{ fontSize: 13 }}>{formatDate(record?.summary.lastRecordedAt)}</Text> },
                  ]}
                />
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                  <Text strong style={{ fontSize: 12, color: '#334155', display: 'block', marginBottom: 6 }}>CẢNH BÁO DỊ ỨNG & THUỐC:</Text>
                  {record?.summary.allergies.length ? (
                    record.summary.allergies.map((item) => <Tag color="error" key={item.id}>{item.display}</Tag>)
                  ) : (
                    <Tag className="emr-subtle-tag">NKA - Chưa có dữ liệu dị ứng</Tag>
                  )}
                </div>
              </Card>

              <Card
                bordered={false}
                className="emr-card"
                title={
                  <div className="emr-card-header">
                    <Activity size={17} className="emr-card-header__icon" />
                    <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Chẩn đoán đang theo dõi</Title>
                  </div>
                }
              >
                {record?.summary.activeConditions.length ? (
                  record.summary.activeConditions.map((item) => (
                    <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <Text strong style={{ color: '#0f172a', fontSize: 13 }}>{item.display}</Text>
                      {(item.code || item.note) && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{item.code}{item.note ? ` · ${item.note}` : ''}</Text>}
                    </div>
                  ))
                ) : (
                  <ProfessionalEmpty title="Chưa có chẩn đoán mạn tính" description="Bệnh nhân chưa có ghi nhận chẩn đoán kéo dài." />
                )}
              </Card>

              <Card
                bordered={false}
                className="emr-card"
                title={
                  <div className="emr-card-header">
                    <Droplets size={17} className="emr-card-header__icon" />
                    <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Thuốc đang sử dụng</Title>
                  </div>
                }
              >
                {record?.summary.currentMedications.length ? (
                  record.summary.currentMedications.map((item) => <Tag color="blue" key={item.id} style={{ marginBottom: 6 }}>{item.display}</Tag>)
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>Chưa ghi nhận thuốc đang hoạt động.</Text>
                )}
              </Card>
            </Space>
          </Col>

          {/* Right Column: Timeline & Clinical Photos Inspection */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* Clinical Image Repository */}
              <Card
                bordered={false}
                className="emr-card"
                title={
                  <div className="emr-card-header">
                    <Camera size={17} className="emr-card-header__icon" />
                    <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Ảnh lâm sàng & Tư liệu hình ảnh</Title>
                  </div>
                }
                extra={
                  <Space wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>Chọn 2 ảnh để đối chiếu</Text>
                    <Button size="small" className="emr-action-btn" disabled={compareImageIds.length !== 2} onClick={() => setCompareOpen(true)}>
                      <Eye size={13} className="emr-btn-icon" /> Đối chiếu ({compareImageIds.length}/2)
                    </Button>
                  </Space>
                }
              >
                {clinicalImages.length ? (
                  <Row gutter={[12, 12]}>
                    {clinicalImages.map((image) => {
                      const selected = compareImageIds.includes(image.id);
                      const selectionLocked = compareImageIds.length >= 2 && !selected;
                      return (
                        <Col xs={24} sm={12} md={8} key={image.id}>
                          <div style={{ overflow: 'hidden', borderRadius: 10, border: `2px solid ${selected ? '#0284c7' : '#e2e8f0'}`, background: '#ffffff' }}>
                            <img src={image.downloadUrl!} alt={image.title} style={{ width: '100%', height: 125, objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: 10 }}>
                              <Text strong style={{ fontSize: 12.5, color: '#0f172a', display: 'block' }}>{image.title}</Text>
                              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
                                {formatDate(image.occurredAt)} · {image.sourceLabel}
                              </Text>
                              <Button
                                block
                                size="small"
                                type={selected ? 'primary' : 'default'}
                                disabled={selectionLocked}
                                onClick={() => setCompareImageIds((ids) =>
                                  selected ? ids.filter((id) => id !== image.id) : [...ids, image.id],
                                )}
                              >
                                {selected ? 'Đã chọn đối chiếu' : 'Chọn đối chiếu'}
                              </Button>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <ProfessionalEmpty title="Chưa có tài liệu hình ảnh" description="Không tìm thấy hình ảnh tổn thương đính kèm đợt khám." />
                )}
              </Card>

              {/* Master Clinical Timeline & Filter Bar */}
              <Card
                bordered={false}
                className="emr-card"
                title={
                  <div className="emr-card-header">
                    <FileHeart size={17} className="emr-card-header__icon" />
                    <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Tiến trình điều trị & Lịch sử lâm sàng 360°</Title>
                  </div>
                }
                extra={<Tag className="emr-subtle-tag">{visibleEvents.length}/{sortedEvents.length} sự kiện</Tag>}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 20 }}>
                  <Input
                    allowClear
                    prefix={<Search size={14} style={{ color: '#64748b' }} />}
                    placeholder="Tìm chẩn đoán, thuốc, bác sĩ..."
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                    style={{ borderRadius: 8 }}
                  />
                  <Select
                    value={eventType}
                    onChange={setEventType}
                    options={[
                      { value: 'all', label: 'Mọi loại sự kiện' },
                      ...Object.entries(EVENT_LABEL).map(([value, label]) => ({ value, label })),
                    ]}
                    style={{ borderRadius: 8 }}
                  />
                  <Select
                    value={sourceOrganizationId}
                    onChange={setSourceOrganizationId}
                    options={[{ value: 'all', label: 'Mọi đơn vị CSYT' }, ...sourceOptions]}
                    style={{ borderRadius: 8 }}
                  />
                </div>

                {visibleEvents.length ? (
                  <Timeline
                    items={visibleEvents.map((event) => ({
                      color: EVENT_COLOR[event.type] ?? '#64748b',
                      children: <ClinicalTimelineItem event={event} />,
                    }))}
                  />
                ) : (
                  <ProfessionalEmpty title="Không có sự kiện phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc sự kiện." />
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </Skeleton>

      {/* Image Comparison Modal */}
      <Modal
        title="Đối chiếu tài liệu hình ảnh lâm sàng"
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={<Button className="emr-action-btn" onClick={() => setCompareOpen(false)}>Đóng đối chiếu</Button>}
        width={960}
      >
        <Alert
          type="info"
          showIcon
          message="Đối chiếu so sánh tổn thương da"
          description="So sánh trực quan hai góc chụp ở các đợt khám khác nhau để hỗ trợ đánh giá tiến triển điều trị."
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          {compareImages.map((image) => (
            <Col xs={24} md={12} key={image.id}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
                <img src={image.downloadUrl!} alt={image.title} style={{ width: '100%', height: 380, objectFit: 'contain', display: 'block' }} />
                <div style={{ padding: 12, background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                  <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{image.title}</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
                    {formatDate(image.occurredAt)} · {image.sourceLabel}
                  </Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Modal>
    </div>
  );
}
