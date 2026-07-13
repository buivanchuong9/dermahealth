import { Hand } from 'lucide-react';
import type { CSSProperties } from 'react';

interface DragHandleProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners?: any;
  label: string;
  size?: number;
  style?: CSSProperties;
}

export function DragHandle({ attributes, listeners, label, size = 16, style }: DragHandleProps) {
  return (
    <span
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={label}
      style={{
        cursor: 'grab', touchAction: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 6, flexShrink: 0, boxShadow: 'none', outline: 'none',
        color: 'var(--medical-blue-600)', background: 'var(--surface-subtle)', border: '1px solid var(--border-default)',
        ...style,
      }}
    >
      <Hand size={size} />
    </span>
  );
}
