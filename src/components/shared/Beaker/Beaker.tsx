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
  /** Show graduated tick marks (default: true) */
  showTicks?: boolean;
}

const DEFAULT_LIQUID_COLOR = 'rgb(100, 185, 240)';
const DEFAULT_OUTLINE_COLOR = 'rgb(90, 90, 90)';

// ---- iOS BeakerSettings constants ----
const HEIGHT_TO_WIDTH = 1.1;
const LIP_RADIUS_RATIO = 0.03;       // lipRadius = width * 0.03
const LIP_WIDTH_LEFT_RATIO = 0.01;   // lipWidthLeft = width * 0.01
const CORNER_RADIUS_RATIO = 0.1;     // outerBottomCornerRadius = width * 0.1
const BOTTOM_GAP_RATIO = 0.055;      // innerBeakersBottomGap = width * 0.055
const LINE_WIDTH = 2;

// ---- Derived ratios for medium/small beakers (shadow layers) ----
// mediumBeakerRightLipWidth = lipWidthLeft * 9
// mediumBeakerRightGap = lipWidthLeft * 5
// mediumBeakerRightCornerRadius = cornerRadius * 1.5
// smallBeakerRightLipWidth = lipWidthLeft * 9
// smallBeakerRightGap = 2 * mediumBeakerRightGap
// smallBeakerRightCornerRadius = mediumBeakerRightCornerRadius * 1.2

interface BeakerGeometry {
  lipRadius: number;
  lipWidthLeft: number;
  cornerRadius: number;
  bottomGap: number;
  innerTop: number;
  wallLeft: number;
  wallRight: number;
  innerWidth: number;
}

function computeGeometry(width: number): BeakerGeometry {
  const lipRadius = width * LIP_RADIUS_RATIO;
  const lipWidthLeft = width * LIP_WIDTH_LEFT_RATIO;
  const cornerRadius = width * CORNER_RADIUS_RATIO;
  const bottomGap = width * BOTTOM_GAP_RATIO;
  const wallLeft = lipRadius + lipWidthLeft;
  const wallRight = width - lipRadius - lipWidthLeft;
  const innerTop = lipRadius * 2 + 2;

  return {
    lipRadius,
    lipWidthLeft,
    cornerRadius,
    bottomGap,
    innerTop,
    wallLeft,
    wallRight,
    innerWidth: wallRight - wallLeft,
  };
}

/**
 * Builds an SVG path that exactly matches the iOS BeakerShape.
 * The iOS shape uses semicircular arcs for lips at the top-left and top-right,
 * straight walls, and quadratic bezier curves for bottom corners.
 *
 * @param rightGap - gap on the right side (0 for large, bigger for medium/small)
 * @param rightLipWidth - lip width on the right (lipWidthLeft for large, lipWidthLeft*9 for medium)
 * @param leftCornerRadius - bottom-left corner radius
 * @param rightCornerRadius - bottom-right corner radius
 * @param bottomGap - gap at the bottom (0 for large, inner gap for medium/small)
 */
