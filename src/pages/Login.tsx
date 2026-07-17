import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Typography, Alert } from 'antd';
import { ArrowRight, Shield, Zap, Heart } from 'lucide-react';
import { motion, useMotionValue, useSpring, animate, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { login } from '../api/auth';
import { ApiError } from '../api/http';
import { useAppState } from '../state/useAppState';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

/* ─── Easing ─────────────────────────────────────────── */
const E_OUT   = [0.22, 1, 0.36, 1] as const;
const E_INOUT = [0.42, 0, 0.58, 1] as const;

/* ─── Variants ───────────────────────────────────────── */
const leftPanel = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.18, staggerChildren: 0.1 } },
};
const leftItem = {
  hidden:  { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.65, ease: E_OUT } },
};
const formCard = {
  hidden:  { opacity: 0, x: 60, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.75, ease: E_OUT, delay: 0.12 } },
};
const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.22 } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: E_OUT } },
};

/* ─── Particles (seeded, stable across renders) ──────── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 137.508) % 360;
  return {
    id: i,
    x: ((seed / 360) * 100),
    y: ((i * 53.13) % 100),
    size: (i % 3) + 1.5,
    delay: (i * 0.38) % 7,
    dur: 10 + (i % 8),
    opacity: 0.06 + (i % 5) * 0.04,
  };
});

/* ─── Animated counter ───────────────────────────────── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    ctrl.current = animate(0, target, { duration: 1.9, ease: E_OUT, onUpdate: v => setVal(Math.round(v)) });
    return () => ctrl.current?.stop();
  }, [target]);
  return <>{val}{suffix}</>;
}

/* ─── Typewriter ─────────────────────────────────────── */
function Typewriter({ lines }: { lines: string[] }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const full = lines[lineIdx] ?? '';
  const shown = full.slice(0, charIdx);
  const done  = charIdx >= full.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setCharIdx(c => c + 1), 46);
    return () => clearTimeout(t);
  }, [charIdx, done]);

  useEffect(() => {
    if (!done || lineIdx >= lines.length - 1) return;
    const t = setTimeout(() => { setLineIdx(l => l + 1); setCharIdx(0); }, 300);
    return () => clearTimeout(t);
  }, [done, lineIdx, lines.length]);

  return (
    <>
      {lines.map((line, idx) => (
        <span key={idx} style={{ display: 'block' }}>
          {idx < lineIdx ? line : idx === lineIdx ? shown : ''}
          {idx === lineIdx && (
            <motion.span
              animate={{ opacity: done && lineIdx === lines.length - 1 ? [1, 0] : 1 }}
              transition={{ repeat: Infinity, duration: 0.55, ease: 'easeInOut' }}
              style={{ display: 'inline-block', width: 2.5, height: '0.85em', background: '#5da9ea', marginLeft: 3, verticalAlign: 'middle', borderRadius: 2 }}
            />
          )}
        </span>
      ))}
    </>
  );
}

/* ─── Spotlight (follows cursor on right panel) ──────── */
function Spotlight() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });

  const onMove = useCallback((e: MouseEvent) => {
    x.set(e.clientX);
    y.set(e.clientY);
  }, [x, y]);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [onMove]);

  return (
    <motion.div
      style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 0,
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(93,169,234,0.10) 0%, transparent 70%)',
        x: sx, y: sy,
        translateX: '-50%', translateY: '-50%',
      }}
    />
  );
}

