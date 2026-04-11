import styles from './ProgressChart.module.scss';

interface ProgressChartProps {
  progress: number;
  reactantColor: string;
  excessColor: string;
  productColor: string;
  /** Label for limiting-reactant column (compound formula) */
  limitingLabel: string;
  /** Label for excess-reactant column (compound formula) */
  excessLabel: string;
  /** Label for product column (compound formula) */
  productLabel: string;
  /** Actual limiting-reactant molecule count in the beaker */
  limitingCount: number;
  /** Actual excess-reactant molecule count in the beaker */
  excessCount: number;
  /** Stoichiometric coefficient for limiting reactant (default 1) */
  limitingCoefficient?: number;
  /** Stoichiometric coefficient for excess reactant (default 1) */
  excessCoefficient?: number;
  /** Maximum molecules for scaling (grid capacity) */
  maxCount: number;
}

const MAX_DOTS = 10;
const MOLECULE_SIZE = 12;

export default function ProgressChart({
  progress,
  reactantColor,
  excessColor,
  productColor,
  limitingLabel,
  excessLabel,
  productLabel,
  limitingCount,
  excessCount,
  limitingCoefficient = 1,
  excessCoefficient = 1,
  maxCount,
}: ProgressChartProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  // Scale counts to dots (0 to MAX_DOTS)
  const scale = maxCount > 0 ? MAX_DOTS / maxCount : 0;

  // Before reaction: show current molecule counts as-is
  // During reaction: limiting decreases, excess decreases by stoichiometric ratio, product increases proportionally
  // All dot counts are clamped to MAX_DOTS to prevent overflow outside the chart area
  const limitingDots = limitingCount > 0
    ? Math.min(MAX_DOTS, Math.max(0, Math.round(limitingCount * scale * (1 - clampedProgress))))
    : 0;

  // Excess consumed based on stoichiometric ratio
  let excessDots = 0;
  if (excessCount > 0) {
    if (clampedProgress > 0 && limitingCount > 0) {
      const excessNeeded = limitingCount * (excessCoefficient / limitingCoefficient);
      const excessConsumed = excessNeeded * clampedProgress;
      excessDots = Math.min(MAX_DOTS, Math.max(0, Math.round((excessCount - excessConsumed) * scale)));
    } else {
      excessDots = Math.min(MAX_DOTS, Math.round(excessCount * scale));
    }
  }

  const productDots = limitingCount > 0
    ? Math.min(MAX_DOTS, Math.round(limitingCount * scale * clampedProgress))
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.plotArea}>
        <div className={styles.column}>
          {Array.from({ length: limitingDots }).map((_, i) => (
            <div
              key={`l-${i}`}
              className={styles.molecule}
              style={{
                width: MOLECULE_SIZE,
                height: MOLECULE_SIZE,
                backgroundColor: reactantColor,
              }}
            />
          ))}
        </div>
        <div className={styles.column}>
          {Array.from({ length: excessDots }).map((_, i) => (
            <div
              key={`e-${i}`}
              className={styles.molecule}
              style={{
                width: MOLECULE_SIZE,
                height: MOLECULE_SIZE,
                backgroundColor: excessColor,
              }}
            />
          ))}
        </div>
        <div className={styles.column}>
          {Array.from({ length: productDots }).map((_, i) => (
            <div
              key={`p-${i}`}
              className={styles.molecule}
              style={{
                width: MOLECULE_SIZE,
                height: MOLECULE_SIZE,
                backgroundColor: productColor,
              }}
            />
          ))}
        </div>
      </div>
      <div className={styles.axis}>
        <div className={styles.axisItem}>
          <div
            className={styles.axisCircle}
            style={{ backgroundColor: reactantColor }}
          />
          <span className={styles.axisLabel}>{limitingLabel}</span>
        </div>
        <div className={styles.axisItem}>
          <div
            className={styles.axisCircle}
            style={{ backgroundColor: excessColor }}
          />
          <span className={styles.axisLabel}>{excessLabel}</span>
        </div>
        <div className={styles.axisItem}>
          <div
            className={styles.axisCircle}
            style={{ backgroundColor: productColor }}
          />
          <span className={styles.axisLabel}>{productLabel}</span>
        </div>
      </div>
    </div>
  );
}
