import { App, Button, Card, Col, DatePicker, Row, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing, Calendar, Check, LogIn, Route, SkipForward, UserRound,
  Clock, Video, Building2, XCircle, UserX, RotateCcw, Stethoscope,
} from 'lucide-react';
import { useStore } from '../state/useStore';
import { appointmentRepository, patientRepository, queueRepository } from '../domain/repositories';
import type { QueueTicket, Appointment } from '../domain/core/entities';
import { useFriendlyError } from '../components/feedback/useFriendlyError';
import { ProfessionalEmpty } from '../components/feedback/ProfessionalEmpty';
import {
  acknowledgeQueueTicket,
  callNextQueueTicket,
  cancelQueueTicket,
  completeQueueTicket,
  listQueueTickets,
  mergeQueueTicketSnapshot,
  noShowQueueTicket,
  returnQueueTicketToQueue,
  skipQueueTicket,
  startQueueTicketService,
  subscribeQueueStream,
} from '../api/queue';
import { listAppointments } from '../api/appointments';

const { Title, Text } = Typography;

const STATUS_LABELS: Record<QueueTicket['status'], string> = {
  waiting: 'Đang chờ',
  called: 'Đang gọi',
  acknowledged: 'Đã xác nhận',
  in_service: 'Đang phục vụ',
  skipped: 'Tạm bỏ qua',
  completed: 'Hoàn tất',
  routed: 'Đã chuyển trạm',
  cancelled: 'Đã hủy',
  no_show: 'Vắng mặt',
};

const STATUS_COLORS: Record<QueueTicket['status'], string> = {
  waiting: 'default',
  called: 'blue',
  acknowledged: 'cyan',
  in_service: 'green',
  skipped: 'orange',
  completed: 'success',
  routed: 'purple',
  cancelled: 'error',
  no_show: 'warning',
};

const ACTIVE_STATUSES: QueueTicket['status'][] = ['waiting', 'called', 'acknowledged', 'in_service', 'skipped'];

