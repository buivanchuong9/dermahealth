import type { ReactNode } from 'react';

export interface TabPanelItem {
  key: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

interface TabPanelProps {
  items: TabPanelItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

// Tab đang chọn dùng chung màu nền (trắng) với panel nội dung bên dưới để tạo
// cảm giác "liền khối"; tab không chọn có nền nhạt hơn để phân biệt.
export function TabPanel({ items, activeKey, onChange }: TabPanelProps) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-default)' }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                border: 'none',
                borderBottom: active ? '1px solid var(--surface-card)' : 'none',
                marginBottom: active ? -1 : 0,
                borderRadius: '10px 10px 0 0',
                background: active ? 'var(--surface-card)' : 'var(--medical-blue-50)',
                color: active ? 'var(--medical-blue-700)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: 20,
        }}
      >
        {items.find((item) => item.key === activeKey)?.children}
      </div>
    </div>
  );
}
