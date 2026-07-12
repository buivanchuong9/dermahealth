import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const handle = (e: React.FormEvent) => { e.preventDefault(); nav('/app/dashboard'); };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(150deg, #0f172a 0%, #1e3a5f 55%, #1677FF 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        padding: '3rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative rings */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', top: '-160px', right: '-160px' }} />
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.03)', top: '-260px', right: '-260px' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', border: '1px solid rgba(22,119,255,0.15)', bottom: '60px', left: '-120px' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(22,119,255,0.08)', bottom: '120px', right: '80px' }} />

        {/* Logo top-left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: 'auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            lineHeight: 0,
          }}>
            <img src="/logo.jpeg" alt="DermaHealth" style={{ height: 38, width: 38, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>DermaHealth</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 1 }}>Chuỗi hệ thống trạm chăm sóc da</div>
          </div>
        </div>

        {/* Hero content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>

          {/* Big logo center */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              width: 120, height: 120, borderRadius: 28,
              background: 'white',
              padding: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              lineHeight: 0,
            }}>
              <img
                src="/logo.jpeg"
                alt="DermaHealth"
                style={{ width: '100%', height: '100%', borderRadius: 20, objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Chăm Sóc Da<br />Thông Minh Hơn.
          </h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.72, lineHeight: 1.75, maxWidth: 400 }}>
            Kết hợp AI tiên tiến và chuyên môn y tế để mang lại kết quả điều trị da liễu tốt nhất cho bạn.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '2.5rem', marginTop: '2.5rem' }}>
            {[
              { v: '50K+', l: 'Bệnh nhân' },
              { v: '98%', l: 'Hài lòng' },
              { v: '200+', l: 'Bác sĩ' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1, color: '#60a5fa' }}>{s.v}</div>
                <div style={{ fontSize: '0.825rem', opacity: 0.6, marginTop: '0.3rem' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {['🤖 AI Phân tích da', '💊 Quản lý thuốc', '📅 Đặt lịch khám', '📊 Theo dõi tiến triển'].map(tag => (
              <span key={tag} style={{ fontSize: '0.775rem', fontWeight: 600, padding: '0.375rem 0.875rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 30, color: 'rgba(255,255,255,0.85)' }}>{tag}</span>
            ))}
          </div>
        </div>

        <div style={{ opacity: 0.3, fontSize: '0.775rem', position: 'relative', zIndex: 1 }}>
          © 2024 DermaHealth. Chuỗi hệ thống trạm chăm sóc da toàn diện.
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ width: '44%', background: '#F6F8FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo on right panel */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: '8px',
              boxShadow: '0 4px 16px rgba(22,119,255,0.12)',
              lineHeight: 0,
            }}>
              <img src="/logo.jpeg" alt="DermaHealth" style={{ height: 52, width: 52, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
            </div>
          </div>

          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1F2937', marginBottom: '0.35rem', letterSpacing: '-0.02em', textAlign: 'center' }}>
            Đăng nhập
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.875rem', textAlign: 'center' }}>
            Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
          </p>

          <form onSubmit={handle}>
            <div style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.45rem', color: '#1F2937' }}>
                Email
              </label>
              <input
                type="email"
                defaultValue="nguyenvana@gmail.com"
                placeholder="Ví dụ: nguyenvana@gmail.com"
                style={{ display: 'block', width: '100%', padding: '0.8rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', transition: 'all 0.18s', background: 'white' }}
                onFocus={e => { e.target.style.borderColor = '#1677FF'; e.target.style.boxShadow = '0 0 0 3px rgba(22,119,255,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.45rem', color: '#1F2937' }}>
                Mật khẩu
              </label>
              <input
                type="password"
                defaultValue="password123"
                placeholder="Nhập mật khẩu của bạn"
                style={{ display: 'block', width: '100%', padding: '0.8rem 1rem', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', transition: 'all 0.18s', background: 'white' }}
                onFocus={e => { e.target.style.borderColor = '#1677FF'; e.target.style.boxShadow = '0 0 0 3px rgba(22,119,255,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#1F2937' }}>
                <input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập
              </label>
              <a href="#" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1677FF' }}>Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.9rem', background: '#1677FF', color: 'white', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(22,119,255,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0958d9'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(22,119,255,0.38)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1677FF'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,119,255,0.3)'; }}
            >
              Đăng nhập →
            </button>
          </form>

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>Hoặc tiếp tục với</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.875rem' }}>
            {[
              { name: 'Google', icon: '🔵' },
              { name: 'Apple', icon: '🍎' },
            ].map(s => (
              <button
                key={s.name}
                style={{ flex: 1, padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 10, background: 'white', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1677FF'; e.currentTarget.style.background = 'var(--primary-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Chưa có tài khoản?{' '}
            <a href="#" style={{ fontWeight: 700, color: '#1677FF' }}>Đăng ký ngay</a>
          </p>
        </div>
      </div>
    </div>
  );
}
