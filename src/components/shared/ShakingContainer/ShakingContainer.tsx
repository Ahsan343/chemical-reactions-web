import { useState, useCallback } from 'react';
import styles from './ShakingContainer.module.scss';

interface ShakingContainerProps {
  color: string;
  label: string;
  onPour: () => void;
  disabled?: boolean;
  isActive?: boolean;
  tooltipText?: string;
}

export default function ShakingContainer({
  color,
  label,
  onPour,
  disabled = false,
  isActive = false,
  tooltipText,
}: ShakingContainerProps) {
  const [shaking, setShaking] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;

    setShaking(true);
    onPour();

    const timer = setTimeout(() => setShaking(false), 300);
    return () => clearTimeout(timer);
  }, [disabled, onPour]);

  const containerClasses = [
    styles.container,
    isActive ? styles.active : '',
    disabled ? styles.disabled : '',
    shaking ? styles.shaking : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {tooltipText && (
        <div className={styles.tooltip} role="tooltip">
          {tooltipText}
        </div>
      )}

      <button
        type="button"
        className={styles.bottle}
        onClick={handleClick}
        disabled={disabled}
        aria-label={`Pour ${label}`}
      >
        <div className={styles.neck} />
        <div className={styles.body}>
          <div
            className={styles.fill}
            style={{ backgroundColor: color }}
          />
          <span className={styles.label}>{label}</span>
        </div>
      </button>
    </div>
  );
}
