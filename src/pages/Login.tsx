import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Typography } from 'antd';
import { ArrowRight, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import appleLogo from '../../logo_apple.png';

const { Title, Text, Paragraph } = Typography;

// --- ĐỊNH NGHĨA ANIMATION CHO PANEL TRÁI (Hiệu ứng thác đổ mượt mà) ---
const leftPanelVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.15,
      staggerChildren: 0.1,
    },
  },
};

const leftItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// --- ĐỊNH NGHĨA ANIMATION CHO FORM PHẢI ---
const formVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 },
  },
};

// --- ANIMATION CHO FORM ITEMS (STAGGER) ---
const formItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const formItemsContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

// --- ANIMATION CHO DIVIDER VÀ SOCIAL BUTTONS ---
const dividerVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.35 },
  },
};

const socialButtonsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.5,
    },
  },
};

const socialButtonItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Login() {
  const nav = useNavigate();
  const handleLogin = () => nav('/app/dashboard');

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--font-system)', overflow: 'hidden', background: 'radial-gradient(circle at top left, rgba(93, 169, 234, 0.12), transparent 24%), radial-gradient(circle at bottom right, rgba(30, 94, 158, 0.14), transparent 26%)' }}>
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <motion.div
          style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'rgba(93,169,234,0.18)', filter: 'blur(90px)', left: '6%', top: '10%' }}
          animate={{ x: [0, 18, 0], y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: [0.42, 0, 0.58, 1] as const }}
        />
        <motion.div
          style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', filter: 'blur(70px)', right: '8%', top: '24%' }}
          animate={{ x: [0, -14, 0], y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: [0.42, 0, 0.58, 1] as const }}
        />
      </motion.div>
      
      {/* Panel Trái với hiệu ứng Staggered */}
      <motion.div
        variants={leftPanelVariants}
        initial="hidden"
        animate="visible"
        style={{
          flex: 1,
          background: 'linear-gradient(160deg, #0c2d4f 0%, #123b66 55%, #1e5e9e 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 64px',
        }}
      >
        {/* LOGO GÓC TRÊN CÙNG BÊN TRÁI */}
        <motion.div variants={leftItemVariants} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
          <img 
            src="/logo.jpeg" 
            alt="DermaHealth Logo" 
            style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', background: 'white' }} 
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>DermaHealth</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Chuỗi hệ thống trạm chăm sóc da</div>
          </div>
        </motion.div>

        {/* NỘI DUNG CHÍNH */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460 }}>
          
            <motion.div variants={leftItemVariants}>
              <motion.div animate={{ y: [0, -6] }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 6, ease: [0.42, 0, 0.58, 1] as const, repeatDelay: 0 }}>
                <Title style={{ color: 'white', fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.2, marginBottom: 16 }}>
                  Chăm Sóc Da<br />Thông Minh Hơn
                </Title>
              </motion.div>
            </motion.div>

            <motion.div variants={leftItemVariants}>
              <motion.div animate={{ y: [0, -4] }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 7, ease: [0.42, 0, 0.58, 1] as const, repeatDelay: 0 }}>
                <Paragraph style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15.5, lineHeight: 1.7 }}>
                  Kết hợp AI tiên tiến và chuyên môn y tế để mang lại kết quả điều trị da liễu tốt nhất cho bạn.
                </Paragraph>
              </motion.div>
            </motion.div>

          {/* SỐ LIỆU */}
          <motion.div variants={leftItemVariants} style={{ display: 'flex', gap: 40, marginTop: 32 }}>
            {[
              { v: '50K+', l: 'Bệnh nhân' },
              { v: '98%', l: 'Hài lòng' },
              { v: '200+', l: 'Bác sĩ' },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#5da9ea', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </motion.div>

          {/* TAGS */}
          <motion.div variants={leftItemVariants} style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            {['AI Phân tích da', 'Quản lý thuốc', 'Đặt lịch khám', 'Theo dõi tiến triển'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* COPYRIGHT */}
        <motion.div variants={leftItemVariants} style={{ opacity: 0.35, fontSize: 12 }}>
          © 2024 DermaHealth. Chuỗi hệ thống trạm chăm sóc da toàn diện.
        </motion.div>
      </motion.div>

      {/* Form Đăng Nhập bên phải có Motion */}
      <motion.div
        whileHover={{ y: -4, scale: 1.008 }}
        transition={{ duration: 0.2 }}
        style={{ width: 460, background: 'rgba(255,255,255,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, boxShadow: '0 30px 90px rgba(16,34,90,0.12)', borderRadius: 32, backdropFilter: 'blur(18px)' }}
      >
        <motion.div
          variants={formVariants}
          initial="hidden"
          animate="visible"
          style={{ width: '100%', maxWidth: 360, padding: '24px 24px 16px' }}
        >
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Đăng nhập</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</Text>

          <Form
            layout="vertical"
            onFinish={handleLogin}
            initialValues={{ email: 'nguyenvana@gmail.com', password: 'password123', remember: true }}
          >
            <motion.div
              variants={formItemsContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={formItemVariants}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ required: true, message: 'Vui lòng nhập Email!' }, { type: 'email', message: 'Định dạng email không hợp lệ!' }]}
                >
                  <Input size="large" style={{ borderRadius: 14, padding: '12px 14px', transition: 'all 0.3s ease' }} />
                </Form.Item>
              </motion.div>

              <motion.div variants={formItemVariants}>
                <Form.Item
                  label="Mật khẩu"
                  name="password"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                >
                  <Input.Password size="large" style={{ borderRadius: 14, padding: '12px 14px', transition: 'all 0.3s ease' }} />
                </Form.Item>
              </motion.div>

              <motion.div variants={formItemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                </Form.Item>
                <motion.a
                  href="#"
                  style={{ color: 'var(--medical-blue-700)', fontWeight: 500 }}
                  whileHover={{ textDecoration: 'underline', scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.preventDefault()}
                >
                  Quên mật khẩu?
                </motion.a>
              </motion.div>

              {/* Nút đăng nhập có Micro-interaction */}
              <motion.div variants={formItemVariants} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  icon={<ArrowRight size={16} />}
                  iconPosition="end"
                  style={{
                    height: 52,
                    borderRadius: 16,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  Đăng nhập
                </Button>
              </motion.div>
            </motion.div>
          </Form>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.5 }}
            style={{ transformOrigin: 'center' }}
          >
            <Divider plain style={{ fontSize: 12, color: 'var(--text-muted)', margin: '24px 0' }}>
              Hoặc tiếp tục với
            </Divider>
          </motion.div>

          <motion.div
            variants={socialButtonsVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}
          >
            <motion.div variants={socialButtonItemVariants} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(16,34,90,0.15)' }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
              <Button
                block
                size="large"
                style={{ borderRadius: 16, padding: '0 16px', background: '#ffffff', color: '#111827', border: '1px solid rgba(16,34,90,0.1)', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.3s ease' }}
                icon={<Globe size={18} />}
              >
                Google
              </Button>
            </motion.div>
            <motion.div variants={socialButtonItemVariants} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(16,34,90,0.15)' }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
              <Button
                block
                size="large"
                style={{ borderRadius: 16, padding: '0 16px', background: '#ffffff', color: '#111827', border: '1px solid rgba(16,34,90,0.1)', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.3s ease' }}
                icon={<img src={appleLogo} alt="Apple" style={{ width: 18, height: 18, objectFit: 'contain' }} />}
              >
                Apple
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.7 }}
          >
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 28, fontSize: 13.5 }}>
              Chưa có tài khoản?{' '}
              <motion.a
                href="/register"
                style={{ color: 'var(--medical-blue-700)', fontWeight: 600, cursor: 'pointer' }}
                whileHover={{ scale: 1.05, textDecoration: 'underline' }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  e.preventDefault();
                  nav('/register');
                }}
              >
                Đăng ký ngay
              </motion.a>
            </Text>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}