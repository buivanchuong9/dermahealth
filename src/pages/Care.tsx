import { useState } from 'react';
import React from 'react';
import { Phone, CheckCircle, Clock, AlertTriangle, Bell, MessageCircle, Calendar, Plus, X } from 'lucide-react';
import { mockCareItems } from '../data/mockData';

const PRIO: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: 'Quan trọng', cls: 'badge-danger',   dot: '#FF4D4F' },
  medium: { label: 'Trung bình', cls: 'badge-warning',  dot: '#FAAD14' },
  low:    { label: 'Bình thường', cls: 'badge-gray',    dot: '#9ca3af' },
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  pending:  <Clock size={15} color="#FAAD14" />,
  ongoing:  <AlertTriangle size={15} color="#1677FF" />,
  done:     <CheckCircle size={15} color="#52C41A" />,
};

const CAMPAIGNS = [
  { id: 1, title: 'Nhắc tái khám tháng 11', type: 'Lịch hẹn', reach: 1, status: 'active', sent: '08:00 hôm nay' },
  { id: 2, title: 'Nhắc uống thuốc buổi tối', type: 'Thuốc', reach: 1, status: 'active', sent: '21:30 hàng ngày' },
  { id: 3, title: 'Cảnh báo AI nguy cơ tái phát', type: 'AI Alert', reach: 1, status: 'sent', sent: '10/10/2023' },
];

export default function Care() {
  const [items, setItems] = useState(mockCareItems);
  const [modal, setModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const addItem = () => {
    if (!newTitle.trim()) return;
    setItems(p => [...p, { id: Date.now(), category: 'Chăm sóc', title: newTitle, desc: '', date: 'Hôm nay', priority: 'medium', status: 'pending' }]);
    setNewTitle(''); setModal(false);
  };

  const pending = items.filter(i => i.status === 'pending' || i.status === 'ongoing');
  const done = items.filter(i => i.status === 'done');

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Chăm sóc bệnh nhân</div>
          <h1>Chăm Sóc Sau Khám</h1>
          <p>Quản lý nhắc nhở, chăm sóc liên tục và các cảnh báo từ AI.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-outline btn-sm"><Bell size={15} /> Tất cả nhắc nhở</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Thêm mục chăm sóc
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Cần thực hiện', val: pending.length, color: '#1677FF', icon: <Clock size={18} color="#1677FF" /> },
          { label: 'Đã hoàn thành', val: done.length, color: '#52C41A', icon: <CheckCircle size={18} color="#52C41A" /> },
          { label: 'Cảnh báo AI', val: 1, color: '#FF4D4F', icon: <AlertTriangle size={18} color="#FF4D4F" /> },
          { label: 'Chiến dịch hoạt động', val: 2, color: '#FAAD14', icon: <Bell size={18} color="#FAAD14" /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.val}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
        {/* Care items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Pending items */}
          <div className="card card-no-hover">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.125rem' }}>
              ⏳ Cần thực hiện ({pending.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map(item => {
                const p = PRIO[item.priority];
                return (
                  <div key={item.id} style={{ display: 'flex', gap: '0.875rem', padding: '1rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ marginTop: 2 }}>{STATUS_ICON[item.status]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</div>
                        <span className={`badge ${p.cls}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>{p.label}</span>
                      </div>
                      {item.desc && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.625rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>{item.category}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed items */}
          <div className="card card-no-hover">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.125rem' }}>
              ✅ Đã hoàn thành ({done.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {done.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', opacity: 0.75 }}>
                  <CheckCircle size={15} color="var(--success)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', textDecoration: 'line-through', color: 'var(--muted)' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{item.date}</div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.68rem', flexShrink: 0 }}>Hoàn thành</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Contact doctor */}
          <div className="card card-no-hover">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>📞 Liên hệ bác sĩ</h4>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: '0.875rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1677FF, #4096ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Bs. Nguyễn Thị An</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>Chuyên khoa Da liễu</div>
                <span className="badge badge-success" style={{ fontSize: '0.65rem', marginTop: 4 }}>● Đang trực tuyến</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-full btn-sm">
                <MessageCircle size={15} /> Nhắn tin bác sĩ
              </button>
              <button className="btn btn-outline btn-full btn-sm">
                <Phone size={15} /> Gọi điện tư vấn
              </button>
              <button className="btn btn-outline btn-full btn-sm">
                <Calendar size={15} /> Đặt lịch tái khám
              </button>
            </div>
          </div>

          {/* Care campaigns */}
          <div className="card card-no-hover">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>📢 Nhắc nhở tự động</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {CAMPAIGNS.map(c => (
                <div key={c.id} style={{ padding: '0.875rem', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700 }}>{c.title}</span>
                    <span className={c.status === 'active' ? 'badge badge-success' : 'badge badge-gray'} style={{ fontSize: '0.65rem' }}>
                      {c.status === 'active' ? 'Hoạt động' : 'Đã gửi'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.sent}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI alert */}
          <div style={{ background: 'linear-gradient(135deg, #FF4D4F 0%, #ff7875 100%)', borderRadius: 16, padding: '1.25rem', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cảnh báo AI</span>
            </div>
            <p style={{ fontSize: '0.825rem', lineHeight: 1.65, opacity: 0.9 }}>
              AI phát hiện tín hiệu sớm nguy cơ tái phát vùng trán. Khuyến nghị: Tăng tần suất rửa mặt và theo dõi chặt hơn trong 2 tuần tới.
            </p>
            <button style={{ marginTop: '0.875rem', fontSize: '0.8rem', fontWeight: 600, color: 'white', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '0.45rem 0.875rem', cursor: 'pointer', width: '100%' }}>
              Xem phân tích chi tiết →
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm Mục Chăm Sóc</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Tên mục *</label>
              <input className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="VD: Uống đủ nước mỗi ngày..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={addItem}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
