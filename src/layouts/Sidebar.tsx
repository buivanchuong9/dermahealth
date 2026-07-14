import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Divider, type MenuProps } from 'antd';
import {
  Home, User, Cpu, Activity, TrendingUp, Heart, Calendar,
  BarChart2, Settings, MessageCircle, TriangleAlert, MapPinned,
  Stethoscope, ListChecks, Workflow, ShieldCheck, Plug,
  QrCode, MonitorPlay,
} from 'lucide-react';
import { AppLogo } from '../components/brand';
import { useAppState } from '../state/useAppState';
import { hasRoleAccess, type UserRole } from '../domain/core/enums';

const { Sider } = Layout;
const { Text } = Typography;

interface NavItem { key: string; label: string; icon: typeof Home; roles: UserRole[] | 'all'; children?: NavItem[] }

// Every non-patient role — used for items that used to be visible to 'all'
// but are now nested under a patient-only submenu, so staff roles still get
// their own flat entry instead of losing the link entirely.
const NON_PATIENT_ROLES: UserRole[] = [
  'doctor', 'nurse', 'receptionist', 'lab_technician', 'imaging_technician',
  'pharmacist', 'care_coordinator', 'customer_care_employee',
  'medical_administrator', 'system_administrator', 'clinical_process_designer',
];

const NAV_MAIN: NavItem[] = [
  { key: '/app/dashboard', label: 'Tổng quan', icon: Home, roles: 'all' },
  { key: '/app/appointments', label: 'Lịch hẹn', icon: Calendar, roles: ['patient', 'receptionist'] },
  {
    key: 'group:exam', label: 'Khám bệnh', icon: Stethoscope, roles: ['patient'],
    children: [
      { key: '/app/journey', label: 'Tiến trình khám bệnh', icon: MapPinned, roles: ['patient'] },
      { key: '/app/ai-analysis', label: 'Phân tích da bằng AI', icon: Cpu, roles: ['patient'] },
    ],
  },
  { key: '/app/journey', label: 'Tiến trình khám bệnh', icon: MapPinned, roles: NON_PATIENT_ROLES },
  { key: '/app/doctor-review', label: 'Xem xét & Chẩn đoán', icon: Stethoscope, roles: ['doctor'] },
  { key: '/app/work-queue', label: 'Hàng đợi công việc', icon: ListChecks, roles: ['doctor', 'nurse', 'receptionist', 'lab_technician', 'imaging_technician', 'pharmacist', 'care_coordinator', 'medical_administrator'] },
  { key: '/app/workflows/templates', label: 'Quy trình BPM', icon: Workflow, roles: ['clinical_process_designer', 'medical_administrator'] },
  {
    key: 'group:treatment', label: 'Điều trị', icon: Activity, roles: ['patient'],
    children: [
      { key: '/app/records', label: 'Tiến trình điều trị', icon: Activity, roles: ['patient'] },
      { key: '/app/progress', label: 'Theo dõi tiến triển', icon: TrendingUp, roles: ['patient'] },
      { key: '/app/care', label: 'Chăm sóc sau khám', icon: Heart, roles: ['patient'] },
    ],
  },
  { key: '/app/care', label: 'Chăm sóc sau khám', icon: Heart, roles: ['care_coordinator', 'customer_care_employee', 'medical_administrator'] },
  { key: '/app/reception/qr-check-in', label: 'Check-in QR', icon: QrCode, roles: ['receptionist', 'medical_administrator'] },
  { key: '/app/reception', label: 'Trung tâm lễ tân', icon: User, roles: ['receptionist', 'medical_administrator'] },
  { key: '/app/clinic-queue', label: 'Điều phối hàng đợi', icon: MonitorPlay, roles: ['receptionist', 'nurse', 'doctor', 'medical_administrator'] },
  { key: '/app/prescriptions', label: 'Đơn thuốc', icon: BarChart2, roles: ['patient'] },
  { key: '/app/reports', label: 'Báo cáo', icon: BarChart2, roles: ['patient'] },
  { key: '/app/audit', label: 'Nhật ký kiểm toán', icon: ShieldCheck, roles: ['medical_administrator', 'system_administrator'] },
  { key: '/app/integrations', label: 'Tình trạng tích hợp', icon: Plug, roles: ['system_administrator', 'medical_administrator'] },
];

const NAV_BOTTOM: NavItem[] = [
  { key: '/app/support', label: 'Hỗ trợ', icon: MessageCircle, roles: 'all' },
  { key: '/app/settings', label: 'Cài đặt', icon: Settings, roles: 'all' },
];

function iconEl(Icon: typeof Home) {
  return <Icon size={16} strokeWidth={2} />;
}

/**
 * The sidebar's content, independent of how it's framed on screen. Desktop
 * (`Sidebar`, below) mounts this inside a permanently-visible `Layout.Sider`;
 * `AppShell` mounts the exact same content inside an `antd Drawer` for
 * viewports below the `lg` breakpoint, so the two never drift apart into
 * two different navigation implementations. `onNavigate` is only passed by
 * the Drawer variant, to close the overlay after a nav pick.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const location = useLocation();
  const { role } = useAppState();
  const visible = (i: NavItem) => i.roles === 'all' || hasRoleAccess(role, i.roles);
  const items = NAV_MAIN
    .filter(visible)
    .map((i) => (i.children ? { ...i, children: i.children.filter(visible) } : i))
    .filter((i) => !i.children || i.children.length > 0);

  const goTo = (key: string) => {
    if (key.startsWith('group:')) return;
    nav(key);
    onNavigate?.();
  };

  const toMenuItems = (list: NavItem[]): NonNullable<MenuProps['items']> =>
    list.map((i) => ({
      key: i.key,
      icon: iconEl(i.icon),
      label: i.label,
      ...(i.children ? { children: toMenuItems(i.children) } : {}),
    }));

  const openKeys = items.filter((i) => i.children?.some((c) => c.key === location.pathname)).map((i) => i.key);

  return (
    <div className="app-sidebar">
      <div
        className="app-sidebar__brand"
        role="button"
        tabIndex={0}
        onClick={() => goTo('/app/dashboard')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goTo('/app/dashboard'); }}
        style={{ cursor: 'pointer' }}
      >
        <AppLogo size={42} />
        <div style={{ minWidth: 0 }}>
          <Text className="app-sidebar__brand-name">DermaHealth</Text>
          <Text className="app-sidebar__brand-tagline">Chăm sóc da toàn diện</Text>
        </div>
      </div>

      {role === 'patient' && (
        <div style={{ padding: '0 16px 10px' }}>
          <Button danger block icon={<TriangleAlert size={14} />} style={{ background: 'rgba(200,62,77,0.15)', borderColor: 'rgba(200,62,77,0.3)', color: '#f3a9b1', fontSize: 13 }}>
            Cấp cứu khẩn cấp
          </Button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          items={toMenuItems(items)}
          onClick={({ key }) => goTo(key)}
          style={{ background: 'transparent' }}
        />
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
      <div style={{ paddingBottom: 12 }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={toMenuItems(NAV_BOTTOM.filter((i) => i.roles === 'all' || hasRoleAccess(role, i.roles)))}
          onClick={({ key }) => goTo(key)}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}

/** Desktop/tablet-up sidebar — permanently visible, in-flow. Below the `lg`
 * breakpoint `AppShell` renders `SidebarContent` inside a `Drawer` instead
 * and this component isn't mounted at all (see `AppShell.tsx`). */
export default function Sidebar() {
  return (
    <Sider width={260} theme="dark" style={{ background: '#0f2f4d' }}>
      <SidebarContent />
    </Sider>
  );
}
