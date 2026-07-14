import { useState } from 'react';
import {
  Row, Col, Card, Steps, Select, Button, Alert, Tag, List, Descriptions, Timeline, Table, Typography, Progress,
} from 'antd';
import {
  MapPin, Hash, Clock, ClipboardCheck, FlaskConical, PhoneCall, TriangleAlert, Users, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, clinicalOrderRepository, workflowRepository, medicalRecordRepository, carePlanRepository } from '../domain/repositories';
import { encounterService } from '../domain/services/encounterService';
import { MILESTONES, milestoneIndexForStatus, overallProgressPct } from '../domain/journeyView';
import { ENCOUNTER_STATUS_LABEL, TASK_STATUS_LABEL, RECORD_STATUS_LABEL, ROLE_LABEL } from '../domain/core/enums';
import type { EncounterId } from '../domain/core/ids';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const { Title, Text } = Typography;

const PREP_INSTRUCTIONS = [
  'Mang theo CMND/CCCD và thẻ bảo hiểm (nếu có)',
  'Không trang điểm vùng da cần khám',
  'Mang theo đơn thuốc đang sử dụng (nếu có)',
];

const EVENT_COLOR: Record<string, string> = { info: 'blue', success: 'green', warning: 'orange', danger: 'red' };

const ENCOUNTER_TYPE_LABEL = {
  standard: 'Khám thông thường',
  emergency: 'Khám cấp cứu',
  follow_up: 'Tái khám',
  remote: 'Khám từ xa',
} as const;

const CARE_PLAN_STATUS_LABEL = {
  not_started: 'Chưa bắt đầu',
  active: 'Đang theo dõi',
  completed: 'Đã hoàn tất',
  suspended: 'Tạm dừng',
} as const;

const WORKFLOW_STATUS_LABEL = {
  created: 'Chưa bắt đầu',
  active: 'Đang thực hiện',
  suspended: 'Tạm dừng',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã hủy',
} as const;

const ORDER_TYPE_LABEL = { laboratory: 'Xét nghiệm', imaging: 'Chẩn đoán hình ảnh', consultation: 'Hội chẩn' } as const;
const ORDER_STATUS_LABEL = {
  requested: 'Đã tạo yêu cầu',
  in_progress: 'Đang thực hiện',
  invalid_sample: 'Mẫu không hợp lệ',
  result_ready: 'Đã có kết quả',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã hủy',
} as const;

function formatEncounterDate(value: string) {
  const [date, time] = value.split(' ');
  return time ? `${date} lúc ${time}` : date;
}

