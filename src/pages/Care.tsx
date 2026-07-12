import { useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Button, Modal, Input, Select, Alert, Typography, List, Avatar, Empty } from 'antd';
import { Phone, CheckCircle, Clock, TriangleAlert, Bell, MessageCircle, Calendar, Plus, ShieldAlert, Info, UserCheck, XCircle } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { carePlanRepository } from '../domain/repositories';
import { crmService, ESCALATION_RULES, CRM_PROHIBITED_ACTIONS, type EscalationTrigger } from '../domain/services/crmService';
import { ITEM_TYPE_LABEL, type CarePlanItemType } from '../domain/carePlan';
import type { FollowUpActivityStatus } from '../domain/core/enums';

const { Title, Text, Paragraph } = Typography;

const PRIO_COLOR: Record<string, string> = { high: 'red', medium: 'gold', low: 'default' };
const PRIO_LABEL: Record<string, string> = { high: 'Quan trọng', medium: 'Trung bình', low: 'Bình thường' };
const STATUS_LABEL: Record<FollowUpActivityStatus, string> = { scheduled: 'Đã lên lịch', due: 'Đến hạn', completed: 'Hoàn thành', escalated: 'Đã báo cáo bất thường', cancelled: 'Đã hủy' };
const SEVERITY_COLOR: Record<string, string> = { low: 'default', medium: 'gold', high: 'red', critical: 'red' };

const CAMPAIGNS = [
  { id: 1, title: 'Nhắc tái khám tháng 11', sent: '08:00 hôm nay' },
  { id: 2, title: 'Nhắc uống thuốc buổi tối', sent: '21:30 hàng ngày' },
];

