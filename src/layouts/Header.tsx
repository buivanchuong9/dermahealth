import { Search, Bell, Settings, ChevronDown } from 'lucide-react';

const Header = () => {
  return (
    <header className="top-header">
      <div className="header-search">
        <Search size={17} color="var(--color-text-muted)" />
        <input type="text" placeholder="Tìm kiếm lịch hẹn, đơn thuốc..." />
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="Thông báo">
          <Bell size={19} />
          <span className="notif-badge"></span>
        </button>
        <button className="header-icon-btn" title="Cài đặt">
          <Settings size={19} />
        </button>
        <div className="header-divider"></div>
        <div className="header-user">
          <div className="header-avatar">A</div>
          <div className="header-user-info">
            <span className="user-name">Nguyễn Văn A</span>
            <span className="user-role">Bệnh nhân</span>
          </div>
          <ChevronDown size={16} color="var(--color-text-muted)" />
        </div>
      </div>
    </header>
  );
};

export default Header;
