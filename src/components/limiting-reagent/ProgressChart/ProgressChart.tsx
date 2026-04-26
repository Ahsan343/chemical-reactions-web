import { useRef, useEffect, useState } from 'react';
import styles from './ProgressChart.module.scss';

interface ProgressChartProps {
  progress: number;
  reactantColor: string;
  excessColor: string;
  productColor: string;
  limitingLabel: string;
  excessLabel: string;
  productLabel: string;
  limitingCount: number;
  excessCount: number;
  limitingCoefficient?: number;
  excessCoefficient?: number;
  maxCount: number;
  /** Hide the colored legend dots + labels below the plot area (used before
   *  any reaction is selected so empty grey dots don't appear). */
  showLegend?: boolean;
}

const MAX_DOTS = 10;
const MOLECULE_SIZE = 12;
const DOT_GAP = 3;

// iOS: fadeDuration = 0.5s, dropSpeed = 10 rows/sec
const FADE_DURATION_S = 0.5;
const DROP_SPEED = 10; // rows per second

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
  showLegend = true,
}: ProgressChartProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const scale = maxCount > 0 ? MAX_DOTS / maxCount : 0;

  const limitingDots = limitingCount > 0
    ? Math.min(MAX_DOTS, Math.max(0, Math.round(limitingCount * scale * (1 - clampedProgress))))
    : 0;

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

  // Track which dots are newly added so we can animate them dropping from the top
  const prevCounts = useRef({ limiting: 0, excess: 0, product: 0 });
  const [droppingDots, setDroppingDots] = useState<Record<string, { dropFrom: number; duration: number }>>({});

  useEffect(() => {
    const prev = prevCounts.current;
    const newDropping: Record<string, { dropFrom: number; duration: number }> = {};

    // For each column, if count increased, animate new dots dropping from top
    if (limitingDots > prev.limiting) {
      for (let i = prev.limiting; i < limitingDots; i++) {
        const dropDistance = MAX_DOTS - i; // rows to fall
        newDropping[`l-${i}`] = {
          dropFrom: MAX_DOTS,
          duration: dropDistance / DROP_SPEED,
        };
      }
    }
    if (excessDots > prev.excess) {
      for (let i = prev.excess; i < excessDots; i++) {
        const dropDistance = MAX_DOTS - i;
        newDropping[`e-${i}`] = {
          dropFrom: MAX_DOTS,
          duration: dropDistance / DROP_SPEED,
        };
      }
    }
    if (productDots > prev.product) {
      for (let i = prev.product; i < productDots; i++) {
        const dropDistance = MAX_DOTS - i;
        newDropping[`p-${i}`] = {
          dropFrom: MAX_DOTS,
          duration: dropDistance / DROP_SPEED,
        };
      }
    }

    if (Object.keys(newDropping).length > 0) {
      setDroppingDots((d) => ({ ...d, ...newDropping }));

      // Clear after animations complete
      const maxDuration = Math.max(...Object.values(newDropping).map((d) => d.duration));
      const timer = setTimeout(() => {
        setDroppingDots({});
      }, (maxDuration + FADE_DURATION_S) * 1000 + 100);

      prevCounts.current = { limiting: limitingDots, excess: excessDots, product: productDots };
      return () => clearTimeout(timer);
    }

    prevCounts.current = { limiting: limitingDots, excess: excessDots, product: productDots };
  }, [limitingDots, excessDots, productDots]);

  // Calculate the pixel position for a row (0 = bottom)
  const rowHeight = MOLECULE_SIZE + DOT_GAP;
  const chartHeight = MAX_DOTS * rowHeight;

  const renderDot = (key: string, color: string, rowIndex: number) => {
    const dropping = droppingDots[key];
    // Bottom position for this row (0 = very bottom)
    const bottomY = rowIndex * rowHeight;

    if (dropping) {
      // Animate: start at top of chart, drop to target position
      const startBottomY = (dropping.dropFrom) * rowHeight;
      return (
        <div
          key={key}
          className={styles.moleculeDrop}
          style={{
            width: MOLECULE_SIZE,
            height: MOLECULE_SIZE,
            backgroundColor: color,
            bottom: bottomY,
            '--drop-start': `${-(startBottomY - bottomY)}px`,
            '--drop-duration': `${dropping.duration}s`,
            '--fade-duration': `${FADE_DURATION_S}s`,
          } as React.CSSProperties}
        />
      );
    }

    return (
      <div
        key={key}
        className={styles.molecule}
        style={{
          width: MOLECULE_SIZE,
          height: MOLECULE_SIZE,
          backgroundColor: color,
          bottom: bottomY,
        }}
      />
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.plotArea} style={{ minHeight: chartHeight }}>
        <div className={styles.column} style={{ height: chartHeight }}>
          {Array.from({ length: limitingDots }).map((_, i) =>
            renderDot(`l-${i}`, reactantColor, i)
          )}
        </div>
        <div className={styles.column} style={{ height: chartHeight }}>
          {Array.from({ length: excessDots }).map((_, i) =>
            renderDot(`e-${i}`, excessColor, i)
          )}
        </div>
        <div className={styles.column} style={{ height: chartHeight }}>
          {Array.from({ length: productDots }).map((_, i) =>
            renderDot(`p-${i}`, productColor, i)
          )}
        </div>
      </div>
      {showLegend && (
        <div className={styles.axis}>
          <div className={styles.axisItem}>
            <div className={styles.axisCircle} style={{ backgroundColor: reactantColor }} />
            <span className={styles.axisLabel}>{limitingLabel}</span>
          </div>
          <div className={styles.axisItem}>
            <div className={styles.axisCircle} style={{ backgroundColor: excessColor }} />
            <span className={styles.axisLabel}>{excessLabel}</span>
          </div>
          <div className={styles.axisItem}>
            <div className={styles.axisCircle} style={{ backgroundColor: productColor }} />
            <span className={styles.axisLabel}>{productLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
