import { useState } from 'react';
import { BarChart2, TrendingUp, Calendar, Download, FileText, Brain, Star } from 'lucide-react';
import { mockProgressData } from '../data/mockData';

const WEEKS = mockProgressData.map(d => d.week);
const SCORES = mockProgressData.map(d => d.score);

function BarChartSVG({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const W = 560, H = 160, PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxV = 100;
  const barW = (innerW / data.length) * 0.55;
  const gap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = PAD.top + innerH - (v / maxV) * innerH;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e8edf3" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const x = PAD.left + i * gap + (gap - barW) / 2;
        const barH = (v / maxV) * innerH;
        const y = PAD.top + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#9ca3af">{labels[i]}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill={color} fontWeight="700">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

const TABS = ['Tổng quan', 'Điều trị', 'Thuốc', 'AI Báo cáo'];

export default function Reports() {
  const [tab, setTab] = useState('Tổng quan');

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Báo cáo sức khỏe</div>
          <h1>Báo Cáo & Thống Kê</h1>
          <p>Tổng hợp kết quả điều trị và phân tích sức khỏe da của bạn.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-outline btn-sm"><Download size={15} /> Xuất PDF</button>
          <button className="btn btn-primary"><FileText size={16} /> Báo cáo đầy đủ</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Tuần điều trị', val: '8', sub: 'Tháng 9 – nay', color: '#1677FF', icon: <Calendar size={18} color="#1677FF" /> },
          { label: 'Điểm phục hồi', val: '85', sub: '↑ từ 42 ban đầu', color: '#52C41A', icon: <TrendingUp size={18} color="#52C41A" /> },
          { label: 'Tuân thủ thuốc', val: '92%', sub: 'Xuất sắc', color: '#FAAD14', icon: <Star size={18} color="#FAAD14" /> },
          { label: 'AI Đánh giá', val: 'Tốt', sub: 'Tiếp tục phác đồ', color: '#1677FF', icon: <Brain size={18} color="#1677FF" /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pill-tabs">
        {TABS.map(t => (
          <button key={t} className={`pill-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'Tổng quan' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card card-no-hover">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Điểm sức khỏe da theo tuần</h3>
                <span className="badge badge-success">↑ +43 điểm</span>
              </div>
              <BarChartSVG data={SCORES} labels={WEEKS} color="#1677FF" />
            </div>

            <div className="card card-no-hover">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.125rem' }}>Chi tiết cải thiện</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  { label: 'Giảm mụn viêm', start: 100, end: 22, improvement: 78, color: '#FF4D4F' },
                  { label: 'Giảm vết thâm', start: 100, end: 38, improvement: 62, color: '#FAAD14' },
                  { label: 'Độ ẩm da', start: 45, end: 68, improvement: 51, color: '#52C41A' },
                  { label: 'Kết cấu da', start: 40, end: 72, improvement: 80, color: '#1677FF' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.label}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>↑ {m.improvement}%</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: m.color }}>{m.end}%</span>
                      </div>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${m.end}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card card-no-hover">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>📅 Thống kê lịch hẹn</h4>
              {[
                { label: 'Tổng lịch hẹn', val: '4', note: 'Trong 8 tuần' },
                { label: 'Đã tham dự', val: '4/4', note: '100% đúng hẹn' },
                { label: 'Lịch tới', val: '22/10', note: 'Bs. Trần Văn Nam' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>{s.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 1 }}>{s.note}</div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className="card card-no-hover">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>💊 Tuân thủ thuốc</h4>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#52C41A' }}>92%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tỷ lệ tuân thủ trung bình</div>
              </div>
              <div className="prog-track" style={{ height: 10, marginBottom: '0.875rem' }}>
                <div className="prog-fill prog-fill-success" style={{ width: '92%' }} />
              </div>
              {[
                { name: 'Tretinoin 0.05%', pct: 95 },
                { name: 'Omega-3', pct: 88 },
                { name: 'Kem chống nắng', pct: 91 },
              ].map(m => (
                <div key={m.name} style={{ marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.775rem' }}>{m.name}</span>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700 }}>{m.pct}%</span>
                  </div>
                  <div className="prog-track" style={{ height: 5 }}>
                    <div className="prog-fill prog-fill-success" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(135deg, #1677FF, #4096ff)', borderRadius: 16, padding: '1.25rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Brain size={17} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>AI Tóm tắt</span>
              </div>
              <p style={{ fontSize: '0.825rem', lineHeight: 1.65, opacity: 0.9 }}>
                Bệnh nhân có tiến triển xuất sắc sau 8 tuần. Phác đồ hiện tại đang hiệu quả. Dự kiến hoàn thành điều trị tuần 14.
              </p>
              <button className="btn btn-sm" style={{ marginTop: '0.875rem', color: 'white', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, width: '100%' }}>
                <Download size={13} /> Xuất báo cáo AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment tab */}
      {tab === 'Điều trị' && (
        <div className="card card-no-hover">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Lịch sử điều trị chi tiết</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tuần</th>
                <th>Chẩn đoán</th>
                <th>Điểm AI</th>
                <th>Ghi chú</th>
                <th>Bác sĩ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { week: 'Tuần 1', dx: 'Mụn trứng cá độ III', score: 42, note: 'Bắt đầu điều trị', doctor: 'Bs. Nguyễn Thị An' },
                { week: 'Tuần 2', dx: 'Mụn trứng cá độ III', score: 52, note: 'Kháng sinh phát huy', doctor: 'Bs. Nguyễn Thị An' },
                { week: 'Tuần 4', dx: 'Mụn trứng cá độ II', score: 65, note: 'Cải thiện rõ', doctor: 'Bs. Nguyễn Thị An' },
                { week: 'Tuần 6', dx: 'Mụn trứng cá độ I-II', score: 74, note: 'Tretinoin hiệu quả', doctor: 'Bs. Nguyễn Thị An' },
                { week: 'Tuần 8', dx: 'Mụn trứng cá độ I', score: 85, note: 'Tiến triển tốt', doctor: 'Bs. Nguyễn Thị An' },
              ].map(r => (
                <tr key={r.week}>
                  <td><span style={{ fontWeight: 700 }}>{r.week}</span></td>
                  <td>{r.dx}</td>
                  <td>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: r.score >= 80 ? '#52C41A' : r.score >= 60 ? '#1677FF' : '#FAAD14' }}>{r.score}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>/100</span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.825rem' }}>{r.note}</td>
                  <td style={{ fontSize: '0.825rem' }}>{r.doctor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Medicine tab */}
      {tab === 'Thuốc' && (
        <div className="card card-no-hover">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Lịch sử sử dụng thuốc</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { name: 'Tretinoin 0.05% Cream', from: '10/10/2023', to: 'Đang dùng', compliance: 95, status: 'active' },
              { name: 'Doxycycline 100mg', from: '25/09/2023', to: '02/10/2023', compliance: 100, status: 'done' },
              { name: 'Omega-3 1000mg', from: '10/10/2023', to: 'Đang dùng', compliance: 88, status: 'active' },
              { name: 'Nước muối sinh lý 0.9%', from: '25/09/2023', to: '02/10/2023', compliance: 96, status: 'done' },
            ].map(m => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: m.status === 'active' ? 'var(--primary-bg)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BarChart2 size={18} color={m.status === 'active' ? 'var(--primary)' : 'var(--muted)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>{m.from} – {m.to}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.compliance >= 90 ? '#52C41A' : '#FAAD14' }}>{m.compliance}%</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>tuân thủ</div>
                </div>
                <span className={m.status === 'active' ? 'badge badge-primary' : 'badge badge-gray'}>
                  {m.status === 'active' ? 'Đang dùng' : 'Hoàn thành'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Report tab */}
      {tab === 'AI Báo cáo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          <div className="card card-no-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--primary-bg)', borderRadius: 12 }}>
              <Brain size={22} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>Báo cáo AI tự động</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>Tạo lúc 08:30 hôm nay · Dựa trên 8 tuần dữ liệu</div>
              </div>
            </div>

            {[
              { title: '1. Tình trạng da hiện tại', content: 'Sau 8 tuần điều trị, tình trạng mụn trứng cá đã cải thiện từ Độ III xuống Độ I. Chỉ số AI tổng thể đạt 85/100, tăng 43 điểm so với ban đầu.' },
              { title: '2. Hiệu quả phác đồ điều trị', content: 'Phác đồ kết hợp Tretinoin + Doxycycline + Omega-3 cho kết quả rất tốt. Mụn viêm giảm 61%, vết thâm giảm 38%, độ ẩm da tăng 51%.' },
              { title: '3. Tuân thủ điều trị', content: 'Tỷ lệ tuân thủ trung bình đạt 92% – Xuất sắc. Đặc biệt Doxycycline được tuân thủ 100% trong 7 ngày điều trị.' },
              { title: '4. Dự đoán & Khuyến nghị', content: 'Dự kiến hoàn thành điều trị vào tuần 14 (tháng 12/2023). Nguy cơ tái phát thấp (8%). Tiếp tục Tretinoin thêm 6 tuần và duy trì kem chống nắng.' },
            ].map(s => (
              <div key={s.title} style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{s.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.7 }}>{s.content}</p>
              </div>
            ))}

            <button className="btn btn-primary btn-full">
              <Download size={16} /> Tải báo cáo AI (PDF)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card card-no-hover" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Điểm tổng kết AI</div>
              <div style={{ fontSize: '4rem', fontWeight: 800, color: '#52C41A', lineHeight: 1 }}>A+</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Tiến triển xuất sắc</div>
            </div>

            <div className="card card-no-hover">
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.875rem' }}>Đánh giá của bác sĩ</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={18} fill="#FAAD14" color="#FAAD14" />)}
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic' }}>
                "Bệnh nhân rất tuân thủ phác đồ và có tiến triển nhanh. Kết quả vượt mong đợi."
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.625rem' }}>— Bs. Nguyễn Thị An, 10/10/2023</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
