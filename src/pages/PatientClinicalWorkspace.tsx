import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Col, Descriptions, Empty, Row, Skeleton, Space, Tag, Timeline, Typography,
} from 'antd';
import {
  Activity, ArrowLeft, CalendarDays, Camera, Droplets, FileHeart, HeartPulse,
  Mail, MapPin, Phone, Printer, ShieldCheck, Stethoscope, UserRound,
} from 'lucide-react';
import { getLifetimeMedicalRecord, type LifetimeMedicalRecord, type LifetimeRecordEvent } from '../api/lifetimeMedicalRecord';
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

function ClinicalTimelineItem({ event }: { event: LifetimeRecordEvent }) {
  return (
    <div style={{ paddingBottom: 8 }}>
      <Space size={6} wrap>
        <Text strong>{event.title}</Text>
        {event.status && <Tag>{event.status}</Tag>}
      </Space>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
        {formatDate(event.occurredAt)}
        {event.practitionerName ? ` · ${event.practitionerName}` : ''}
        {event.source.facilityName ? ` · ${event.source.facilityName}` : ''}
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

  useEffect(() => {
    let active = true;
    getLifetimeMedicalRecord(effectivePatientId)
      .then((value) => { if (active) setRecord(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ lâm sàng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [effectivePatientId]);

  const recentEvents = useMemo(
    () => [...(record?.events ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8),
    [record?.events],
  );
  const clinicalImages = useMemo(
    () => recentEvents.flatMap((event) =>
      event.documents
        .filter((document) => document.contentType?.startsWith('image/') && document.downloadUrl)
        .map((document) => ({ ...document, occurredAt: event.occurredAt, eventTitle: event.title })),
    ).slice(0, 3),
    [recentEvents],
  );
  const patient = record?.patient;
  const profile = currentPatient.profile;
  const canEditClinical = role === 'doctor' || role === 'medical_administrator' || role === 'super_administrator';

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
                <Tag color="green" icon={<ShieldCheck size={12} />}>Đã xác minh hồ sơ</Tag>
              </Space>
              <Space size={[14, 6]} wrap style={{ marginTop: 7 }}>
                <Text><UserRound size={13} style={{ verticalAlign: -2 }} /> {patient?.gender ?? profile.gender}</Text>
                <Text><CalendarDays size={13} style={{ verticalAlign: -2 }} /> {formatDate(patient?.dob ?? profile.dob)}</Text>
                <Text type="secondary">Mã BN: {patient?.code ?? currentPatient.code}</Text>
                {patient?.nationalHealthId && <Text type="secondary">Mã định danh: {patient.nationalHealthId}</Text>}
              </Space>
              <Space size={[14, 6]} wrap style={{ marginTop: 8 }}>
                <Text type="secondary"><Phone size={13} style={{ verticalAlign: -2 }} /> {profile.phone || 'Chưa có SĐT'}</Text>
                <Text type="secondary"><Mail size={13} style={{ verticalAlign: -2 }} /> {profile.email || 'Chưa có email'}</Text>
                <Text type="secondary"><MapPin size={13} style={{ verticalAlign: -2 }} /> {profile.address || 'Chưa có địa chỉ'}</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card title={<Space><HeartPulse size={16} /> Tóm tắt an toàn lâm sàng</Space>} size="small">
                <Descriptions
                  size="small"
                  column={2}
                  layout="vertical"
                  items={[
                    { key: 'blood', label: 'Nhóm máu', children: <Text strong>{patient?.bloodType ?? profile.bloodType ?? '—'}</Text> },
                    { key: 'encounters', label: 'Tổng lượt khám', children: <Text strong>{record?.summary.encounterCount ?? 0}</Text> },
                    { key: 'last', label: 'Cập nhật cuối', span: 2, children: formatDate(record?.summary.lastRecordedAt) },
                  ]}
                />
                <div style={{ marginTop: 10 }}>
                  <Text strong style={{ fontSize: 12 }}>Dị ứng/cảnh báo</Text>
                  <div style={{ marginTop: 6 }}>
                    {record?.summary.allergies.length
                      ? record.summary.allergies.map((item) => <Tag color="red" key={item.id}>{item.display}</Tag>)
                      : <Tag color="green">Chưa ghi nhận dị ứng</Tag>}
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
              <Card title={<Space><Camera size={16} /> Ảnh lâm sàng gần đây</Space>} size="small" extra={<Button type="link" onClick={() => navigate('/app/progress')}>Xem theo dõi tiến triển</Button>}>
                {clinicalImages.length ? (
                  <Row gutter={[10, 10]}>
                    {clinicalImages.map((image) => (
                      <Col xs={24} md={8} key={image.id}>
                        <div style={{ overflow: 'hidden', borderRadius: 9, border: '1px solid var(--border-default)' }}>
                          <img src={image.downloadUrl!} alt={image.title} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                          <div style={{ padding: 8 }}>
                            <Text strong style={{ fontSize: 12 }}>{image.title}</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{formatDate(image.occurredAt)}</Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có ảnh lâm sàng được ký và đính kèm hồ sơ" />
                )}
              </Card>

              <Card title={<Space><FileHeart size={16} /> Tiến trình điều trị & ghi chú</Space>} size="small" extra={<Tag>{recentEvents.length} sự kiện gần nhất</Tag>}>
                {recentEvents.length ? (
                  <Timeline
                    items={recentEvents.map((event) => ({
                      color: EVENT_COLOR[event.type] ?? 'gray',
                      children: <ClinicalTimelineItem event={event} />,
                    }))}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có sự kiện điều trị" />
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </Skeleton>
    </div>
  );
}
