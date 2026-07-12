import { useState } from 'react';
import {
  Row, Col, Card, Steps, Select, Button, Alert, Tag, List, Descriptions, Timeline, Table, Typography, Statistic,
} from 'antd';
import {
  MapPin, Hash, Clock, ClipboardCheck, FlaskConical, PhoneCall, TriangleAlert, PlayCircle, Users,
} from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { encounterRepository, clinicalOrderRepository, workflowRepository, medicalRecordRepository, carePlanRepository } from '../domain/repositories';
import { encounterService } from '../domain/services/encounterService';
import { MILESTONES, milestoneIndexForStatus, overallProgressPct } from '../domain/journeyView';
import { applyScenario, SCENARIO_LABEL, type ScenarioKey } from '../domain/journeyScenarios';
import { ENCOUNTER_STATUS_LABEL, TASK_STATUS_LABEL, RECORD_STATUS_LABEL } from '../domain/core/enums';
import type { EncounterId } from '../domain/core/ids';

const { Title, Text } = Typography;

const PREP_INSTRUCTIONS = [
  'Mang theo CMND/CCCD và thẻ bảo hiểm (nếu có)',
  'Không trang điểm vùng da cần khám',
  'Mang theo đơn thuốc đang sử dụng (nếu có)',
];

const EVENT_COLOR: Record<string, string> = { info: 'blue', success: 'green', warning: 'orange', danger: 'red' };

export default function Journey() {
  const { currentPatient, currentUser, role } = useAppState();
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
  const [scenario, setScenario] = useState<ScenarioKey>('standard');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const encounter = encounters.find((e) => e.id === selectedId) ?? encounters[0];

  const encounterOrders = orders.filter((o) => o.encounterId === encounter?.id);
  const encounterTasks = tasks.filter((t) => t.encounterId === encounter?.id);
  const instance = instances.find((i) => i.id === encounter?.workflowInstanceId);
  const record = records.find((r) => r.encounterId === encounter?.id);
  const carePlan = carePlans.find((p) => p.patientId === currentPatient.id);
  const openAlerts = alerts.filter((a) => a.patientId === currentPatient.id && a.status !== 'resolved');

  if (!encounter) {
    return <Card>Chưa có lượt khám nào cho bệnh nhân này.</Card>;
  }

  const pct = overallProgressPct(encounter.status);
  const milestoneIdx = milestoneIndexForStatus(encounter.status);
  const outstandingTasks = encounterTasks.filter((t) => t.status === 'pending' || t.status === 'blocked' || t.status === 'ready');
  const resultStatus = encounterOrders.length === 0 ? 'not_ordered' : encounterOrders.some((o) => o.status === 'requested' || o.status === 'in_progress') ? 'pending' : 'ready';
  const currentTask = encounterTasks.find((t) => t.status === 'in_progress' || t.status === 'accepted') ?? encounterTasks.find((t) => t.status === 'ready' || t.status === 'assigned');

  const handleApplyScenario = () => {
    try {
      const { message } = applyScenario(scenario, encounter.id, currentUser.id);
      setFeedback({ type: 'success', text: message });
      if (scenario === 'follow_up_visit') {
        const followUp = encounters.find((e) => e.parentEncounterId === encounter.id || e.id === 'ENC-1002');
        if (followUp) setSelectedId(followUp.id);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Theo dõi trực tiếp</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>Hành Trình Khám Bệnh</Title>
          <Text type="secondary">{currentPatient.name} · {currentPatient.code} · Lượt khám {encounter.id}</Text>
        </div>
        <Statistic value={pct} suffix="%" valueStyle={{ color: 'var(--medical-blue-700)', fontSize: 28 }} title="Hoàn tất" />
      </div>

      <Card size="small">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 260 }}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lượt khám</Text>
            <Select
              style={{ width: '100%' }}
              value={encounter.id}
              onChange={(v) => setSelectedId(v as EncounterId)}
              options={encounters.map((e) => ({ value: e.id, label: `${e.id} — ${ENCOUNTER_STATUS_LABEL[e.status]} (${e.type})` }))}
            />
          </div>
          <div style={{ minWidth: 280 }}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Kịch bản mô phỏng (demo)</Text>
            <Select
              style={{ width: '100%' }}
              value={scenario}
              onChange={(v) => setScenario(v as ScenarioKey)}
              options={Object.entries(SCENARIO_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <Button type="primary" icon={<PlayCircle size={15} />} onClick={handleApplyScenario}>Áp dụng kịch bản</Button>
        </div>
      </Card>

      {feedback && (
        <Alert type={feedback.type === 'success' ? 'success' : 'error'} showIcon message={feedback.text} closable onClose={() => setFeedback(null)} />
      )}

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
          <Card size="small">
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Trạng thái hiện tại: <Text strong style={{ color: 'var(--medical-blue-700)' }}>{ENCOUNTER_STATUS_LABEL[encounter.status]}</Text>
              </Text>
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
              {outstandingTasks.length === 0 && <Text type="secondary" style={{ fontSize: 13 }}>Không có yêu cầu nào đang chờ.</Text>}
              <List size="small" dataSource={outstandingTasks} renderItem={(t) => <List.Item>{t.name}</List.Item>} />
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
              <Button block icon={<PhoneCall size={15} />}>Tổng đài hỗ trợ bệnh nhân: 1900 6363</Button>
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
            <Descriptions.Item label="Vai trò chịu trách nhiệm hiện tại">{currentTask ? currentTask.responsibleRole : 'Không có tác vụ đang hoạt động'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái hồ sơ bệnh án">{record ? RECORD_STATUS_LABEL[record.status] : 'Chưa tạo'}</Descriptions.Item>
            <Descriptions.Item label="Bàn giao CRM sau khám">{carePlan ? `${carePlan.status} · ${openAlerts.length} cảnh báo đang mở` : 'Chưa bàn giao'}</Descriptions.Item>
          </Descriptions>

          {instance && (
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Quy trình BPM: {instance.status} ({encounterTasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length}/{encounterTasks.length} bước xong)
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
                { title: 'Loại chỉ định', dataIndex: 'type' },
                { title: 'Lý do', dataIndex: 'justification' },
                { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
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
