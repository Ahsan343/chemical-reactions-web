import React, { useMemo } from 'react';
import { type Atom } from '../../../helper/chemistry/types';
import styles from './Scales.module.scss';

interface ScalesProps {
  atom: Atom;
  atomColor: string;
  atomSymbol: string;
  reactantCount: number;
  productCount: number;
  isBalanced: boolean;
}

const DOTS_COLS = 4;
const DOTS_ROWS = 4;
const MAX_SURPLUS = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getGridCoords(cols: number, rows: number): number {
  const maxRows = Math.min(rows, cols);
  let count = 0;
  for (let row = 0; row < maxRows; row++) {
    count += cols - row;
  }
  return count;
}

const MAX_DOTS = getGridCoords(DOTS_COLS, DOTS_ROWS);

function buildDotGrid(count: number, color: string): React.ReactElement[] {
  const capped = Math.min(count, MAX_DOTS);
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < capped; i++) {
    dots.push(
      <span
        key={i}
        className={styles.dot}
        style={{ backgroundColor: color }}
      />,
    );
  }
  return dots;
}

function Scales({
  atom,
  atomColor,
  atomSymbol,
  reactantCount,
  productCount,
  isBalanced,
}: ScalesProps) {
  const surplus = productCount - reactantCount;

  const rotationDeg = useMemo(() => {
    const fraction = clamp(surplus / MAX_SURPLUS, -1, 1);
    const maxAngle = 20;
    return fraction * maxAngle;
  }, [surplus]);

  const reactantDots = useMemo(
    () => buildDotGrid(reactantCount, atomColor),
    [reactantCount, atomColor],
  );

  const productDots = useMemo(
    () => buildDotGrid(productCount, atomColor),
    [productCount, atomColor],
  );

  return (
    <div
      className={styles.scalesContainer}
      role="group"
      aria-label={`Balance scale for ${atom} atoms`}
    >
      <div
        className={styles.badge}
        style={{ backgroundColor: atomColor }}
      >
        <span className={styles.badgeSymbol}>{atomSymbol}</span>
      </div>

      <div className={styles.scaleBody}>
        <div
          className={styles.beam}
          style={{ transform: `rotate(${rotationDeg}deg)` }}
        >
          <div className={styles.pan}>
            <div
              className={styles.dotGrid}
              style={{ gridTemplateColumns: `repeat(${DOTS_COLS}, 1fr)` }}
            >
              {reactantDots}
            </div>
          </div>

          <div className={styles.beamBar} />

          <div className={styles.pan}>
            <div
              className={styles.dotGrid}
              style={{ gridTemplateColumns: `repeat(${DOTS_COLS}, 1fr)` }}
            >
              {productDots}
            </div>
          </div>
        </div>

        <div className={styles.fulcrum} />
      </div>

      <div className={styles.labels}>
        <span className={styles.countLabel}>
          {reactantCount > 0 ? reactantCount : ''}
        </span>

        <span className={styles.checkmark}>
          {isBalanced && (
            <span className={styles.checkmarkIcon} aria-label="Balanced">
              &#x2713;
            </span>
          )}
        </span>

        <span className={styles.countLabel}>
          {productCount > 0 ? productCount : ''}
        </span>
      </div>
    </div>
  );
}

export default Scales;
