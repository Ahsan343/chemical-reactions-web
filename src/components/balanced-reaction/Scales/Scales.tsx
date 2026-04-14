import React, { useMemo } from 'react';
import { type Atom } from '../../../helper/chemistry/types';
import styles from './Scales.module.scss';
import scalesStandImg from './assets/scales-stand.png';
import singleScaleBasketImg from './assets/single-scale-basket.png';

interface ScalesProps {
  atom: Atom;
  atomColor: string;
  atomSymbol: string;
  reactantCount: number;
  productCount: number;
  isBalanced: boolean;
}

// iOS: maxDifference = 3, linear mapping surplus → rotation fraction [-1, 1]
const MAX_SURPLUS = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * iOS MoleculeScalesGeometry proportions (applied to our chosen dimensions):
 *   widthToHeight = 1.657
 *   rotationCenterY = 0.247 * height
 *   basketWidth = 0.391 * height
 *   basketHeight = basketWidth * 1.11
 *   armWidth = width - basketWidth
 *   badgeSize = 0.5 * basketWidth
 *   lineWidth = 0.8
 *
 * Stand image: 908×2304 (aspect ~0.394:1)
 * Basket image: 903×192 (aspect ~4.7:1)
 */

// Wider container so the beam arms are long enough to separate the baskets
const W = 240;
const H = 190;

const PIVOT_X = W / 2;
const PIVOT_Y = 0.247 * H; // ~47

// Basket sizing
const BASKET_W = 0.391 * H; // ~74
const BASKET_H_RATIO = 1.11;
const BASKET_H = BASKET_W * BASKET_H_RATIO; // ~82
const BASKET_Y_OFFSET = BASKET_H / 2;

// Arm (beam) — wider W gives more separation between baskets
const ARM_W = W - BASKET_W; // ~166
const LINE_WIDTH = 0.8;
const SCALES_BODY_COLOR = 'rgb(130, 130, 130)';

// Badge
const BADGE_SIZE = 0.5 * BASKET_W; // ~37
const BADGE_FONT_SIZE = 0.75 * BADGE_SIZE;
const BADGE_OUTLINE_COLOR = 'rgb(100, 100, 100)';

// Stand image dimensions (fills the container height, maintains aspect ratio)
const STAND_IMG_ASPECT = 908 / 2304; // ~0.394
const STAND_IMG_H = H;
const STAND_IMG_W = STAND_IMG_H * STAND_IMG_ASPECT;

// Basket image aspect ratio
const BASKET_IMG_ASPECT = 903 / 192; // ~4.7
const BASKET_IMG_W = BASKET_W;
const BASKET_IMG_H = BASKET_IMG_W / BASKET_IMG_ASPECT;

// Max rotation angle (iOS computes dynamically)
function computeMaxRotationDeg(): number {
  const singleArm = ARM_W / 2;
  const maxRight = Math.asin(Math.min(1, PIVOT_Y / singleArm)) * (180 / Math.PI);
  const maxLeft = Math.asin(Math.min(1, (H - PIVOT_Y - BASKET_H) / singleArm)) * (180 / Math.PI);
  return Math.min(maxLeft, maxRight);
}

const MAX_ROTATION_DEG = computeMaxRotationDeg();

// iOS molecule pile: 5×5 triangular grid
const PILE_COLS = 5;
const PILE_ROWS = 5;

interface GridCoord { col: number; row: number; }

function buildGridCoords(cols: number, rows: number): GridCoord[] {
  const maxRows = Math.min(rows, cols);
  const coords: GridCoord[] = [];
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < cols - row; col++) {
      coords.push({ col, row });
    }
  }
  return coords;
}

const ALL_GRID_COORDS = buildGridCoords(PILE_COLS, PILE_ROWS);
const MAX_MOLECULE_COUNT = ALL_GRID_COORDS.length; // 15

/**
 * iOS AnimatingMoleculePile: triangular stack of ellipses
 */
