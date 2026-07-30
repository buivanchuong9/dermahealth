import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, User, Smartphone, Moon, Globe, FileCheck, Settings2, RotateCcw, LogOut, Flag } from 'lucide-react';
import { App as AntApp, Row, Col, Card, Menu, Switch, Input, Select, Button, Alert, Typography, Segmented, Spin } from 'antd';
import { useAppState } from '../state/useAppState';
import { logoutCurrentSession } from '../api/auth';
import { enableMfa, getMe, getMyPreferences, updateMe, updateMyPreferences } from '../api/me';
import { ApiError } from '../api/http';
import type { AuthUser, UserPreferences } from '../api/types';
import { requestUserDeletion } from '../api/users';
import {
  clearOrganizationFeatureFlag,
  listOwnerFeatureFlags,
  setOrganizationFeatureFlag,
  type OwnerFeatureFlag,
} from '../api/ownerFeatureFlags';
import {
  getCurrentPatientDetails,
  getPatientConsents,
  grantPatientConsent,
  updateCurrentPatient,
  withdrawPatientConsent,
  type ApiConsent,
  type ApiPatient,
} from '../api/clinical';

const { Title, Text, Paragraph } = Typography;

const CONSENT_LABEL: Record<string, string> = {
  data_processing: 'Xử lý dữ liệu y tế cá nhân',
  research_data_sharing: 'Chia sẻ dữ liệu ẩn danh với nghiên cứu',
  telemedicine: 'Khám bệnh từ xa (telemedicine)',
};

interface Toggle { label: string; desc: string; val: boolean }

function ToggleRow({ label, desc, val, onChange }: Toggle & { onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-default)' }}>
      <div>
        <Text strong style={{ fontSize: 13.5, display: 'block' }}>{label}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{desc}</Text>
      </div>
      <Switch checked={val} onChange={onChange} />
    </div>
  );
}

const SECTIONS = [
  { key: 'notif', label: 'Thông báo', icon: <Bell size={15} /> },
  { key: 'account', label: 'Tài khoản', icon: <User size={15} /> },
  { key: 'privacy', label: 'Quyền riêng tư', icon: <Shield size={15} /> },
  { key: 'device', label: 'Thiết bị & Ứng dụng', icon: <Smartphone size={15} /> },
  { key: 'display', label: 'Giao diện', icon: <Moon size={15} /> },
  { key: 'language', label: 'Ngôn ngữ & Khu vực', icon: <Globe size={15} /> },
  { key: 'app', label: 'Ứng dụng', icon: <Settings2 size={15} /> },
  { key: 'features', label: 'Feature flags', icon: <Flag size={15} /> },
];

