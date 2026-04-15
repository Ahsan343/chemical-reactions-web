import styles from './DigitalScales.module.scss';

interface DigitalScalesProps {
  mass: number | null;
  isDropTarget: boolean;
  showMass: boolean;
}

export default function DigitalScales({ mass, isDropTarget, showMass }: DigitalScalesProps) {
  const displayText = showMass && mass !== null ? `${mass.toFixed(2)} g` : null;

  return (
    <div className={styles.scales} aria-label="Digital scales">
      {/* iOS: ZStack(alignment: .bottom) → platform at top, then base */}
      <div className={`${styles.container} ${isDropTarget ? styles.containerEmphasised : ''}`}>
        <div className={styles.platform} />
        <div className={styles.containerBase} />
      </div>
      {/* iOS: RoundedRectangle(darkColor) with white text frame inside */}
      <div className={styles.display}>
        <div className={styles.displayTextFrame}>
          {displayText ?? ''}
        </div>
      </div>
    </div>
  );
}
