import { Camera, Edit2, Bell, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HEALTH = [
  { label: 'Điểm sức khỏe AI', value: '85/100', color: '#1677FF' },
  { label: 'Tuần điều trị', value: 'Tuần 8', color: '#4096ff' },
  { label: 'Lịch hẹn sắp tới', value: '15/10', color: '#FF4D4F' },
  { label: 'Nguy cơ tái phát', value: 'Thấp', color: '#059669' },
];

const TIMELINE = [
  { date: '10/10/2023', title: 'Bác sĩ điều chỉnh liều Tretinoin', type: 'Cập nhật phác đồ', color: '#1677FF' },
  { date: '01/10/2023', title: 'Khám định kỳ lần 2', type: 'Lịch hẹn', color: '#4096ff' },
  { date: '28/09/2023', title: 'Xét nghiệm máu – Kết quả bình thường', type: 'Xét nghiệm', color: '#059669' },
  { date: '15/09/2023', title: 'Bắt đầu điều trị mụn trứng cá', type: 'Bắt đầu phác đồ', color: '#FF4D4F' },
];

export default function Profile() {
  const nav = useNavigate();
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Hồ sơ</div>
          <h1>Tài Khoản Bệnh Nhân</h1>
          <p>Thông tin cá nhân và lịch sử điều trị của bạn.</p>
        </div>
        <button className="btn btn-primary"><Edit2 size={16} /> Chỉnh sửa hồ sơ</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card card-no-hover" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 1.25rem' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #1677FF, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'white' }}>A</div>
              <button style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: '#FF4D4F', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={13} color="white" />
              </button>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1677FF', marginBottom: '0.25rem' }}>Nguyễn Văn A</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>Mã bệnh nhân: PT-1029</p>
            <span className="badge badge-success" style={{ margin: '0.875rem auto 0', display: 'inline-flex' }}>Đang điều trị</span>
          </div>

          <div className="card card-no-hover">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1677FF', marginBottom: '1rem' }}>Thông tin cá nhân</h4>
            {[
              ['Ngày sinh', '15/03/1995'],
              ['Giới tính', 'Nam'],
              ['Số điện thoại', '0912 345 678'],
              ['Email', 'nguyenvana@gmail.com'],
              ['Địa chỉ', 'Q. Bình Thạnh, TP.HCM'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>{l}</span>
                <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card card-no-hover">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1677FF', marginBottom: '1rem' }}>Bác sĩ phụ trách</h4>
            <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1677FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>A</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Bs. Nguyễn Thị An</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Chuyên khoa Da liễu</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { icon: Bell, label: 'Cài đặt thông báo' },
              { icon: Shield, label: 'Quyền riêng tư & Bảo mật' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', background: 'white', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, color: '#1a2332', transition: 'all 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <Icon size={18} style={{ color: '#1677FF' }} /> {label}
              </button>
            ))}
            <button onClick={() => nav('/login')} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)', transition: 'all 0.18s' }}>
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
            {HEALTH.map(h => (
              <div key={h.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: h.color, marginBottom: '0.375rem' }}>{h.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{h.label}</div>
              </div>
            ))}
          </div>

          <div className="card card-no-hover">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1677FF', marginBottom: '1.25rem' }}>Lịch sử điều trị</h4>
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
              {TIMELINE.map((t, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'absolute', left: '-1.65rem', top: '4px', width: 14, height: 14, borderRadius: '50%', background: t.color, border: '2px solid white', boxShadow: `0 0 0 2px ${t.color}33` }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>{t.date}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{t.title}</div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: `${t.color}12`, color: t.color, padding: '0.15rem 0.625rem', borderRadius: 20 }}>{t.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-no-hover">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1677FF', marginBottom: '1rem' }}>Đơn thuốc hiện tại</h4>
            {[
              { name: 'Tretinoin 0.05% Cream', dose: 'Bôi tối, 1 lần/ngày', duration: '3 tháng' },
              { name: 'Doxycycline 100mg', dose: 'Uống sáng, 1 viên/ngày', duration: '7 ngày' },
              { name: 'Omega-3 1000mg', dose: 'Sau bữa ăn, 1 viên/ngày', duration: '30 ngày' },
            ].map(rx => (
              <div key={rx.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', background: 'var(--bg)', borderRadius: 10, marginBottom: '0.625rem', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{rx.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{rx.dose}</div>
                </div>
                <span className="badge badge-primary">{rx.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
