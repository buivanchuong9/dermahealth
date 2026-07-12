import { useEffect, useState } from 'react';
import { Video, Calendar, Camera, TrendingUp, Brain, AlertTriangle, Plus, ArrowRight, Bell, ChevronRight, Pill, FileText } from 'lucide-react';

/* ── Inline SVG Area Chart (no library needed) ── */
const WEEKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
const SCORES = [52, 58, 63, 61, 70, 74, 78, 85];

function AreaChart() {
  const W = 600, H = 180, PAD = { top: 12, right: 12, bottom: 28, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxV = 100, minV = 40;
  const xStep = innerW / (SCORES.length - 1);
  const yScale = (v: number) => innerH - ((v - minV) / (maxV - minV)) * innerH;

  const pts = SCORES.map((v, i) => ({ x: PAD.left + i * xStep, y: PAD.top + yScale(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1677FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1677FF" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[60, 70, 80, 90].map(v => {
        const y = PAD.top + yScale(v);
        return <line key={v} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* Y labels */}
      {[60, 80, 100].map(v => (
        <text key={v} x={PAD.left - 6} y={PAD.top + yScale(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{v}</text>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#1677FF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + X labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#1677FF" stroke="white" strokeWidth="2" />
          <text x={p.x} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{WEEKS[i]}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Circular progress ring ── */
function Ring({ value, max = 100, color, size = 88 }: { value: number; max?: number; color: string; size?: number }) {
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / max);
  return (
    <svg width={size} height={size} viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

const APPTS = [
  { id: 1, day: '15', month: '10', type: 'Da liễu', time: '09:00', doctor: 'Bs. Nguyễn Thị An', status: 'upcoming' },
  { id: 2, day: '22', month: '10', type: 'Tái khám', time: '14:00', doctor: 'Bs. Trần Văn Nam', status: 'upcoming' },
];

const RECORDS = [
  { id: 1, icon: Pill, title: 'Đơn thuốc Tretinoin 0.05%', date: '10/10/2023' },
  { id: 2, icon: FileText, title: 'Kết quả xét nghiệm máu', date: '28/09/2023' },
  { id: 3, icon: Camera, title: 'Ảnh phân tích da – Tuần 3', date: '05/10/2023' },
];

const QUICK = [
  { label: 'Đặt lịch hẹn', Icon: Calendar, color: '#1677FF', href: '/app/appointments' },
  { label: 'Phân tích da AI', Icon: Camera, color: '#4096ff', href: '/app/ai-analysis' },
  { label: 'Hành trình điều trị', Icon: TrendingUp, color: '#FF4D4F', href: '/app/records' },
  { label: 'Nhắc nhở uống thuốc', Icon: Bell, color: '#059669', href: '/app/profile' },
];

export default function Dashboard() {
  const [greet, setGreet] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Hero ── */}
      <div className="fade-up page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Tổng quan hôm nay</div>
          <h1>{greet}, Nguyễn Văn A 👋</h1>
          <p>Sức khỏe da của bạn đang được cải thiện. Tiếp tục theo dõi nhé!</p>
        </div>
        <div className="page-hero-actions">
          <a href="/app/appointments" className="btn btn-primary"><Video size={17} /> Khám trực tuyến</a>
        </div>
      </div>

      {/* ── Alert ── */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', background: 'rgba(250,173,20,0.06)', border: '1.5px solid rgba(250,173,20,0.25)', borderRadius: 'var(--radius)', color: '#92400e' }}>
        <AlertTriangle size={17} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '0.875rem' }}><strong>Nhắc nhở:</strong> Bạn chưa bôi kem Tretinoin tối nay. Hãy thực hiện trước 22:00.</span>
        <button className="btn btn-sm btn-outline" style={{ flexShrink: 0 }}>Đánh dấu xong</button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {QUICK.map(({ label, Icon, color, href }) => (
          <a key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)', e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = 'var(--shadow)')}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color="white" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1 }}>{label}</span>
            <ArrowRight size={15} style={{ color: 'var(--muted)', opacity: 0.6 }} />
          </a>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* AI Health Scores */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>Chỉ số sức khỏe da AI</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cập nhật lúc 08:30 hôm nay</p>
              </div>
              <span className="badge badge-success">↑ Cải thiện 15%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1.25rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {[
                { label: 'Điểm tổng quát', value: 85, max: 100, color: '#1677FF', suffix: '/100' },
                { label: 'Hồi phục', value: 72, max: 100, color: '#4096ff', suffix: '%' },
                { label: 'Độ ẩm da', value: 68, max: 100, color: '#059669', suffix: '%' },
              ].map(({ label, value, max, color, suffix }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ position: 'relative', width: 88, height: 88 }}>
                    <Ring value={value} max={max} color={color} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{suffix}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>Tiến trình phục hồi da</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Chỉ số AI theo tuần điều trị</p>
              </div>
              <select style={{ padding: '0.4rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', fontFamily: 'inherit', fontSize: '0.825rem', outline: 'none', cursor: 'pointer' }}>
                <option>8 Tuần qua</option>
                <option>3 Tháng qua</option>
              </select>
            </div>
            <AreaChart />
          </div>

          {/* Treatment progress bars */}
          <div className="card card-no-hover">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Chi tiết tình trạng da</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Mụn viêm', value: 35, color: 'var(--danger)', tag: 'Giảm 48%', tagCls: 'badge-success' },
                { label: 'Vết thâm', value: 55, color: 'var(--warning)', tag: 'Giảm 22%', tagCls: 'badge-success' },
                { label: 'Độ ẩm da', value: 68, color: '#059669', tag: 'Tốt', tagCls: 'badge-success' },
                { label: 'Nguy cơ tái phát', value: 20, color: 'var(--info)', tag: 'Thấp', tagCls: 'badge-info' },
              ].map(({ label, value, color, tag, tagCls }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${tagCls}`}>{tag}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color, width: 32, textAlign: 'right' }}>{value}%</span>
                    </div>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Appointments */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Lịch hẹn sắp tới</h3>
              <a href="/app/appointments" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'underline' }}>Xem tất cả</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {APPTS.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '0.875rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--primary)', color: 'white', borderRadius: 10, padding: '0.5rem 0.625rem', minWidth: 46 }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1 }}>{a.day}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.75, marginTop: 2 }}>Th {a.month}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.2rem' }}>Khám {a.type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{a.time} — {a.doctor}</div>
                  </div>
                  <span className="badge badge-primary" style={{ flexShrink: 0 }}>Video</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
              <button className="btn btn-primary btn-full"><Video size={16} /> Tham gia cuộc gọi</button>
              <a href="/app/appointments" className="btn btn-outline btn-full"><Plus size={16} /> Đặt lịch mới</a>
            </div>
          </div>

          {/* Recent records */}
          <div className="card card-no-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Hồ sơ & Đơn thuốc</h3>
              <a href="/app/records" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'underline' }}>Tất cả</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {RECORDS.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8edf2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <r.icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: 2 }}>{r.date}</div>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--muted)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* AI tip */}
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderRadius: 'var(--radius)', padding: '1.25rem', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <Brain size={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>AI Insights</span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.85 }}>Dựa trên tiến trình 8 tuần, da của bạn đang phục hồi tốt. Tiếp tục sử dụng kem Tretinoin và dùng kem chống nắng SPF 50 hàng ngày để đạt kết quả tối ưu.</p>
            <button style={{ marginTop: '0.875rem', fontSize: '0.825rem', fontWeight: 600, color: 'white', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              Xem báo cáo đầy đủ <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
