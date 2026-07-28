import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Col, Descriptions, Empty, Input, Modal, Row, Select, Skeleton, Space, Tag, Timeline, Typography,
} from 'antd';
import {
  Activity, ArrowLeft, CalendarDays, Camera, Droplets, FileHeart, HeartPulse,
  Mail, MapPin, Phone, Printer, Search, ShieldCheck, Stethoscope, UserRound,
} from 'lucide-react';
import {
  getLifetimeMedicalRecord,
  type LifetimeMedicalRecord,
  type LifetimeRecordEvent,
  type LifetimeRecordEventType,
} from '../api/lifetimeMedicalRecord';
import { useAppState } from '../state/useAppState';

const { Title, Text, Paragraph } = Typography;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

const EVENT_COLOR: Record<string, string> = {
  diagnosis: 'red',
  prescription: 'blue',
  procedure: 'purple',
  laboratory: 'gold',
  imaging: 'cyan',
  encounter: 'green',
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
    <div style={{ paddingBottom: 8 }}>
      <Space size={6} wrap>
        <Text strong>{event.title}</Text>
        {event.status && <Tag>{event.status}</Tag>}
        <Tag color={verifiedAt ? 'green' : 'default'}>
          {verifiedAt ? 'Nguồn đã đối soát' : 'Chưa đối soát nguồn'}
        </Tag>
      </Space>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
        {formatDate(event.occurredAt)}
        {event.practitionerName ? ` · ${event.practitionerName}` : ''}
        {sourceLabel ? ` · ${sourceLabel}` : ''}
      </Text>
      {event.summary && (
        <Paragraph style={{ margin: '8px 0 0', padding: '9px 11px', background: 'var(--surface-subtle)', borderRadius: 8, fontSize: 12.5 }}>
          {event.summary}
        </Paragraph>
      )}
      {(event.diagnoses.length > 0 || event.medications.length > 0) && (
        <Space size={[5, 5]} wrap style={{ marginTop: 8 }}>
          {event.diagnoses.map((item) => <Tag color="red" key={item.id}>{item.display}</Tag>)}
          {event.medications.map((item) => <Tag color="blue" key={item.id}>{item.display}</Tag>)}
        </Space>
      )}
      <Text type="secondary" style={{ display: 'block', marginTop: 7, fontSize: 10.5 }}>
        Nguồn: {event.provenance.sourceSystem || event.source.system || 'Hệ thống cơ sở'}
        {event.provenance.sourceRecordId ? ` · Mã nguồn ${event.provenance.sourceRecordId}` : ' · Thiếu mã bản ghi nguồn'}
        {verifiedAt ? ` · Đối soát ${formatDate(verifiedAt)}` : ''}
      </Text>
    </div>
  );
}

