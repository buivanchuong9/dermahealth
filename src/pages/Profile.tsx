import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Avatar, Button, Tag, Descriptions, Timeline, List, Typography, Statistic } from 'antd';
import { Camera, Edit2, Bell, Shield, LogOut } from 'lucide-react';
import { useAppState } from '../state/useAppState';
import { patientService } from '../domain/services/patientService';

const { Title, Text } = Typography;

const HEALTH = [
  { label: 'Điểm sức khỏe AI', value: '85/100' },
  { label: 'Tuần điều trị', value: 'Tuần 8' },
  { label: 'Lịch hẹn sắp tới', value: '15/10' },
  { label: 'Nguy cơ tái phát', value: 'Thấp' },
];

const TIMELINE = [
  { date: '10/10/2023', title: 'Bác sĩ điều chỉnh liều Tretinoin', type: 'Cập nhật phác đồ' },
  { date: '01/10/2023', title: 'Khám định kỳ lần 2', type: 'Lịch hẹn' },
  { date: '28/09/2023', title: 'Xét nghiệm máu – Kết quả bình thường', type: 'Xét nghiệm' },
  { date: '15/09/2023', title: 'Bắt đầu điều trị mụn trứng cá', type: 'Bắt đầu phác đồ' },
];

const CURRENT_RX = [
  { name: 'Tretinoin 0.05% Cream', dose: 'Bôi tối, 1 lần/ngày', duration: '3 tháng' },
  { name: 'Doxycycline 100mg', dose: 'Uống sáng, 1 viên/ngày', duration: '7 ngày' },
  { name: 'Omega-3 1000mg', dose: 'Sau bữa ăn, 1 viên/ngày', duration: '30 ngày' },
];

export default function Profile() {
  const nav = useNavigate();
  const { currentPatient } = useAppState();
  const primaryDoctor = patientService.getPrimaryDoctor(currentPatient);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: '4px 0 0' }}>Thông Tin Cá Nhân Và Lịch Sử Điều Trị Của Bạn</Title>
        </div>
        <Button type="primary" icon={<Edit2 size={16} />}>Chỉnh sửa hồ sơ</Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 16px' }}>
                <Avatar size={96} style={{ background: 'var(--medical-blue-700)', fontSize: 32, fontWeight: 700 }}>{currentPatient.name.trim().slice(-1)}</Avatar>
                <Button shape="circle" size="small" danger type="primary" icon={<Camera size={12} />} style={{ position: 'absolute', bottom: 0, right: 0 }} />
              </div>
              <Title level={5} style={{ marginBottom: 2 }}>{currentPatient.name}</Title>
              <Text type="secondary" style={{ fontSize: 12.5 }}>Mã bệnh nhân: {currentPatient.code}</Text>
              <div><Tag color="success" style={{ marginTop: 10 }}>Đang điều trị</Tag></div>
            </Card>

            <Card size="small" title="Thông tin cá nhân">
              <Descriptions column={1} size="small" items={[
                { key: 'dob', label: 'Ngày sinh', children: currentPatient.profile.dob },
                { key: 'gender', label: 'Giới tính', children: currentPatient.profile.gender },
                { key: 'phone', label: 'Số điện thoại', children: currentPatient.profile.phone },
                { key: 'email', label: 'Email', children: currentPatient.profile.email },
                { key: 'address', label: 'Địa chỉ', children: currentPatient.profile.address },
              ]} />
            </Card>

            <Card size="small" title="Bác sĩ phụ trách">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar size={44} style={{ background: 'var(--medical-blue-700)' }}>{primaryDoctor?.name.trim().slice(-1) ?? '?'}</Avatar>
                <div>
                  <Text strong style={{ display: 'block' }}>{primaryDoctor?.name ?? 'Chưa gán bác sĩ'}</Text>
                  <Text type="secondary" style={{ fontSize: 12.5 }}>{primaryDoctor?.specialty ?? ''}</Text>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button block icon={<Bell size={16} />} style={{ justifyContent: 'flex-start' }}>Cài đặt thông báo</Button>
              <Button block icon={<Shield size={16} />} style={{ justifyContent: 'flex-start' }}>Quyền riêng tư & Bảo mật</Button>
              <Button block danger icon={<LogOut size={16} />} style={{ justifyContent: 'flex-start' }} onClick={() => nav('/login')}>Đăng xuất</Button>
            </div>
          </div>
        </Col>

        <Col xs={24} md={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row gutter={12}>
              {HEALTH.map((h) => (
                <Col xs={24} sm={12} md={6} key={h.label}>
                  <Card size="small" style={{ textAlign: 'center' }}><Statistic title={h.label} value={h.value} valueStyle={{ fontSize: 20, color: 'var(--medical-blue-700)' }} /></Card>
                </Col>
              ))}
            </Row>

            <Card size="small" title="Lịch sử điều trị">
              <Timeline
                items={TIMELINE.map((t) => ({
                  children: (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>{t.date}</Text>
                      <Text strong style={{ fontSize: 13.5, display: 'block', margin: '2px 0 4px' }}>{t.title}</Text>
                      <Tag color="blue">{t.type}</Tag>
                    </div>
                  ),
                }))}
              />
            </Card>

            <Card size="small" title="Đơn thuốc hiện tại">
              <List
                dataSource={CURRENT_RX}
                renderItem={(rx) => (
                  <List.Item extra={<Tag color="blue">{rx.duration}</Tag>}>
                    <List.Item.Meta title={<Text strong style={{ fontSize: 13.5 }}>{rx.name}</Text>} description={<Text type="secondary" style={{ fontSize: 12.5 }}>{rx.dose}</Text>} />
                  </List.Item>
                )}
              />
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
