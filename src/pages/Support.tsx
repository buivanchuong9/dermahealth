import { useState } from 'react';
import { Row, Col, Card, Collapse, Select, Input, Button, Typography } from 'antd';
import { MessageCircle, Phone, Mail, Send } from 'lucide-react';

const { Title, Text } = Typography;

const FAQS = [
  { q: 'Làm sao để đặt lịch hẹn khám?', a: 'Vào mục "Lịch hẹn", sau đó nhấn "Đặt lịch mới" rồi chọn bác sĩ, ngày giờ phù hợp.' },
  { q: 'Ảnh phân tích AI được lưu ở đâu?', a: 'Ảnh được lưu bảo mật trên hệ thống DermaHealth. Vào "Theo dõi tiến triển" để xem lại.' },
  { q: 'Cách thay đổi lịch nhắc uống thuốc?', a: 'Vào "Đơn thuốc", sau đó nhấn "Đặt nhắc nhở tùy chỉnh" rồi chỉnh giờ phù hợp.' },
  { q: 'Dữ liệu của tôi có được bảo mật không?', a: 'Tuyệt đối. Dữ liệu mã hóa 256-bit và chỉ bác sĩ phụ trách mới được truy cập.' },
  { q: 'AI phân tích da có chính xác không?', a: 'AI DermaHealth được huấn luyện trên 1.5 triệu ca lâm sàng, độ chính xác 94%. Tuy nhiên đây chỉ là hỗ trợ, không thay thế chẩn đoán của bác sĩ.' },
];

const CHANNELS = [
  { icon: <MessageCircle size={22} color="var(--medical-blue-700)" />, label: 'Chat trực tiếp', desc: 'Phản hồi trong 5 phút', action: 'Bắt đầu chat' },
  { icon: <Phone size={22} color="var(--success)" />, label: 'Gọi hotline', desc: '1800-1234 (miễn phí)', action: 'Gọi ngay' },
  { icon: <Mail size={22} color="var(--warning)" />, label: 'Gửi email', desc: 'support@dermahealth.vn', action: 'Gửi email' },
];

export default function Support() {
  const [msg, setMsg] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, color: 'var(--medical-blue-600)' }}>Trợ giúp</Text>
        <Title level={3} style={{ margin: '4px 0 0' }}>Hỗ Trợ & Liên Hệ</Title>
        <Text type="secondary">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.</Text>
      </div>

      <Row gutter={12}>
        {CHANNELS.map((c) => (
          <Col xs={24} sm={12} md={8} key={c.label}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--medical-blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{c.icon}</div>
              <Text strong style={{ display: 'block', marginBottom: 2 }}>{c.label}</Text>
              <Text type="secondary" style={{ fontSize: 12.5, display: 'block', marginBottom: 12 }}>{c.desc}</Text>
              <Button type="primary" size="small" block>{c.action}</Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Card title="Câu hỏi thường gặp" size="small">
            <Collapse
              ghost
              items={FAQS.map((f, i) => ({ key: i, label: <Text strong style={{ fontSize: 13.5 }}>{f.q}</Text>, children: <Text type="secondary" style={{ fontSize: 13 }}>{f.a}</Text> }))}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card title="Gửi yêu cầu hỗ trợ" size="small">
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Chủ đề</Text>
            <Select
              style={{ width: '100%', marginBottom: 14 }}
              defaultValue="tech"
              options={[
                { value: 'tech', label: 'Vấn đề kỹ thuật' },
                { value: 'treatment', label: 'Câu hỏi về điều trị' },
                { value: 'billing', label: 'Thanh toán & Gói dịch vụ' },
                { value: 'other', label: 'Khác' },
              ]}
            />
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nội dung</Text>
            <Input.TextArea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Mô tả vấn đề bạn đang gặp phải..." style={{ marginBottom: 14 }} />
            <Button type="primary" block icon={<Send size={15} />} onClick={() => setMsg('')}>Gửi yêu cầu</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
