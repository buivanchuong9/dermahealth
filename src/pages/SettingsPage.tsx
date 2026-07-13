import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, User, Smartphone, Moon, Globe, FileCheck, Settings2, RotateCcw, LogOut } from 'lucide-react';
import { App as AntApp, Row, Col, Card, Menu, Switch, Input, Select, Button, Alert, Typography, Segmented } from 'antd';
import { useAppState } from '../state/useAppState';
import { useStore } from '../state/useStore';
import { consentRepository } from '../domain/repositories';
import { patientService } from '../domain/services/patientService';

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
];

export default function SettingsPage() {
  const [active, setActive] = useState('notif');
  const nav = useNavigate();
  const { modal } = AntApp.useApp();
  const { currentPatient, resetToSeed } = useAppState();
  const consents = useStore(consentRepository).filter((c) => c.patientId === currentPatient.id);

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

  const toggle = (setArr: typeof setNotifs, i: number, v: boolean) => setArr((a) => a.map((x, idx) => (idx === i ? { ...x, val: v } : x)));

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Title level={3} style={{ margin: '4px 0 0' }}>Cài Đặt</Title>
      </div>

      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" styles={{ body: { padding: 4 } }}>
            <Menu mode="inline" selectedKeys={[active]} onClick={({ key }) => setActive(key)} items={SECTIONS.map((s) => ({ key: s.key, icon: s.icon, label: s.label }))} style={{ border: 'none' }} />
          </Card>
        </Col>

        <Col xs={24} md={18}>
          {active === 'notif' && (
            <Card title="Cài đặt thông báo" size="small">
              {notifs.map((n, i) => <ToggleRow key={n.label} {...n} onChange={(v) => toggle(setNotifs, i, v)} />)}
              <Button type="primary" size="small" style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'account' && (
            <Card title="Thông tin tài khoản" size="small">
              <Row gutter={16}>
                {[
                  { label: 'Họ và tên', val: currentPatient.name },
                  { label: 'Ngày sinh', val: currentPatient.profile.dob },
                  { label: 'Số điện thoại', val: currentPatient.profile.phone },
                  { label: 'Email', val: currentPatient.profile.email },
                ].map((f) => (
                  <Col xs={24} md={12} key={f.label} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</Text>
                    <Input defaultValue={f.val} />
                  </Col>
                ))}
              </Row>
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Địa chỉ</Text>
              <Input defaultValue={currentPatient.profile.address} style={{ marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="primary">Lưu thay đổi</Button>
                <Button>Hủy</Button>
              </div>
            </Card>
          )}

          {active === 'privacy' && (
            <Card title="Quyền riêng tư & Bảo mật" size="small">
              {privacy.map((n, i) => <ToggleRow key={n.label} {...n} onChange={(v) => toggle(setPrivacy, i, v)} />)}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><FileCheck size={15} /> Trạng thái đồng ý (Consent)</Text>
                {consents.map((c) => (
                  <ToggleRow
                    key={c.id}
                    label={CONSENT_LABEL[c.type] ?? c.type}
                    desc={c.granted ? `Đã đồng ý lúc ${c.grantedAt ? new Date(c.grantedAt.replace(' ', 'T')).toLocaleString('vi-VN') : ''}` : `Đã rút lại lúc ${c.withdrawnAt ? new Date(c.withdrawnAt.replace(' ', 'T')).toLocaleString('vi-VN') : ''}`}
                    val={c.granted}
                    onChange={(v) => patientService.setConsent(currentPatient.id, c.type, v)}
                  />
                ))}
              </div>

              <Alert
                type="error"
                showIcon
                style={{ marginTop: 20 }}
                message="Xóa tài khoản"
                description={<>
                  <Paragraph style={{ fontSize: 12.5, marginBottom: 8 }}>Xóa vĩnh viễn tất cả dữ liệu. Hành động này không thể hoàn tác.</Paragraph>
                  <Button danger size="small">Yêu cầu xóa tài khoản</Button>
                </>}
              />
            </Card>
          )}

          {active === 'display' && (
            <Card title="Giao diện" size="small">
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Giao diện màu</Text>
              <Segmented block options={['Sáng', 'Tối', 'Theo hệ thống']} defaultValue="Sáng" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Cỡ chữ</Text>
              <Select style={{ width: '100%' }} defaultValue="Vừa (Mặc định)" options={['Nhỏ', 'Vừa (Mặc định)', 'Lớn', 'Rất lớn (Cao tuổi)'].map((v) => ({ value: v, label: v }))} />
              <Button type="primary" size="small" style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'language' && (
            <Card title="Ngôn ngữ & Khu vực" size="small">
              <div style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ngôn ngữ hiển thị</Text>
                <Select style={{ width: '100%' }} defaultValue="Tiếng Việt" options={[{ value: 'Tiếng Việt', label: 'Tiếng Việt' }, { value: 'English', label: 'English' }]} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Múi giờ</Text>
                <Select style={{ width: '100%' }} defaultValue="UTC+7 (Hà Nội / TP.HCM)" options={[{ value: 'UTC+7 (Hà Nội / TP.HCM)', label: 'UTC+7 (Hà Nội / TP.HCM)' }]} />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Định dạng ngày</Text>
                <Select style={{ width: '100%' }} defaultValue="DD/MM/YYYY" options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }]} />
              </div>
              <Button type="primary" size="small" style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'device' && (
            <Card title="Thiết bị & Ứng dụng" size="small">
              {device.map((n, i) => <ToggleRow key={n.label} {...n} onChange={(v) => toggle(setDevice, i, v)} />)}
              <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-subtle)', borderRadius: 8 }}>
                <Text strong style={{ fontSize: 12.5, display: 'block', marginBottom: 4 }}>Phiên bản ứng dụng</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>DermaHealth v2.4.1 · Cập nhật mới nhất</Text>
              </div>
              <Button type="primary" size="small" style={{ marginTop: 16 }}>Lưu cài đặt</Button>
            </Card>
          )}

          {active === 'app' && (
            <Card title="Quản lý ứng dụng" size="small">
              <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--border-default)' }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Dữ liệu dùng thử</Text>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 12 }}>
                  Khôi phục toàn bộ lượt khám, hồ sơ và quy trình về dữ liệu mẫu ban đầu.
                </Paragraph>
                <Button danger icon={<RotateCcw size={15} />} onClick={confirmReset}>Đặt lại dữ liệu demo</Button>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Phiên đăng nhập</Text>
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 12 }}>
                  Kết thúc phiên hiện tại và quay lại màn hình đăng nhập.
                </Paragraph>
                <Button icon={<LogOut size={15} />} onClick={() => nav('/login')}>Đăng xuất</Button>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