/* ─── Ripple on click ────────────────────────────────── */
function RippleButton({ onClick, children, style }: {
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const addRipple = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 600);
    onClick?.();
  };

  return (
    <div ref={ref} onClick={addRipple}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, cursor: 'pointer', ...style }}
    >
      {children}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span key={r.id}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: 'easeOut' }}
            style={{ position: 'absolute', left: r.x, top: r.y, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Social Button (no y-lift, just shadow + scale) ─── */
function SocialBtn({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.035, boxShadow: '0 6px 22px rgba(16,34,90,0.13)' }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.18 }}
      style={{
        flex: 1, height: 50, borderRadius: 14,
        background: 'rgba(255,255,255,0.92)',
        border: '1.5px solid rgba(16,34,90,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        fontWeight: 600, fontSize: 14, color: '#1a1a2e', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(16,34,90,0.06)',
        transition: 'border-color 0.2s',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}

/* ─── Feature card for left panel ───────────────────── */
function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: E_OUT }}
      whileHover={{ x: 6, background: 'rgba(255,255,255,0.12)' }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '12px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.25s',
        cursor: 'default',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(93,169,234,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </motion.div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function Login() {
  const nav = useNavigate();
  const { refreshMe } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: values.email, password: values.password, rememberMe: values.remember });
      refreshMe();
      nav('/app/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--font-system)', overflow: 'hidden', background: 'linear-gradient(135deg, #eef2ff 0%, #e8f0fe 100%)' }}>
      <Spotlight />

      {/* ── Ambient blobs ── */}
      <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>
        {[
          { w: 520, h: 520, bg: 'rgba(93,169,234,0.20)', blur: 130, style: { left: '-8%', top: '-12%' }, ax: [0,20,0] as [number,number,number], ay: [0,14,0] as [number,number,number], dur: 20 },
          { w: 400, h: 400, bg: 'rgba(26,84,148,0.15)', blur: 110, style: { right: '-5%', bottom: '-10%' }, ax: [0,-14,0] as [number,number,number], ay: [0,-10,0] as [number,number,number], dur: 24 },
          { w: 300, h: 300, bg: 'rgba(93,169,234,0.12)', blur: 90, style: { right: '32%', top: '18%' }, ax: [0,10,0] as [number,number,number], ay: [0,16,0] as [number,number,number], dur: 16 },
        ].map((b, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', width: b.w, height: b.h, borderRadius: '50%', background: b.bg, filter: `blur(${b.blur}px)`, ...b.style }}
            animate={{ x: b.ax, y: b.ay }}
            transition={{ repeat: Infinity, duration: b.dur, ease: E_INOUT }}
          />
        ))}

        {/* Aurora sweep */}
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(210deg, rgba(93,169,234,0.07) 0%, transparent 50%, rgba(26,84,148,0.07) 100%)', pointerEvents: 'none' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 8, ease: E_INOUT }}
        />

        {/* Floating particles */}
        {PARTICLES.map(p => (
          <motion.div key={p.id}
            style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: 'rgba(26,84,148,0.55)', opacity: p.opacity }}
            animate={{ y: [0, -26, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity] }}
            transition={{ repeat: Infinity, duration: p.dur, delay: p.delay, ease: E_INOUT }}
          />
        ))}
      </motion.div>

      {/* ══════════ LEFT PANEL ══════════ */}
      <motion.div variants={leftPanel} initial="hidden" animate="visible"
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(152deg, #071e35 0%, #0c3060 48%, #174d8a 100%)', color: 'white', display: 'flex', flexDirection: 'column', padding: '44px 60px' }}
      >
        {/* Shimmer sweep */}
        <motion.div
          style={{ position: 'absolute', top: '-20%', left: '-10%', width: '40%', height: '140%', background: 'linear-gradient(108deg, transparent 28%, rgba(255,255,255,0.04) 50%, transparent 72%)', transform: 'skewX(-16deg)', pointerEvents: 'none' }}
          animate={{ x: ['0%', '340%'] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear', repeatDelay: 4 }}
        />

        {/* Grid lines decoration */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

        {/* Glow orb */}
        <div style={{ position: 'absolute', right: -60, top: '15%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,169,234,0.16) 0%, transparent 68%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <motion.div variants={leftItem} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto', zIndex: 1 }}>
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }}
          >
            <img src="/logo-mark.png" alt="DermaHealth" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '0.01em' }}>DermaHealth</div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 1 }}>Chuỗi hệ thống trạm chăm sóc da</div>
          </div>
        </motion.div>

        {/* Hero text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
          <motion.div variants={leftItem}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(93,169,234,0.18)', border: '1px solid rgba(93,169,234,0.32)', borderRadius: 20, padding: '4px 12px', fontSize: 11.5, fontWeight: 600, color: '#8ecdf5', marginTop: 20, marginBottom: 18, letterSpacing: '0.04em' }}>
              <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2, ease: E_INOUT }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5da9ea', display: 'inline-block' }} />
              </motion.span>
              AI-POWERED SKINCARE
            </div>
            <Title style={{ color: 'white', fontSize: 'clamp(26px, 3.2vw, 40px)', lineHeight: 1.16, marginBottom: 16, fontWeight: 800 }}>
              <Typewriter lines={['Chăm Sóc Da', 'Thông Minh Hơn']} />
            </Title>
          </motion.div>

          <motion.div variants={leftItem}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.78, marginBottom: 0, maxWidth: 400 }}>
              Kết hợp AI tiên tiến và chuyên môn y tế để mang lại kết quả điều trị da liễu tốt nhất cho bạn.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={leftItem} style={{ display: 'flex', gap: 0, marginTop: 32, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
            {[{ target: 50, suffix: 'K+', label: 'Bệnh nhân' }, { target: 98, suffix: '%', label: 'Hài lòng' }, { target: 200, suffix: '+', label: 'Bác sĩ' }].map((s, i) => (
              <motion.div key={s.label}
                whileHover={{ background: 'rgba(93,169,234,0.12)' }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'default' }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: '#5da9ea', lineHeight: 1 }}>
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.5, marginTop: 4, letterSpacing: '0.03em' }}>{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature cards */}
          <motion.div variants={leftItem} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <FeatureCard icon={<Zap size={16} color="#5da9ea" />} title="AI Phân tích da" desc="Nhận diện vấn đề da chính xác 98%" delay={0.8} />
            <FeatureCard icon={<Shield size={16} color="#5da9ea" />} title="Bảo mật dữ liệu" desc="Mã hóa end-to-end chuẩn y tế" delay={0.92} />
            <FeatureCard icon={<Heart size={16} color="#5da9ea" />} title="Theo dõi tiến triển" desc="Lịch sử điều trị toàn diện" delay={1.04} />
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div variants={leftItem} style={{ opacity: 0.3, fontSize: 11.5, zIndex: 1, marginTop: 20 }}>
          © 2026 DermaHealth · All rights reserved
        </motion.div>
      </motion.div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div style={{ width: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', position: 'relative', zIndex: 1 }}>
        <motion.div variants={formCard} initial="hidden" animate="visible"
          style={{ width: '100%', maxWidth: 400, position: 'relative' }}
        >
          {/* Card glow pulse */}
          <motion.div
            style={{ position: 'absolute', inset: -2, borderRadius: 30, pointerEvents: 'none', zIndex: -1 }}
            animate={{ boxShadow: ['0 0 0 0 rgba(93,169,234,0)', '0 0 0 4px rgba(93,169,234,0.15)', '0 0 0 0 rgba(93,169,234,0)'] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', repeatDelay: 2 }}
          />

          <div style={{
            padding: '38px 36px 30px',
            background: 'rgba(255,255,255,0.86)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.92)',
            boxShadow: '0 4px 24px rgba(16,34,90,0.08), 0 1px 4px rgba(16,34,90,0.05), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5, ease: E_OUT }}>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <Title level={3} style={{ marginBottom: 4, background: 'linear-gradient(135deg, #071e35, #1a5494)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                  Đăng nhập
                </Title>
                <Text type="secondary" style={{ fontSize: 13.5 }}>
                  Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
                </Text>
              </div>
            </motion.div>

            {/* Form */}
            <Form<LoginFormValues> layout="vertical" onFinish={handleLogin}
              initialValues={{ remember: true }}
            >
              <motion.div variants={stagger} initial="hidden" animate="visible">
                {error && (
                  <motion.div variants={fadeUp}>
                    <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 12 }} />
                  </motion.div>
                )}

                <motion.div variants={fadeUp}>
                  <Form.Item label="Email" name="email"
                    rules={[{ required: true, message: 'Vui lòng nhập Email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}
                  >
                    <Input size="large" placeholder="email@example.com"
                      style={{ borderRadius: 13, padding: '11px 14px', fontSize: 14, background: 'rgba(248,250,255,0.9)', border: '1.5px solid rgba(16,34,90,0.11)', transition: 'all 0.25s ease' }}
                    />
                  </Form.Item>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Form.Item label="Mật khẩu" name="password"
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                  >
                    <Input.Password size="large" placeholder="••••••••"
                      style={{ borderRadius: 13, padding: '11px 14px', fontSize: 14, background: 'rgba(248,250,255,0.9)', border: '1.5px solid rgba(16,34,90,0.11)', transition: 'all 0.25s ease' }}
                    />
                  </Form.Item>
                </motion.div>

                <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox style={{ fontSize: 13 }}>Ghi nhớ đăng nhập</Checkbox>
                  </Form.Item>
                  <motion.a href="#" style={{ color: '#1a5494', fontWeight: 600, fontSize: 13 }}
                    whileHover={{ color: '#5da9ea' }} onClick={e => e.preventDefault()}
                  >
                    Quên mật khẩu?
                  </motion.a>
                </motion.div>

                {/* Submit with ripple */}
                <motion.div variants={fadeUp}>
                  <RippleButton>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.16 }}>
                      <Button type="primary" htmlType="submit" block size="large" loading={loading}
                        icon={<ArrowRight size={16} />} iconPosition="end"
                        style={{ height: 52, borderRadius: 14, fontWeight: 700, letterSpacing: '0.02em', background: 'linear-gradient(135deg, #174d8a 0%, #071e35 100%)', border: 'none', boxShadow: '0 4px 18px rgba(7,30,53,0.32)', fontSize: 15 }}
                      >
                        Đăng nhập
                      </Button>
                    </motion.div>
                  </RippleButton>
                </motion.div>
              </motion.div>
            </Form>

            {/* Divider */}
            <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.5, ease: E_OUT, delay: 0.58 }} style={{ transformOrigin: 'center' }}>
              <Divider plain style={{ fontSize: 12, color: '#9ca3af', margin: '20px 0' }}>Hoặc tiếp tục với</Divider>
            </motion.div>

            {/* Social buttons — no y-lift, just scale + shadow */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.45, ease: E_OUT }}
              style={{ display: 'flex', gap: 10 }}
            >
              <SocialBtn label="Google" icon={
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              } />
              <SocialBtn label="Apple" icon={<img src="/logo_apple.png" alt="Apple" style={{ width: 18, height: 18, objectFit: 'contain' }} />} />
            </motion.div>

            {/* Register link */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.4 }}>
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 22, fontSize: 13.5 }}>
                Chưa có tài khoản?{' '}
                <motion.a href="/register"
                  style={{ color: '#1a5494', fontWeight: 700 }}
                  whileHover={{ color: '#5da9ea' }}
                  onClick={e => { e.preventDefault(); nav('/register'); }}
                >
                  Đăng ký ngay →
                </motion.a>
              </Text>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}