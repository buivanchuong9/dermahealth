import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

interface IconActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  danger?: boolean;
  disabled?: boolean;
  size?: number;
  style?: CSSProperties;
}

export function IconActionButton({ icon, label, onClick, danger, disabled, size = 28, style }: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none', WebkitAppearance: 'none', outline: 'none', boxShadow: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: 6, flexShrink: 0,
        color: danger ? 'var(--color-danger, #d4380d)' : 'var(--medical-blue-600)',
        background: 'var(--surface-subtle)', border: '1px solid var(--border-default)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        padding: 0,
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
