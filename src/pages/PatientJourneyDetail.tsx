import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Result,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  Clock3,
  FileCheck2,
  HelpCircle,
  ListChecks,
  MapPin,
  Navigation,
  QrCode,
  RefreshCw,
  Route,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useAppState } from '../state/useAppState';
import {
  clinicalOrderRepository,
  encounterRepository,
  patientRepository,
  queueRepository,
  workflowRepository,
} from '../domain/repositories';
import { buildClinicalGpsView, type PatientJourneyStep } from '../domain/clinicalGps';
import { ENCOUNTER_STATUS_LABEL } from '../domain/core/enums';
import { getClinicalOrderResult, getEncounterClinicalOrders } from '../api/clinicalOrder';
import { listWorkflowInstances } from '../api/workflowInstance';
import { listWorkflowTasks } from '../api/workflowTask';
import { AccessDenied } from '../components/feedback/AccessDenied';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';

const { Title, Text } = Typography;

const ORDER_TYPE_LABEL = {
  laboratory: 'Xét nghiệm',
  imaging: 'Chẩn đoán hình ảnh',
  consultation: 'Hội chẩn',
} as const;

const ORDER_STATUS = {
  requested: { label: 'Chờ tiếp nhận', color: 'default' },
  in_progress: { label: 'Đang thực hiện', color: 'processing' },
  invalid_sample: { label: 'Cần lấy lại mẫu', color: 'error' },
  result_ready: { label: 'Đã có kết quả', color: 'warning' },
  completed: { label: 'Hoàn tất', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'default' },
} as const;

function StepIcon({ step }: { step: PatientJourneyStep }) {
  if (step.tone === 'done') return <Check size={15} strokeWidth={2.5} />;
  if (step.tone === 'blocked') return <AlertTriangle size={15} />;
  if (step.isCurrent) return <Navigation size={15} />;
  return <CircleDashed size={15} />;
}