export default function SettingsPage() {
  const [active, setActive] = useState('notif');
  const nav = useNavigate();
  const { modal, message } = AntApp.useApp();
  const { refreshMe, resetToSeed, resetSession, role } = useAppState();
  const [me, setMe] = useState<AuthUser>();
  const [patient, setPatient] = useState<ApiPatient>();
  const [consents, setConsents] = useState<ApiConsent[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>();
  const [apiLoading, setApiLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<OwnerFeatureFlag[]>([]);
  const [featureLoading, setFeatureLoading] = useState(false);

  useEffect(() => {
    let activeRequest = true;
    const loadSettings = async () => {
      const [user, prefs] = await Promise.all([getMe(), getMyPreferences()]);
      if (!activeRequest) return;
      setMe(user);
      setPreferences(prefs);

      const hasPatientMembership = user.memberships.some(
        (membership) => membership.role === 'patient',
      );
      if (!hasPatientMembership) {
        setPatient(undefined);
        setConsents([]);
        return;
      }

      try {
        const selfPatient = await getCurrentPatientDetails();
        if (selfPatient.userId !== user.id) {
          throw new Error(
            'Backend trả về hồ sơ bệnh nhân không thuộc tài khoản đang đăng nhập.',
          );
        }
        if (!activeRequest) return;
        setPatient(selfPatient);
        const consentRows = await getPatientConsents(selfPatient.id);
        if (activeRequest) setConsents(consentRows);
      } catch (error) {
        // A mixed-role staff account may carry the patient role without having
        // a linked patient record. That is an account-only settings screen,
        // not a reason to fall back to whichever patient is currently open.
        if (
          error instanceof ApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          if (activeRequest) {
            setPatient(undefined);
            setConsents([]);
          }
          return;
        }
        throw error;
      }
    };
    void loadSettings()
      .catch((error) => {
        if (!activeRequest) return;
        void message.error(error instanceof Error ? error.message : 'Không tải được cài đặt.');
      })
      .finally(() => {
        if (activeRequest) setApiLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, [message]);

  useEffect(() => {
    if (active !== 'features' || role !== 'super_administrator') return;
    const timer = window.setTimeout(() => {
      setFeatureLoading(true);
      void listOwnerFeatureFlags()
        .then(setFeatureFlags)
        .catch((error: unknown) => {
          void message.error(
            error instanceof Error ? error.message : 'Không tải được feature flags.',
          );
        })
        .finally(() => setFeatureLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, message, role]);

  const saveAccount = async () => {
    if (!me) return;
    if (patient && patient.userId !== me.id) {
      void message.error('Đã chặn cập nhật vì hồ sơ không thuộc tài khoản này.');
      return;
    }
    setSaving(true);
    try {
      const phone = patient?.phone ?? me.phone ?? '';
      const updatedUser = await updateMe({
        displayName: me.displayName,
        phone,
        version: me.version,
      });
      setMe(updatedUser);

      if (patient) {
        const updatedPatient = await updateCurrentPatient({
          name: patient.name,
          dob: patient.dob,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          bloodType: patient.bloodType,
          primaryDoctorId: patient.primaryDoctor?.id ?? null,
          version: patient.version,
        });
        if (updatedPatient.userId !== updatedUser.id) {
          throw new Error(
            'Phản hồi cập nhật không khớp tài khoản; cần kiểm tra backend ngay.',
          );
        }
        setPatient(updatedPatient);
      }

      await refreshMe();
      void message.success('Đã cập nhật thông tin tài khoản.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const setConsent = (consent: ApiConsent, granted: boolean) => {
    modal.confirm({
      title: granted ? 'Xác nhận đồng ý?' : 'Rút lại đồng ý?',
      content: granted
        ? `Bạn đồng ý với chính sách ${CONSENT_LABEL[consent.type] ?? consent.type}.`
        : 'Việc rút lại có thể làm giới hạn một số chức năng chăm sóc.',
      okText: granted ? 'Đồng ý' : 'Rút lại',
      okButtonProps: { danger: !granted },
      cancelText: 'Hủy',
      onOk: async () => {
        if (!patient || !me || patient.userId !== me.id) {
          throw new Error('Không xác định được hồ sơ bệnh nhân của tài khoản này.');
        }
        const updated = granted
          ? await grantPatientConsent(patient.id, {
              type: consent.type,
              policyVersion: consent.policyVersion,
              grantedAt: new Date().toISOString(),
            })
          : await withdrawPatientConsent(patient.id, {
              type: consent.type,
              reason: 'Người dùng rút lại đồng ý trong phần cài đặt',
              version: consent.version,
            });
        setConsents((rows) =>
          rows.map((row) => (row.type === updated.type ? updated : row)),
        );
        void message.success(granted ? 'Đã ghi nhận đồng ý.' : 'Đã rút lại đồng ý.');
      },
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;
    setSaving(true);
    try {
      const updated = await updateMyPreferences({
        locale: preferences.locale,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        theme: preferences.theme,
        notificationChannels: preferences.notificationChannels,
        deviceSettings: preferences.deviceSettings,
        version: preferences.version,
      });
      setPreferences(updated);
      void message.success('Đã lưu cài đặt.');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Không thể lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  const [privacy, setPrivacy] = useState([
    { label: 'Chia sẻ dữ liệu ẩn danh với nghiên cứu', desc: 'Giúp cải thiện AI và điều trị cho bệnh nhân khác', val: true },
    { label: 'Cho phép bác sĩ xem lịch sử', desc: 'Bác sĩ phụ trách có thể xem toàn bộ hồ sơ', val: true },
    { label: 'Lưu ảnh vào thiết bị', desc: 'Tự động lưu ảnh tiến triển vào Camera Roll', val: true },
  ]);

  const toggle = (setArr: typeof setPrivacy, i: number, v: boolean) => setArr((a) => a.map((x, idx) => (idx === i ? { ...x, val: v } : x)));

  const confirmReset = () => {
    modal.confirm({
      title: 'Đặt lại dữ liệu demo?',
      content: 'Toàn bộ dữ liệu hiện tại sẽ bị xóa và thay thế bằng dữ liệu mẫu ban đầu. Hành động này không thể hoàn tác.',
      okText: 'Đặt lại dữ liệu',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: resetToSeed,
    });
  };

  const confirmEnableMfa = () => {
    modal.confirm({
      title: 'Bật xác thực đa yếu tố?',
      content: 'Sau khi bật, tài khoản có thể yêu cầu mã MFA trong lần đăng nhập tiếp theo.',
      okText: 'Bật MFA',
      cancelText: 'Hủy',
      onOk: async () => {
        const updated = await enableMfa();
        setMe(updated);
        setMfaEnabled(true);
        void message.success('Đã bật xác thực đa yếu tố.');
      },
    });
  };

  const confirmDeletionRequest = () => {
    if (!me || deletionRequested) return;
    modal.confirm({
      title: 'Yêu cầu xóa tài khoản?',
      content:
        'Yêu cầu sẽ được gửi đến quản trị viên để xử lý. Dữ liệu không bị xóa ngay lập tức.',
      okText: 'Gửi yêu cầu',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        await requestUserDeletion(me.id);
        setDeletionRequested(true);
        void message.success('Đã gửi yêu cầu xóa tài khoản.');
      },
    });
  };

  const toggleFeatureFlag = async (flag: OwnerFeatureFlag, enabled: boolean) => {
    const organizationId = me?.activeOrganizationId;
    if (!organizationId) {
      void message.error('Tài khoản chưa có organization đang hoạt động.');
      return;
    }
    setFeatureLoading(true);
    try {
      await setOrganizationFeatureFlag(flag.key, organizationId, enabled);
      setFeatureFlags((rows) =>
        rows.map((row) => (row.key === flag.key ? { ...row, enabled } : row)),
      );
      void message.success('Đã cập nhật feature flag.');
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : 'Không cập nhật được feature flag.',
      );
    } finally {
      setFeatureLoading(false);
    }
  };

  const resetFeatureFlag = async (flag: OwnerFeatureFlag) => {
    const organizationId = me?.activeOrganizationId;
    if (!organizationId) {
      void message.error('Tài khoản chưa có organization đang hoạt động.');
      return;
    }
    setFeatureLoading(true);
    try {
      await clearOrganizationFeatureFlag(flag.key, organizationId);
      setFeatureFlags(await listOwnerFeatureFlags());
      void message.success('Đã xóa override của organization.');
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : 'Không xóa được feature flag.',
      );
    } finally {
      setFeatureLoading(false);
    }
  };

  if (apiLoading) return <Spin size="large" tip="Đang tải cài đặt…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Cài Đặt</Title>
      </div>

      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" styles={{ body: { padding: 4 } }}>
            <Menu mode="inline" selectedKeys={[active]} onClick={({ key }) => setActive(key)} items={SECTIONS.filter((section) => section.key !== 'features' || role === 'super_administrator').map((s) => ({ key: s.key, icon: s.icon, label: s.label }))} style={{ border: 'none' }} />
          </Card>
        </Col>

        <Col xs={24} md={18}>
          {active === 'notif' && (
            <Card title="Cài đặt thông báo" size="small">
              {preferences && ([
                ['inApp', 'Thông báo trong ứng dụng', 'Hiển thị thông báo trực tiếp trong DermaHealth'],
                ['email', 'Thông báo qua email', 'Nhận cập nhật và nhắc lịch qua email'],
                ['sms', 'Thông báo SMS', 'Nhận tin nhắn tại số điện thoại tài khoản'],
                ['push', 'Thông báo đẩy', 'Nhận thông báo trên thiết bị đã đăng nhập'],
              ] as const).map(([key, label, desc]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  desc={desc}
                  val={preferences.notificationChannels[key]}
                  onChange={(value) => setPreferences({
                    ...preferences,
                    notificationChannels: {
                      ...preferences.notificationChannels,
                      [key]: value,
                    },
                  })}
                />
              ))}
              <Button type="primary" size="small" loading={saving} onClick={savePreferences} style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'account' && (
            <Card title="Thông tin tài khoản" size="small">
              <Row gutter={16}>
                <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Họ và tên</Text>
                  <Input value={me?.displayName} onChange={(event) => me && setMe({ ...me, displayName: event.target.value })} />
                </Col>
                <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Số điện thoại</Text>
                  <Input
                    value={patient?.phone ?? me?.phone ?? ''}
                    onChange={(event) => {
                      const phone = event.target.value;
                      if (patient) setPatient({ ...patient, phone });
                      if (me) setMe({ ...me, phone });
                    }}
                  />
                </Col>
                <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</Text>
                  <Input value={me?.email} disabled />
                </Col>
                <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Trạng thái</Text>
                  <Input value={me?.status} disabled />
                </Col>
                {patient && (
                  <>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên hồ sơ bệnh nhân của tôi</Text>
                      <Input value={patient.name} onChange={(event) => setPatient({ ...patient, name: event.target.value })} />
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngày sinh</Text>
                      <Input type="date" value={patient.dob} onChange={(event) => setPatient({ ...patient, dob: event.target.value })} />
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Giới tính</Text>
                      <Select style={{ width: '100%' }} value={patient.gender} onChange={(gender) => setPatient({ ...patient, gender })} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }]} />
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nhóm máu</Text>
                      <Select style={{ width: '100%' }} value={patient.bloodType} onChange={(bloodType) => setPatient({ ...patient, bloodType })} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => ({ value, label: value }))} />
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email liên hệ</Text>
                      <Input value={patient.email ?? ''} onChange={(event) => setPatient({ ...patient, email: event.target.value || null })} />
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Địa chỉ</Text>
                      <Input value={patient.address ?? ''} onChange={(event) => setPatient({ ...patient, address: event.target.value || null })} />
                    </Col>
                  </>
                )}
              </Row>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="primary" loading={saving} onClick={saveAccount}>Lưu thay đổi</Button>
              </div>
            </Card>
          )}

          {active === 'privacy' && (
            <Card title="Quyền riêng tư & Bảo mật" size="small">
              {privacy.map((n, i) => <ToggleRow key={n.label} {...n} onChange={(v) => toggle(setPrivacy, i, v)} />)}

              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-default)' }}>
                <Text strong style={{ display: 'block', fontSize: 13.5 }}>Xác thực đa yếu tố (MFA)</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 10 }}>
                  Tăng bảo mật bằng mã xác minh khi đăng nhập.
                </Text>
                <Button type="primary" size="small" disabled={mfaEnabled} onClick={confirmEnableMfa}>
                  {mfaEnabled ? 'MFA đã được bật' : 'Bật MFA'}
                </Button>
              </div>

              {patient && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><FileCheck size={15} /> Trạng thái đồng ý của tôi (Consent)</Text>
                  {consents.map((c) => (
                    <ToggleRow
                      key={c.id}
                      label={CONSENT_LABEL[c.type] ?? c.type}
                      desc={c.granted ? `Đã đồng ý lúc ${c.grantedAt ? new Date(c.grantedAt.replace(' ', 'T')).toLocaleString('vi-VN') : ''}` : `Đã rút lại lúc ${c.withdrawnAt ? new Date(c.withdrawnAt.replace(' ', 'T')).toLocaleString('vi-VN') : ''}`}
                      val={c.granted}
                      onChange={(value) => setConsent(c, value)}
                    />
                  ))}
                </div>
              )}

              <Alert
                type="error"
                showIcon
                style={{ marginTop: 20 }}
                message="Xóa tài khoản"
                description={<>
                  <Paragraph style={{ fontSize: 12.5, marginBottom: 8 }}>Xóa vĩnh viễn tất cả dữ liệu. Hành động này không thể hoàn tác.</Paragraph>
                  <Button danger size="small" disabled={deletionRequested} onClick={confirmDeletionRequest}>
                    {deletionRequested ? 'Đã gửi yêu cầu' : 'Yêu cầu xóa tài khoản'}
                  </Button>
                </>}
              />
            </Card>
          )}

          {active === 'display' && (
            <Card title="Giao diện" size="small">
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Giao diện màu</Text>
              <Segmented
                block
                options={[
                  { label: 'Sáng', value: 'light' },
                  { label: 'Tối', value: 'dark' },
                  { label: 'Theo hệ thống', value: 'system' },
                ]}
                value={preferences?.theme}
                onChange={(theme) => preferences && setPreferences({ ...preferences, theme: String(theme) })}
                style={{ marginBottom: 16 }}
              />
              <Button type="primary" size="small" loading={saving} onClick={savePreferences}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'language' && (
            <Card title="Ngôn ngữ & Khu vực" size="small">
              <div style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ngôn ngữ hiển thị</Text>
                <Select style={{ width: '100%' }} value={preferences?.locale} onChange={(locale) => preferences && setPreferences({ ...preferences, locale })} options={[{ value: 'vi-VN', label: 'Tiếng Việt' }, { value: 'en-US', label: 'English' }]} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Múi giờ</Text>
                <Select style={{ width: '100%' }} value={preferences?.timezone} onChange={(timezone) => preferences && setPreferences({ ...preferences, timezone })} options={[{ value: 'Asia/Ho_Chi_Minh', label: 'UTC+7 (Hà Nội / TP.HCM)' }]} />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Định dạng ngày</Text>
                <Select style={{ width: '100%' }} value={preferences?.dateFormat} onChange={(dateFormat) => preferences && setPreferences({ ...preferences, dateFormat })} options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }]} />
              </div>
              <Button type="primary" size="small" loading={saving} onClick={savePreferences} style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'device' && (
            <Card title="Thiết bị & Ứng dụng" size="small">
              {preferences && ([
                ['biometricLogin', 'Đăng nhập sinh trắc học', 'Cho phép xác thực bằng vân tay hoặc khuôn mặt'],
                ['mobileNotifications', 'Thông báo trên thiết bị', 'Cho phép ứng dụng gửi thông báo di động'],
              ] as const).map(([key, label, desc]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  desc={desc}
                  val={preferences.deviceSettings[key]}
                  onChange={(value) => setPreferences({
                    ...preferences,
                    deviceSettings: { ...preferences.deviceSettings, [key]: value },
                  })}
                />
              ))}
              <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                <Text strong style={{ fontSize: 12.5, display: 'block', marginBottom: 4 }}>Phiên bản ứng dụng</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>DermaHealth v2.4.1 · Cập nhật mới nhất</Text>
              </div>
              <Button type="primary" size="small" loading={saving} onClick={savePreferences} style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'app' && (
            <Card title="Quản lý ứng dụng" size="small">
              <div style={{ marginBottom: 18 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Dữ liệu dùng thử</Text>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 12 }}>
                  Khôi phục toàn bộ lượt khám, hồ sơ và quy trình về dữ liệu mẫu ban đầu.
                </Paragraph>
                <Button danger icon={<RotateCcw size={15} />} onClick={confirmReset}>Đặt lại dữ liệu demo</Button>
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Phiên đăng nhập</Text>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 12 }}>
                  Đăng xuất khỏi tài khoản trên thiết bị này.
                </Paragraph>
                <Button
                  danger
                  icon={<LogOut size={15} />}
                  onClick={() => logoutCurrentSession().finally(() => { resetSession(); nav('/login'); })}
                >
                  Đăng xuất
                </Button>
              </div>
            </Card>
          )}

          {active === 'features' && role === 'super_administrator' && (
            <Card title="Feature flags theo organization" size="small" loading={featureLoading}>
              <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
                Organization hiện tại: {me?.activeOrganizationId ?? 'Chưa xác định'}
              </Paragraph>
              {featureFlags.map((flag) => (
                <div
                  key={flag.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <div>
                    <Text strong style={{ display: 'block' }}>{flag.key}</Text>
                    {flag.description && <Text type="secondary">{flag.description}</Text>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                      checked={flag.enabled}
                      disabled={featureLoading}
                      onChange={(enabled) => void toggleFeatureFlag(flag, enabled)}
                    />
                    <Button
                      size="small"
                      disabled={featureLoading}
                      onClick={() => void resetFeatureFlag(flag)}
                    >
                      Xóa override
                    </Button>
                  </div>
                </div>
              ))}
              {!featureLoading && featureFlags.length === 0 && (
                <Text type="secondary">Backend chưa trả feature flag nào.</Text>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
