import { useState } from 'react';
import { Video, Calendar, Clock, MapPin, Search, Filter, Star, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const DOCTORS = [
  { id: 1, name: 'Bs. Nguyễn Thị An', spec: 'Da liễu', exp: '10 năm', rating: 4.9, reviews: 128, av: 'A', avail: true },
  { id: 2, name: 'Bs. Trần Văn Nam', spec: 'Da liễu thẩm mỹ', exp: '8 năm', rating: 4.8, reviews: 95, av: 'N', avail: true },
  { id: 3, name: 'Bs. Lê Thu Hà', spec: 'Dị ứng – Da liễu', exp: '12 năm', rating: 4.7, reviews: 211, av: 'H', avail: false },
];

const TIMES_AM = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
const TIMES_PM = ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

const CAL = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
];
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function Appointments() {
  const [docId, setDocId] = useState(1);
  const [selDay, setSelDay] = useState(15);
  const [selTime, setSelTime] = useState('09:00');
  const [done, setDone] = useState(false);
  const doc = DOCTORS.find(d => d.id === docId)!;

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card fade-up" style={{ maxWidth: 520, textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--success)' }}>
          <CheckCircle size={48} />
        </div>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Đặt lịch thành công!</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>Lịch khám với <strong>{doc.name}</strong> vào <strong>{selTime}, Thứ Ba {selDay}/10/2023</strong> đã được xác nhận. Thông báo đã gửi qua SMS.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setDone(false)}>Xem lịch hẹn</button>
          <button className="btn btn-primary"><Video size={16} /> Chuẩn bị cuộc gọi</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Đặt lịch</div>
          <h1>Đặt Lịch Khám Trực Tuyến</h1>
          <p>Chọn bác sĩ, ngày giờ và xác nhận để hoàn tất đặt lịch.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-accent"><Video size={17} /> Khám khẩn cấp</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Step 1 */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>1</div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Chọn Bác Sĩ</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: '1rem' }}>
              <Search size={16} color="var(--muted)" />
              <input type="text" placeholder="Tìm theo tên, chuyên khoa..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.875rem', fontFamily: 'inherit' }} />
              <button className="btn btn-sm btn-outline"><Filter size={14} /> Lọc</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {DOCTORS.map(d => (
                <div key={d.id} onClick={() => d.avail && setDocId(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.125rem', borderRadius: 12, border: `2px solid ${docId === d.id ? 'var(--primary)' : 'var(--border)'}`, background: docId === d.id ? 'rgba(10,61,74,0.03)' : 'white', cursor: d.avail ? 'pointer' : 'not-allowed', opacity: d.avail ? 1 : 0.55, transition: 'all 0.18s', position: 'relative' }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>{d.av}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>{d.name}</span>
                      {!d.avail && <span className="badge badge-warning">Hết lịch</span>}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '0.375rem' }}>{d.spec} • {d.exp} kinh nghiệm</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.825rem', fontWeight: 600 }}>
                      <Star size={13} fill="#f59e0b" stroke="none" />
                      <span>{d.rating}</span>
                      <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({d.reviews} đánh giá)</span>
                    </div>
                  </div>
                  {docId === d.id && <CheckCircle size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>2</div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Chọn Ngày & Giờ</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Calendar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <button style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white' }}><ChevronLeft size={16} /></button>
                  <strong style={{ fontSize: '0.9rem' }}>Tháng 10, 2023</strong>
                  <button style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white' }}><ChevronRight size={16} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', textAlign: 'center' }}>
                  {DAYS.map(d => <div key={d} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', padding: '0.375rem 0' }}>{d}</div>)}
                  {CAL.map(row => row.map((day, ci) => (
                    <button key={`${day}-${ci}`} disabled={!day || (day !== null && day < 14)} onClick={() => day && setSelDay(day)}
                      style={{ aspectRatio: '1', border: 'none', borderRadius: 8, fontSize: '0.825rem', cursor: !day || day < 14 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        background: selDay === day ? 'var(--primary)' : 'transparent',
                        color: !day ? 'transparent' : day < 14 ? '#cbd5e1' : selDay === day ? 'white' : 'var(--text)',
                        fontWeight: selDay === day ? 700 : 400 }}>
                      {day ?? ''}
                    </button>
                  )))}
                </div>
              </div>
              {/* Time slots */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.625rem' }}>Buổi sáng</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {TIMES_AM.map(t => (
                    <button key={t} onClick={() => setSelTime(t)} style={{ padding: '0.575rem', border: `1.5px solid ${selTime === t ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, background: selTime === t ? 'var(--primary)' : 'white', color: selTime === t ? 'white' : 'var(--text)', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{t}</button>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.625rem' }}>Buổi chiều</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
                  {TIMES_PM.map(t => (
                    <button key={t} onClick={() => setSelTime(t)} style={{ padding: '0.575rem', border: `1.5px solid ${selTime === t ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, background: selTime === t ? 'var(--primary)' : 'white', color: selTime === t ? 'white' : 'var(--text)', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>3</div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Thông Tin Bệnh Nhân</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Họ và tên</label>
                <input className="form-input" defaultValue="Nguyễn Văn A" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" defaultValue="0912 345 678" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lý do khám</label>
              <textarea className="form-input" rows={3} defaultValue="Mụn viêm lan rộng sau khi đổi kem dưỡng, xuất hiện từ tuần trước." />
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="card card-no-hover" style={{ position: 'sticky', top: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>Tổng Quan Lịch Hẹn</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: 'var(--bg)', borderRadius: 12, marginBottom: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{doc.av}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{doc.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{doc.spec}</div>
            </div>
          </div>
          {[
            { Icon: Calendar, key: 'Ngày khám', val: `Thứ Ba, ${selDay} Th 10, 2023` },
            { Icon: Clock, key: 'Giờ khám', val: selTime },
            { Icon: Video, key: 'Hình thức', val: 'Khám trực tuyến (Video)' },
            { Icon: MapPin, key: 'Địa điểm', val: 'Ứng dụng DermaHealth' },
          ].map(({ Icon, key, val }) => (
            <div key={key} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <Icon size={18} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 2 }}>{key}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{val}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', background: 'var(--bg)', borderRadius: 10, margin: '1.25rem 0' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Phí dự kiến</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>500.000đ</strong>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setDone(true)}>Xác nhận đặt lịch →</button>
          <p style={{ textAlign: 'center', fontSize: '0.775rem', color: 'var(--muted)', marginTop: '0.75rem' }}>Hủy miễn phí trước 2 tiếng</p>
        </div>
      </div>
    </div>
  );
}
