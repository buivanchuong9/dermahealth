import { useState } from 'react';
import { Bell, Shield, User, Smartphone, Moon, Globe, ChevronRight, Check } from 'lucide-react';

interface Toggle { label: string; desc: string; val: boolean }

function ToggleRow({ label, desc, val, onChange }: Toggle & { onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!val)}
        style={{
          width: 44, height: 24, borderRadius: 30, border: 'none', cursor: 'pointer',
          background: val ? 'var(--primary)' : '#d1d9e6',
          position: 'relative', transition: 'background 0.22s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: val ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left 0.22s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

const SECTIONS = [
  { id: 'notif',    label: 'Thông báo',           Icon: Bell,       color: '#1677FF' },
  { id: 'account',  label: 'Tài khoản',           Icon: User,       color: '#52C41A' },
  { id: 'privacy',  label: 'Quyền riêng tư',      Icon: Shield,     color: '#FAAD14' },
  { id: 'device',   label: 'Thiết bị & Ứng dụng', Icon: Smartphone, color: '#FF4D4F' },
  { id: 'display',  label: 'Giao diện',            Icon: Moon,       color: '#4096ff' },
  { id: 'language', label: 'Ngôn ngữ & Khu vực',  Icon: Globe,      color: '#52C41A' },
];

export default function SettingsPage() {
  const [active, setActive] = useState('notif');

  const [notifs, setNotifs] = useState([
    { label: 'Nhắc uống thuốc hàng ngày', desc: 'Thông báo vào giờ uống thuốc đã đặt', val: true },
    { label: 'Nhắc tái khám', desc: 'Nhắc 1 ngày trước lịch hẹn', val: true },
    { label: 'Kết quả phân tích AI', desc: 'Khi AI hoàn thành phân tích ảnh da', val: true },
    { label: 'Cảnh báo sức khỏe', desc: 'Khi AI phát hiện nguy cơ cao', val: true },
    { label: 'Tin nhắn từ bác sĩ', desc: 'Khi bác sĩ gửi tin hoặc phản hồi', val: true },
    { label: 'Khuyến mãi & Tin tức', desc: 'Thông tin ưu đãi và tính năng mới', val: false },
  ]);

  const [privacy, setPrivacy] = useState([
    { label: 'Chia sẻ dữ liệu ẩn danh với nghiên cứu', desc: 'Giúp cải thiện AI và điều trị cho bệnh nhân khác', val: true },
    { label: 'Cho phép bác sĩ xem lịch sử', desc: 'Bác sĩ phụ trách có thể xem toàn bộ hồ sơ', val: true },
    { label: 'Xác thực 2 yếu tố (2FA)', desc: 'Bảo vệ tài khoản với mã OTP khi đăng nhập', val: false },
    { label: 'Lưu ảnh vào thiết bị', desc: 'Tự động lưu ảnh tiến triển vào Camera Roll', val: true },
  ]);

  const [device, setDevice] = useState([
    { label: 'Cho phép thông báo đẩy', desc: 'Nhận thông báo ngay cả khi không mở ứng dụng', val: true },
    { label: 'Cho phép camera', desc: 'Cần để chụp ảnh tiến triển da', val: true },
    { label: 'Cho phép microphone', desc: 'Cần để cuộc gọi video với bác sĩ', val: false },
  ]);

  const sec = SECTIONS.find(s => s.id === active)!;

  const toggle = (_arr: typeof notifs, setArr: typeof setNotifs, i: number, v: boolean) =>
    setArr(a => a.map((x, idx) => idx === i ? { ...x, val: v } : x));

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Hệ thống</div>
          <h1>Cài Đặt</h1>
          <p>Tùy chỉnh ứng dụng theo nhu cầu của bạn.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Menu */}
        <div className="card card-no-hover" style={{ padding: '0.625rem' }}>
          {SECTIONS.map(s => {
            const isActive = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem',
                width: '100%', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? 'var(--primary-bg)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text)',
                fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.18s',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: isActive ? 'var(--primary)' : `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.Icon size={15} color={isActive ? 'white' : s.color} />
                </div>
                <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
                {isActive && <ChevronRight size={14} />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {active === 'notif' && (
            <div className="card card-no-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Cài đặt thông báo</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Quản lý loại thông báo bạn muốn nhận</p>
                </div>
              </div>
              {notifs.map((n, i) => (
                <ToggleRow key={i} label={n.label} desc={n.desc} val={n.val} onChange={v => toggle(notifs, setNotifs, i, v)} />
              ))}
              <div style={{ marginTop: '1.25rem' }}>
                <button className="btn btn-primary btn-sm">Lưu cài đặt</button>
              </div>
            </div>
          )}

          {active === 'account' && (
            <div className="card card-no-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#52C41A15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="#52C41A" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Thông tin tài khoản</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cập nhật thông tin cá nhân</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { label: 'Họ và tên', val: 'Nguyễn Văn A' },
                  { label: 'Ngày sinh', val: '15/03/1995' },
                  { label: 'Số điện thoại', val: '0912 345 678' },
                  { label: 'Email', val: 'nguyenvana@gmail.com' },
                ].map(f => (
                  <div key={f.label} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" defaultValue={f.val} />
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Địa chỉ</label>
                <input className="form-input" defaultValue="Q. Bình Thạnh, TP.HCM" />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary">Lưu thay đổi</button>
                <button className="btn btn-outline">Hủy</button>
              </div>
            </div>
          )}

          {active === 'privacy' && (
            <div className="card card-no-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FAAD1415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="#FAAD14" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Quyền riêng tư & Bảo mật</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Kiểm soát dữ liệu và quyền truy cập</p>
                </div>
              </div>
              {privacy.map((n, i) => (
                <ToggleRow key={i} label={n.label} desc={n.desc} val={n.val} onChange={v => toggle(privacy, setPrivacy, i, v)} />
              ))}
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--danger-bg)', borderRadius: 12, border: '1px solid rgba(255,77,79,0.2)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '0.375rem' }}>Xóa tài khoản</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>Xóa vĩnh viễn tất cả dữ liệu. Hành động này không thể hoàn tác.</div>
                <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }}>Yêu cầu xóa tài khoản</button>
              </div>
            </div>
          )}

          {(active === 'device' || active === 'display' || active === 'language') && (
            <div className="card card-no-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${sec.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <sec.Icon size={20} color={sec.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{sec.label}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tuỳ chỉnh {sec.label.toLowerCase()}</p>
                </div>
              </div>

              {active === 'display' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Giao diện màu</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {['Sáng', 'Tối', 'Theo hệ thống'].map((mode, i) => (
                        <button key={mode} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`, background: i === 0 ? 'var(--primary-bg)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: i === 0 ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                          {i === 0 && <Check size={14} />} {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cỡ chữ</label>
                    <select className="form-input">
                      <option>Nhỏ</option>
                      <option>Vừa (Mặc định)</option>
                      <option>Lớn</option>
                      <option>Rất lớn (Cao tuổi)</option>
                    </select>
                  </div>
                </div>
              )}

              {active === 'language' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Ngôn ngữ hiển thị</label>
                    <select className="form-input">
                      <option>Tiếng Việt</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Múi giờ</label>
                    <select className="form-input">
                      <option>UTC+7 (Hà Nội / TP.HCM)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Định dạng ngày</label>
                    <select className="form-input">
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                    </select>
                  </div>
                </div>
              )}

              {active === 'device' && (
                <div>
                  {device.map((n, i) => (
                    <ToggleRow key={i} label={n.label} desc={n.desc} val={n.val} onChange={v => toggle(device, setDevice, i, v)} />
                  ))}
                  <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Phiên bản ứng dụng</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>DermaHealth v2.4.1 · Cập nhật mới nhất</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }}>
                <button className="btn btn-primary btn-sm">Lưu cài đặt</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
