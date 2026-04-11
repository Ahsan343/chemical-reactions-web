import type { ReactNode } from 'react';
import styles from './HighlightOverlay.module.scss';

interface HighlightOverlayProps {
  highlighted: boolean;
  children: ReactNode;
}

export default function HighlightOverlay({
  highlighted,
  children,
}: HighlightOverlayProps) {
  return (
    <div
      className={`${styles.overlay} ${highlighted ? '' : styles.dimmed}`}
    >
      {children}
    </div>
  );
}