function buildBeakerShapePath(
  width: number,
  height: number,
  lipRadius: number,
  lipWidthLeft: number,
  rightLipWidth: number,
  leftCornerRadius: number,
  rightCornerRadius: number,
  bottomGap: number,
  rightGap: number
): string {
  const d: string[] = [];
  const lipDiameter = lipRadius * 2;

  // --- Left lip: semicircular arc ---
  // Arc center at (lipRadius, lipRadius), radius=lipRadius, from 270° to 90° (clockwise in iOS = counter-clockwise in SVG)
  // SVG arc: start at top of arc, sweep to bottom
  // Start point: center + radius at 270° = (lipRadius, lipRadius - lipRadius) = (lipRadius, 0)
  d.push(`M ${lipRadius},${0}`);
  // Arc to (lipRadius, lipDiameter) — going from top to bottom of the semicircle on the left
  // SVG arc params: rx ry x-rotation large-arc-flag sweep-flag x y
  // iOS clockwise from 270° to 90° = goes left then down = counter-clockwise in SVG (sweep=0)
  d.push(`A ${lipRadius} ${lipRadius} 0 0 0 ${lipRadius},${lipDiameter}`);

  // Left lip extension
  d.push(`L ${lipRadius + lipWidthLeft},${lipDiameter}`);

  // Left wall down
  d.push(`L ${lipRadius + lipWidthLeft},${height - leftCornerRadius - bottomGap}`);

  // Bottom-left quadratic curve
  d.push(
    `Q ${lipRadius + lipWidthLeft},${height - bottomGap} ${lipRadius + lipWidthLeft + leftCornerRadius},${height - bottomGap}`
  );

  // Bottom edge
  const rightWallX = width - lipRadius - rightLipWidth - rightGap;
  d.push(`L ${rightWallX - rightCornerRadius},${height - bottomGap}`);

  // Bottom-right quadratic curve
  d.push(
    `Q ${rightWallX},${height - bottomGap} ${rightWallX},${height - rightCornerRadius - bottomGap}`
  );

  // Right wall up
  d.push(`L ${rightWallX},${lipDiameter}`);

  // Right lip extension
  d.push(`L ${width - lipRadius - rightGap},${lipDiameter}`);

  // --- Right lip: semicircular arc ---
  // Arc center at (width - lipRadius - rightGap, lipRadius), radius=lipRadius, from 90° to 270° (clockwise in iOS = counter-clockwise in SVG)
  // Start at bottom of right arc: (width - lipRadius - rightGap, lipDiameter)
  // End at top of right arc: (width - lipRadius - rightGap, 0)
  d.push(`A ${lipRadius} ${lipRadius} 0 0 0 ${width - lipRadius - rightGap},${0}`);

  // Close path — connects back to start, creating the closed top
  d.push('Z');

  return d.join(' ');
}

/**
 * Builds tick marks for the right inner wall.
 */
function buildTickLines(
  width: number,
  height: number,
  geo: BeakerGeometry
): Array<{ y: number; length: number }> {
  const lipRadius = geo.lipRadius;
  const ticksTopGap = lipRadius * 4;
  const ticksBottomGap = geo.bottomGap * 1.5;
  const fillableTop = ticksTopGap;
  const fillableBottom = height - ticksBottomGap;
  const fillableHeight = fillableBottom - fillableTop;

  const numTicks = 13;
  const ticks = [];
  for (let i = 1; i < numTicks; i++) {
    const fraction = i / numTicks;
    const y = fillableBottom - fraction * fillableHeight;
    const isMajor = i % 5 === 0;
    ticks.push({
      y,
      length: isMajor ? width * 0.075 * 2 : width * 0.075,
    });
  }
  return ticks;
}

