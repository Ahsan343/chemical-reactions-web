import styles from './DigitalScales.module.scss';

interface DigitalScalesProps {
  mass: number | null;
  isDropTarget: boolean;
  showMass: boolean;
}

export default function DigitalScales({ mass, isDropTarget, showMass }: DigitalScalesProps) {
  const displayNumber = showMass && mass !== null ? mass.toFixed(2) : '0.00';

  return (
    <div className={styles.scales} aria-label="Digital scales">
      <div className={`${styles.container} ${isDropTarget ? styles.containerEmphasised : ''}`}>
        <div className={styles.platform} />
        <div className={styles.containerBase} />
      </div>
      <div className={styles.display}>
        <div className={styles.displayTextFrame}>
          {displayNumber}
        </div>
      </div>
    </div>
  );
}
