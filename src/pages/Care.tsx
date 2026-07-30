import { useEffect, useState } from 'react';
import { App, Alert, Button, Card, Col, Input, List, Modal, Progress, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { Bot, CheckCircle, CircleAlert, Clock, Play, Send, ShieldCheck, Sparkles, UserCheck, XCircle } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { carePlanRepository } from '../domain/repositories';
import { ESCALATION_RULES, type EscalationTrigger } from '../domain/services/crmService';
import { listPatientAlerts, createPatientAlert, closeAlert as closeAlertRequest } from '../api/alert';
import { createPatientEncounterRequest, listEncounterRequests, decideEncounterRequest } from '../api/encounterRequest';
import {
  confirmCarePlanActivity,
  createCarePlanActivity,
  getPatientCarePlan,
  listCarePlanActivities,
  runPatientCareAutomation,
  transitionCarePlanActivity,
} from '../api/carePlan';
import { ITEM_TYPE_LABEL, type CarePlanItemType } from '../domain/carePlan';
import type { FollowUpActivity } from '../domain/core/entities';
import type { FollowUpActivityStatus } from '../domain/core/enums';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { hasRoleAccess } from '../domain/core/role';

const { Title, Text, Paragraph } = Typography;
const AUTO_TYPES = new Set(['medication_reminder', 'lifestyle_guidance', 'patient_education', 'symptom_questionnaire', 'satisfaction_survey', 'adherence_check']);
// Mirrors the backend's Kanban state machine (POST .../transitions) for the
// single-button "next step" action below — only covers the two statuses the
// automatic-activities list can show (scheduled, due).
const NEXT_KANBAN_STATUS: Partial<Record<FollowUpActivityStatus, FollowUpActivityStatus>> = {
  scheduled: 'due',
  due: 'completed',
};
const severityColor: Record<string, string> = { low: 'default', medium: 'gold', high: 'red', critical: 'red' };

export default function Care() {
  const { message } = App.useApp();
  const showError = useFriendlyError();
  const { currentPatient, role } = useAppState();
  const plans = useStore(carePlanRepository.plans());
  const activities = useStore(carePlanRepository.activities());
  const alerts = useStore(carePlanRepository.alerts());
  const requests = useStore(carePlanRepository.encounterRequests());
  const [reportOpen, setReportOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [encounterRequestOpen, setEncounterRequestOpen] = useState(false);
  const [encounterReason, setEncounterReason] = useState('');
  const [trigger, setTrigger] = useState<EscalationTrigger>('worsening_symptoms');
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<CarePlanItemType>('coordinator_call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDueDate, setActivityDueDate] = useState('');
  const [activityPriority, setActivityPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (!currentPatient) return;
    const refreshAlerts = () =>
      listPatientAlerts(currentPatient.id).then((rows) => rows.forEach((row) => carePlanRepository.alerts().upsert(row)));
    const refreshRequests = () =>
      listEncounterRequests('requested').then((rows) => rows.forEach((row) => carePlanRepository.encounterRequests().upsert(row)));
    const refreshCarePlan = async () => {
      const serverPlan = await getPatientCarePlan(currentPatient.id);
      carePlanRepository.plans().upsert(serverPlan);
      const serverActivities = await listCarePlanActivities(serverPlan.id);
      const otherActivities = carePlanRepository.activities().getAll().filter((item) => item.carePlanId !== serverPlan.id);
      carePlanRepository.activities().replaceAll([...otherActivities, ...serverActivities]);
    };
    refreshCarePlan().catch((err: unknown) => { showError(err); });
    refreshAlerts().catch((err: unknown) => { showError(err); });
    refreshRequests().catch((err: unknown) => { showError(err); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id]);

  // No patient record is linked to this account — nothing below is scoped
  // safely without one, so stop before any patient-specific read/write.
  if (!currentPatient) {
    return <ProfessionalEmpty title="Chưa có hồ sơ bệnh nhân" description="Tài khoản này chưa được liên kết với hồ sơ bệnh nhân nào." />;
  }

  const plan = plans.find((p) => p.patientId === currentPatient.id);
  const rows = plan ? activities.filter((a) => a.carePlanId === plan.id) : [];
  const automatic = rows.filter((a) => AUTO_TYPES.has(a.type) && ['scheduled', 'due'].includes(a.status));
  const patientActions = rows.filter((a) => !AUTO_TYPES.has(a.type) && ['scheduled', 'due'].includes(a.status));
  const openAlerts = alerts.filter((a) => a.patientId === currentPatient.id && a.status !== 'resolved');
  const coordinatorAlerts = openAlerts.filter((a) => ['low', 'medium'].includes(a.severity));
  const clinicalAlerts = openAlerts.filter((a) => ['high', 'critical'].includes(a.severity));
  const pendingRequests = requests.filter((r) => r.patientId === currentPatient.id && r.status === 'requested');
  const canRunAutomation = hasRoleAccess(role, ['care_coordinator', 'medical_administrator', 'system_administrator']);
  const canCoordinate = hasRoleAccess(role, ['care_coordinator', 'medical_administrator']);
  const canDecide = hasRoleAccess(role, ['doctor', 'medical_administrator']);
  const canRequestEncounter = hasRoleAccess(role, ['patient', 'care_coordinator', 'medical_administrator']);

  const refreshAlerts = () =>
    listPatientAlerts(currentPatient.id).then((rows) => rows.forEach((row) => carePlanRepository.alerts().upsert(row)));
  const refreshRequests = () =>
    listEncounterRequests('requested').then((rows) => rows.forEach((row) => carePlanRepository.encounterRequests().upsert(row)));

  const guardAsync = (fn: () => Promise<void>, success?: string) => {
    fn().then(() => { if (success) message.success(success); }).catch((e: unknown) => { showError(e); });
  };
  const runAutomation = () => guardAsync(async () => {
    if (!plan) throw new Error('Chưa có kế hoạch chăm sóc.');
    const result = await runPatientCareAutomation(currentPatient.id);
    result.activities.forEach((activity) => carePlanRepository.activities().upsert(activity));
    message.success(`CRM đã tự xử lý ${result.processed} hoạt động và gửi ${result.notifications} thông báo.`);
  });
  const confirm = (activity: FollowUpActivity) => guardAsync(async () => {
    const updated = await confirmCarePlanActivity(activity.id);
    carePlanRepository.activities().upsert(updated);
  }, 'Đã ghi nhận hoàn thành.');
  const advance = (activity: FollowUpActivity) => guardAsync(async () => {
    const toStatus = NEXT_KANBAN_STATUS[activity.status];
    if (!toStatus) throw new Error('Hoạt động này không thể chuyển bước.');
    if (!activity.version) throw new Error('Thiếu phiên bản hoạt động, vui lòng tải lại trang.');
    const updated = await transitionCarePlanActivity(activity.id, { toStatus, version: activity.version });
    carePlanRepository.activities().upsert(updated);
  }, 'Đã chuyển hoạt động sang bước tiếp theo.');
  const addActivity = () => guardAsync(async () => {
    if (!plan) throw new Error('Chưa có kế hoạch chăm sóc.');
    if (!activityTitle.trim() || !activityDueDate) throw new Error('Vui lòng nhập tiêu đề và hạn thực hiện.');
    const created = await createCarePlanActivity(plan.id, {
      type: activityType,
      title: activityTitle.trim(),
      description: activityDescription.trim(),
      dueDate: activityDueDate,
      priority: activityPriority,
      status: 'scheduled',
      automationMode: AUTO_TYPES.has(activityType) ? 'automatic' : 'patient_action',
    });
    carePlanRepository.activities().upsert(created);
    setActivityOpen(false);
    setActivityTitle('');
    setActivityDescription('');
    setActivityDueDate('');
  }, 'Đã thêm hoạt động chăm sóc.');
  const closeAlert = (id: string) => guardAsync(async () => { await closeAlertRequest(id); await refreshAlerts(); }, 'Đã xử lý ngoại lệ.');
  const decide = (id: string, decision: 'approve' | 'reject') => guardAsync(async () => {
    await decideEncounterRequest(id, { decision });
    await refreshRequests();
  }, decision === 'approve' ? 'Đã duyệt và tạo lượt tái khám.' : 'Đã từ chối yêu cầu.');
  const requestEncounter = () => guardAsync(async () => {
    const reason = encounterReason.trim();
    if (reason.length < 3) throw new Error('Vui lòng nhập lý do tái khám.');
    const created = await createPatientEncounterRequest(currentPatient.id, { reason });
    carePlanRepository.encounterRequests().upsert(created);
    setEncounterRequestOpen(false);
    setEncounterReason('');
  }, 'Đã gửi yêu cầu tái khám.');
  const report = () => guardAsync(async () => {
    if (!plan) throw new Error('Chưa có kế hoạch chăm sóc.');
    await createPatientAlert(currentPatient.id, { carePlanId: plan.id, trigger, note: note || ESCALATION_RULES[trigger].label });
    await refreshAlerts();
    await refreshRequests();
    setReportOpen(false);
    setNote('');
  }, 'Hệ thống đã phân loại và chuyển đúng người phụ trách.');

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Quản Lý Chăm Sóc</Title>
      </div><Space>{canCoordinate && <Button onClick={() => setActivityOpen(true)}>Thêm hoạt động</Button>}{canRequestEncounter && <Button onClick={() => setEncounterRequestOpen(true)}>Yêu cầu tái khám</Button>}<Button icon={<CircleAlert size={15} />} onClick={() => setReportOpen(true)}>Báo tình trạng bất thường</Button>{canRunAutomation && <Button type="primary" icon={<Play size={15} />} onClick={runAutomation}>Chạy tự động ngay</Button>}</Space></div>

    <Alert type="success" showIcon icon={<Sparkles size={17} />} message="Bác sĩ không phải theo dõi danh sách thường quy" description="Nhắc thuốc, nội dung giáo dục và bảng hỏi được CRM gửi tự động. Chỉ kết quả vượt ngưỡng an toàn mới được chuyển thành ngoại lệ cần con người xem xét." />

    <Row gutter={[12, 12]}>
      <Col xs={12} lg={6}><Card><Statistic title="Tác vụ CRM tự chạy" value={automatic.length} prefix={<Bot size={18} />} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Bệnh nhân cần làm" value={patientActions.length} prefix={<UserCheck size={18} />} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Điều phối xử lý" value={coordinatorAlerts.length} prefix={<Clock size={18} />} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Cần bác sĩ quyết định" value={clinicalAlerts.length+pendingRequests.length} prefix={<ShieldCheck size={18}/>} valueStyle={{color:clinicalAlerts.length?'var(--danger)':undefined}}/></Card></Col>
    </Row>

    <Row gutter={[16,16]}>
      <Col xs={24} xl={15}><div style={{display:'flex',flexDirection:'column',gap:16}}>
        <Card title={<Space><Bot size={18} color="#6f42c1"/>CRM đang tự vận hành<Tag color="purple">Không cần bác sĩ thao tác</Tag></Space>}>
          <List dataSource={automatic} locale={{emptyText:<ProfessionalEmpty compact title="Chưa có kịch bản tự động" description="Kịch bản sẽ được tạo từ kế hoạch chăm sóc đã duyệt." />}} renderItem={(item)=><List.Item actions={canCoordinate?[<Button key="advance" size="small" onClick={()=>advance(item)}>Chuyển bước</Button>]:undefined} extra={<Tag color={item.lastAutomatedAt?'success':'processing'}>{item.lastAutomatedAt?'Đã tự chạy':'Đang chờ lịch'}</Tag>}><List.Item.Meta avatar={<span style={{width:38,height:38,borderRadius:10,background:'#f1eafa',color:'#6f42c1',display:'grid',placeItems:'center'}}><Bot size={20}/></span>} title={item.title} description={<><Text type="secondary">{item.automationAction ?? (item.type==='medication_reminder'?'Tự gửi nhắc đúng giờ':'Tự gửi nội dung và theo dõi phản hồi')}</Text><br/><Text type="secondary" style={{fontSize:11}}>Đã chạy {item.automationRunCount??0} lần · {item.lastAutomatedAt?new Date(item.lastAutomatedAt).toLocaleString('vi-VN'):item.dueDate}</Text></>}/></List.Item>}/>
        </Card>

        <Card title={<Space><UserCheck size={18}/>Việc bệnh nhân cần xác nhận<Tag>{patientActions.length}</Tag></Space>}>
          <List dataSource={patientActions} locale={{emptyText:<ProfessionalEmpty compact title="Không có việc tồn đọng" description="Tất cả hoạt động cần bệnh nhân xác nhận đã hoàn tất." />}} renderItem={(item)=><List.Item actions={[<Button key="done" type="primary" icon={<CheckCircle size={14}/>} onClick={()=>confirm(item)}>Tôi đã thực hiện</Button>]}><List.Item.Meta title={item.title} description={<><Text type="secondary">{item.description}</Text><br/><Tag color="blue">{ITEM_TYPE_LABEL[item.type as CarePlanItemType]??item.type}</Tag><Text type="secondary"> · {item.dueDate}</Text></>}/></List.Item>}/>
        </Card>

        {canCoordinate&&<Card title={<Space><Clock size={18}/>Ngoại lệ do điều phối viên xử lý<Tag color="gold">Không chuyển bác sĩ ngay</Tag></Space>}><List dataSource={coordinatorAlerts} locale={{emptyText:<ProfessionalEmpty compact title="Không có ngoại lệ" description="CRM chưa phát hiện trường hợp nào cần điều phối viên can thiệp." />}} renderItem={(item)=><List.Item actions={[<Button key="resolve" onClick={()=>closeAlert(item.id)}>Đã liên hệ và xử lý</Button>]}><List.Item.Meta title={<Space>{ESCALATION_RULES[item.trigger as EscalationTrigger]?.label??item.trigger}<Tag color={severityColor[item.severity]}>{item.severity}</Tag></Space>} description={`${item.note} · SLA ${item.responseDeadlineHours} giờ · ${item.responsibleActor}`}/></List.Item>}/></Card>}
      </div></Col>

      <Col xs={24} xl={9}><div style={{display:'flex',flexDirection:'column',gap:16}}>
        <Card title={<Space><ShieldCheck size={18} color="#c83e4d"/>Chỉ chuyển bác sĩ khi cần</Space>}>
          <Paragraph type="secondary">Bác sĩ chỉ nhận cảnh báo nguy cơ cao/cờ đỏ hoặc yêu cầu tạo lượt khám cần thẩm quyền lâm sàng.</Paragraph>
          <List dataSource={clinicalAlerts} locale={{emptyText:<ProfessionalEmpty compact title="Không có cảnh báo nguy cơ cao" description="Bác sĩ không có quyết định lâm sàng khẩn cần xử lý." />}} renderItem={(item)=><List.Item><List.Item.Meta title={<Space>{ESCALATION_RULES[item.trigger as EscalationTrigger]?.label??item.trigger}<Tag color="red">{item.severity}</Tag></Space>} description={item.note}/></List.Item>}/>
          {canDecide&&pendingRequests.map((request)=><Card key={request.id} size="small" style={{marginTop:10}}><Text strong>Đề nghị tạo lượt tái khám</Text><Paragraph type="secondary" style={{margin:'6px 0 10px'}}>{request.reason}</Paragraph><Space><Button type="primary" icon={<CheckCircle size={14}/>} onClick={()=>decide(request.id,'approve')}>Duyệt</Button><Button icon={<XCircle size={14}/>} onClick={()=>decide(request.id,'reject')}>Từ chối</Button></Space></Card>)}
        </Card>
        <Card title="Mức độ tự động hóa"><Progress percent={Math.min(100,Math.round(automatic.length/Math.max(1,rows.filter(r=>['scheduled','due'].includes(r.status)).length)*100))} status="active"/><Text type="secondary">Tỷ lệ công việc đang được CRM xử lý tự động, không cần bác sĩ thao tác.</Text></Card>
        <Card size="small" title="Nguyên tắc an toàn"><List size="small" dataSource={['CRM không chẩn đoán hoặc đổi đơn thuốc','Điều phối viên xử lý ngoại lệ mức thấp/trung bình','Bác sĩ chỉ duyệt quyết định lâm sàng','Mọi hoạt động tự động đều có nhật ký kiểm toán']} renderItem={x=><List.Item><Send size={13} style={{marginRight:8}}/>{x}</List.Item>}/></Card>
      </div></Col>
    </Row>

    <Modal title="Báo tình trạng bất thường" open={reportOpen} onCancel={()=>setReportOpen(false)} onOk={report} okText="Gửi và tự động phân loại" cancelText="Hủy"><Text strong>Loại tình trạng</Text><Select style={{width:'100%',margin:'6px 0 14px'}} value={trigger} onChange={setTrigger} options={Object.values(ESCALATION_RULES).map(rule=>({value:rule.trigger,label:rule.label}))}/><Text strong>Mô tả ngắn</Text><Input.TextArea rows={3} value={note} onChange={e=>setNote(e.target.value)} style={{marginTop:6}}/><Alert style={{marginTop:14}} type="info" showIcon message="CRM sẽ tự xác định mức độ, SLA và người phụ trách. Bác sĩ chỉ được thông báo nếu vượt ngưỡng lâm sàng."/></Modal>
    <Modal title="Yêu cầu tái khám" open={encounterRequestOpen} onCancel={()=>setEncounterRequestOpen(false)} onOk={requestEncounter} okText="Gửi yêu cầu" cancelText="Hủy">
      <Text strong>Lý do tái khám</Text>
      <Input.TextArea rows={4} value={encounterReason} onChange={e=>setEncounterReason(e.target.value)} placeholder="Mô tả triệu chứng hoặc lý do cần được bác sĩ đánh giá lại" style={{marginTop:6}}/>
    </Modal>
    <Modal title="Thêm hoạt động chăm sóc" open={activityOpen} onCancel={()=>setActivityOpen(false)} onOk={addActivity} okText="Thêm hoạt động" cancelText="Hủy">
      <Space direction="vertical" size={12} style={{width:'100%'}}>
        <div><Text strong>Loại hoạt động</Text><Select style={{width:'100%',marginTop:6}} value={activityType} onChange={setActivityType} options={Object.entries(ITEM_TYPE_LABEL).map(([value,label])=>({value,label}))}/></div>
        <div><Text strong>Tiêu đề</Text><Input style={{marginTop:6}} value={activityTitle} onChange={e=>setActivityTitle(e.target.value)}/></div>
        <div><Text strong>Mô tả</Text><Input.TextArea rows={3} style={{marginTop:6}} value={activityDescription} onChange={e=>setActivityDescription(e.target.value)}/></div>
        <Row gutter={12}><Col span={14}><Text strong>Hạn thực hiện</Text><Input type="datetime-local" style={{marginTop:6}} value={activityDueDate} onChange={e=>setActivityDueDate(e.target.value)}/></Col><Col span={10}><Text strong>Ưu tiên</Text><Select style={{width:'100%',marginTop:6}} value={activityPriority} onChange={setActivityPriority} options={[{value:'low',label:'Thấp'},{value:'medium',label:'Trung bình'},{value:'high',label:'Cao'}]}/></Col></Row>
      </Space>
    </Modal>
  </div>;
}
