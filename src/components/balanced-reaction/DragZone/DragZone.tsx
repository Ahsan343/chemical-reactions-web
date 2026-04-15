import { useState, useEffect, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { type Molecule, type ElementType } from '../../../helper/chemistry/types';
import { Beaker } from '../../shared/Beaker/Beaker';
import MoleculeView from '../MoleculeView/MoleculeView';
import styles from './DragZone.module.scss';

type HighlightState = 'none' | 'correct' | 'wrong';

interface DroppedEntry {
  molecule: Molecule;
  side: ElementType;
  count: number;
}

interface DragZoneProps {
  id: string;
  elementType: 'reactant' | 'product';
  highlightState: HighlightState;
  width?: number;
  height?: number;
  /** Molecules that have been dropped into this beaker */
  droppedEntries?: DroppedEntry[];
  /** Called when user drags a molecule out or clicks to remove */
  onRemoveMolecule?: (molecule: Molecule, side: ElementType) => void;
}

const OUTLINE_COLORS: Record<HighlightState, string> = {
  correct: 'rgb(220, 84, 59)',
  wrong: 'rgb(160, 160, 160)',
  none: 'rgb(64, 64, 64)',
};

/** A single molecule inside the beaker that can be dragged out to remove */
function BeakerDraggableMolecule({
  molecule,
  side,
  dragId,
  isNew,
  onRemove,
}: {
  molecule: Molecule;
  side: ElementType;
  dragId: string;
  isNew: boolean;
  onRemove?: (molecule: Molecule, side: ElementType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      molecule,
      elementType: side,
      source: 'beaker', // marks this drag as originating from inside a beaker
    },
    disabled: !onRemove,
  });

  // Track whether this molecule should play the enter animation
  const [animate, setAnimate] = useState(isNew);
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  // Intentionally no transform on the source — DragOverlay handles the moving
  // visual. Keeping a transform here would show two molecules moving at once.
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.3 : 1,
    cursor: onRemove ? (isDragging ? 'grabbing' : 'grab') : 'default',
    zIndex: isDragging ? 10 : 1,
    // pointer-events must be auto so dragging works inside the beaker overlay
    pointerEvents: 'auto' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.beakerMolecule} ${onRemove ? styles.removable : ''} ${animate ? styles.beakerMoleculeEnter : ''}`}
      onClick={onRemove ? () => onRemove(molecule, side) : undefined}
      title={onRemove ? `Drag out or click to remove ${molecule.formula}` : undefined}
      {...listeners}
      {...attributes}
    >
      <MoleculeView
        molecule={molecule}
        atomSize={16}
        showSymbols={false}
      />
    </div>
  );
}

// iOS beaker grid constants: 4 rows × 2 columns per molecule type
const BEAKER_GRID_ROWS = 4;
const BEAKER_GRID_COLS = 2;
const BEAKER_MAX_PER_TYPE = BEAKER_GRID_ROWS * BEAKER_GRID_COLS;

// Generate grid coordinates row-by-row from top-left (matching iOS GridCoordinateList.list)
function buildGridCoords(cols: number, rows: number): { col: number; row: number }[] {
  const coords: { col: number; row: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      coords.push({ col: c, row: r });
    }
  }
  return coords;
}

// iOS TableCellPosition: returns center of the cell at (row, col) within a rect
function tableCellPosition(
  rectW: number,
  rectH: number,
  rows: number,
  cols: number,
  row: number,
  col: number,
): { x: number; y: number } {
  const cellW = rectW / cols;
  const cellH = rectH / rows;
  return {
    x: cellW * col + cellW / 2,
    y: cellH * row + cellH / 2,
  };
}

const GRID_COORDS = buildGridCoords(BEAKER_GRID_COLS, BEAKER_GRID_ROWS);

export default function DragZone({
  id,
  elementType,
  highlightState,
  width = 180,
  height = 200,
  droppedEntries = [],
  onRemoveMolecule,
}: DragZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const outlineColor = OUTLINE_COLORS[highlightState];
  const emphasised = highlightState !== 'none';

  // Track previous total count to detect newly added molecules
  const prevTotalRef = useRef(0);
  const totalCount = droppedEntries.reduce((sum, e) => sum + e.count, 0);
  const justAdded = totalCount > prevTotalRef.current;
  useEffect(() => {
    prevTotalRef.current = totalCount;
  }, [totalCount]);

  // iOS layout: each molecule type gets its own sub-rect in the beaker.
  // Single type → full width. Two types → split vertically (left/right halves).
  const distinctTypes = droppedEntries.filter((e) => e.count > 0);
  const hasTwoTypes = distinctTypes.length === 2;

  // Build positioned molecules with absolute (left, top) within the beaker overlay
  // The overlay container size is provided by Beaker's childrenOverlay
  const positionedMolecules: {
    molecule: Molecule;
    side: ElementType;
    key: string;
    isNew: boolean;
    leftPercent: number;
    topPercent: number;
  }[] = [];

  distinctTypes.forEach((entry, typeIndex) => {
    // Determine this type's horizontal region as a fraction of the total width
    const regionLeft = hasTwoTypes ? typeIndex * 0.5 : 0;
    const regionWidth = hasTwoTypes ? 0.5 : 1;

    for (let i = 0; i < entry.count; i++) {
      if (i >= BEAKER_MAX_PER_TYPE) break;
      const coord = GRID_COORDS[i];
      const pos = tableCellPosition(1, 1, BEAKER_GRID_ROWS, BEAKER_GRID_COLS, coord.row, coord.col);
      const isLastInstance = i === entry.count - 1;

      positionedMolecules.push({
        molecule: entry.molecule,
        side: entry.side,
        key: `${entry.molecule.id}-${i}`,
        isNew: justAdded && isLastInstance,
        leftPercent: (regionLeft + pos.x * regionWidth) * 100,
        topPercent: pos.y * 100,
      });
    }
  });

  return (
    <div ref={setNodeRef} className={styles.zone} data-beaker={id}>
      <div className={`${styles.beakerWrapper} ${isOver || emphasised ? styles.beakerActive : ''}`}>
        <Beaker
          width={width}
          height={height}
          outlineColor={outlineColor}
          liquidLevel={0}
          showTicks={false}
        >
          {positionedMolecules.length > 0 && (
            <div className={styles.moleculesInBeaker}>
              {positionedMolecules.map((entry) => (
                <div
                  key={entry.key}
                  className={styles.gridCell}
                  style={{
                    left: `${entry.leftPercent}%`,
                    top: `${entry.topPercent}%`,
                  }}
                >
                  <BeakerDraggableMolecule
                    molecule={entry.molecule}
                    side={entry.side}
                    dragId={`beaker-${id}-${entry.key}`}
                    isNew={entry.isNew}
                    onRemove={onRemoveMolecule}
                  />
                </div>
              ))}
            </div>
          )}
        </Beaker>
      </div>
    </div>
  );
}

export type { DragZoneProps, HighlightState, DroppedEntry };
