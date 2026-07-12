import { useState } from 'react';
import { Plus, Pill, Activity, Calendar, FileText, Trash2, X } from 'lucide-react';

interface Task { id: number; col: string; title: string; type: string; date: string; desc: string; priority: 'high' | 'medium' | 'low'; }

const INIT: Task[] = [
  { id: 1, col: 'todo', title: 'Bôi kem Tretinoin 0.05%', type: 'Thuốc', date: 'Hôm nay', desc: 'Thoa lớp mỏng vùng mụn viêm trước khi ngủ. Tránh vùng mắt và môi.', priority: 'high' },
  { id: 2, col: 'todo', title: 'Chụp ảnh AI báo cáo tuần 3', type: 'AI', date: 'Ngày mai', desc: 'Upload hình ảnh vùng má phải và trán để AI theo dõi tiến độ phục hồi.', priority: 'medium' },
  { id: 3, col: 'in_progress', title: 'Theo dõi phản ứng thuốc', type: 'Theo dõi', date: 'Tuần này', desc: 'Quan sát xem vùng da có phản ứng đỏ, ngứa quá mức sau khi dùng thuốc.', priority: 'medium' },
  { id: 4, col: 'in_progress', title: 'Uống Omega-3 hàng ngày', type: 'Thuốc', date: '14 ngày', desc: 'Uống 1 viên sau bữa sáng. Hỗ trợ giảm viêm từ bên trong.', priority: 'low' },
  { id: 5, col: 'done', title: 'Khám với Bs. Nguyễn Thị An', type: 'Lịch hẹn', date: '01/10/2023', desc: 'Khám định kỳ tháng 10. Đã điều chỉnh liều Tretinoin.', priority: 'high' },
  { id: 6, col: 'done', title: 'Uống kháng sinh Doxycycline', type: 'Thuốc', date: '25/09–02/10', desc: '7 ngày theo đơn. Đã hoàn thành đủ liệu trình.', priority: 'high' },
  { id: 7, col: 'done', title: 'Xét nghiệm máu tổng quát', type: 'Xét nghiệm', date: '28/09/2023', desc: 'Kết quả bình thường. Không có dấu hiệu nhiễm khuẩn.', priority: 'medium' },
];

const COLS = [
  { id: 'todo', label: 'Cần thực hiện', color: '#3b82f6', emoji: '📋' },
  { id: 'in_progress', label: 'Đang thực hiện', color: '#f59e0b', emoji: '⚡' },
  { id: 'done', label: 'Đã hoàn thành', color: '#10b981', emoji: '✅' },
];

const TYPE_ICON: Record<string, typeof Pill> = { Thuốc: Pill, AI: Activity, 'Lịch hẹn': Calendar };
const PRIO: Record<string, { label: string; cls: string }> = {
  high: { label: 'Quan trọng', cls: 'badge-danger' },
  medium: { label: 'Trung bình', cls: 'badge-warning' },
  low: { label: 'Bình thường', cls: 'badge-gray' },
};

export default function Records() {
  const [tasks, setTasks] = useState<Task[]>(INIT);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);

  const add = () => {
    if (!title.trim()) return;
    setTasks(p => [...p, { id: Date.now(), col: 'todo', title, type: 'Theo dõi', date: 'Hôm nay', desc, priority: 'medium' }]);
    setTitle(''); setDesc(''); setModal(false);
  };

  const del = (id: number) => setTasks(p => p.filter(t => t.id !== id));
  const move = (id: number, col: string) => setTasks(p => p.map(t => t.id === id ? { ...t, col } : t));

  const done = tasks.filter(t => t.col === 'done').length;
  const pct = Math.round((done / tasks.length) * 100);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Kanban Board</div>
          <h1>Hành Trình Điều Trị</h1>
          <p>Quản lý và theo dõi từng bước trong lộ trình chăm sóc da của bạn.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={17} /> Thêm bước mới</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: '📋 Cần thực hiện', val: tasks.filter(t => t.col === 'todo').length, color: '#3b82f6' },
          { label: '⚡ Đang thực hiện', val: tasks.filter(t => t.col === 'in_progress').length, color: '#f59e0b' },
          { label: '✅ Đã hoàn thành', val: done, color: '#10b981' },
          { label: '📊 Hoàn thành', val: `${pct}%`, color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: '0.4rem' }}>{s.val}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
        {COLS.map(col => (
          <div key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); dragId !== null && move(dragId, col.id); setDragId(null); }}
            style={{ background: 'var(--bg)', borderRadius: 16, padding: '1.25rem', border: '1px solid var(--border)', minHeight: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.875rem', borderTop: `3px solid ${col.color}`, paddingTop: '0.875rem', borderRadius: '2px 2px 0 0' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{col.emoji} {col.label}</span>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'white', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                {tasks.filter(t => t.col === col.id).length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.filter(t => t.col === col.id).map(task => {
                const Icon = TYPE_ICON[task.type] || FileText;
                const prio = PRIO[task.priority];
                return (
                  <div key={task.id} draggable
                    onDragStart={() => setDragId(task.id)}
                    className="card"
                    style={{ padding: '1rem', cursor: 'grab', userSelect: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: 6, color: 'var(--muted)' }}>
                        <Icon size={13} /> {task.type}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {COLS.filter(c => c.id !== col.id).map(c => (
                          <button key={c.id} onClick={() => move(task.id, c.id)} title={`Chuyển sang ${c.label}`}
                            style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.emoji}
                          </button>
                        ))}
                        <button onClick={() => del(task.id)}
                          style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem', lineHeight: 1.4 }}>{task.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.desc}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${prio.cls}`} style={{ fontSize: '0.7rem' }}>{prio.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{task.date}</span>
                    </div>
                  </div>
                );
              })}
              {tasks.filter(t => t.col === col.id).length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, border: '2px dashed var(--border)', borderRadius: 12, color: 'var(--muted)', fontSize: '0.825rem' }}>
                  Thả thẻ vào đây
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm Bước Điều Trị Mới</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Tên bước *</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Uống thuốc kháng viêm..." />
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Chi tiết thêm..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={add}>Thêm bước</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