const announce = (ticket: QueueTicket) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(
    `Mời số ${ticket.number.split('').join(' ')}, đến ${ticket.room ?? ticket.serviceStation}`,
  );
  u.lang = 'vi-VN';
  window.speechSynthesis.speak(u);
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function ClinicQueue({ board = false }: { board?: boolean }) {
  const tickets = useStore(queueRepository);
  const appointments = useStore(appointmentRepository);
  const patients = useStore(patientRepository);
  const { message } = App.useApp();
  const showError = useFriendlyError();
  const [calling, setCalling] = useState(false);
  const [actionTicketId, setActionTicketId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [departmentFilter, setDepartmentFilter] = useState<string>();

  const clinicLocationId =
    appointments.find((a) => a.clinicLocationId)?.clinicLocationId ??
    import.meta.env.VITE_CLINIC_LOCATION_ID;

  useEffect(() => {
    let active = true;

    const syncParams = { clinicLocationId: clinicLocationId || undefined, clinicDate: selectedDate };

    const sync = () => {
      Promise.all([
        listQueueTickets(syncParams),
        listAppointments().catch(() => [] as Appointment[]),
      ])
        .then(([scopedRows, fetchedAppointments]) => {
          if (!active) return;
          queueRepository.replaceAll(mergeQueueTicketSnapshot(scopedRows, queueRepository.getAll()));
          if (fetchedAppointments.length > 0) appointmentRepository.replaceAll(fetchedAppointments);
        })
        .catch((err: unknown) => { if (active) showError(err, 'Không tải được hàng đợi'); })
        .finally(() => { if (active) setLoading(false); });
    };

    sync();
    const unsubscribe = subscribeQueueStream(
      (rows) => { if (active) queueRepository.replaceAll(mergeQueueTicketSnapshot(rows, queueRepository.getAll())); },
      syncParams,
    );
    return () => { active = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicLocationId, selectedDate]);

  const activeTickets = useMemo(
    () =>
      tickets.filter((t) => {
        const dateMatch = t.clinicDate === selectedDate;
        const statusMatch = ACTIVE_STATUSES.includes(t.status);
        const deptMatch = !departmentFilter || t.department === departmentFilter;
        return dateMatch && statusMatch && deptMatch;
      }),
    [tickets, selectedDate, departmentFilter],
  );

  const departments = useMemo(
    () => [...new Set(tickets.filter((t) => t.clinicDate === selectedDate).map((t) => t.department))],
    [tickets, selectedDate],
  );

  const called = [...activeTickets]
    .filter((t) => t.status === 'called')
    .sort((a, b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''))[0];

  // Board mode: public display screen
  if (board) {
    return (
      <div style={{ minHeight: '100vh', background: '#082b49', color: 'white', padding: 32 }}>
        <Title style={{ color: 'white', textAlign: 'center' }}>DERMAHEALTH · BẢNG GỌI SỐ</Title>
        <Row gutter={24} justify="center">
          <Col xs={24} lg={14}>
            <Card style={{ textAlign: 'center', border: called ? '5px solid #35c98b' : undefined }}>
              <Text>ĐANG MỜI</Text>
              <div style={{ fontSize: 'clamp(70px,15vw,170px)', fontWeight: 900, color: '#1769aa' }}>
                {called?.number ?? '—'}
              </div>
              <Title level={2}>{called?.room ?? 'Vui lòng chờ gọi số'}</Title>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Các số đang chờ">
              {activeTickets
                .filter((t) => t.status === 'waiting')
                .slice(0, 8)
                .map((t) => (
                  <div key={t.id} style={{ fontSize: 28, padding: 10, borderBottom: '1px solid #ddd' }}>
                    {t.number} <Text type="secondary">· {t.department}</Text>
                  </div>
                ))}
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  const act = async (ticket: QueueTicket, fn: () => Promise<QueueTicket>, success: string) => {
    setActionTicketId(ticket.id);
    try {
      const updated = await fn();
      queueRepository.upsert(updated);
      message.success(success);
    } catch (e) {
      showError(e);
    } finally {
      setActionTicketId(undefined);
    }
  };

  // Server selects the next ticket — client provides location and optional department filter only.
  const callNext = async () => {
    if (!clinicLocationId) return message.error('Lượt khám chưa có cơ sở tiếp nhận.');
    const hasWaiting = activeTickets.some((t) => t.status === 'waiting');
    if (!hasWaiting) return message.info('Không còn bệnh nhân đang chờ.');
    setCalling(true);
    try {
      const updated = await callNextQueueTicket({
        clinicLocationId,
        department: departmentFilter,
      });
      queueRepository.upsert(updated);
      announce(updated);
      message.success('Đã gọi bệnh nhân tiếp theo.');
    } catch (error) {
      showError(error);
    } finally {
      setCalling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Hàng đợi & Lịch hẹn phòng khám</Title>
          <Text type="secondary">Quản lý luồng bệnh nhân check-in và danh sách đặt lịch trong ngày.</Text>
        </div>
        <Space wrap>
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={(d) => { if (d) setSelectedDate(d.format('YYYY-MM-DD')); }}
            allowClear={false}
            format="DD/MM/YYYY"
          />
          <Select
            allowClear
            placeholder="Lọc theo khoa"
            style={{ minWidth: 180 }}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={departments.map((d) => ({ label: d, value: d }))}
          />
          <Button
            type="primary"
            size="large"
            loading={calling}
            icon={<BellRing size={18} />}
            onClick={() => void callNext()}
          >
            Gọi số tiếp theo
          </Button>
          <Button
            disabled={!clinicLocationId}
            href={clinicLocationId ? `/queue-display/${encodeURIComponent(clinicLocationId)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở bảng hiển thị
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: '12px 24px' }}>
        <Tabs
          defaultActiveKey="queue"
          items={[
            {
              key: 'queue',
              label: (
                <Space>
                  <BellRing size={16} />
                  <span>Danh sách chờ khám thực tế ({activeTickets.length})</span>
                </Space>
              ),
              children: (
                <Table
                  loading={loading}
                  rowKey="id"
                  dataSource={loading ? [] : activeTickets}
                  locale={{
                    emptyText: (
                      <ProfessionalEmpty
                        title="Chưa có bệnh nhân đang chờ hôm nay"
                        description="Lượt mới sẽ xuất hiện sau khi bệnh nhân lấy số hoặc check-in."
                        primaryLabel="Mở tiếp đón & cấp số"
                        primaryHref="/app/reception"
                      />
                    ),
                  }}
                  columns={[
                    {
                      title: 'Số',
                      dataIndex: 'number',
                      render: (v: string) => <Title level={4} style={{ margin: 0 }}>{v}</Title>,
                    },
                    {
                      title: 'Bệnh nhân',
                      render: (_: unknown, t: QueueTicket) => {
                        const p = patients.find((pat) => pat.id === t.patientId);
                        return <Text strong>{p?.name ?? (t.patientId ? `BN #${t.patientId.slice(0, 8)}` : 'Bệnh nhân vãng lai')}</Text>;
                      },
                    },
                    {
                      title: 'Nguồn',
                      dataIndex: 'sourceType',
                      render: (v: QueueTicket['sourceType']) => (
                        <Tag icon={v === 'appointment' ? <Calendar size={11} /> : <Stethoscope size={11} />}
                          color={v === 'appointment' ? 'blue' : 'green'}>
                          {v === 'appointment' ? 'Lịch hẹn' : 'Đến trực tiếp'}
                        </Tag>
                      ),
                    },
                    { title: 'Khoa', dataIndex: 'department' },
                    { title: 'Khu vực', dataIndex: 'waitingArea' },
                    {
                      title: 'Check-in lúc',
                      dataIndex: 'issuedAt',
                      render: (v: string) =>
                        new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      render: (v: QueueTicket['status']) => (
                        <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>
                      ),
                    },
                    {
                      title: 'Thao tác',
                      render: (_: unknown, t: QueueTicket) => (
                        <Space wrap>
                          {t.status === 'called' && (
                            <>
                              <Button size="small" icon={<BellRing size={13} />} onClick={() => announce(t)}>Gọi lại</Button>
                              <Button size="small" loading={actionTicketId === t.id} icon={<Check size={13} />}
                                onClick={() => void act(t, () => acknowledgeQueueTicket(t.id, t.version ?? 0), 'Đã xác nhận bệnh nhân.')}>
                                Xác nhận
                              </Button>
                              <Button size="small" loading={actionTicketId === t.id} icon={<UserX size={13} />}
                                onClick={() => void act(t, () => noShowQueueTicket(t.id, t.version ?? 0), 'Đã ghi nhận vắng mặt.')}>
                                Vắng mặt
                              </Button>
                              <Button size="small" loading={actionTicketId === t.id} danger icon={<SkipForward size={13} />}
                                onClick={() => void act(t, () => skipQueueTicket(t.id, t.version ?? 0), 'Đã tạm bỏ qua.')}>
                                Bỏ qua
                              </Button>
                            </>
                          )}
                          {t.status === 'acknowledged' && (
                            <>
                              <Button size="small" loading={actionTicketId === t.id} type="primary" icon={<LogIn size={13} />}
                                onClick={() => void act(t, () => startQueueTicketService(t.id, t.version ?? 0), 'Đã bắt đầu phục vụ.')}>
                                Bắt đầu phục vụ
                              </Button>
                              <Button size="small" loading={actionTicketId === t.id} icon={<UserX size={13} />}
                                onClick={() => void act(t, () => noShowQueueTicket(t.id, t.version ?? 0), 'Đã ghi nhận vắng mặt.')}>
                                Vắng mặt
                              </Button>
                            </>
                          )}
                          {t.status === 'in_service' && (
                            <Button size="small" loading={actionTicketId === t.id} icon={<Route size={13} />}
                              onClick={() => void act(t, () => completeQueueTicket(t.id, { version: t.version ?? 0 }), 'Đã hoàn tất lượt phục vụ.')}>
                              Hoàn tất
                            </Button>
                          )}
                          {t.status === 'skipped' && (
                            <Button size="small" loading={actionTicketId === t.id} icon={<RotateCcw size={13} />}
                              onClick={() => void act(t, () => returnQueueTicketToQueue(t.id, t.version ?? 0), 'Đã trả về hàng đợi.')}>
                              Trả về hàng đợi
                            </Button>
                          )}
                          {['waiting', 'called', 'acknowledged', 'skipped'].includes(t.status) && (
                            <Button size="small" loading={actionTicketId === t.id} danger icon={<XCircle size={13} />}
                              onClick={() => void act(t, () => cancelQueueTicket(t.id, t.version ?? 0), 'Đã hủy lượt.')}>
                              Hủy
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'appointments',
              label: (
                <Space>
                  <Calendar size={16} />
                  <span>Lịch hẹn đặt trước ({appointments.length})</span>
                </Space>
              ),
              children: (
                <Table
                  loading={loading}
                  rowKey="id"
                  dataSource={appointments}
                  locale={{
                    emptyText: (
                      <ProfessionalEmpty
                        title="Chưa có lịch hẹn nào"
                        description="Danh sách các lịch hẹn trực tuyến/tại phòng khám do bệnh nhân hoặc lễ tân tạo."
                      />
                    ),
                  }}
                  columns={[
                    {
                      title: 'Thời gian',
                      render: (_: unknown, appt: Appointment) => (
                        <Space direction="vertical" size={2}>
                          <Text strong>
                            <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {appt.time || (appt.startAt ? new Date(appt.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—')}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {appt.date || (appt.startAt ? new Date(appt.startAt).toLocaleDateString('vi-VN') : '')}
                          </Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'Bệnh nhân',
                      render: (_: unknown, appt: Appointment) => {
                        const p = patients.find((pat) => pat.id === appt.patientId);
                        return (
                          <Space direction="vertical" size={2}>
                            <Text strong>
                              <UserRound size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                              {p?.name ?? `Bệnh nhân #${appt.patientId.slice(0, 8)}`}
                            </Text>
                            {p?.profile?.phone && (
                              <Text type="secondary" style={{ fontSize: 12 }}>SĐT: {p.profile.phone}</Text>
                            )}
                          </Space>
                        );
                      },
                    },
                    { title: 'Khoa / Chuyên khoa', dataIndex: 'department' },
                    {
                      title: 'Hình thức',
                      dataIndex: 'mode',
                      render: (v: string) => (
                        <Tag icon={v === 'video' ? <Video size={12} /> : <Building2 size={12} />} color={v === 'video' ? 'purple' : 'cyan'}>
                          {v === 'video' ? 'Trực tuyến' : 'Tại phòng khám'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Trạng thái lịch',
                      dataIndex: 'status',
                      render: (v: string) => (
                        <Tag color={v === 'upcoming' ? 'processing' : v === 'done' ? 'success' : 'default'}>
                          {v === 'upcoming' ? 'Sắp tới' : v === 'done' ? 'Đã khám' : v}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Trạng thái Check-in',
                      render: (_: unknown, appt: Appointment) => {
                        const ticket = tickets.find((t) => t.appointmentId === appt.id);
                        if (!ticket) return <Tag color="warning">Chưa check-in</Tag>;
                        const color = ticket.status === 'completed' ? 'success'
                          : ticket.status === 'in_service' ? 'green'
                          : ticket.status === 'cancelled' ? 'error'
                          : ticket.status === 'no_show' ? 'orange'
                          : 'blue';
                        return <Tag color={color}>Số {ticket.number} · {STATUS_LABELS[ticket.status]}</Tag>;
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
