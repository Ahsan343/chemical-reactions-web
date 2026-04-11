import { type ReactNode, useMemo } from 'react';
import styles from './Beaker.module.scss';

interface BeakerProps {
  /** Width of the beaker in pixels */
  width?: number;
  /** Height of the beaker in pixels */
  height?: number;
  /** Liquid fill level from 0 (empty) to 1 (full) */
  liquidLevel?: number;
  /** Color of the liquid fill */
  liquidColor?: string;
  /** Color of the beaker outline stroke */
  outlineColor?: string;
  /** Content rendered inside the liquid area (e.g. molecule overlays) */
  children?: ReactNode;
  /** Optional className for the root container */
  className?: string;
}

const DEFAULT_LIQUID_COLOR = 'rgb(218, 238, 245)';
const DEFAULT_OUTLINE_COLOR = 'rgb(64, 64, 64)';

/** Ratio constants derived from iOS BeakerSettings */
const LIP_RADIUS_RATIO = 0.03;
const LIP_WIDTH_RATIO = 0.01;
const CORNER_RADIUS_RATIO = 0.1;
const HEIGHT_TO_WIDTH = 1.1;
const STROKE_WIDTH = 2;

interface BeakerGeometry {
  lipRadius: number;
  lipWidth: number;
  cornerRadius: number;
  /** X offset where the inner wall begins on the left */
  wallLeft: number;
  /** X offset where the inner wall begins on the right */
  wallRight: number;
  /** Y offset where the inner area starts (below lip) */
  innerTop: number;
  /** Inner width between the walls */
  innerWidth: number;
}

function computeGeometry(width: number, height: number): BeakerGeometry {
  const lipRadius = width * LIP_RADIUS_RATIO;
  const lipWidth = width * LIP_WIDTH_RATIO;
  const cornerRadius = width * CORNER_RADIUS_RATIO;
  const wallLeft = lipRadius + lipWidth;
  const wallRight = width - lipRadius - lipWidth;

  return {
    lipRadius,
    lipWidth,
    cornerRadius,
    wallLeft,
    wallRight,
    innerTop: lipRadius * 2,
    innerWidth: wallRight - wallLeft,
  };
}

/**
 * Builds the SVG path string for the beaker outline.
 * Matches the iOS BeakerShape: open top with lip curves, straight sides, rounded bottom.
 */
function buildBeakerPath(width: number, height: number, geo: BeakerGeometry): string {
  const { lipRadius, lipWidth, cornerRadius } = geo;
  const d: string[] = [];

  // Start at top of left lip curve (top-center of left arc)
  // Left lip arc: arc center at (lipRadius, lipRadius), from 270deg to 90deg clockwise (SVG: sweep=0)
  d.push(`M ${lipRadius} 0`);
  d.push(`A ${lipRadius} ${lipRadius} 0 0 0 ${lipRadius} ${lipRadius * 2}`);

  // Left lip horizontal
  d.push(`L ${lipRadius + lipWidth} ${lipRadius * 2}`);

  // Left wall down to bottom-left curve
  d.push(`L ${lipRadius + lipWidth} ${height - cornerRadius}`);

  // Bottom-left quad curve
  d.push(
    `Q ${lipRadius + lipWidth} ${height} ${lipRadius + lipWidth + cornerRadius} ${height}`
  );

  // Bottom edge
  d.push(
    `L ${width - lipRadius - lipWidth - cornerRadius} ${height}`
  );

  // Bottom-right quad curve
  d.push(
    `Q ${width - lipRadius - lipWidth} ${height} ${width - lipRadius - lipWidth} ${height - cornerRadius}`
  );

  // Right wall up
  d.push(`L ${width - lipRadius - lipWidth} ${lipRadius * 2}`);

  // Right lip horizontal
  d.push(`L ${width - lipRadius} ${lipRadius * 2}`);

  // Right lip arc
  d.push(`A ${lipRadius} ${lipRadius} 0 0 0 ${width - lipRadius} 0`);

  return d.join(' ');
}

/**
 * Builds tick mark lines on the right inner wall of the beaker.
 * 3 ticks at 25%, 50%, 75% height of the liquid-fillable area.
 */