export default function PatientClinicalWorkspace() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const { currentPatient, role } = useAppState();
  const effectivePatientId = patientId ?? currentPatient.id;
  const [record, setRecord] = useState<LifetimeMedicalRecord>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [eventType, setEventType] = useState<LifetimeRecordEventType | 'all'>('all');
  const [sourceOrganizationId, setSourceOrganizationId] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [compareImageIds, setCompareImageIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
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
  const isOwnPatientContext = effectivePatientId === currentPatient.id;
  const profile = isOwnPatientContext ? currentPatient.profile : undefined;
  const canEditClinical = role === 'doctor' || role === 'medical_administrator';
  const unverifiedEventCount = sortedEvents.filter((event) => !event.provenance.lastVerifiedAt).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>Quay lại</Button>
        <Space wrap>
          <Button icon={<Printer size={14} />} onClick={() => window.print()}>In tóm tắt</Button>
          {canEditClinical && <Button type="primary" icon={<Stethoscope size={14} />} onClick={() => navigate('/app/records')}>Cập nhật lượt khám</Button>}
        </Space>
      </div>

      {error && <Alert type="warning" showIcon message="Chưa tải đủ dữ liệu lâm sàng" description={error} />}
      <Skeleton loading={loading} active>
        <Card>
          <Row gutter={[18, 18]} align="middle">
            <Col>
              <Avatar
                shape="square"
                size={88}
                icon={<UserRound size={38} />}
                style={{ background: 'linear-gradient(145deg, #dcecf7, #b8d5e7)', color: 'var(--medical-blue-700)' }}
              />
            </Col>
            <Col flex="auto">
              <Space size={8} wrap>
                <Title level={2} style={{ margin: 0 }}>{patient?.name ?? currentPatient.name}</Title>
                <Tag color={unverifiedEventCount === 0 && sortedEvents.length > 0 ? 'green' : 'blue'} icon={<ShieldCheck size={12} />}>
                  {unverifiedEventCount === 0 && sortedEvents.length > 0
                    ? 'Các nguồn đã đối soát'
                    : `Hồ sơ tổng hợp · ${record?.summary.organizationCount ?? 0} đơn vị`}
                </Tag>
              </Space>
              <Space size={[14, 6]} wrap style={{ marginTop: 7 }}>
                <Text><UserRound size={13} style={{ verticalAlign: -2 }} /> {patient?.gender ?? profile?.gender ?? 'Chưa cập nhật'}</Text>
                <Text><CalendarDays size={13} style={{ verticalAlign: -2 }} /> {formatDate(patient?.dob ?? profile?.dob)}</Text>
                <Text type="secondary">Mã BN: {patient?.code ?? currentPatient.code}</Text>
                {patient?.nationalHealthId && <Text type="secondary">Mã định danh: {patient.nationalHealthId}</Text>}
              </Space>
              {profile && (
                <Space size={[14, 6]} wrap style={{ marginTop: 8 }}>
                  <Text type="secondary"><Phone size={13} style={{ verticalAlign: -2 }} /> {profile.phone || 'Chưa có SĐT'}</Text>
                  <Text type="secondary"><Mail size={13} style={{ verticalAlign: -2 }} /> {profile.email || 'Chưa có email'}</Text>
                  <Text type="secondary"><MapPin size={13} style={{ verticalAlign: -2 }} /> {profile.address || 'Chưa có địa chỉ'}</Text>
                </Space>
              )}
            </Col>
          </Row>
        </Card>

        {unverifiedEventCount > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`${unverifiedEventCount} sự kiện chưa có dấu đối soát nguồn`}
            description="Vẫn hiển thị để bác sĩ có bối cảnh, nhưng không nên dùng làm căn cứ duy nhất cho quyết định lâm sàng cho tới khi kiểm tra nguồn gốc."
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card title={<Space><HeartPulse size={16} /> Tóm tắt an toàn lâm sàng</Space>} size="small">
                <Descriptions
                  size="small"
                  column={2}
                  layout="vertical"
                  items={[
                    { key: 'blood', label: 'Nhóm máu', children: <Text strong>{patient?.bloodType ?? profile?.bloodType ?? '—'}</Text> },
                    { key: 'encounters', label: 'Tổng lượt khám', children: <Text strong>{record?.summary.encounterCount ?? 0}</Text> },
                    { key: 'last', label: 'Cập nhật cuối', span: 2, children: formatDate(record?.summary.lastRecordedAt) },
                  ]}
                />
                <div style={{ marginTop: 10 }}>
                  <Text strong style={{ fontSize: 12 }}>Dị ứng/cảnh báo</Text>
                  <div style={{ marginTop: 6 }}>
                    {record?.summary.allergies.length
                      ? record.summary.allergies.map((item) => <Tag color="red" key={item.id}>{item.display}</Tag>)
                      : <Tag>Không có dữ liệu dị ứng</Tag>}
                  </div>
                </div>
              </Card>

              <Card title={<Space><Activity size={16} /> Chẩn đoán đang theo dõi</Space>} size="small">
                {record?.summary.activeConditions.length
                  ? record.summary.activeConditions.map((item) => (
                    <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                      <Text strong>{item.display}</Text>
                      {(item.code || item.note) && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{item.code}{item.note ? ` · ${item.note}` : ''}</Text>}
                    </div>
                  ))
                  : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chẩn đoán đang hoạt động" />}
              </Card>

              <Card title={<Space><Droplets size={16} /> Thuốc đang sử dụng</Space>} size="small">
                {record?.summary.currentMedications.length
                  ? record.summary.currentMedications.map((item) => <Tag color="blue" key={item.id} style={{ marginBottom: 6 }}>{item.display}</Tag>)
                  : <Text type="secondary">Chưa có thuốc đang sử dụng.</Text>}
              </Card>
            </Space>
          </Col>

          <Col xs={24} xl={16}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card
                title={<Space><Camera size={16} /> Ảnh lâm sàng gần đây</Space>}
                size="small"
                extra={(
                  <Space wrap>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>Chọn đúng 2 ảnh để đối chiếu</Text>
                    <Button size="small" disabled={compareImageIds.length !== 2} onClick={() => setCompareOpen(true)}>
                      Đối chiếu ({compareImageIds.length}/2)
                    </Button>
                    <Button type="link" onClick={() => navigate('/app/progress')}>Xem tiến triển</Button>
                  </Space>
                )}
              >
                {clinicalImages.length ? (
                  <Row gutter={[10, 10]}>
                    {clinicalImages.map((image) => {
                      const selected = compareImageIds.includes(image.id);
                      const selectionLocked = compareImageIds.length >= 2 && !selected;
                      return (
                        <Col xs={24} md={8} key={image.id}>
                          <div style={{ overflow: 'hidden', borderRadius: 9, border: `2px solid ${selected ? 'var(--medical-blue-500)' : 'var(--border-default)'}` }}>
                            <img src={image.downloadUrl!} alt={image.title} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: 8 }}>
                              <Text strong style={{ fontSize: 12 }}>{image.title}</Text>
                              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                                {formatDate(image.occurredAt)} · {image.sourceLabel}
                              </Text>
                              <Button
                                block
                                size="small"
                                type={selected ? 'primary' : 'default'}
                                disabled={selectionLocked}
                                style={{ marginTop: 7 }}
                                onClick={() => setCompareImageIds((ids) =>
                                  selected ? ids.filter((id) => id !== image.id) : [...ids, image.id],
                                )}
                              >
                                {selected ? 'Đã chọn' : 'Chọn đối chiếu'}
                              </Button>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có ảnh lâm sàng được ký và đính kèm hồ sơ" />
                )}
              </Card>

              <Card title={<Space><FileHeart size={16} /> Tiến trình điều trị & ghi chú</Space>} size="small" extra={<Tag>{visibleEvents.length}/{sortedEvents.length} sự kiện</Tag>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 18 }}>
                  <Input
                    allowClear
                    prefix={<Search size={14} />}
                    placeholder="Tìm chẩn đoán, thuốc, bác sĩ..."
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                  />
                  <Select
                    value={eventType}
                    onChange={setEventType}
                    options={[
                      { value: 'all', label: 'Mọi loại sự kiện' },
                      ...Object.entries(EVENT_LABEL).map(([value, label]) => ({ value, label })),
                    ]}
                  />
                  <Select
                    value={sourceOrganizationId}
                    onChange={setSourceOrganizationId}
                    options={[{ value: 'all', label: 'Mọi đơn vị' }, ...sourceOptions]}
                  />
                </div>
                {visibleEvents.length ? (
                  <Timeline
                    items={visibleEvents.map((event) => ({
                      color: EVENT_COLOR[event.type] ?? 'gray',
                      children: <ClinicalTimelineItem event={event} />,
                    }))}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={sortedEvents.length ? 'Không có sự kiện phù hợp bộ lọc' : 'Chưa có sự kiện điều trị'} />
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </Skeleton>

      <Modal
        title="Đối chiếu ảnh lâm sàng"
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={<Button type="primary" onClick={() => setCompareOpen(false)}>Đóng</Button>}
        width={980}
      >
        <Alert
          type="info"
          showIcon
          message="Ảnh chỉ có giá trị so sánh khi cùng vùng cơ thể và điều kiện chụp tương đương"
          description="Hệ thống đang hiển thị ảnh gốc cùng ngày và nguồn. Không tự kết luận tiến triển nếu thiếu protocol chụp chuẩn hóa."
          style={{ marginBottom: 14 }}
        />
        <Row gutter={[14, 14]}>
          {compareImages.map((image) => (
            <Col xs={24} md={12} key={image.id}>
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
                <img src={image.downloadUrl!} alt={image.title} style={{ width: '100%', height: 390, objectFit: 'contain', background: '#111827', display: 'block' }} />
                <div style={{ padding: 11 }}>
                  <Text strong>{image.title}</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: 3, fontSize: 12 }}>
                    {formatDate(image.occurredAt)} · {image.sourceLabel}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    {image.signedAt ? `Đã ký ${formatDate(image.signedAt)}` : 'Chưa có thông tin chữ ký tài liệu'}
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
