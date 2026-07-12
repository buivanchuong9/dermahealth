import { useState } from 'react';
import { Upload, Camera, ScanLine, CheckCircle, AlertTriangle, ArrowRight, RotateCcw, Brain, ZoomIn } from 'lucide-react';

type Step = 'upload' | 'scan' | 'result';

const STEPS_TXT = [
  'Tiền xử lý và tăng cường hình ảnh...',
  'Trích xuất đặc trưng vùng da tổn thương...',
  'Đối chiếu với mô hình AI lâm sàng (1.5M ca)...',
  'Tổng hợp kết quả và tạo báo cáo...',
];

export default function AIAnalysis() {
  const [step, setStep] = useState<Step>('upload');
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  const startScan = () => {
    setStep('scan'); setPct(0); setStepIdx(0);
    let p = 0;
    const t = setInterval(() => {
      p += 2; setPct(p);
      setStepIdx(Math.min(Math.floor(p / 25), 3));
      if (p >= 100) { clearInterval(t); setTimeout(() => setStep('result'), 500); }
    }, 60);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">AI Diagnosis</div>
          <h1>Phân Tích Da Bằng AI</h1>
          <p>Tải lên hình ảnh để nhận đánh giá sơ bộ từ hệ thống trí tuệ nhân tạo của DermaHealth.</p>
        </div>
        <span className="badge badge-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}>
          <Brain size={15} /> AI Diagnosis v2.4
        </span>
      </div>

      {step === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Upload zone */}
          <div onClick={startScan} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'white', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(10,61,74,0.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              <Upload size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Kéo thả hoặc nhấp để tải lên</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>Hỗ trợ JPG, PNG, HEIC • Tối đa 5MB</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={e => { e.stopPropagation(); startScan(); }}><Upload size={16} /> Chọn tệp</button>
              <button className="btn btn-primary" onClick={e => { e.stopPropagation(); startScan(); }}><Camera size={16} /> Dùng camera</button>
            </div>
          </div>

          {/* Tips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card card-no-hover" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Để có kết quả tốt nhất</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { icon: '☀️', title: 'Đủ ánh sáng', desc: 'Chụp dưới ánh sáng trắng tự nhiên' },
                  { icon: '🎯', title: 'Khoảng cách 10–15cm', desc: 'Để thiết bị gần vùng da cần chụp' },
                  { icon: '🔍', title: 'Lấy nét rõ', desc: 'Giữ tay ổn định, tránh ảnh mờ' },
                  { icon: '📐', title: 'Chụp thẳng góc', desc: 'Camera song song với bề mặt da' },
                ].map(t => (
                  <div key={t.title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{t.icon}</span>
                    <div>``
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 12, fontSize: '0.825rem', color: '#92400e' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--warning)' }} />
              <span>Kết quả AI chỉ là đánh giá sơ bộ, không thay thế chẩn đoán bác sĩ chuyên khoa.</span>
            </div>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="card card-no-hover" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(10,61,74,0.15)', animation: 'pulse 2s infinite' }} />
            <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '2px solid rgba(10,61,74,0.1)', animation: 'pulse 2s 0.5s infinite' }} />
            <ScanLine size={48} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Đang phân tích hình ảnh</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 420, lineHeight: 1.6, marginBottom: '2rem' }}>AI đang đối chiếu với hơn 1.5 triệu ca lâm sàng trong cơ sở dữ liệu...</p>
          <div style={{ width: '100%', maxWidth: 520, marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{STEPS_TXT[stepIdx]}</span>
              <strong style={{ color: 'var(--primary)' }}>{pct}%</strong>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)', transition: 'width 0.1s linear' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%', maxWidth: 400, textAlign: 'left' }}>
            {STEPS_TXT.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0.875rem', borderRadius: 10, background: stepIdx > i ? 'rgba(5,150,105,0.06)' : stepIdx === i ? 'rgba(10,61,74,0.05)' : 'transparent', fontSize: '0.875rem', color: stepIdx > i ? 'var(--success)' : stepIdx === i ? 'var(--primary)' : 'var(--muted)', fontWeight: stepIdx === i ? 600 : 400 }}>
                <CheckCircle size={17} style={{ flexShrink: 0, opacity: stepIdx > i ? 1 : stepIdx === i ? 0.7 : 0.3 }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'result' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Image */}
          <div className="card card-no-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ width: '100%', aspectRatio: '1', background: 'linear-gradient(135deg, #ffc9b0 0%, #ffa07a 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '22%', left: '28%', width: '40%', height: '38%', border: '2.5px solid var(--primary)', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '4px', background: 'rgba(10,61,74,0.08)' }}>
                <div style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ZoomIn size={11} /> Vùng tổn thương
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>Hình ảnh đã được chú thích</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>AI đánh dấu vùng có nghi ngờ tổn thương</div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', padding: '0 1.25rem 1.25rem' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setStep('upload')}><RotateCcw size={13} /> Phân tích lại</button>
              <button className="btn btn-sm btn-outline"><Upload size={13} /> Tải xuống</button>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card card-no-hover">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Kết Quả Chẩn Đoán AI</h3>
                <span className="badge badge-danger">⚠ Cần theo dõi</span>
              </div>
              {[
                { name: 'Viêm nang lông', pct: 96.8, color: 'var(--danger)', cls: 'badge-danger', desc: 'Viêm do vi khuẩn, tụ cầu khuẩn. Tổn thương có mủ, đỏ, đau rát. Mức độ cao.' },
                { name: 'Mụn trứng cá', pct: 89.4, color: 'var(--warning)', cls: 'badge-warning', desc: 'Viêm nang lông do tắc nghẽn bã nhờn. Cần theo dõi.' },
                { name: 'Viêm da tiết bã', pct: 82.1, color: 'var(--warning)', cls: 'badge-warning', desc: 'Tình trạng da bong tróc vảy đỏ. Thường gặp ở vùng nhiều tuyến bã.' },
              ].map(d => (
                <div key={d.name} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.name}</span>
                    <span className={`badge ${d.cls}`}>{d.pct}%</span>
                  </div>
                  <div className="prog-track" style={{ marginBottom: '0.375rem' }}>
                    <div className="prog-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{d.desc}</p>
                </div>
              ))}
            </div>

            <div className="card card-no-hover">
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '1rem' }}>Phân Tích Chi Tiết (ABCDE)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { k: 'A', n: 'Bất đối xứng', v: 'Không đồng đều', bg: 'rgba(217,119,6,0.07)' },
                  { k: 'B', n: 'Đường viền', v: 'Bờ không rõ ràng', bg: 'rgba(217,119,6,0.07)' },
                  { k: 'C', n: 'Màu sắc', v: 'Đỏ viêm', bg: 'rgba(220,38,38,0.06)' },
                  { k: 'D', n: 'Đường kính', v: '~3–5mm', bg: 'rgba(5,150,105,0.06)' },
                ].map(i => (
                  <div key={i.k} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.875rem', borderRadius: 10, background: i.bg }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{i.k}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.825rem' }}>{i.n}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{i.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-no-hover">
              <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Đề Xuất Tiếp Theo</h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.25rem', fontSize: '0.875rem' }}>AI phát hiện tổn thương có dấu hiệu viêm trung bình. Khuyến nghị đặt lịch với bác sĩ chuyên khoa da liễu trong vòng 7 ngày để được điều trị phù hợp.</p>
              <a href="/app/appointments" className="btn btn-primary btn-full">Đặt lịch khám ngay <ArrowRight size={17} /></a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
