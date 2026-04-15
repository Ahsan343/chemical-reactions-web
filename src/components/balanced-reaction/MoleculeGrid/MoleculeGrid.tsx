import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { type BalancedReactionDef, type Molecule, ElementType } from '../../../helper/chemistry/types';
import MoleculeView from '../MoleculeView/MoleculeView';
import styles from './MoleculeGrid.module.scss';

interface MoleculeGridProps {
  reaction: BalancedReactionDef;
  showTutorial: boolean;
  dragEnabled: boolean;
}

interface GridMolecule {
  dragId: string;
  molecule: Molecule;
  elementType: ElementType;
  instanceIndex: number;
}

function buildGridMolecules(
  reaction: BalancedReactionDef,
): { reactantMolecules: GridMolecule[]; productMolecules: GridMolecule[] } {
  const reactantMolecules: GridMolecule[] = [];
  const productMolecules: GridMolecule[] = [];

  // iOS pattern: always show exactly ONE of each molecule type in the grid.
  // The grid acts as an infinite palette — drag creates copies in the beaker,
  // and the molecule always stays in the grid for further dragging.
  for (const entry of reaction.reactants) {
    reactantMolecules.push({
      dragId: `reactant-${entry.molecule.id}-0`,
      molecule: entry.molecule,
      elementType: ElementType.Reactant,
      instanceIndex: 0,
    });
  }

  for (const entry of reaction.products) {
    productMolecules.push({
      dragId: `product-${entry.molecule.id}-0`,
      molecule: entry.molecule,
      elementType: ElementType.Product,
      instanceIndex: 0,
    });
  }

  return { reactantMolecules, productMolecules };
}

interface DraggableMoleculeProps {
  gridMolecule: GridMolecule;
  isTutorialTarget: boolean;
  compact?: boolean;
  dragEnabled: boolean;
}

function DraggableMolecule({ gridMolecule, isTutorialTarget, compact, dragEnabled }: DraggableMoleculeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: gridMolecule.dragId,
    data: {
      molecule: gridMolecule.molecule,
      elementType: gridMolecule.elementType,
    },
    disabled: !dragEnabled,
  });

  // NOTE: intentionally NOT applying `transform` to the source element. The
  // DragOverlay renders the moving visual. If we also translated the source,
  // the user would see two molecules moving at once (duplicate). The source
  // stays fully visible in place — iOS "infinite palette" pattern.
  const style: React.CSSProperties = {
    opacity: 1,
    cursor: dragEnabled ? (isDragging ? 'grabbing' : 'grab') : 'default',
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.draggableItem} ${compact ? styles.compact : ''}`}
      data-tutorial-source={isTutorialTarget ? 'first-reactant' : undefined}
      {...listeners}
      {...attributes}
    >
      <MoleculeView molecule={gridMolecule.molecule} atomSize={compact ? 20 : 28} />
      <span className={styles.moleculeName}>{gridMolecule.molecule.formula}</span>
    </div>
  );
}

export default function MoleculeGrid({
  reaction,
  showTutorial,
  dragEnabled,
}: MoleculeGridProps) {
  const { reactantMolecules, productMolecules } = useMemo(
    () => buildGridMolecules(reaction),
    [reaction],
  );

  const allMolecules = [...reactantMolecules, ...productMolecules];
  const isFirstMolecule = allMolecules.length > 0;
  const isCompact = allMolecules.length > 10;

  return (
    <div className={styles.gridContainer}>
      <div className={styles.contentColumn}>
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Reactants</span>
          <div className={`${styles.row} ${isCompact ? styles.compactRow : ''}`}>
            {reactantMolecules.map((gm, index) => (
              <DraggableMolecule
                key={gm.dragId}
                gridMolecule={gm}
                isTutorialTarget={showTutorial && isFirstMolecule && index === 0 && reactantMolecules.length > 0}
                compact={isCompact}
                dragEnabled={dragEnabled}
              />
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Products</span>
          <div className={`${styles.row} ${isCompact ? styles.compactRow : ''}`}>
            {productMolecules.map((gm, index) => (
              <DraggableMolecule
                key={gm.dragId}
                gridMolecule={gm}
                isTutorialTarget={showTutorial && reactantMolecules.length === 0 && index === 0}
                compact={isCompact}
                dragEnabled={dragEnabled}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { MoleculeGridProps };
