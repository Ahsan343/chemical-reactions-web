import styles from './PrecipitateShape.module.scss';

interface PrecipitateShapeProps {
  progress: number;
  color: string;
  size: number;
}

const POLYGON_POINTS = [
  [0.5, 0.05],
  [0.85, 0.2],
  [0.95, 0.55],
  [0.75, 0.9],
  [0.35, 0.95],
  [0.08, 0.65],
  [0.15, 0.25],
];

export default function PrecipitateShape({ progress, color, size }: PrecipitateShapeProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const pointsStr = POLYGON_POINTS.map(([x, y]) => `${x * size},${y * size}`).join(' ');

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.shape}
        style={{ transform: `scale(${clampedProgress})` }}
      >
        <polygon points={pointsStr} fill={color} />
      </svg>
    </div>
  );
}
