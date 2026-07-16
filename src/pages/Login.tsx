import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Typography, Alert } from 'antd';
import { HeartPulse, ArrowRight } from 'lucide-react';
import { login } from '../api/auth';
import { ApiError } from '../api/http';

const { Title, Text, Paragraph } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: values.email, password: values.password, rememberMe: values.remember });
      nav('/app/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--font-system)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, background: 'linear-gradient(160deg, #0c2d4f 0%, #123b66 55%, #1e5e9e 100%)', color: 'white', display: 'flex', flexDirection: 'column', padding: '48px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartPulse size={20} color="#5da9ea" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>DermaHealth</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Chuỗi hệ thống trạm chăm sóc da</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460 }}>
          <div style={{ width: 88, height: 88, borderRadius: 16, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <HeartPulse size={40} color="#5da9ea" />
          </div>
          <Title style={{ color: 'white', fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.2, marginBottom: 16 }}>Chăm Sóc Da<br />Thông Minh Hơn</Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15.5, lineHeight: 1.7 }}>
            Kết hợp AI tiên tiến và chuyên môn y tế để mang lại kết quả điều trị da liễu tốt nhất cho bạn.
          </Paragraph>

          <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
            {[{ v: '50K+', l: 'Bệnh nhân' }, { v: '98%', l: 'Hài lòng' }, { v: '200+', l: 'Bác sĩ' }].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#5da9ea', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            {['AI Phân tích da', 'Quản lý thuốc', 'Đặt lịch khám', 'Theo dõi tiến triển'].map((tag) => (
              <span key={tag} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, color: 'rgba(255,255,255,0.85)' }}>{tag}</span>
            ))}
          </div>
        </div>

        <div style={{ opacity: 0.35, fontSize: 12 }}>© 2024 DermaHealth. Chuỗi hệ thống trạm chăm sóc da toàn diện.</div>
      </div>

      {/* Right panel */}
      <div style={{ width: 460, background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--medical-blue-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HeartPulse size={26} color="white" />
            </div>
          </div>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Đăng nhập</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</Text>

          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

          <Form<LoginFormValues> layout="vertical" onFinish={handle} initialValues={{ email: 'nguyenvana@example.test', password: 'a-strong-password', remember: true }}>
            <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}><Input /></Form.Item>
            <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}><Input.Password /></Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle><Checkbox>Ghi nhớ đăng nhập</Checkbox></Form.Item>
              <a href="#">Quên mật khẩu?</a>
            </div>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} icon={<ArrowRight size={16} />} iconPosition="end">Đăng nhập</Button>
          </Form>

          <Divider plain style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hoặc tiếp tục với</Divider>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button block>Google</Button>
            <Button block>Apple</Button>
          </div>

          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 13.5 }}>
            Chưa có tài khoản? <a href="#">Đăng ký ngay</a>
          </Text>
        </div>
      </div>
    </div>
  );
}
