import { Button, Typography } from 'antd';
import { Home, RotateCcw } from 'lucide-react';
const errorImage = `${import.meta.env.BASE_URL}error.png`;

const { Title, Text } = Typography;

function safeMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Hệ thống chưa thể hoàn tất yêu cầu này. Vui lòng thử lại sau ít phút.';
}

export function FriendlyErrorContent({
  error,
  title = 'Rất tiếc, đã có sự cố',
  compact = false,
}: {
  error?: unknown;
  title?: string;
  compact?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '4px 0 0' : 20, maxWidth: compact ? 380 : 620, margin: '0 auto' }}>
      <img
        src={errorImage}
        alt="Minh họa hệ thống đang gặp sự cố"
        style={{ width: compact ? 150 : 330, maxWidth: '75%', height: 'auto', display: 'block', margin: '0 auto 12px' }}
      />
      <Title level={compact ? 4 : 2} style={{ margin: '0 0 6px' }}>{title}</Title>
      <Text type="secondary">{safeMessage(error)}</Text>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>Thông tin sự cố đã được hệ thống ghi nhận an toàn.</Text>
    </div>
  );
}

export function FriendlyErrorPage({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--surface-page)' }}>
      <div style={{ textAlign: 'center' }}>
        <FriendlyErrorContent error={error} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onRetry && <Button type="primary" icon={<RotateCcw size={15}/>} onClick={onRetry}>Thử lại</Button>}
          <Button icon={<Home size={15}/>} onClick={() => { window.location.href = '/app/dashboard'; }}>Về trang tổng quan</Button>
        </div>
      </div>
    </div>
  );
}

export function FriendlyErrorInline({ error, title = 'Chưa thể hoàn tất thao tác', onClose }: { error?: unknown; title?: string; onClose?: () => void }) {
  return (
    <div role="alert" style={{ position: 'relative', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 12, boxShadow: 'var(--shadow-card)' }}>
      {onClose && <Button type="text" size="small" onClick={onClose} style={{ position: 'absolute', right: 8, top: 8 }}>Đóng</Button>}
      <FriendlyErrorContent error={error} title={title} compact />
    </div>
  );
}
