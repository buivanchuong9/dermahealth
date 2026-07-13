import { Button, Typography } from 'antd';
import { Hand } from 'lucide-react';

const { Text } = Typography;

export interface PendingDrop {
  title?: string;
  question: string;
  confirmLabel: string;
  run: () => void;
}

export function DragConfirmDialog({ pending, onCancel }: { pending: PendingDrop; onCancel: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)', borderRadius: 12, padding: '20px 22px', width: 360,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)', border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Hand size={18} color="var(--medical-blue-600)" />
          <Text strong style={{ fontSize: 15 }}>{pending.title ?? 'Xác nhận kéo thả'}</Text>
        </div>
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 18 }}>{pending.question}</Text>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" onClick={pending.run}>{pending.confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