export default function Care() {
  const { currentPatient, currentUser, role } = useAppState();
  const plans = useStore(carePlanRepository.plans());
  const activities = useStore(carePlanRepository.activities());
  const alerts = useStore(carePlanRepository.alerts());
  const requests = useStore(carePlanRepository.encounterRequests());

  const [addModal, setAddModal] = useState(false);
  const [escModal, setEscModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CarePlanItemType>('lifestyle_guidance');
  const [escTrigger, setEscTrigger] = useState<EscalationTrigger>('worsening_symptoms');
  const [escNote, setEscNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const carePlan = plans.find((p) => p.patientId === currentPatient.id);
  const planActivities = carePlan ? activities.filter((a) => a.carePlanId === carePlan.id) : [];
  const patientAlerts = alerts.filter((a) => a.patientId === currentPatient.id);
  const openAlerts = patientAlerts.filter((a) => a.status !== 'resolved');
  const patientRequests = requests.filter((r) => r.patientId === currentPatient.id);
  const pendingRequests = patientRequests.filter((r) => r.status === 'requested');

  const canApproveRequests = role === 'medical_administrator' || role === 'doctor';
  const canCloseAlerts = role === 'doctor' || role === 'medical_administrator' || role === 'care_coordinator';

  const guarded = (fn: () => void) => {
    setError(null);
    try { fn(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };

  const addItem = () => guarded(() => {
    if (!newTitle.trim() || !carePlan) throw new Error('Vui lòng nhập tên mục và đảm bảo đã có kế hoạch chăm sóc.');
    crmService.addActivity(carePlan.id, { type: newType, title: newTitle, description: '', dueDate: 'Hôm nay', priority: 'medium', status: 'scheduled' });
    setNewTitle(''); setAddModal(false);
  });

  const advanceItem = (id: string, to: FollowUpActivityStatus) => guarded(() => crmService.advanceActivity(id, to));

  const submitEscalation = () => guarded(() => {
    if (!carePlan) throw new Error('Chưa có kế hoạch chăm sóc cho bệnh nhân này.');
    crmService.raiseAlert(carePlan.id, currentPatient.id, escTrigger, escNote || ESCALATION_RULES[escTrigger].label, currentUser.id);
    setEscNote(''); setEscModal(false);
  });

  const closeAlert = (id: string) => guarded(() => crmService.closeAlert(id, currentUser.id));
  const decideRequest = (id: string, decision: 'approve' | 'reject') => guarded(() => crmService.decideEncounterCreationRequest(id, decision, currentUser.id));

  const active = planActivities.filter((i) => i.status === 'scheduled' || i.status === 'due');
  const done = planActivities.filter((i) => i.status === 'completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Chăm sóc bệnh nhân</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>Chăm Sóc Sau Khám</Title>
          <Text type="secondary">Quản lý nhắc nhở, chăm sóc liên tục và báo cáo bất thường tới đội ngũ điều phối.</Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ShieldAlert size={15} />} onClick={() => setEscModal(true)}>Báo cáo bất thường</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddModal(true)}>Thêm mục chăm sóc</Button>
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

      <Row gutter={[12, 12]}>
        {[
          { label: 'Cần thực hiện', val: active.length, icon: <Clock size={18} /> },
          { label: 'Đã hoàn thành', val: done.length, icon: <CheckCircle size={18} /> },
          { label: 'Cảnh báo đang mở', val: openAlerts.length, icon: <TriangleAlert size={18} />, danger: openAlerts.length > 0 },
          { label: 'Yêu cầu tái khám đang chờ', val: pendingRequests.length, icon: <Calendar size={18} />, warn: pendingRequests.length > 0 },
        ].map((s) => (
          <Col xs={24} sm={12} md={6} key={s.label}>
            <Card size="small"><Statistic title={s.label} value={s.val} prefix={s.icon} valueStyle={{ color: s.danger ? 'var(--danger)' : s.warn ? 'var(--warning)' : 'var(--text-primary)', fontSize: 24 }} /></Card>
          </Col>
        ))}
      </Row>

      {canApproveRequests && pendingRequests.length > 0 && (
        <Card title={`Yêu cầu tạo lượt tái khám cần phê duyệt (${pendingRequests.length})`} size="small">
          <List
            dataSource={pendingRequests}
            renderItem={(r) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Text style={{ fontSize: 13.5, display: 'block', marginBottom: 4 }}>{r.reason}</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Yêu cầu bởi: {r.requestedByRole} · {new Date(r.requestedAt).toLocaleString('vi-VN')}</Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="small" type="primary" icon={<UserCheck size={13} />} onClick={() => decideRequest(r.id, 'approve')}>Duyệt & tạo lượt khám</Button>
                    <Button size="small" icon={<XCircle size={13} />} onClick={() => decideRequest(r.id, 'reject')}>Từ chối</Button>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {openAlerts.length > 0 && (
              <Card title={`Cảnh báo đang xử lý (${openAlerts.length})`} size="small">
                <List
                  dataSource={openAlerts}
                  renderItem={(a) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 13.5 }}>{ESCALATION_RULES[a.trigger as EscalationTrigger]?.label ?? a.trigger}</Text>
                          <Tag color={SEVERITY_COLOR[a.severity]}>{a.severity}</Tag>
                        </div>
                        <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 6 }}>{a.note}</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>Chịu trách nhiệm: <Text strong>{a.responsibleActor}</Text> · Hạn phản hồi: {a.responseDeadlineHours}h</Text>
                        {a.requiresLinkedEncounter && (
                          <Alert type="info" showIcon style={{ marginTop: 8, fontSize: 12 }} message={a.status === 'encounter_requested' ? 'Đã gửi yêu cầu tạo lịch tái khám — chờ phê duyệt.' : 'Cần yêu cầu tạo lịch tái khám liên kết (CRM không tự tạo lịch khám).'} />
                        )}
                        {canCloseAlerts && <Button size="small" style={{ marginTop: 8 }} onClick={() => closeAlert(a.id)}>Đóng cảnh báo (có xác nhận)</Button>}
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Card title={`Cần thực hiện (${active.length})`} size="small">
              <List
                dataSource={active}
                locale={{ emptyText: <Empty description="Không còn mục nào cần thực hiện" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      item.status === 'scheduled' && <Button size="small" key="due" onClick={() => advanceItem(item.id, 'due')}>Đến hạn</Button>,
                      item.status === 'due' && <Button size="small" type="primary" key="done" icon={<CheckCircle size={12} />} onClick={() => advanceItem(item.id, 'completed')}>Hoàn thành</Button>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={<div style={{ display: 'flex', justifyContent: 'space-between' }}><Text strong style={{ fontSize: 13.5 }}>{item.title}</Text><Tag color={PRIO_COLOR[item.priority]}>{PRIO_LABEL[item.priority]}</Tag></div>}
                      description={
                        <>
                          {item.description && <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 4 }}>{item.description}</Paragraph>}
                          <Tag color="blue">{ITEM_TYPE_LABEL[item.type as CarePlanItemType] ?? item.type}</Tag>
                          <Text type="secondary" style={{ fontSize: 11.5 }}> · {item.dueDate} · {STATUS_LABEL[item.status]}</Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card title={`Đã hoàn thành (${done.length})`} size="small">
              <List
                dataSource={done}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckCircle size={18} color="var(--success)" />}
                      title={<Text delete type="secondary" style={{ fontSize: 13 }}>{item.title}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 11.5 }}>{item.dueDate}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Liên hệ bác sĩ" size="small">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <Avatar size={44} style={{ background: 'var(--medical-blue-700)' }}>A</Avatar>
                <div>
                  <Text strong style={{ display: 'block', fontSize: 13.5 }}>Bs. Nguyễn Thị An</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Chuyên khoa Da liễu</Text>
                  <Tag color="success" style={{ display: 'block', marginTop: 4, width: 'fit-content' }}>Đang trực tuyến</Tag>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button type="primary" block icon={<MessageCircle size={15} />}>Nhắn tin bác sĩ</Button>
                <Button block icon={<Phone size={15} />}>Gọi điện tư vấn</Button>
                <Button block icon={<Calendar size={15} />}>Đặt lịch tái khám</Button>
              </div>
            </Card>

            <Card title="Nhắc nhở tự động" size="small">
              <List
                dataSource={CAMPAIGNS}
                renderItem={(c) => (
                  <List.Item extra={<Tag color="success">Hoạt động</Tag>}>
                    <List.Item.Meta title={<Text style={{ fontSize: 13 }}>{c.title}</Text>} description={<Text type="secondary" style={{ fontSize: 12 }}>{c.sent}</Text>} />
                  </List.Item>
                )}
              />
            </Card>

            <Card title={<span><Info size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Giới hạn của chăm sóc sau khám</span>} size="small">
              <List size="small" dataSource={[...CRM_PROHIBITED_ACTIONS]} renderItem={(a) => <List.Item style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{a}</List.Item>} />
            </Card>
          </div>
        </Col>
      </Row>

      <Modal title="Thêm Mục Chăm Sóc" open={addModal} onCancel={() => setAddModal(false)} onOk={addItem} okText="Thêm" cancelText="Hủy">
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Loại</Text>
          <Select style={{ width: '100%' }} value={newType} onChange={setNewType} options={Object.entries(ITEM_TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
        </div>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên mục *</Text>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="VD: Uống đủ nước mỗi ngày..." />
        </div>
      </Modal>

      <Modal title="Báo Cáo Bất Thường" open={escModal} onCancel={() => setEscModal(false)} onOk={submitEscalation} okText={<span><Bell size={13} style={{ verticalAlign: -2 }} /> Gửi báo cáo</span>} cancelText="Hủy">
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Loại bất thường</Text>
          <Select style={{ width: '100%' }} value={escTrigger} onChange={setEscTrigger} options={Object.values(ESCALATION_RULES).map((r) => ({ value: r.trigger, label: r.label }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mô tả</Text>
          <Input value={escNote} onChange={(e) => setEscNote(e.target.value)} placeholder="Mô tả ngắn về tình trạng..." />
        </div>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          Mức độ nghiêm trọng, người chịu trách nhiệm và hạn phản hồi sẽ được hệ thống tự động xác định dựa trên loại bất thường bạn chọn. Nếu cần lịch tái khám, một <Text strong>Encounter Creation Request</Text> sẽ được gửi để Quản trị viên y tế / bác sĩ phê duyệt trước khi tạo lượt khám mới.
        </Paragraph>
      </Modal>
    </div>
  );
}
