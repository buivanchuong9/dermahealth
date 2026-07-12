import { useState } from 'react';
import { Pill, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Bell, FileText, Plus, Calendar } from 'lucide-react';
import { mockPrescriptions, mockMedicineReminders } from '../data/mockData';

const TODAY_MEDS = mockMedicineReminders;

export default function Prescriptions() {
  const [expandedRx, setExpandedRx] = useState<string | null>('RX-001');
  const [reminders, setReminders] = useState(TODAY_MEDS);

  const toggleTaken = (id: number) => {
    setReminders(r => r.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const takenCount = reminders.filter(r => r.taken).length;

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <div className="page-eyebrow">Quản lý thuốc</div>
          <h1>Đơn Thuốc</h1>
          <p>Theo dõi thuốc hàng ngày và lịch sử đơn thuốc của bạn.</p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-outline btn-sm">
            <FileText size={15} /> Lịch sử đơn thuốc
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Yêu cầu tái kê đơn
          </button>
        </div>
      </div>

      {/* Today medicine tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Daily checklist */}
        <div className="card card-no-hover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>💊 Thuốc hôm nay</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                {takenCount}/{reminders.length} đã uống
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                {Math.round((takenCount / reminders.length) * 100)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>hoàn thành</div>
            </div>
          </div>

          {/* Progress */}
          <div className="prog-track" style={{ marginBottom: '1.25rem' }}>
            <div
              className="prog-fill prog-fill-primary"
              style={{ width: `${(takenCount / reminders.length) * 100}%` }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reminders.map(med => (
              <div
                key={med.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem 1rem', borderRadius: 12,
                  background: med.taken ? 'var(--success-bg)' : 'var(--bg)',
                  border: `1.5px solid ${med.taken ? 'rgba(82,196,26,0.25)' : 'var(--border)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: med.taken ? 'var(--success)' : med.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: med.taken ? 0.9 : 1,
                }}>
                  <Pill size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{med.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Clock size={12} /> {med.time} · {med.type}
                  </div>
                </div>
                <button
                  onClick={() => toggleTaken(med.id)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                    background: med.taken ? 'var(--success)' : 'white',
                    border: `2px solid ${med.taken ? 'var(--success)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {med.taken
                    ? <CheckCircle size={16} color="white" />
                    : <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--border)' }} />
                  }
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-outline btn-full" style={{ marginTop: '1rem' }}>
            <Bell size={15} /> Đặt nhắc nhở tùy chỉnh
          </button>
        </div>

        {/* Upcoming reminders / schedule */}
        <div className="card card-no-hover">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.125rem' }}>📅 Lịch dùng thuốc tuần này</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { day: 'Thứ 2', date: '09/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
              { day: 'Thứ 3', date: '10/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
              { day: 'Thứ 4', date: '11/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
              { day: 'Thứ 5', date: '12/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'done' },
              { day: 'Thứ 6', date: '13/10', meds: ['Tretinoin', 'Omega-3', 'Kem chống nắng'], status: 'today' },
              { day: 'Thứ 7', date: '14/10', meds: ['Tretinoin', 'Omega-3'], status: 'upcoming' },
              { day: 'CN', date: '15/10', meds: ['Tretinoin', 'Omega-3'], status: 'upcoming' },
            ].map(d => (
              <div key={d.day} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                borderRadius: 10, background: d.status === 'today' ? 'var(--primary-bg)' : 'var(--bg)',
                border: `1px solid ${d.status === 'today' ? 'rgba(22,119,255,0.2)' : 'var(--border)'}`,
              }}>
                <div style={{ textAlign: 'center', minWidth: 38 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600 }}>{d.day}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: d.status === 'today' ? 'var(--primary)' : 'var(--text)' }}>{d.date.split('/')[0]}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.775rem', color: 'var(--muted)' }}>{d.meds.join(' · ')}</div>
                </div>
                {d.status === 'done' && <CheckCircle size={16} color="var(--success)" />}
                {d.status === 'today' && <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>Hôm nay</span>}
                {d.status === 'upcoming' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prescription history */}
      <div className="card card-no-hover">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📋 Lịch sử đơn thuốc</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{mockPrescriptions.length} đơn thuốc</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {mockPrescriptions.map(rx => (
            <div key={rx.id} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedRx(expandedRx === rx.id ? null : rx.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                  width: '100%', background: expandedRx === rx.id ? 'var(--primary-bg)' : 'var(--bg)',
                  border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.18s',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: rx.status === 'active' ? 'var(--primary)' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={18} color={rx.status === 'active' ? 'white' : 'var(--muted)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Đơn thuốc {rx.id}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: 2 }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {rx.date} · {rx.doctor}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={rx.status === 'active' ? 'badge badge-primary' : 'badge badge-gray'}>
                    {rx.status === 'active' ? 'Đang dùng' : 'Hoàn thành'}
                  </span>
                  {expandedRx === rx.id ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                </div>
              </button>

              {expandedRx === rx.id && (
                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                  {rx.note && (
                    <div style={{ display: 'flex', gap: '0.625rem', padding: '0.875rem', background: 'rgba(250,173,20,0.06)', border: '1px solid rgba(250,173,20,0.2)', borderRadius: 10, margin: '1rem 0 0.875rem' }}>
                      <AlertCircle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: '0.825rem', color: '#92400e' }}>{rx.note}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {rx.medicines.map(med => (
                      <div key={med.name} style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.875rem', background: 'var(--bg)', borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Pill size={16} color="var(--primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{med.name}</div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: 2 }}>{med.dose}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text)' }}>{med.duration}</div>
                          <div style={{ fontSize: '0.7rem', color: rx.status === 'active' ? 'var(--primary)' : 'var(--muted)', marginTop: 1 }}>
                            {rx.status === 'active' ? `Còn ${med.remaining}` : 'Hoàn thành'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
