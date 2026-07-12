import type { CSSProperties } from 'react';
import styles from './AppLogo.module.scss';

type AppLogoProps = {
  className?: string;
  size?: number;
  variant?: 'mark' | 'full';
};

export default function AppLogo({ className = '', size = 44, variant = 'mark' }: AppLogoProps) {
  const style = { '--app-logo-size': `${size}px` } as CSSProperties;

  return (
    <span className={`${styles.logo} ${styles[variant]} ${className}`.trim()} style={style}>
      <img src={variant === 'mark' ? '/logo-mark.png' : '/logo.jpeg'} alt="DermaHealth" />
    </span>
  );
}
