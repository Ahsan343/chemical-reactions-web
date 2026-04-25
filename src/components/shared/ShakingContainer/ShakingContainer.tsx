import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styles from './ShakingContainer.module.scss';

interface ShakingContainerProps {
  color: string;
  label: string;
  onPour: () => void;
  disabled?: boolean;
  isActive?: boolean;
  tooltipText?: string;
  /** CSS-variable-driven distance the particles travel (e.g. "320px"). Defaults to 110px. */
  fallDistance?: string;
  /** When true, first click "positions" the bottle (tilts, shows pour tooltip),
   *  second click pours. Mirrors thermodynamics-unit6 reference. Default false
   *  to preserve existing single-tap shake-in flow in limiting reagent. */
  twoTapPour?: boolean;
}

interface FallingParticle {
  id: string;
  x: number;
  delay: number;
}

/**
 * iOS ContainerShape SVG path — quadratic bezier cap from ParticleContainer.swift.
 */
function containerShapePath(w: number, h: number): string {
  const outerCapH = 0.212 * h;
  const innerPadX = 0.0832 * w;
  const innerPadY = 0.1018 * w;
  const innerW = w - 2 * innerPadX;
  const innerCapH = 0.178 * h;

  const outer = [
    `M 0 ${outerCapH}`,
    `Q 0 0, ${w / 2} 0`,
    `Q ${w} 0, ${w} ${outerCapH}`,
    `L ${w} ${h}`,
    `L 0 ${h}`,
    `Z`,
  ].join(' ');

  const ix = innerPadX;
  const iy = innerPadY;
  const inner = [
    `M ${ix} ${iy + innerCapH}`,
    `Q ${ix} ${iy}, ${ix + innerW / 2} ${iy}`,
    `Q ${ix + innerW} ${iy}, ${ix + innerW} ${iy + innerCapH}`,
    `Z`,
  ].join(' ');

  return `${outer} ${inner}`;
}

const LABEL_HEIGHT_RATIO = 0.66;

export default function ShakingContainer({
  color,
  label,
  onPour,
  disabled = false,
  isActive = false,
  tooltipText,
  fallDistance,
  twoTapPour = false,
}: ShakingContainerProps) {
  const [pourKey, setPourKey] = useState(0);
  const [pouring, setPouring] = useState(false);
  /** Two-tap mode: tracks whether the bottle is "positioned" (first tap done). */
  const [positioned, setPositioned] = useState(false);
  const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset positioned state when the bottle becomes inactive (phase changed)
  useEffect(() => {
    if (!isActive) setPositioned(false);
  }, [isActive]);

  const containerW = 40;
  const containerH = containerW * 2.33;

  const svgPath = useMemo(() => containerShapePath(containerW, containerH), [containerW, containerH]);

  const particles = useMemo<FallingParticle[]>(() => {
    if (!pouring) return [];
    // iOS MoleculeEmitter: 5 molecules, staggered — 2× speed
    return Array.from({ length: 5 }, (_, i) => ({
      id: `${pourKey}-${i}`,
      x: Math.random() * 16 - 8,
      delay: i * 0.04,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pouring, pourKey]);

  const pourCallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
      if (pourCallbackRef.current) clearTimeout(pourCallbackRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    // Two-tap pour mode: first click positions, second pours.
    if (twoTapPour && !positioned) {
      setPositioned(true);
      return;
    }
    // Delay molecule appearance until particles reach the water surface
    if (pourCallbackRef.current) clearTimeout(pourCallbackRef.current);
    pourCallbackRef.current = setTimeout(() => onPour(), 420);
    setPourKey((k) => k + 1);
    setPouring(true);
    if (pourTimerRef.current) clearTimeout(pourTimerRef.current);
    pourTimerRef.current = setTimeout(() => setPouring(false), 600);
  }, [disabled, onPour, twoTapPour, positioned]);

  const labelH = LABEL_HEIGHT_RATIO * containerH;
  const labelY = containerH - labelH;

  const containerClasses = [
    styles.container,
    isActive ? styles.active : '',
    disabled ? styles.disabled : '',
    twoTapPour && positioned ? styles.positioned : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Tooltip override for two-tap mode — only when the container is active
  // (interactable). Disabled/greyed containers fall back to the supplied
  // tooltipText (typically empty).
  const effectiveTooltip = twoTapPour && isActive && !disabled
    ? (positioned ? 'Tap again to pour' : 'Tap to position above beaker')
    : tooltipText;

  return (
    <div className={styles.wrapper}>
      {/* Particles layer — sits OUTSIDE the rotating container so they always fall straight down */}
      <div
        className={styles.particlesContainer}
        style={{ '--fall-distance': fallDistance ?? '110px' } as React.CSSProperties}
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className={styles.fallingParticle}
            style={{
              backgroundColor: color,
              '--particle-x': `${p.x}px`,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={containerClasses}>
        {effectiveTooltip && (
          <div className={styles.tooltip} role="tooltip">
            {effectiveTooltip}
          </div>
        )}

        <button
          type="button"
          className={styles.bottle}
          onClick={handleClick}
          disabled={disabled}
          aria-label={`Pour ${label}`}
        >
          <svg
            width={containerW}
            height={containerH}
            viewBox={`0 0 ${containerW} ${containerH}`}
            className={styles.bottleSvg}
          >
            <path d={svgPath} fill="white" fillRule="evenodd" />
            <clipPath id={`label-clip-${label}`}>
              <rect x={0} y={labelY} width={containerW} height={labelH} />
            </clipPath>
            <path
              d={svgPath}
              fill={color}
              fillRule="evenodd"
              clipPath={`url(#label-clip-${label})`}
            />
            <path
              d={svgPath}
              fill="none"
              stroke="rgb(60, 60, 60)"
              strokeWidth={2.5}
              fillRule="evenodd"
            />
            <text
              x={containerW / 2}
              y={labelY + labelH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(-90, ${containerW / 2}, ${labelY + labelH / 2})`}
              className={styles.labelText}
              fill="white"
            >
              {label}
            </text>
          </svg>
        </button>
      </div>
    </div>
  );
}
