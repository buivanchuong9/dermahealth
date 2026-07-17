import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Input, Badge, Avatar, Popover, Button, Typography, Tag, Empty, Divider, Grid, Select } from 'antd';
import { Search, Bell, Settings, CheckCheck, Menu as MenuIcon, ChevronDown, UserRound, LogOut } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { notificationRepository } from '../domain/repositories';
import { notificationService } from '../domain/services/notificationService';
import { ROLE_LABEL } from '../domain/core/enums';
import { logoutCurrentSession } from '../api/auth';

const { Header } = Layout;
const { Text } = Typography;

const STATUS_LABEL: Record<string, string> = { queued: 'Đang xếp hàng', sent: 'Đã gửi', delivered: 'Đã gửi thành công', failed: 'Gửi thất bại', retrying: 'Đang thử lại' };
const STATUS_COLOR: Record<string, string> = { queued: 'default', sent: 'processing', delivered: 'success', failed: 'error', retrying: 'warning' };

export default function TopHeader({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const navigate = useNavigate();
  const { currentUser, allUsers, setCurrentUserId, resetSession } = useAppState();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      resetSession();
      setAccountOpen(false);
      setLoggingOut(false);
      navigate('/login');
    }
  };
  const screens = Grid.useBreakpoint();
  const isNarrow = screens.md === false;
  useStore(notificationRepository);
  const myNotifications = notificationService.listForUser(currentUser.id);
  const unread = myNotifications.filter((n) => !n.read).length;

  const notifContent = (
    <div style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>Thông báo ({myNotifications.length})</Text>
        <Button type="text" size="small" icon={<CheckCheck size={13} />} onClick={() => myNotifications.forEach((n) => notificationService.markRead(n.id))}>Đọc hết</Button>
      </div>
      {myNotifications.length === 0 && <Empty description="Không có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {myNotifications.map((n, idx) => (
        <div key={n.id}>
          {idx > 0 && <Divider style={{ margin: '8px 0' }} />}
          <div style={{ background: n.read ? 'transparent' : 'var(--surface-selected)', borderRadius: 8, padding: '8px 10px' }}>
            <Text style={{ fontSize: 12.5 }}>{n.message}</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <Tag color={STATUS_COLOR[n.status]} style={{ fontSize: 11 }}>{STATUS_LABEL[n.status]} · {n.channel}</Tag>
              {n.status === 'failed' && <Button size="small" onClick={() => notificationService.retry(n.id)}>Thử lại</Button>}
            </div>
            {n.failureReason && <Text type="danger" style={{ fontSize: 11 }}>{n.failureReason}</Text>}
          </div>
        </div>
      ))}
    </div>
  );

  const accountContent = (
    <div className="top-header__account-menu">
      <div className="top-header__account-summary">
        <Avatar size={40} style={{ background: 'var(--medical-blue-700)', flexShrink: 0 }}>{currentUser.name.trim().slice(-1)}</Avatar>
        <div style={{ minWidth: 0 }}>
          <Text strong className="top-header__account-name">{currentUser.name}</Text>
          <Text type="secondary" className="top-header__account-meta">
            {ROLE_LABEL[currentUser.role]}{currentUser.department ? ` · ${currentUser.department}` : ''}
          </Text>
        </div>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <Text strong className="top-header__account-label">Chuyển tài khoản và vai trò</Text>
      <Select
        value={currentUser.id}
        onChange={(userId) => {
          setCurrentUserId(userId);
          setAccountOpen(false);
        }}
        style={{ width: '100%', marginTop: 7 }}
        optionLabelProp="label"
        options={allUsers.map((user) => ({
          value: user.id,
          label: user.name,
          searchText: `${user.name} ${ROLE_LABEL[user.role]} ${user.department ?? ''}`,
          content: (
            <div className="top-header__account-option">
              <Avatar size={28} style={{ background: 'var(--medical-blue-100)', color: 'var(--medical-blue-700)', flexShrink: 0 }}>{user.name.trim().slice(-1)}</Avatar>
              <div style={{ minWidth: 0 }}>
                <Text className="top-header__account-option-name">{user.name}</Text>
                <Text type="secondary" className="top-header__account-option-role">{ROLE_LABEL[user.role]}{user.department ? ` · ${user.department}` : ''}</Text>
              </div>
            </div>
          ),
        }))}
        optionRender={(option) => option.data.content}
        showSearch
        filterOption={(input, option) => (option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())}
        placeholder="Chọn tài khoản"
      />
      <Button
        type="text"
        block
        icon={<UserRound size={15} />}
        className="top-header__account-settings"
        onClick={() => {
          setAccountOpen(false);
          navigate('/app/profile');
        }}
      >
        Hồ sơ bệnh nhân
      </Button>
      <Button
        type="text"
        block
        icon={<Settings size={15} />}
        className="top-header__account-settings"
        onClick={() => {
          setAccountOpen(false);
          navigate('/app/settings');
        }}
      >
        Cài đặt
      </Button>
      <Button
        type="text"
        danger
        block
        loading={loggingOut}
        icon={<LogOut size={15} />}
        className="top-header__account-settings"
        onClick={handleLogout}
      >
        Đăng xuất
      </Button>
    </div>
  );

  return (
    <Header className={`top-header${isNarrow ? ' top-header--narrow' : ''}`}>
      <div className="top-header__start">
        {onOpenMobileNav && (
          <Button shape="circle" icon={<MenuIcon size={17} />} onClick={onOpenMobileNav} aria-label="Mở menu điều hướng" />
        )}
        {!isNarrow && (
          <Input
            prefix={<Search size={15} color="var(--text-muted)" />}
            placeholder="Tìm lịch hẹn, đơn thuốc, bệnh nhân..."
            style={{ maxWidth: 320, borderRadius: 8 }}
          />
        )}
      </div>
      <div className="top-header__actions">
        <Popover content={notifContent} trigger="click" placement="bottomRight">
          <Badge count={unread} size="small">
            <Button shape="circle" icon={<Bell size={16} />} />
          </Badge>
        </Popover>
        {!isNarrow && <Divider type="vertical" style={{ height: 24 }} />}
        <Popover content={accountContent} trigger="click" placement="bottomRight" open={accountOpen} onOpenChange={setAccountOpen}>
          <Button type="text" className="top-header__user" aria-label="Mở menu tài khoản">
            <Avatar size={32} style={{ background: 'var(--medical-blue-700)', flexShrink: 0 }}>{currentUser.name.trim().slice(-1)}</Avatar>
            {!isNarrow && (
              <div className="top-header__user-copy">
                <Text className="top-header__user-name" title={currentUser.name}>{currentUser.name}</Text>
                <Text className="top-header__user-role">{ROLE_LABEL[currentUser.role]}</Text>
              </div>
            )}
            <ChevronDown size={14} className="top-header__user-chevron" />
          </Button>
        </Popover>
      </div>
    </Header>
  );
}
