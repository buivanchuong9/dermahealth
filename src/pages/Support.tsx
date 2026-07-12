import { MessageCircle, Phone, Mail, ChevronRight, Send } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
  { q: 'Làm sao để đặt lịch hẹn khám?', a: 'Vào mục "Lịch hẹn" → nhấn "Đặt lịch mới" → chọn bác sĩ, ngày giờ phù hợp.' },
  { q: 'Ảnh phân tích AI được lưu ở đâu?', a: 'Ảnh được lưu bảo mật trên hệ thống DermaHealth. Vào "Theo dõi tiến triển" để xem lại.' },
  { q: 'Cách thay đổi lịch nhắc uống thuốc?', a: 'Vào "Đơn thuốc" → nhấn "Đặt nhắc nhở tùy chỉnh" → chỉnh giờ phù hợp.' },
  { q: 'Dữ liệu của tôi có được bảo mật không?', a: 'Tuyệt đối. Dữ liệu mã hóa 256-bit và chỉ bác sĩ phụ trách mới được truy cập.' },
  { q: 'AI phân tích da có chính xác không?', a: 'AI DermaHealth được huấn luyện trên 1.5 triệu ca lâm sàng, độ chính xác 94%. Tuy nhiên đây chỉ là hỗ trợ, không thay thế chẩn đoán của bác sĩ.' },
];

export default function Support() {
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Trợ giúp</div>
          <h1>Hỗ Trợ & Liên Hệ</h1>
          <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { icon: <MessageCircle size={22} color="#1677FF" />, label: 'Chat trực tiếp', desc: 'Phản hồi trong 5 phút', color: '#1677FF', action: 'Bắt đầu chat' },
          { icon: <Phone size={22} color="#52C41A" />, label: 'Gọi hotline', desc: '1800-1234 (miễn phí)', color: '#52C41A', action: 'Gọi ngay' },
          { icon: <Mail size={22} color="#FAAD14" />, label: 'Gửi email', desc: 'support@dermahealth.vn', color: '#FAAD14', action: 'Gửi email' },
        ].map(c => (
          <div key={c.label} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>{c.desc}</div>
            <button className="btn btn-primary btn-sm btn-full">{c.action}</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
        <div className="card card-no-hover">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>❓ Câu hỏi thường gặp</h3>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: open === i ? 'var(--primary)' : 'var(--text)' }}>{faq.q}</span>
                <ChevronRight size={16} color="var(--muted)" style={{ transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {open === i && (
                <div style={{ padding: '0 0 1rem', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="card card-no-hover">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.125rem' }}>✉️ Gửi yêu cầu hỗ trợ</h3>
          <div className="form-group">
            <label className="form-label">Chủ đề</label>
            <select className="form-input">
              <option>Vấn đề kỹ thuật</option>
              <option>Câu hỏi về điều trị</option>
              <option>Thanh toán & Gói dịch vụ</option>
              <option>Khác</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung</label>
            <textarea className="form-input" rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Mô tả vấn đề bạn đang gặp phải..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setMsg('')}>
            <Send size={15} /> Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}