export function Beaker({
  width = 200,
  height,
  liquidLevel = 0.7,
  liquidColor = DEFAULT_LIQUID_COLOR,
  outlineColor = DEFAULT_OUTLINE_COLOR,
  children,
  className,
  showTicks = true,
}: BeakerProps) {
  const resolvedHeight = height ?? Math.round(width * HEIGHT_TO_WIDTH);
  const geo = useMemo(() => computeGeometry(width), [width]);

  // --- Build 3 beaker shapes (matching iOS exactly) ---
  const { lipRadius, lipWidthLeft, cornerRadius, bottomGap } = geo;
  const mediumRightLipWidth = lipWidthLeft * 9;
  const mediumRightGap = lipWidthLeft * 5;
  const mediumRightCornerRadius = cornerRadius * 1.5;
  const smallRightLipWidth = lipWidthLeft * 9;
  const smallRightGap = 2 * mediumRightGap;
  const smallRightCornerRadius = mediumRightCornerRadius * 1.2;

  // Large beaker (outermost outline)
  const largePath = useMemo(
    () => buildBeakerShapePath(
      width, resolvedHeight, lipRadius, lipWidthLeft,
      lipWidthLeft, cornerRadius, cornerRadius, 0, 0
    ),
    [width, resolvedHeight, lipRadius, lipWidthLeft, cornerRadius]
  );

  // Medium beaker (outer shadow boundary)
  const mediumPath = useMemo(
    () => buildBeakerShapePath(
      width, resolvedHeight, lipRadius, lipWidthLeft,
      mediumRightLipWidth, cornerRadius, mediumRightCornerRadius,
      bottomGap, mediumRightGap
    ),
    [width, resolvedHeight, lipRadius, lipWidthLeft, mediumRightLipWidth, cornerRadius, mediumRightCornerRadius, bottomGap, mediumRightGap]
  );

  // Small beaker (inner shadow boundary)
  const smallPath = useMemo(
    () => buildBeakerShapePath(
      width, resolvedHeight, lipRadius, lipWidthLeft,
      smallRightLipWidth, cornerRadius, smallRightCornerRadius,
      bottomGap, smallRightGap
    ),
    [width, resolvedHeight, lipRadius, lipWidthLeft, smallRightLipWidth, cornerRadius, smallRightCornerRadius, bottomGap, smallRightGap]
  );

  const ticks = useMemo(
    () => (showTicks ? buildTickLines(width, resolvedHeight, geo) : []),
    [width, resolvedHeight, geo, showTicks]
  );

  // Liquid calculations
  const clampedLevel = Math.max(0, Math.min(1, liquidLevel));
  const liquidFillableHeight = resolvedHeight - geo.innerTop;
  const liquidTop = geo.innerTop + liquidFillableHeight * (1 - clampedLevel);

  const clipId = useMemo(() => `beaker-${Math.random().toString(36).slice(2, 9)}`, []);

  // Tick position reference
  const ticksRightGap = lipRadius + mediumRightGap + mediumRightLipWidth;
  const tickX = width - ticksRightGap;

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
          {/* Clip path for liquid fill — uses large beaker shape */}
          <clipPath id={`${clipId}-liquid`}>
            <path d={largePath} />
          </clipPath>

          {/* Mask: large minus medium (outer shadow ring) */}
          <mask id={`${clipId}-outerMask`}>
            <path d={largePath} fill="white" />
            <path d={mediumPath} fill="black" />
          </mask>

          {/* Mask: medium minus small (inner shadow ring) */}
          <mask id={`${clipId}-innerMask`}>
            <path d={mediumPath} fill="white" />
            <path d={smallPath} fill="black" />
          </mask>
        </defs>

        {/* Layer 1: Liquid fill */}
        <rect
          x={0}
          y={liquidTop}
          width={width}
          height={resolvedHeight - liquidTop}
          fill={liquidColor}
          clipPath={`url(#${clipId}-liquid)`}
          className={styles.liquidFill}
        />

        {/* Layer 2: Outer tone shadow (between large and medium beaker) */}
        <rect
          x={0} y={0}
          width={width} height={resolvedHeight}
          fill="rgba(0, 0, 0, 0.12)"
          mask={`url(#${clipId}-outerMask)`}
        />

        {/* Layer 3: Inner tone shadow (between medium and small beaker) */}
        <rect
          x={0} y={0}
          width={width} height={resolvedHeight}
          fill="rgba(0, 0, 0, 0.06)"
          mask={`url(#${clipId}-innerMask)`}
        />

        {/* Layer 4: Tick marks (if enabled) */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tickX}
            y1={tick.y}
            x2={tickX - tick.length}
            y2={tick.y}
            stroke={outlineColor}
            strokeWidth={i % 5 === 0 ? 1.2 : 0.8}
            opacity={i % 5 === 0 ? 0.5 : 0.3}
          />
        ))}

        {/* Layer 5: Beaker outline stroke */}
        <path
          d={largePath}
          fill="none"
          stroke={outlineColor}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>

      {/* Children overlay (molecules etc.) */}
      {children && (() => {
        const overlayTop = geo.innerTop + 4;
        const overlayHeight = resolvedHeight - geo.innerTop - geo.cornerRadius * 0.5 - 4;
        const clipTop = liquidLevel === 0 ? 0 : Math.max(0, liquidTop - overlayTop);
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

      {/* Invisible marker at the water surface for pour-animation targeting */}
      <div
        data-water-surface="true"
        style={{
          position: 'absolute',
          top: liquidTop,
          left: 0,
          width: '100%',
          height: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export type { BeakerProps };
export default Beaker;