function renderMoleculePile(
  count: number,
  color: string,
  pileWidth: number,
  pileHeight: number,
  offsetX: number,
  offsetY: number,
): React.ReactElement[] {
  if (count <= 0) return [];

  const fraction = count / MAX_MOLECULE_COUNT;
  const numToShow = Math.max(0, Math.round(fraction * ALL_GRID_COORDS.length));
  const coordsToShow = ALL_GRID_COORDS.slice(0, numToShow);

  const colSize = pileWidth / PILE_COLS;
  const rowSize = pileHeight / PILE_ROWS;
  const circleSize = Math.min(colSize, rowSize);

  const dots: React.ReactElement[] = [];
  coordsToShow.forEach(({ col, row }, i) => {
    // iOS: top = rect.height - (size * (row + 1)) + (size/8 * row)
    const top = pileHeight - circleSize * (row + 1) + (circleSize / 8) * row;
    // iOS: left = (size/2 * row) + (size * col)
    const left = (circleSize / 2) * row + circleSize * col;

    dots.push(
      <ellipse
        key={`pile-${i}`}
        cx={offsetX + left + circleSize / 2}
        cy={offsetY + top + circleSize / 2}
        rx={circleSize / 2}
        ry={circleSize / 2}
        fill={color}
      />
    );
  });
  return dots;
}

