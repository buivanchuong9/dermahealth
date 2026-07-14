import { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Calendar, Input, Button, Tag, Typography, Result, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { Video, Clock, MapPin, Search, CheckCircle, Star } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { appointmentCheckInTokenRepository, appointmentRepository, userRepository } from '../domain/repositories';
import { appointmentService } from '../domain/services/appointmentService';
import { AppointmentQRCode } from '../components/appointments/AppointmentQRCode';
import type { Appointment } from '../domain/core/entities';
import { hasRoleAccess } from '../domain/core/enums';

const { Title, Text } = Typography;

const DOCTORS = [
  { id: 1, name: 'Bs. Nguyễn Thị An', spec: 'Da liễu', exp: '10 năm', rating: 4.9, reviews: 128, av: 'A', avail: true },
  { id: 2, name: 'Bs. Trần Văn Nam', spec: 'Da liễu thẩm mỹ', exp: '8 năm', rating: 4.8, reviews: 95, av: 'N', avail: true },
  { id: 3, name: 'Bs. Lê Thu Hà', spec: 'Dị ứng – Da liễu', exp: '12 năm', rating: 4.7, reviews: 211, av: 'H', avail: false },
];

const TIMES_AM = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
const TIMES_PM = ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const ALL_TIMES = [...TIMES_AM, ...TIMES_PM];

function TimeWheelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const itemWidth = 80;

  const handleMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    startX.current = e.pageX - (containerRef.current?.offsetLeft || 0);
    scrollLeftStart.current = containerRef.current?.scrollLeft || 0;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseLeave = () => {
    isDown.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    isDown.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleItemClick = (time: string, index: number) => {
    onChange(time);
    if (containerRef.current) {
      const scrollLeft = index * itemWidth;
      containerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const index = Math.round(scrollLeft / itemWidth);
    if (index >= 0 && index < ALL_TIMES.length) {
      const targetTime = ALL_TIMES[index];
      if (targetTime !== value) {
        onChange(targetTime);
      }
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const index = ALL_TIMES.indexOf(value);
      if (index !== -1) {
        const targetScrollLeft = index * itemWidth;
        if (!isDown.current && Math.abs(container.scrollLeft - targetScrollLeft) > 10) {
          container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        }
      }
    }
  }, [value]);

  return (
    <div style={{ position: 'relative', width: '100%', margin: '12px 0', userSelect: 'none' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .time-wheel-container::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      
      {/* Central Highlight Capsule */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: itemWidth - 10,
          height: 38,
          border: '2px solid var(--medical-blue-500)',
          borderRadius: 19,
          background: 'rgba(52, 145, 230, 0.08)',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(52, 145, 230, 0.12)',
          zIndex: 1,
        }}
      />

      {/* Fade Gradients */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '25%',
          background: 'linear-gradient(to right, var(--surface-card) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '25%',
          background: 'linear-gradient(to left, var(--surface-card) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Scrollable track */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="time-wheel-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: 16,
          paddingBottom: 16,
          cursor: 'grab',
          alignItems: 'center',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ flexShrink: 0, width: 'calc(50% - 40px)' }} />

        {ALL_TIMES.map((time, idx) => {
          const isActive = time === value;
          return (
            <div
              key={time}
              onClick={() => handleItemClick(time, idx)}
              style={{
                flexShrink: 0,
                width: itemWidth,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                cursor: 'pointer',
                fontSize: isActive ? 15 : 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--medical-blue-700)' : 'var(--text-secondary)',
                opacity: isActive ? 1 : 0.45,
                transform: isActive ? 'scale(1.15)' : 'scale(0.9)',
                transition: 'all 0.2s ease',
                zIndex: isActive ? 3 : 1,
              }}
            >
              {time}
            </div>
          );
        })}

        <div style={{ flexShrink: 0, width: 'calc(50% - 40px)' }} />
      </div>
    </div>
  );
}

