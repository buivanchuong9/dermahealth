import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Layout, Input, Badge, Avatar, Popover, Button, Typography, Tag, Empty, Divider, Grid, Select, Spin } from 'antd';
import { Search, Bell, Settings, CheckCheck, Menu as MenuIcon, ChevronDown, UserRound, LogOut } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { ROLE_LABEL } from '../domain/core/role';
import { logoutCurrentSession } from '../api/auth';
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
  retryNotification,
} from '../api/notifications';
import type { Notification } from '../domain/core/entities';

const { Header } = Layout;
const { Text } = Typography;

const STATUS_LABEL: Record<string, string> = { queued: 'Đang xếp hàng', sent: 'Đã gửi', delivered: 'Đã gửi thành công', failed: 'Gửi thất bại', retrying: 'Đang thử lại' };
const STATUS_COLOR: Record<string, string> = { queued: 'default', sent: 'processing', delivered: 'success', failed: 'error', retrying: 'warning' };

export default function TopHeader({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { currentUser, setActiveRole, resetSession } = useAppState();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationAction, setNotificationAction] = useState<string>();
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

  const refreshNotifications = useCallback(async () => {
    const [rows, unreadResult] = await Promise.all([
      listNotifications(currentUser.id, currentUser.role),
      getUnreadNotificationCount(currentUser.id),
    ]);
    setNotifications(rows);
    setUnread(unreadResult.count);
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshNotifications()
        .catch(() => undefined)
        .finally(() => setNotificationLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshNotifications]);

  const markAllRead = async () => {
    const unreadRows = notifications.filter((item) => !item.read);
    if (unreadRows.length === 0) return;
    setNotificationAction('all');
    try {
      await Promise.all(unreadRows.map((item) => markNotificationRead(item.id)));
      await refreshNotifications();
      void message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Không thể cập nhật thông báo.');
    } finally {
      setNotificationAction(undefined);
    }
  };

  const retry = async (notificationId: string) => {
    setNotificationAction(notificationId);
    try {
      await retryNotification(notificationId);
      await refreshNotifications();
      void message.success('Đã gửi lại thông báo.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Không thể gửi lại thông báo.');
    } finally {
      setNotificationAction(undefined);
    }
  };

  const notifContent = (
    <div style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>Thông báo ({notifications.length})</Text>
        <Button type="text" size="small" loading={notificationAction === 'all'} icon={<CheckCheck size={13} />} onClick={() => void markAllRead()}>Đọc hết</Button>
      </div>
      {notificationLoading && <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}><Spin size="small" /></div>}
      {!notificationLoading && notifications.length === 0 && <Empty description="Không có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {notifications.map((n, idx) => (
        <div key={n.id}>
          {idx > 0 && <Divider style={{ margin: '8px 0' }} />}
          <div
            style={{ background: n.read ? 'transparent' : 'var(--surface-selected)', borderRadius: 8, padding: '8px 10px', cursor: n.read ? 'default' : 'pointer' }}
            onClick={() => {
              if (n.read) return;
              setNotificationAction(n.id);
              void markNotificationRead(n.id)
                .then(refreshNotifications)
                .catch((error: unknown) => {
                  void message.error(error instanceof Error ? error.message : 'Không thể cập nhật thông báo.');
                })
                .finally(() => setNotificationAction(undefined));
            }}
          >
            <Text style={{ fontSize: 12.5 }}>{n.message}</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <Tag color={STATUS_COLOR[n.status]} style={{ fontSize: 11 }}>{STATUS_LABEL[n.status]} · {n.channel}</Tag>
              {n.status === 'failed' && <Button size="small" loading={notificationAction === n.id} onClick={(event) => { event.stopPropagation(); void retry(n.id); }}>Thử lại</Button>}
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
      {currentUser.roles.length > 1 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Text strong className="top-header__account-label">Vai trò đang hoạt động</Text>
          <Select
            value={currentUser.role}
            onChange={(role) => {
              setActiveRole(role);
              setAccountOpen(false);
            }}
            style={{ width: '100%', marginTop: 7 }}
            options={currentUser.roles.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
          />
          <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 6 }}>
            Tài khoản này có {currentUser.roles.length} vai trò. Đổi vai trò để xem menu và trang tương ứng.
          </Text>
        </>
      )}
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
        <Popover
          content={notifContent}
          trigger="click"
          placement="bottomRight"
          open={notificationOpen}
          onOpenChange={(open) => {
            setNotificationOpen(open);
            if (open) void refreshNotifications().catch(() => undefined);
          }}
        >
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
