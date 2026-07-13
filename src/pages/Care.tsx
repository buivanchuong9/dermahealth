import { useState } from 'react';
import { App, Alert, Button, Card, Col, Empty, Input, List, Modal, Progress, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { Bot, CheckCircle, CircleAlert, Clock, Play, Send, ShieldCheck, Sparkles, UserCheck, XCircle } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { carePlanRepository } from '../domain/repositories';
import { crmService, ESCALATION_RULES, type EscalationTrigger } from '../domain/services/crmService';
import { ITEM_TYPE_LABEL, type CarePlanItemType } from '../domain/carePlan';
import type { FollowUpActivity } from '../domain/core/entities';

const { Title, Text, Paragraph } = Typography;
const AUTO_TYPES = new Set(['medication_reminder', 'lifestyle_guidance', 'patient_education', 'symptom_questionnaire', 'satisfaction_survey', 'adherence_check']);
const severityColor: Record<string, string> = { low: 'default', medium: 'gold', high: 'red', critical: 'red' };

export default function Care() {
  const { message } = App.useApp();
  const { currentPatient, currentUser, role } = useAppState();
  const plans = useStore(carePlanRepository.plans());
  const activities = useStore(carePlanRepository.activities());
  const alerts = useStore(carePlanRepository.alerts());
  const requests = useStore(carePlanRepository.encounterRequests());
  const [reportOpen, setReportOpen] = useState(false);
  const [trigger, setTrigger] = useState<EscalationTrigger>('worsening_symptoms');
  const [note, setNote] = useState('');

  const plan = plans.find((p) => p.patientId === currentPatient.id);
  const rows = plan ? activities.filter((a) => a.carePlanId === plan.id) : [];
  const automatic = rows.filter((a) => AUTO_TYPES.has(a.type) && ['scheduled', 'due'].includes(a.status));
  const patientActions = rows.filter((a) => !AUTO_TYPES.has(a.type) && ['scheduled', 'due'].includes(a.status));
  const openAlerts = alerts.filter((a) => a.patientId === currentPatient.id && a.status !== 'resolved');
  const coordinatorAlerts = openAlerts.filter((a) => ['low', 'medium'].includes(a.severity));
  const clinicalAlerts = openAlerts.filter((a) => ['high', 'critical'].includes(a.severity));
  const pendingRequests = requests.filter((r) => r.patientId === currentPatient.id && r.status === 'requested');
  const canRunAutomation = ['care_coordinator', 'medical_administrator', 'system_administrator'].includes(role);
  const canCoordinate = ['care_coordinator', 'medical_administrator'].includes(role);
  const canDecide = ['doctor', 'medical_administrator'].includes(role);

  const guard = (fn: () => void, success?: string) => { try { fn(); if (success) message.success(success); } catch (e) { message.error(e instanceof Error ? e.message : String(e)); } };
  const runAutomation = () => guard(() => { const result = crmService.runAutomation(currentPatient.id, currentUser.id); message.success(`CRM đã tự xử lý ${result.processed} hoạt động và gửi ${result.notifications} thông báo.`); });
  const confirm = (activity: FollowUpActivity) => guard(() => crmService.confirmPatientActivity(activity.id, currentUser.id), 'Đã ghi nhận hoàn thành.');
  const closeAlert = (id: string) => guard(() => crmService.closeAlert(id, currentUser.id), 'Đã xử lý ngoại lệ.');
  const decide = (id: string, decision: 'approve' | 'reject') => guard(() => crmService.decideEncounterCreationRequest(id, decision, currentUser.id), decision === 'approve' ? 'Đã duyệt và tạo lượt tái khám.' : 'Đã từ chối yêu cầu.');
  const report = () => guard(() => { if (!plan) throw new Error('Chưa có kế hoạch chăm sóc.'); crmService.raiseAlert(plan.id, currentPatient.id, trigger, note || ESCALATION_RULES[trigger].label, currentUser.id); setReportOpen(false); setNote(''); }, 'Hệ thống đã phân loại và chuyển đúng người phụ trách.');

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><Text type="secondary" style={{fontSize:12,fontWeight:700,color:'var(--medical-blue-600)'}}>CRM TỰ ĐỘNG · CHĂM SÓC THEO NGOẠI LỆ</Text><Title level={3} style={{margin:'4px 0'}}>Chăm sóc sau khám</Title><Text type="secondary">Hệ thống xử lý việc thường quy; điều phối viên sàng lọc; bác sĩ chỉ nhận quyết định lâm sàng cần thiết.</Text></div><Space><Button icon={<CircleAlert size={15}/>} onClick={()=>setReportOpen(true)}>Báo tình trạng bất thường</Button>{canRunAutomation&&<Button type="primary" icon={<Play size={15}/>} onClick={runAutomation}>Chạy tự động ngay</Button>}</Space></div>

    <Alert type="success" showIcon icon={<Sparkles size={17}/>} message="Bác sĩ không phải theo dõi danh sách thường quy" description="Nhắc thuốc, nội dung giáo dục và bảng hỏi được CRM gửi tự động. Chỉ kết quả vượt ngưỡng an toàn mới được chuyển thành ngoại lệ cần con người xem xét."/>

    <Row gutter={[12,12]}>
      <Col xs={12} lg={6}><Card><Statistic title="Tác vụ CRM tự chạy" value={automatic.length} prefix={<Bot size={18}/>} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Bệnh nhân cần làm" value={patientActions.length} prefix={<UserCheck size={18}/>} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Điều phối xử lý" value={coordinatorAlerts.length} prefix={<Clock size={18}/>} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Cần bác sĩ quyết định" value={clinicalAlerts.length+pendingRequests.length} prefix={<ShieldCheck size={18}/>} valueStyle={{color:clinicalAlerts.length?'var(--danger)':undefined}}/></Card></Col>
    </Row>

    <Row gutter={[16,16]}>
      <Col xs={24} xl={15}><div style={{display:'flex',flexDirection:'column',gap:16}}>
        <Card title={<Space><Bot size={18} color="#6f42c1"/>CRM đang tự vận hành<Tag color="purple">Không cần bác sĩ thao tác</Tag></Space>}>
          <List dataSource={automatic} locale={{emptyText:<Empty description="Chưa có kịch bản tự động"/>}} renderItem={(item)=><List.Item extra={<Tag color={item.lastAutomatedAt?'success':'processing'}>{item.lastAutomatedAt?'Đã tự chạy':'Đang chờ lịch'}</Tag>}><List.Item.Meta avatar={<span style={{width:38,height:38,borderRadius:10,background:'#f1eafa',color:'#6f42c1',display:'grid',placeItems:'center'}}><Bot size={20}/></span>} title={item.title} description={<><Text type="secondary">{item.automationAction ?? (item.type==='medication_reminder'?'Tự gửi nhắc đúng giờ':'Tự gửi nội dung và theo dõi phản hồi')}</Text><br/><Text type="secondary" style={{fontSize:11}}>Đã chạy {item.automationRunCount??0} lần · {item.lastAutomatedAt?new Date(item.lastAutomatedAt).toLocaleString('vi-VN'):item.dueDate}</Text></>}/></List.Item>}/>
        </Card>

        <Card title={<Space><UserCheck size={18}/>Việc bệnh nhân cần xác nhận<Tag>{patientActions.length}</Tag></Space>}>
          <List dataSource={patientActions} locale={{emptyText:<Empty description="Bệnh nhân không có việc tồn đọng"/>}} renderItem={(item)=><List.Item actions={[<Button key="done" type="primary" icon={<CheckCircle size={14}/>} onClick={()=>confirm(item)}>Tôi đã thực hiện</Button>]}><List.Item.Meta title={item.title} description={<><Text type="secondary">{item.description}</Text><br/><Tag color="blue">{ITEM_TYPE_LABEL[item.type as CarePlanItemType]??item.type}</Tag><Text type="secondary"> · {item.dueDate}</Text></>}/></List.Item>}/>
        </Card>

        {canCoordinate&&<Card title={<Space><Clock size={18}/>Ngoại lệ do điều phối viên xử lý<Tag color="gold">Không chuyển bác sĩ ngay</Tag></Space>}><List dataSource={coordinatorAlerts} locale={{emptyText:<Empty description="Không có ngoại lệ cần điều phối"/>}} renderItem={(item)=><List.Item actions={[<Button key="resolve" onClick={()=>closeAlert(item.id)}>Đã liên hệ và xử lý</Button>]}><List.Item.Meta title={<Space>{ESCALATION_RULES[item.trigger as EscalationTrigger]?.label??item.trigger}<Tag color={severityColor[item.severity]}>{item.severity}</Tag></Space>} description={`${item.note} · SLA ${item.responseDeadlineHours} giờ · ${item.responsibleActor}`}/></List.Item>}/></Card>}
      </div></Col>

      <Col xs={24} xl={9}><div style={{display:'flex',flexDirection:'column',gap:16}}>
        <Card title={<Space><ShieldCheck size={18} color="#c83e4d"/>Chỉ chuyển bác sĩ khi cần</Space>}>
          <Paragraph type="secondary">Bác sĩ chỉ nhận cảnh báo nguy cơ cao/cờ đỏ hoặc yêu cầu tạo lượt khám cần thẩm quyền lâm sàng.</Paragraph>
          <List dataSource={clinicalAlerts} locale={{emptyText:<Empty description="Không có cảnh báo nguy cơ cao" image={Empty.PRESENTED_IMAGE_SIMPLE}/>}} renderItem={(item)=><List.Item><List.Item.Meta title={<Space>{ESCALATION_RULES[item.trigger as EscalationTrigger]?.label??item.trigger}<Tag color="red">{item.severity}</Tag></Space>} description={item.note}/></List.Item>}/>
          {canDecide&&pendingRequests.map((request)=><Card key={request.id} size="small" style={{marginTop:10}}><Text strong>Đề nghị tạo lượt tái khám</Text><Paragraph type="secondary" style={{margin:'6px 0 10px'}}>{request.reason}</Paragraph><Space><Button type="primary" icon={<CheckCircle size={14}/>} onClick={()=>decide(request.id,'approve')}>Duyệt</Button><Button icon={<XCircle size={14}/>} onClick={()=>decide(request.id,'reject')}>Từ chối</Button></Space></Card>)}
        </Card>
        <Card title="Mức độ tự động hóa"><Progress percent={Math.min(100,Math.round(automatic.length/Math.max(1,rows.filter(r=>['scheduled','due'].includes(r.status)).length)*100))} status="active"/><Text type="secondary">Tỷ lệ công việc đang được CRM xử lý tự động, không cần bác sĩ thao tác.</Text></Card>
        <Card size="small" title="Nguyên tắc an toàn"><List size="small" dataSource={['CRM không chẩn đoán hoặc đổi đơn thuốc','Điều phối viên xử lý ngoại lệ mức thấp/trung bình','Bác sĩ chỉ duyệt quyết định lâm sàng','Mọi hoạt động tự động đều có nhật ký kiểm toán']} renderItem={x=><List.Item><Send size={13} style={{marginRight:8}}/>{x}</List.Item>}/></Card>
      </div></Col>
    </Row>

    <Modal title="Báo tình trạng bất thường" open={reportOpen} onCancel={()=>setReportOpen(false)} onOk={report} okText="Gửi và tự động phân loại" cancelText="Hủy"><Text strong>Loại tình trạng</Text><Select style={{width:'100%',margin:'6px 0 14px'}} value={trigger} onChange={setTrigger} options={Object.values(ESCALATION_RULES).map(rule=>({value:rule.trigger,label:rule.label}))}/><Text strong>Mô tả ngắn</Text><Input.TextArea rows={3} value={note} onChange={e=>setNote(e.target.value)} style={{marginTop:6}}/><Alert style={{marginTop:14}} type="info" showIcon message="CRM sẽ tự xác định mức độ, SLA và người phụ trách. Bác sĩ chỉ được thông báo nếu vượt ngưỡng lâm sàng."/></Modal>
  </div>;
}