export default function Appointments() {
  const { currentPatient, currentUser } = useAppState();
  const appointments = useStore(appointmentRepository);
  const tokens = useStore(appointmentCheckInTokenRepository);
  const users = useStore(userRepository);
  const [docId, setDocId] = useState(1);
  const [selDate, setSelDate] = useState<Dayjs | null>(null);
  const [selTime, setSelTime] = useState('09:00');
  const [name, setName] = useState('Nguyễn Văn A');
  const [phone, setPhone] = useState('0912 345 678');
  const [reason, setReason] = useState('Mụn viêm lan rộng sau khi đổi kem dưỡng, xuất hiện từ tuần trước.');
  const [created, setCreated] = useState<Appointment | null>(null);
  const doc = DOCTORS.find((d) => d.id === docId)!;

  const submit = () => {
    if (!selDate) return;
    const doctorId = docId === 1 ? 'U-0006' : 'U-0014';
    setCreated(appointmentService.bookAppointment({ patientId: currentPatient.id, doctorId, date: selDate.format('DD/MM/YYYY'), time: selTime, mode: 'in_person', clinicLocationId: 'CS-HCM-01', clinicName: 'DermaHealth TP.HCM', department: 'Khoa Da liễu' }, currentUser.id));
  };

  if (created) {
    const token = tokens.filter(t => t.appointmentId === created.id && t.status === 'active').sort((a,b)=>b.version-a.version)[0];
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Card>
          <Result
            status="success"
            title="Đặt lịch thành công"
            subTitle={<>Lịch khám với <Text strong>{doc.name}</Text> vào <Text strong>{selTime}{selDate ? `, ${selDate.format('DD/MM/YYYY')}` : ''}</Text> đã được xác nhận. Thông báo đã gửi qua SMS.</>}
            extra={[
              <Button key="view" onClick={() => setCreated(null)}>Đặt lịch khác</Button>,
              <Button key="kiosk" type="primary" href="/kiosk/check-in">Đến trang check-in</Button>,
            ]}
          />
          {token && <AppointmentQRCode appointment={created} token={token} doctorName={doc.name} actorId={currentUser.id} canRegenerate={hasRoleAccess(currentUser.role, ['receptionist', 'medical_administrator'])} />}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Đặt Lịch Khám Trực Tuyến</Title>
        </div>
        <Button danger icon={<Video size={16} />}>Khám khẩn cấp</Button>
      </div>

      <Row gutter={16}>
        {/* Left Column: Overview */}
        <Col xs={24} md={8}>
          <Card size="small" title="Tổng Quan Lịch Hẹn" style={{ position: 'sticky', top: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--surface-subtle)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--medical-blue-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{doc.av}</div>
              <div>
                <Text strong style={{ display: 'block', fontSize: 13.5 }}>{doc.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{doc.spec}</Text>
              </div>
            </div>
            <Space direction="vertical" size={14} style={{ width: '100%', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}><CheckCircle size={16} color="var(--medical-blue-700)" /><div><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Ngày khám</Text><br /><Text strong style={{ fontSize: 13 }}>{selDate ? selDate.format('DD/MM/YYYY') : 'Chưa chọn'}</Text></div></div>
              <div style={{ display: 'flex', gap: 10 }}><Clock size={16} color="var(--medical-blue-700)" /><div><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Giờ khám</Text><br /><Text strong style={{ fontSize: 13 }}>{selTime}</Text></div></div>
              <div style={{ display: 'flex', gap: 10 }}><Video size={16} color="var(--medical-blue-700)" /><div><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Hình thức</Text><br /><Text strong style={{ fontSize: 13 }}>Khám trực tuyến (Video)</Text></div></div>
              <div style={{ display: 'flex', gap: 10 }}><MapPin size={16} color="var(--medical-blue-700)" /><div><Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Địa điểm</Text><br /><Text strong style={{ fontSize: 13 }}>Ứng dụng DermaHealth</Text></div></div>
            </Space>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--surface-subtle)', borderRadius: 8, marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Phí dự kiến</Text>
              <Text strong style={{ fontSize: 16, color: 'var(--medical-blue-700)' }}>500.000đ</Text>
            </div>
            <Button type="primary" block disabled={!selDate || !name.trim() || !phone.trim()} onClick={submit}>Xác nhận đặt lịch</Button>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block', textAlign: 'center', marginTop: 8 }}>Hủy miễn phí trước 2 tiếng</Text>
          </Card>
        </Col>

        {/* Right Column: Choices */}
        <Col xs={24} md={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={<span><span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'var(--medical-blue-700)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8 }}>1</span>Chọn Bác Sĩ</span>} size="small">
              <Input prefix={<Search size={15} color="var(--text-muted)" />} placeholder="Tìm theo tên, chuyên khoa..." style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DOCTORS.map((d) => (
                  <Card
                    key={d.id}
                    size="small"
                    onClick={() => d.avail && setDocId(d.id)}
                    style={{ cursor: d.avail ? 'pointer' : 'not-allowed', opacity: d.avail ? 1 : 0.55, borderColor: docId === d.id ? 'var(--medical-blue-600)' : undefined, background: docId === d.id ? 'var(--surface-selected)' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--medical-blue-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{d.av}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                          <Text strong>{d.name}</Text>
                          {!d.avail && <Tag color="gold">Hết lịch</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12.5 }}>{d.spec} · {d.exp} kinh nghiệm</Text>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                          <Star size={12} color="#b7791f" fill="#b7791f" />
                          <Text style={{ fontSize: 12.5, fontWeight: 600 }}>{d.rating}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>({d.reviews} đánh giá)</Text>
                        </div>
                      </div>
                      {docId === d.id && <CheckCircle size={20} color="var(--medical-blue-700)" />}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <Card title={<span><span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'var(--medical-blue-700)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8 }}>2</span>Chọn Ngày & Giờ</span>} size="small">
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Calendar fullscreen={false} value={selDate ?? undefined} onSelect={setSelDate} />
                </Col>
                <Col xs={24} md={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Chọn Giờ Khám</Text>
                  <TimeWheelPicker value={selTime} onChange={setSelTime} />
                </Col>
              </Row>
            </Card>

            <Card title={<span><span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'var(--medical-blue-700)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8 }}>3</span>Thông Tin Bệnh Nhân</span>} size="small">
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col xs={24} md={12}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Họ và tên</Text>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Col>
                <Col xs={24} md={12}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Số điện thoại</Text>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Col>
              </Row>
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lý do khám</Text>
              <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Card>
          </div>
        </Col>
      </Row>
      {appointments.filter(a => a.patientId === currentPatient.id && a.status === 'upcoming').map(a => { const token = tokens.filter(t=>t.appointmentId===a.id && (t.status==='active'||t.status==='used')).sort((x,y)=>y.version-x.version)[0]; const doctor = users.find(u=>u.id===a.doctorId); return token ? <div key={a.id} style={{display:'flex',flexDirection:'column',gap:8}}><AppointmentQRCode appointment={a} token={token} doctorName={doctor?.name ?? 'Bác sĩ DermaHealth'} actorId={currentUser.id} canRegenerate={hasRoleAccess(currentUser.role, ['receptionist', 'medical_administrator'])} /><Button href={`/app/appointments/${a.id}`}>Xem chi tiết lịch hẹn</Button></div> : null; })}
    </div>
  );
}