export default function Journey() {
  const { currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository).filter((e) => e.patientId === currentPatient.id);
  const orders = useStore(clinicalOrderRepository.orders());
  const results = useStore(clinicalOrderRepository.results());
  const tasks = useStore(workflowRepository.tasks());
  const instances = useStore(workflowRepository.instances());
  const records = useStore(medicalRecordRepository.records());
  const carePlans = useStore(carePlanRepository.plans());
  const alerts = useStore(carePlanRepository.alerts());

  const defaultId = encounterService.getActiveEncounter(currentPatient.id)?.id ?? encounters[0]?.id;
  const [selectedId, setSelectedId] = useState<EncounterId | undefined>(defaultId);

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];

  const encounterOrders = orders.filter((o) => o.encounterId === encounter?.id);
  const encounterTasks = tasks.filter((t) => t.encounterId === encounter?.id);
  const instance = instances.find((i) => i.id === encounter?.workflowInstanceId);
  const record = records.find((r) => r.encounterId === encounter?.id);
  const carePlan = carePlans.find((p) => p.patientId === currentPatient.id);
  const openAlerts = alerts.filter((a) => a.patientId === currentPatient.id && a.status !== 'resolved');

  if (!encounter) {
    return <Card><ProfessionalEmpty title="Chưa có lượt khám" description="Hành trình sẽ xuất hiện sau khi bệnh nhân có lịch hẹn hoặc được tiếp nhận tại phòng khám." primaryLabel="Xem lịch hẹn" primaryHref="/app/appointments" /></Card>;
  }

  const pct = overallProgressPct(encounter.status);
  const milestoneIdx = milestoneIndexForStatus(encounter.status);
  const outstandingTasks = encounterTasks.filter((t) => t.status === 'pending' || t.status === 'blocked' || t.status === 'ready');
  const resultStatus = encounterOrders.length === 0 ? 'not_ordered' : encounterOrders.some((o) => o.status === 'requested' || o.status === 'in_progress') ? 'pending' : 'ready';
  const currentTask = encounterTasks.find((t) => t.status === 'in_progress' || t.status === 'accepted') ?? encounterTasks.find((t) => t.status === 'ready' || t.status === 'assigned');
  const currentMilestone = MILESTONES[Math.max(0, milestoneIdx)];
  const nextMilestone = milestoneIdx >= 0 ? MILESTONES[milestoneIdx + 1] : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Theo Dõi Hành Trình Khám Bệnh</Title>
        </div>
        <div style={{ width: 220, paddingTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><Text type="secondary">Tiến độ lượt khám</Text><Text strong>{pct}%</Text></div>
          <Progress percent={pct} showInfo={false} strokeColor="var(--medical-blue-700)" />
        </div>
      </div>

      <Card size="small">
        <div style={{ maxWidth: 520 }}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Lượt khám đang theo dõi</Text>
            <Select
              style={{ width: '100%' }}
              value={encounter.id}
              onChange={(v) => setSelectedId(v as EncounterId)}
              options={encounters.map((e) => ({
                value: e.id,
                label: `${ENCOUNTER_TYPE_LABEL[e.type]} · ${formatEncounterDate(e.createdAt)} · ${ENCOUNTER_STATUS_LABEL[e.status]}`,
              }))}
            />
        </div>
      </Card>

      {encounter.status === 'escalated' && (
        <Alert
          type="error"
          showIcon
          icon={<TriangleAlert size={16} />}
          message="Lượt khám đang ở trạng thái khẩn cấp / bất thường"
          description={encounter.blockingCondition}
        />
      )}
      {encounter.status !== 'escalated' && encounter.blockingCondition && (
        <Alert type="warning" showIcon message={encounter.blockingCondition} />
      )}

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Card size="small" title="Tiến trình khám">
            <Row gutter={[12, 12]} style={{ marginBottom: 22 }}>
              <Col xs={24} sm={12}>
                <div style={{ padding: 14, borderRadius: 10, background: '#eef6ff', height: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>ĐANG THỰC HIỆN</Text>
                  <div style={{ marginTop: 5 }}><Text strong style={{ color: 'var(--medical-blue-700)' }}>{currentTask?.name ?? currentMilestone?.label ?? ENCOUNTER_STATUS_LABEL[encounter.status]}</Text></div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{ENCOUNTER_STATUS_LABEL[encounter.status]}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ padding: 14, borderRadius: 10, background: '#f6f8fa', height: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>BƯỚC TIẾP THEO</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}><ArrowRight size={15} /><Text strong>{nextMilestone?.label ?? 'Hoàn tất hành trình khám'}</Text></div>
                </div>
              </Col>
            </Row>
            <div style={{ marginBottom: 14 }}>
              <Text strong>Các giai đoạn</Text>
            </div>
            <Steps
              direction="vertical"
              size="small"
              current={milestoneIdx < 0 ? 0 : milestoneIdx}
              status={milestoneIdx < 0 ? 'error' : undefined}
              items={MILESTONES.map((m) => ({ title: m.label }))}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card size="small" title="Vị trí & hàng chờ">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={15} color="var(--medical-blue-700)" /> {encounter.department}{encounter.room ? ` — ${encounter.room}` : ''}</div>
                {encounter.queueNumber !== undefined && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Hash size={15} color="var(--medical-blue-700)" /> Số thứ tự <Text strong>{encounter.queueNumber}</Text>{encounter.peopleAheadInQueue !== undefined ? ` · còn ${encounter.peopleAheadInQueue} người trước bạn` : ''}</div>}
                {encounter.estimatedWaitMinutes !== undefined && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={15} color="var(--medical-blue-700)" /> Thời gian chờ dự kiến: <Text strong>~{encounter.estimatedWaitMinutes} phút</Text></div>}
              </div>
            </Card>

            <Card size="small" title={<span><ClipboardCheck size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Yêu cầu còn thiếu</span>}>
              {outstandingTasks.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#25834b' }}><CheckCircle2 size={18} /><Text>Không có việc nào đang chờ xử lý</Text></div>
              ) : (
                <List size="small" dataSource={outstandingTasks} renderItem={(t) => <List.Item>{t.name}</List.Item>} />
              )}
            </Card>

            <Card size="small" title={<span><FlaskConical size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Trạng thái kết quả</span>}>
              <Tag color={resultStatus === 'ready' ? 'success' : resultStatus === 'pending' ? 'warning' : 'default'}>
                {resultStatus === 'ready' ? 'Đã có kết quả' : resultStatus === 'pending' ? 'Đang chờ kết quả' : 'Chưa có chỉ định'}
              </Tag>
            </Card>

            <Card size="small" title="Chuẩn bị trước khi khám">
              <List size="small" dataSource={PREP_INSTRUCTIONS} renderItem={(p) => <List.Item>{p}</List.Item>} />
            </Card>

            <Card size="small" title="Cần hỗ trợ?">
              <Button block icon={<PhoneCall size={15} />} href="tel:19006363">Gọi tổng đài 1900 6363</Button>
            </Card>
          </div>
        </Col>
      </Row>

      {role !== 'patient' && (
        <Card
          title={<span><Users size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Chế độ xem vận hành (nhân viên)</span>}
          size="small"
        >
          <Descriptions column={3} size="small" bordered style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Người phụ trách hiện tại">{currentTask ? ROLE_LABEL[currentTask.responsibleRole] : 'Chưa có công việc đang thực hiện'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái hồ sơ bệnh án">{record ? RECORD_STATUS_LABEL[record.status] : 'Chưa tạo'}</Descriptions.Item>
            <Descriptions.Item label="Theo dõi sau khám">{carePlan ? `${CARE_PLAN_STATUS_LABEL[carePlan.status]} · ${openAlerts.length} cảnh báo đang mở` : 'Chưa bắt đầu'}</Descriptions.Item>
          </Descriptions>

          {instance && (
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Quy trình vận hành: {WORKFLOW_STATUS_LABEL[instance.status]} ({encounterTasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length}/{encounterTasks.length} bước hoàn tất)
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {encounterTasks.map((t) => <Tag key={t.id}>{t.name}: {TASK_STATUS_LABEL[t.status]}</Tag>)}
              </div>
            </div>
          )}

          {encounterOrders.length > 0 && (
            <Table
              size="small"
              scroll={{ x: 'max-content' }}
              pagination={false}
              style={{ marginBottom: 20 }}
              rowKey="id"
              dataSource={encounterOrders}
              columns={[
                { title: 'Loại chỉ định', dataIndex: 'type', render: (v: keyof typeof ORDER_TYPE_LABEL) => ORDER_TYPE_LABEL[v] },
                { title: 'Lý do', dataIndex: 'justification' },
                { title: 'Trạng thái', dataIndex: 'status', render: (v: keyof typeof ORDER_STATUS_LABEL) => <Tag>{ORDER_STATUS_LABEL[v]}</Tag> },
                {
                  title: 'Kết quả', render: (_, o) => {
                    const result = o.resultId ? results.find((r) => r.id === o.resultId) : undefined;
                    return result ? <Tag color={result.abnormal ? 'error' : 'success'}>{result.abnormal ? 'Bất thường' : 'Bình thường'}</Tag> : '—';
                  },
                },
              ]}
            />
          )}

          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Sự kiện gần đây</Text>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <Timeline
              items={[...encounter.events].reverse().map((ev) => ({ color: EVENT_COLOR[ev.kind], children: <Text style={{ fontSize: 12.5 }}>{ev.label}</Text> }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
