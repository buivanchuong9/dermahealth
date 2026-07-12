import { Search, Bell, Settings, ChevronDown } from 'lucide-react';

export default function TopHeader() {
  return (
    <header className="app-header" style={{ gap: '1rem' }}>
      <div className="header-search">
        <Search size={16} color="var(--muted)" />
        <input type="text" placeholder="Tìm lịch hẹn, đơn thuốc..." />
      </div>
      <div className="header-right">
        <button className="header-icon-btn" aria-label="Thông báo">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="header-icon-btn" aria-label="Cài đặt">
          <Settings size={18} />
        </button>
        <div className="header-sep" />
        <div className="header-user">
          <div className="header-user-av">A</div>
          <div>
            <div className="header-user-name">Nguyễn Văn A</div>
            <div className="header-user-role">Bệnh nhân</div>
          </div>
          <ChevronDown size={15} color="var(--muted)" />
        </div>
      </div>
    </header>
  );
}
