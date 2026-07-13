import { Button, Card, Descriptions, Progress, Result, Steps, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useAppState } from '../state/useAppState';
import { encounterRepository, patientRepository, queueRepository, workflowRepository } from '../domain/repositories';
import { ENCOUNTER_STATUS_LABEL, TASK_STATUS_LABEL } from '../domain/core/enums';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import { AccessDenied } from '../components/feedback/AccessDenied';

const { Title, Text } = Typography;

export default function PatientJourneyDetail() {
  const { encounterId } = useParams();
  const { currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository);
  const patients = useStore(patientRepository);
  const tickets = useStore(queueRepository);
  const tasks = useStore(workflowRepository.tasks());
  const instances = useStore(workflowRepository.instances());
  const encounter = encounters.find((item) => item.id === encounterId);

  if (!encounter) return <Result status="404" title="Không tìm thấy hành trình" subTitle="Lượt khám không tồn tại hoặc đã được lưu trữ." />;
  if (role === 'patient' && encounter.patientId !== currentPatient.id) return <AccessDenied featureName="hành trình của bệnh nhân khác" />;

  const journeyPatient = patients.find((item) => item.id === encounter.patientId);
  const ticket = tickets.find((item) => item.encounterId === encounter.id && item.patientId === encounter.patientId);
  const instance = instances.find((item) => item.id === encounter.workflowInstanceId && item.encounterId === encounter.id);
  const rows = tasks.filter((task) => task.encounterId === encounter.id && (!instance || task.instanceId === instance.id));
  const complete = rows.filter((task) => ['completed', 'skipped'].includes(task.status)).length;
  const current = rows.find((task) => ['in_progress', 'accepted', 'assigned', 'ready', 'waiting_for_patient'].includes(task.status));
  const next = rows.find((task) => ['pending', 'blocked'].includes(task.status));
  const percent = rows.length ? Math.round((complete / rows.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Text type="secondary">HÀNH TRÌNH KHÁM BỆNH</Text>
        <Title level={3} style={{ margin: '4px 0' }}>{journeyPatient?.name ?? currentPatient.name}</Title>
        <Text type="secondary">{instance?.instanceCode ? `Mã hành trình ${instance.instanceCode}` : 'Hành trình theo lượt khám hiện tại'}</Text>
      </div>

      <Card>
        <Descriptions
          column={{ xs: 1, md: 3 }}
          items={[
            { key: 'step', label: 'Đang thực hiện', children: current?.name ?? 'Chờ tiếp nhận' },
            { key: 'next', label: 'Bước tiếp theo', children: next?.name ?? 'Chưa xác định' },
            { key: 'location', label: 'Vị trí', children: `${current?.department ?? encounter.department} · ${ticket?.room ?? encounter.room ?? 'Sẽ thông báo'}` },
            { key: 'queue', label: 'Số thứ tự', children: ticket?.number ?? 'Chưa cấp số' },
            { key: 'wait', label: 'Thời gian chờ dự kiến', children: `${ticket?.estimatedWaitMinutes ?? encounter.estimatedWaitMinutes ?? 0} phút` },
            { key: 'status', label: 'Trạng thái', children: <Tag color="blue">{ENCOUNTER_STATUS_LABEL[encounter.status]}</Tag> },
          ]}
        />
        {ticket?.preparationInstructions.map((instruction) => <div key={instruction}>• {instruction}</div>)}
      </Card>

      <Card title="Tiến độ quy trình">
        <Progress percent={percent} />
        {rows.length ? (
          <Steps
            direction="vertical"
            current={Math.max(0, rows.findIndex((task) => task.id === current?.id))}
            items={rows.map((task) => ({
              title: task.name,
              description: `${task.department} · ${TASK_STATUS_LABEL[task.status]}`,
              status: task.status === 'completed' ? 'finish' : task.id === current?.id ? 'process' : task.status === 'failed' ? 'error' : 'wait',
            }))}
          />
        ) : (
          <ProfessionalEmpty title="Chưa có quy trình lâm sàng" description="Bác sĩ sẽ kích hoạt quy trình phù hợp sau khi hoàn thành thăm khám và duyệt kế hoạch điều trị." primaryLabel="Xem hành trình tổng quan" primaryHref="/app/journey" />
        )}
      </Card>

      {role !== 'patient' && instance && <Button type="primary" href={`/app/workflows/instances/${instance.id}`}>Mở trang điều hành quy trình</Button>}
    </div>
  );
}