function buildTickLines(
  width: number,
  height: number,
  geo: BeakerGeometry
): Array<{ y: number; length: number }> {
  const fillableTop = geo.innerTop;
  const fillableBottom = height - geo.cornerRadius * 0.5;
  const fillableHeight = fillableBottom - fillableTop;

  return [0.25, 0.5, 0.75].map((fraction) => {
    const y = fillableBottom - fraction * fillableHeight;
    const isMajor = fraction === 0.5;
    return {
      y,
      length: isMajor ? width * 0.15 : width * 0.075,
    };
  });
}

/**
 * Builds the SVG clip path for the liquid fill area (inner beaker shape with rounded bottom).
 */
function buildLiquidClipPath(width: number, height: number, geo: BeakerGeometry): string {
  const { wallLeft, wallRight, cornerRadius } = geo;
  const d: string[] = [];

  d.push(`M ${wallLeft} 0`);
  d.push(`L ${wallLeft} ${height - cornerRadius}`);
  d.push(`Q ${wallLeft} ${height} ${wallLeft + cornerRadius} ${height}`);
  d.push(`L ${wallRight - cornerRadius} ${height}`);
  d.push(`Q ${wallRight} ${height} ${wallRight} ${height - cornerRadius}`);
  d.push(`L ${wallRight} 0`);
  d.push('Z');

  return d.join(' ');
}

export function Beaker({
  width = 200,
  height,
  liquidLevel = 0.7,
  liquidColor = DEFAULT_LIQUID_COLOR,
  outlineColor = DEFAULT_OUTLINE_COLOR,
  children,
  className,
}: BeakerProps) {
  const resolvedHeight = height ?? Math.round(width * HEIGHT_TO_WIDTH);
  const geo = useMemo(() => computeGeometry(width, resolvedHeight), [width, resolvedHeight]);

  const beakerPath = useMemo(
    () => buildBeakerPath(width, resolvedHeight, geo),
    [width, resolvedHeight, geo]
  );

  const liquidClip = useMemo(
    () => buildLiquidClipPath(width, resolvedHeight, geo),
    [width, resolvedHeight, geo]
  );

  const ticks = useMemo(
    () => buildTickLines(width, resolvedHeight, geo),
    [width, resolvedHeight, geo]
  );

  const clampedLevel = Math.max(0, Math.min(1, liquidLevel));
  const liquidFillableHeight = resolvedHeight - geo.innerTop;
  const liquidTop = geo.innerTop + liquidFillableHeight * (1 - clampedLevel);

  const clipId = useMemo(() => `beaker-clip-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <div
      className={`${styles.beakerContainer} ${className ?? ''}`}
      style={{ width, height: resolvedHeight }}
    >
      <svg
        width={width}
        height={resolvedHeight}
        viewBox={`0 0 ${width} ${resolvedHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className={styles.beakerSvg}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={liquidClip} />
          </clipPath>
        </defs>

        {/* Liquid fill */}
        <rect
          x={0}
          y={liquidTop}
          width={width}
          height={resolvedHeight - liquidTop}
          fill={liquidColor}
          clipPath={`url(#${clipId})`}
          className={styles.liquidFill}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={geo.wallRight - STROKE_WIDTH / 2}
            y1={tick.y}
            x2={geo.wallRight - STROKE_WIDTH / 2 - tick.length}
            y2={tick.y}
            stroke={outlineColor}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {/* Beaker outline */}
        <path
          d={beakerPath}
          fill="none"
          stroke={outlineColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Children overlay (molecule grids, etc.) — clipped to liquid area */}
      {children && (() => {
        const overlayTop = geo.innerTop + 4;
        const overlayHeight = resolvedHeight - geo.innerTop - geo.cornerRadius * 0.5 - 4;
        // Clip molecules so they only appear within the water-filled region
        const clipTop = Math.max(0, liquidTop - overlayTop);
        return (
          <div
            className={styles.childrenOverlay}
            style={{
              left: geo.wallLeft + 8,
              width: geo.innerWidth - 16,
              top: overlayTop,
              height: overlayHeight,
              clipPath: `inset(${clipTop}px 0 0 0)`,
            }}
          >
            {children}
          </div>
        );
      })()}
    </div>
  );
}

export type { BeakerProps };
export default Beaker;