export default function PatientJourneyDetail() {
  const navigate = useNavigate();
  const { encounterId } = useParams();
  const { currentPatient, role } = useAppState();
  const encounters = useStore(encounterRepository);
  const patients = useStore(patientRepository);
  const tickets = useStore(queueRepository);
  const tasks = useStore(workflowRepository.tasks());
  const instances = useStore(workflowRepository.instances());
  const orders = useStore(clinicalOrderRepository.orders());
  const clinicalResults = useStore(clinicalOrderRepository.results());
  const encounter = encounters.find((item) => item.id === encounterId);
  const [loading, setLoading] = useState(Boolean(encounter));
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadWarning, setLoadWarning] = useState<string>();

  useEffect(() => {
    if (!encounter) return;
    let active = true;

    Promise.allSettled([
      listWorkflowInstances(encounter.patientId),
      listWorkflowTasks(),
      getEncounterClinicalOrders(encounter.id),
    ])
      .then(async ([instanceResult, taskResult, orderResult]) => {
        if (!active) return;
        if (instanceResult.status === 'fulfilled') {
          instanceResult.value.forEach((item) => workflowRepository.instances().upsert(item));
        }
        if (taskResult.status === 'fulfilled') {
          taskResult.value.forEach((item) => workflowRepository.tasks().upsert(item));
        }
        if (orderResult.status === 'fulfilled') {
          orderResult.value.forEach((item) => clinicalOrderRepository.orders().upsert(item));
          const resultRows = await Promise.allSettled(
            orderResult.value
              .filter((item) => item.status === 'result_ready' || item.status === 'completed')
              .map((item) => getClinicalOrderResult(item.id)),
          );
          if (!active) return;
          resultRows.forEach((result) => {
            if (result.status === 'fulfilled') {
              clinicalOrderRepository.results().upsert(result.value);
            }
          });
        }

        const failedCount = [instanceResult, taskResult, orderResult]
          .filter((result) => result.status === 'rejected').length;
        if (failedCount > 0) {
          setLoadWarning(
            failedCount === 3
              ? 'Chưa thể đồng bộ hành trình từ hệ thống. Dữ liệu bên dưới có thể chưa cập nhật.'
              : 'Một phần hành trình chưa đồng bộ. Bạn vẫn có thể xem dữ liệu đã tải được.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [encounter, refreshKey]);

  const instance = instances
    .filter((item) => item.encounterId === encounter?.id)
    .sort((left, right) => right.activatedAt.localeCompare(left.activatedAt))[0];
  const encounterTasks = tasks.filter(
    (task) =>
      task.encounterId === encounter?.id &&
      (!instance || task.instanceId === instance.id),
  );
  const encounterOrders = orders.filter((order) => order.encounterId === encounter?.id);
  const ticket = tickets.find(
    (item) =>
      item.encounterId === encounter?.id &&
      item.patientId === encounter?.patientId &&
      item.status !== 'completed',
  ) ?? tickets.find((item) => item.encounterId === encounter?.id);

  const view = useMemo(
    () =>
      encounter
        ? buildClinicalGpsView({
            encounter,
            ticket,
            tasks: encounterTasks,
            orders: encounterOrders,
          })
        : undefined,
    [encounter, ticket, encounterTasks, encounterOrders],
  );

  if (!encounter) {
    return (
      <Result
        status="404"
        title="Không tìm thấy tiến trình"
        subTitle="Lượt khám không tồn tại hoặc đã được lưu trữ."
        extra={<Button onClick={() => navigate('/app/journey')}>Về danh sách tiến trình</Button>}
      />
    );
  }
  if (role === 'patient' && encounter.patientId !== currentPatient.id) {
    return <AccessDenied featureName="tiến trình của bệnh nhân khác" />;
  }
  if (!view) return null;

  const journeyPatient = patients.find((item) => item.id === encounter.patientId);
  const currentAction = view.current?.name ?? (
    view.totalCount > 0 ? 'Chờ hệ thống xác định bước tiếp theo' : 'Chờ bác sĩ duyệt kế hoạch khám'
  );
  const isFinished = view.totalCount > 0 && view.completedCount === view.totalCount;
  const statusTone = view.blockers.length > 0 ? 'warning' : isFinished ? 'success' : 'processing';

  return (
    <div className="clinical-gps">
      <div className="clinical-gps__header">
        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={15} />}
            className="clinical-gps__back"
            onClick={() => navigate('/app/journey')}
          >
            Tất cả lượt khám
          </Button>
          <Space size={8} wrap>
            <Title level={3} style={{ margin: 0 }}>
              Hành trình khám của {journeyPatient?.name ?? currentPatient.name}
            </Title>
            <Tag color={statusTone}>{ENCOUNTER_STATUS_LABEL[encounter.status]}</Tag>
          </Space>
          <Text type="secondary">
            {instance?.instanceCode
              ? `Mã hành trình ${instance.instanceCode}`
              : 'Thông tin được cập nhật theo lượt khám hiện tại'}
          </Text>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          loading={loading}
          onClick={() => {
            setLoading(true);
            setLoadWarning(undefined);
            setRefreshKey((value) => value + 1);
          }}
        >
          Cập nhật
        </Button>
      </div>

      {loadWarning && <Alert type="warning" showIcon message={loadWarning} />}

      <Skeleton active loading={loading && view.totalCount === 0}>
        <Card className="clinical-gps__hero" bordered={false}>
          <Row gutter={[24, 20]} align="middle">
            <Col xs={24} lg={15}>
              <Space size={8} wrap>
                <Tag color={view.blockers.length ? 'warning' : 'blue'}>
                  {view.blockers.length ? 'CẦN XỬ LÝ TRƯỚC' : isFinished ? 'ĐÃ HOÀN TẤT' : 'VIỆC CẦN LÀM TIẾP'}
                </Tag>
                {view.current?.isAdHoc && (
                  <Tag icon={<Sparkles size={11} />}>Bước được bác sĩ bổ sung riêng</Tag>
                )}
              </Space>
              <Title level={2} className="clinical-gps__action-title">
                {isFinished ? 'Bạn đã hoàn thành hành trình hôm nay' : currentAction}
              </Title>
              <div className="clinical-gps__destination">
                <MapPin size={19} />
                <div>
                  <Text strong>{view.location.department}</Text>
                  <Text type="secondary">
                    {[
                      view.location.room,
                      view.location.waitingArea,
                      view.location.nextStation,
                    ].filter(Boolean).join(' · ') || 'Vị trí cụ thể sẽ được thông báo'}
                  </Text>
                </div>
              </div>
              {view.current?.statusLabel && (
                <Text type="secondary" className="clinical-gps__status-copy">
                  {view.current.statusLabel}
                </Text>
              )}
            </Col>

            <Col xs={24} lg={9}>
              <div className="clinical-gps__queue-panel">
                {view.queue ? (
                  <>
                    <div className="clinical-gps__queue-number">
                      <QrCode size={21} />
                      <span>{view.queue.number}</span>
                    </div>
                    <div className="clinical-gps__queue-metrics">
                      <div>
                        <UsersRound size={16} />
                        <span><strong>{view.queue.peopleAhead}</strong> người phía trước</span>
                      </div>
                      <div>
                        <Clock3 size={16} />
                        <span>Khoảng <strong>{view.queue.estimatedWaitMinutes} phút</strong></span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="clinical-gps__queue-empty">
                    <Route size={24} />
                    <div>
                      <Text strong>Chưa cần lấy số</Text>
                      <Text type="secondary">Hệ thống sẽ hiển thị số khi bạn vào hàng đợi.</Text>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      </Skeleton>

      {view.blockers.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<AlertTriangle size={18} />}
          message="Hành trình đang có điều kiện cần xử lý"
          description={
            <ul className="clinical-gps__plain-list">
              {view.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            title={<Space><ListChecks size={17} /> Các bước trong lượt khám</Space>}
            extra={
              <Text type="secondary">
                {view.completedCount}/{view.totalCount} hoàn thành
              </Text>
            }
          >
            <Progress
              percent={view.progressPercent}
              showInfo={false}
              strokeColor="var(--medical-blue-700)"
              trailColor="var(--surface-subtle)"
            />

            {view.timeline.length > 0 ? (
              <div className="clinical-gps__timeline">
                {view.timeline.map((step, index) => (
                  <div
                    key={step.id}
                    className={[
                      'clinical-gps__step',
                      `clinical-gps__step--${step.tone}`,
                      step.isCurrent ? 'clinical-gps__step--current' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="clinical-gps__step-marker">
                      <StepIcon step={step} />
                    </div>
                    <div className="clinical-gps__step-copy">
                      <Space size={6} wrap>
                        <Text strong>{step.name}</Text>
                        {step.isCurrent && <Tag color="blue">Hiện tại</Tag>}
                        {step.isAdHoc && <Tag>Bổ sung riêng</Tag>}
                      </Space>
                      <Text type="secondary">{step.department} · {step.statusLabel}</Text>
                    </div>
                    {index < view.timeline.length - 1 && (
                      <ArrowRight size={15} className="clinical-gps__step-arrow" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <ProfessionalEmpty
                title="Bác sĩ chưa kích hoạt quy trình chuyên sâu"
                description="Sau khi bác sĩ xác nhận chẩn đoán và duyệt kế hoạch, các phòng cần đến sẽ xuất hiện tại đây."
                primaryLabel="Xem tổng quan lượt khám"
                primaryHref="/app/journey"
              />
            )}
          </Card>

          {view.activeOrders.length > 0 && (
            <Card
              title={<Space><FileCheck2 size={17} /> Phiếu dịch vụ điện tử</Space>}
              className="clinical-gps__orders"
            >
              {view.activeOrders.map((order) => {
                const status = ORDER_STATUS[order.status];
                const clinicalResult = clinicalResults.find((result) => result.orderId === order.id);
                return (
                  <div className="clinical-gps__order" key={order.id}>
                    <div>
                      <Space size={7} wrap>
                        <Text strong>{ORDER_TYPE_LABEL[order.type]}</Text>
                        <Tag color={status.color}>{status.label}</Tag>
                        {clinicalResult?.critical && (
                          <Tag color={clinicalResult.acknowledgedAt ? 'warning' : 'error'}>
                            {clinicalResult.acknowledgedAt ? 'Bác sĩ đã tiếp nhận' : 'Đang chờ bác sĩ xử trí'}
                          </Tag>
                        )}
                      </Space>
                      <Text type="secondary">{order.justification}</Text>
                      {clinicalResult?.critical && !clinicalResult.acknowledgedAt && (
                        <Text type="danger" style={{ display: 'block', marginTop: 4 }}>
                          Vui lòng ở lại cơ sở hoặc làm theo hướng dẫn trực tiếp của nhân viên y tế.
                        </Text>
                      )}
                    </div>
                    <Text type="secondary">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                );
              })}
            </Card>
          )}
        </Col>

        <Col xs={24} xl={8}>
          <div className="clinical-gps__side">
            <Card title="Chuẩn bị trước khi đến phòng" size="small">
              {view.preparationInstructions.length > 0 ? (
                <ul className="clinical-gps__check-list">
                  {view.preparationInstructions.map((instruction) => (
                    <li key={instruction}>
                      <Check size={14} />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">Hiện không có yêu cầu chuẩn bị đặc biệt.</Text>
              )}
            </Card>

            <Card title="Sắp tới" size="small">
              {view.next.length > 0 ? (
                <div className="clinical-gps__next-list">
                  {view.next.map((step, index) => (
                    <div key={step.id}>
                      <span>{index + 1}</span>
                      <div>
                        <Text strong>{step.name}</Text>
                        <Text type="secondary">{step.department}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">
                  {isFinished ? 'Không còn bước nào trong lượt khám này.' : 'Bước kế tiếp sẽ xuất hiện khi kế hoạch được duyệt.'}
                </Text>
              )}
            </Card>

            <Card size="small" className="clinical-gps__help">
              <HelpCircle size={22} />
              <div>
                <Text strong>Bạn chưa biết đi đâu?</Text>
                <Text type="secondary">
                  Đưa mã hành trình cho nhân viên tại quầy hỗ trợ.
                </Text>
              </div>
              <Button href="tel:19006363">Gọi hỗ trợ</Button>
            </Card>

            {role !== 'patient' && instance && (
              <Button
                type="primary"
                block
                icon={<Navigation size={15} />}
                href={`/app/workflows/instances/${instance.id}`}
              >
                Điều hành quy trình này
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}
