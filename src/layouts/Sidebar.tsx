import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, User, Cpu, Activity, TrendingUp, Heart, Calendar,
  BarChart2, Settings, MessageCircle, LogOut, AlertTriangle
} from 'lucide-react';

const NAV_MAIN = [
  { to: '/app/dashboard', label: 'Tổng quan', Icon: Home },
  { to: '/app/profile', label: 'Hồ sơ bệnh nhân', Icon: User },
  { to: '/app/ai-analysis', label: 'AI Studio', Icon: Cpu },
  { to: '/app/records', label: 'Hành trình điều trị', Icon: Activity },
  { to: '/app/progress', label: 'Theo dõi tiến triển', Icon: TrendingUp },
  { to: '/app/care', label: 'Chăm sóc sau khám', Icon: Heart },
  { to: '/app/appointments', label: 'Lịch hẹn', Icon: Calendar },
  { to: '/app/prescriptions', label: 'Đơn thuốc', Icon: BarChart2 },
  { to: '/app/reports', label: 'Báo cáo', Icon: BarChart2 },
];

const NAV_BOTTOM = [
  { to: '/app/support', label: 'Hỗ trợ', Icon: MessageCircle },
  { to: '/app/settings', label: 'Cài đặt', Icon: Settings },
];

export default function Sidebar() {
  const nav = useNavigate();
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <img
          src="/logo.jpeg"
          alt="DermaHealth"
          style={{
            height: 36,
            width: 36,
            borderRadius: 8,
            objectFit: 'cover',
            background: 'white',
            flexShrink: 0,
          }}
        />
        <div className="sb-logo-text">
          <strong>DermaHealth</strong>
          <span>Ứng dụng bệnh nhân</span>
        </div>
      </div>

      <div className="sb-patient">
        <div className="sb-avatar">A</div>
        <div>
          <div className="sb-patient-name">Nguyễn Văn A</div>
          <div className="sb-patient-id">Mã BN: PT-1029</div>
        </div>
      </div>

      <div className="sb-sos">
        <button className="btn-sos">
          <AlertTriangle size={14} /> Cấp cứu khẩn cấp
        </button>
      </div>

      <nav className="sb-nav">
        <div className="sb-section-label">Chức năng chính</div>
        {NAV_MAIN.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sb-bottom">
        <div className="sb-section-label">Khác</div>
        {NAV_BOTTOM.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} className="nav-icon" />
            {label}
          </NavLink>
        ))}
        <button
          className="nav-link nav-link-logout w-full"
          style={{ textAlign: 'left', marginTop: '0.25rem' }}
          onClick={() => nav('/login')}
        >
          <LogOut size={17} className="nav-icon" /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}
