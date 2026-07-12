import { useState } from 'react';
import { Camera, Brain, Image, ChevronRight, Star, Upload } from 'lucide-react';
import { mockProgressData, mockProgressPhotos } from '../data/mockData';

const WEEKS = mockProgressData.map(d => d.week);
const SCORES = mockProgressData.map(d => d.score);

function AreaChart({ data }: { data: number[] }) {
  const W = 560, H = 160, PAD = { top: 12, right: 12, bottom: 28, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxV = 100, minV = 30;
  const xStep = innerW / (data.length - 1);
  const yScale = (v: number) => innerH - ((v - minV) / (maxV - minV)) * innerH;
  const pts = data.map((v, i) => ({ x: PAD.left + i * xStep, y: PAD.top + yScale(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1677FF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1677FF" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[50, 70, 90].map(v => {
        const y = PAD.top + yScale(v);
        return <g key={v}><line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e8edf3" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text></g>;
      })}
      <path d={areaPath} fill="url(#pg)" />
      <path d={linePath} fill="none" stroke="#1677FF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#1677FF" stroke="white" strokeWidth="2.5" />
          <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">{WEEKS[i]}</text>
        </g>
      ))}
    </svg>
  );
}

function Ring({ value, color = '#1677FF', size = 80 }: { value: number; color?: string; size?: number }) {
  const r = 34, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8edf3" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

const TABS = ['Biểu đồ', 'Ảnh tiến triển', 'So sánh AI'];

export default function Progress() {
  const [tab, setTab] = useState('Biểu đồ');
  const [uploadModal, setUploadModal] = useState(false);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">AI Phân tích</div>
          <h1>Theo Dõi Tiến Triển</h1>
          <p>Theo dõi sự cải thiện da theo thời gian với AI phân tích hình ảnh.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-outline btn-sm"><Brain size={15} /> Phân tích AI</button>
          <button className="btn btn-primary" onClick={() => setUploadModal(true)}>
            <Upload size={16} /> Upload ảnh mới
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Điểm phục hồi', value: 85, prev: 42, color: '#1677FF' },
          { label: 'Giảm viêm', value: 72, prev: 20, color: '#52C41A' },
          { label: 'Đều màu da', value: 60, prev: 25, color: '#FAAD14' },
          { label: 'Độ ẩm da', value: 68, prev: 45, color: '#4096ff' },
        ].map(m => (
          <div key={m.label} className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 0.75rem' }}>
              <Ring value={m.value} color={m.color} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: m.color }}>{m.value}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{m.label}</div>
            <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
              ↑ +{m.value - m.prev}% so với đầu
            </span>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="pill-tabs">
        {TABS.map(t => (
          <button key={t} className={`pill-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Chart tab */}
      {tab === 'Biểu đồ' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          <div className="card card-no-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Biểu đồ phục hồi da theo tuần</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Chỉ số AI đánh giá tổng thể</p>
              </div>
              <span className="badge badge-success">↑ Cải thiện 43%</span>
            </div>
            <AreaChart data={SCORES} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.25rem' }}>
              {[
                { label: 'Mụn viêm', start: 80, end: 22, color: '#FF4D4F' },
                { label: 'Vết thâm', start: 75, end: 30, color: '#FAAD14' },
                { label: 'Độ ẩm da', start: 45, end: 68, color: '#52C41A' },
              ].map(m => (
                <div key={m.label} style={{ padding: '0.875rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.5rem' }}>{m.label}</div>
                  <div className="prog-track" style={{ marginBottom: '0.5rem' }}>
                    <div className="prog-fill" style={{ width: `${m.end}%`, background: m.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{m.start}% → {m.end}%</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: m.color }}>
                      {m.label === 'Độ ẩm da' ? `+${m.end - m.start}%` : `-${m.start - m.end}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI insights sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #1677FF 0%, #4096ff 100%)', borderRadius: 16, padding: '1.25rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Brain size={17} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>AI Nhận xét</span>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65, opacity: 0.9 }}>
                Tiến triển 8 tuần rất tích cực. Mụn viêm giảm 61%, vết thâm giảm 38%. Tiếp tục phác đồ hiện tại và tăng tần suất bôi kem dưỡng ẩm.
              </p>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.12)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '0.25rem' }}>Dự đoán hoàn thành điều trị</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Tuần 14 (tháng 12/2023)</div>
              </div>
            </div>

            {mockProgressData.slice(-3).reverse().map((d, i) => (
              <div key={i} style={{ padding: '1rem', background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{d.week}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1677FF' }}>{d.score}/100</span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill prog-fill-primary" style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos tab */}
      {tab === 'Ảnh tiến triển' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {mockProgressPhotos.map((photo, i) => (
              <div key={i} className="card" style={{ padding: '1rem', cursor: 'pointer' }}>
                <div style={{
                  height: 180, background: `linear-gradient(135deg, hsl(${210 + i * 20}, 60%, ${88 - i * 4}%) 0%, hsl(${210 + i * 20}, 40%, ${82 - i * 4}%) 100%)`,
                  borderRadius: 12, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <Image size={32} color={`hsl(${210 + i * 20}, 40%, 60%)`} />
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>AI {photo.score}/100</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '0.35rem 0.6rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600 }}>{photo.week}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>{photo.date}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{photo.note}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <div className="prog-track" style={{ flex: 1, marginRight: '0.75rem' }}>
                    <div className="prog-fill prog-fill-primary" style={{ width: `${photo.score}%` }} />
                  </div>
                  <ChevronRight size={16} color="var(--muted)" />
                </div>
              </div>
            ))}

            {/* Upload card */}
            <div className="card" style={{ padding: '1rem', border: '2px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, boxShadow: 'none' }}
              onClick={() => setUploadModal(true)}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                <Camera size={24} color="var(--primary)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 4 }}>Upload ảnh mới</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--muted)', textAlign: 'center' }}>Chụp hoặc tải ảnh da để AI phân tích tiến triển</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Comparison tab */}
      {tab === 'So sánh AI' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
          <div className="card card-no-hover">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>📊 So sánh Trước & Sau điều trị</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Tuần 1 (Trước)', score: 42, bg: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
                { label: 'Tuần 8 (Sau 2 tháng)', score: 85, bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' },
              ].map(p => (
                <div key={p.label}>
                  <div style={{ height: 220, background: p.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', position: 'relative' }}>
                    <Image size={40} color="rgba(100,116,139,0.4)" />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.35rem 0.625rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>{p.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>AI {p.score}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--primary-bg)', borderRadius: 14, border: '1px solid rgba(22,119,255,0.15)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
                <Brain size={15} style={{ display: 'inline', marginRight: 6 }} />
                AI Đánh giá cải thiện tổng thể: <strong>+43 điểm</strong>
              </div>
              {[
                { label: 'Giảm mụn viêm', value: 61, color: '#52C41A' },
                { label: 'Giảm sắc tố thâm', value: 38, color: '#1677FF' },
                { label: 'Cải thiện độ ẩm', value: 51, color: '#4096ff' },
                { label: 'Đều màu da', value: 45, color: '#FAAD14' },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: m.color }}>+{m.value}%</span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card card-no-hover">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>⭐ Đánh giá của bệnh nhân</h4>
              {[
                { label: 'Hiệu quả điều trị', stars: 5 },
                { label: 'Dễ tuân thủ', stars: 4 },
                { label: 'Tác dụng phụ', stars: 4 },
                { label: 'Hài lòng tổng thể', stars: 5 },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.825rem' }}>{r.label}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} fill={s <= r.stars ? '#FAAD14' : 'none'} color={s <= r.stars ? '#FAAD14' : '#d1d9e6'} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="card card-no-hover">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.875rem' }}>🎯 Dự đoán AI</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--success-bg)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>Hoàn thành điều trị</div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, marginTop: 2 }}>Tháng 12/2023 (Tuần 14)</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--info-bg)', borderRadius: 10, border: '1px solid rgba(22,119,255,0.15)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Nguy cơ tái phát</div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, marginTop: 2 }}>Thấp (8%) — Tiên lượng tốt</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Ảnh Tiến Triển</h3>
              <button className="modal-close" onClick={() => setUploadModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', border: '2px dashed var(--border)', borderRadius: 14, background: 'var(--bg)', cursor: 'pointer', marginBottom: '1rem' }}>
              <Camera size={40} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Chụp hoặc chọn ảnh</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>PNG, JPG tối đa 10MB</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>Chọn ảnh</button>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú (tùy chọn)</label>
              <textarea className="form-input" rows={2} placeholder="VD: Tuần 9 – Da đã bớt viêm..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setUploadModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => setUploadModal(false)}>Lưu & Phân tích AI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