// Label area below the scale
const LABEL_AREA_H = 20;
const TOTAL_H = H + LABEL_AREA_H;

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
    return fraction * MAX_ROTATION_DEG;
  }, [surplus]);

  const rad = (rotationDeg * Math.PI) / 180;

  // Beam endpoints
  const halfArm = ARM_W / 2;
  const leftEndX = PIVOT_X - halfArm * Math.cos(rad);
  const leftEndY = PIVOT_Y + halfArm * Math.sin(rad);
  const rightEndX = PIVOT_X + halfArm * Math.cos(rad);
  const rightEndY = PIVOT_Y - halfArm * Math.sin(rad);

  // Basket center positions (below arm endpoints)
  const leftBasketCX = leftEndX;
  const leftBasketCY = leftEndY + BASKET_Y_OFFSET;
  const rightBasketCX = rightEndX;
  const rightBasketCY = rightEndY + BASKET_Y_OFFSET;

  // Basket image Y position (bottom of basket area)
  const leftBasketImgY = leftBasketCY + BASKET_H / 2 - BASKET_IMG_H;
  const rightBasketImgY = rightBasketCY + BASKET_H / 2 - BASKET_IMG_H;

  // String endpoints: V-shape from arm endpoint down to basket rim edges
  // iOS basketHolder: line from (basketWidth/2, 0) to (0 or basketWidth, height - basketImageHeight)
  // In our coords: from arm endpoint to basket left/right edges at basket rim
  const leftBasketLeftEdge = leftBasketCX - BASKET_W / 2;
  const leftBasketRightEdge = leftBasketCX + BASKET_W / 2;
  const rightBasketLeftEdge = rightBasketCX - BASKET_W / 2;
  const rightBasketRightEdge = rightBasketCX + BASKET_W / 2;

  // Molecule pile area inside basket (above the basket image)
  const pileAvailableH = BASKET_H - BASKET_IMG_H;
  const pileSize = Math.min(BASKET_W, pileAvailableH);

  const leftPileX = leftBasketCX - pileSize / 2;
  const leftPileY = leftBasketCY - BASKET_H / 2 + (pileAvailableH - pileSize);
  const leftDots = useMemo(
    () => renderMoleculePile(reactantCount, atomColor, pileSize, pileSize, leftPileX, leftPileY),
    [reactantCount, atomColor, pileSize, leftPileX, leftPileY],
  );

  const rightPileX = rightBasketCX - pileSize / 2;
  const rightPileY = rightBasketCY - BASKET_H / 2 + (pileAvailableH - pileSize);
  const rightDots = useMemo(
    () => renderMoleculePile(productCount, atomColor, pileSize, pileSize, rightPileX, rightPileY),
    [productCount, atomColor, pileSize, rightPileX, rightPileY],
  );

  return (
    <div
      className={styles.scalesContainer}
      role="group"
      aria-label={`Balance scale for ${atom} atoms`}
    >
      <svg
        className={styles.scalesSvg}
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Stand image (background — fills full height, centered) */}
        <image
          href={scalesStandImg}
          x={PIVOT_X - STAND_IMG_W / 2}
          y={0}
          width={STAND_IMG_W}
          height={STAND_IMG_H}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Arm / beam (drawn on top of stand) */}
        <line
          x1={leftEndX}
          y1={leftEndY}
          x2={rightEndX}
          y2={rightEndY}
          stroke={SCALES_BODY_COLOR}
          strokeWidth={LINE_WIDTH * 2}
          className={styles.beam}
        />

        {/* Left basket: V-strings from arm endpoint to basket rim edges */}
        <line
          x1={leftEndX} y1={leftEndY}
          x2={leftBasketLeftEdge} y2={leftBasketImgY}
          stroke={SCALES_BODY_COLOR} strokeWidth={LINE_WIDTH}
          className={styles.beam}
        />
        <line
          x1={leftEndX} y1={leftEndY}
          x2={leftBasketRightEdge} y2={leftBasketImgY}
          stroke={SCALES_BODY_COLOR} strokeWidth={LINE_WIDTH}
          className={styles.beam}
        />

        {/* Right basket: V-strings */}
        <line
          x1={rightEndX} y1={rightEndY}
          x2={rightBasketLeftEdge} y2={rightBasketImgY}
          stroke={SCALES_BODY_COLOR} strokeWidth={LINE_WIDTH}
          className={styles.beam}
        />
        <line
          x1={rightEndX} y1={rightEndY}
          x2={rightBasketRightEdge} y2={rightBasketImgY}
          stroke={SCALES_BODY_COLOR} strokeWidth={LINE_WIDTH}
          className={styles.beam}
        />

        {/* Molecule dots in left basket */}
        {leftDots}

        {/* Molecule dots in right basket */}
        {rightDots}

        {/* Left basket image */}
        <image
          href={singleScaleBasketImg}
          x={leftBasketCX - BASKET_IMG_W / 2}
          y={leftBasketImgY}
          width={BASKET_IMG_W}
          height={BASKET_IMG_H}
          preserveAspectRatio="xMidYMid meet"
          className={styles.beam}
        />

        {/* Right basket image */}
        <image
          href={singleScaleBasketImg}
          x={rightBasketCX - BASKET_IMG_W / 2}
          y={rightBasketImgY}
          width={BASKET_IMG_W}
          height={BASKET_IMG_H}
          preserveAspectRatio="xMidYMid meet"
          className={styles.beam}
        />

        {/* Badge circle at pivot (on top of everything) */}
        <circle
          cx={PIVOT_X}
          cy={PIVOT_Y}
          r={BADGE_SIZE / 2}
          fill={atomColor}
        />
        <circle
          cx={PIVOT_X}
          cy={PIVOT_Y}
          r={BADGE_SIZE / 2}
          fill="none"
          stroke={BADGE_OUTLINE_COLOR}
          strokeWidth={LINE_WIDTH}
        />
        <text
          x={PIVOT_X}
          y={PIVOT_Y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={BADGE_FONT_SIZE}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {atomSymbol}
        </text>

        {/* Count labels below scale */}
        <text
          x={leftEndX}
          y={H + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgb(60, 60, 60)"
          fontSize={11}
          fontWeight="600"
          opacity={reactantCount > 0 ? 1 : 0}
        >
          {reactantCount}
        </text>

        {/* Balanced checkmark in center */}
        {isBalanced && (
          <g className={styles.checkmarkGroup}>
            <circle
              cx={PIVOT_X}
              cy={H + 12}
              r={7}
              fill="rgb(76, 175, 80)"
            />
            <path
              d={`M ${PIVOT_X - 3},${H + 12} L ${PIVOT_X - 0.5},${H + 14.5} L ${PIVOT_X + 4},${H + 8.5}`}
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        <text
          x={rightEndX}
          y={H + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgb(60, 60, 60)"
          fontSize={11}
          fontWeight="600"
          opacity={productCount > 0 ? 1 : 0}
        >
          {productCount}
        </text>
      </svg>
    </div>
  );
}

export default Scales;
