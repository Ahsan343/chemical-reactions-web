import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { type BalancedReactionDef, type Molecule, ElementType } from '../../../helper/chemistry/types';
import MoleculeView from '../MoleculeView/MoleculeView';
import styles from './MoleculeGrid.module.scss';

interface DroppedMoleculeInfo {
  side: ElementType;
  count: number;
}

interface MoleculeGridProps {
  reaction: BalancedReactionDef;
  droppedMolecules: Map<string, DroppedMoleculeInfo>;
  showTutorial: boolean;
}

interface GridMolecule {
  dragId: string;
  molecule: Molecule;
  elementType: ElementType;
  instanceIndex: number;
}

function buildGridMolecules(
  reaction: BalancedReactionDef,
  droppedMolecules: Map<string, DroppedMoleculeInfo>,
): { reactantMolecules: GridMolecule[]; productMolecules: GridMolecule[] } {
  const reactantMolecules: GridMolecule[] = [];
  const productMolecules: GridMolecule[] = [];

  for (const entry of reaction.reactants) {
    const dropped = droppedMolecules.get(entry.molecule.id);
    const droppedCount = dropped?.count ?? 0;
    const remaining = entry.coefficient - droppedCount;
    for (let i = 0; i < remaining; i++) {
      reactantMolecules.push({
        dragId: `reactant-${entry.molecule.id}-${i}`,
        molecule: entry.molecule,
        elementType: ElementType.Reactant,
        instanceIndex: i,
      });
    }
  }

  for (const entry of reaction.products) {
    const dropped = droppedMolecules.get(entry.molecule.id);
    const droppedCount = dropped?.count ?? 0;
    const remaining = entry.coefficient - droppedCount;
    for (let i = 0; i < remaining; i++) {
      productMolecules.push({
        dragId: `product-${entry.molecule.id}-${i}`,
        molecule: entry.molecule,
        elementType: ElementType.Product,
        instanceIndex: i,
      });
    }
  }

  return { reactantMolecules, productMolecules };
}

interface DraggableMoleculeProps {
  gridMolecule: GridMolecule;
  isTutorialTarget: boolean;
  compact?: boolean;
}

function DraggableMolecule({ gridMolecule, isTutorialTarget, compact }: DraggableMoleculeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: gridMolecule.dragId,
    data: {
      molecule: gridMolecule.molecule,
      elementType: gridMolecule.elementType,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.draggableItem} ${compact ? styles.compact : ''} ${isTutorialTarget ? styles.tutorialPulse : ''}`}
      {...listeners}
      {...attributes}
    >
      <MoleculeView molecule={gridMolecule.molecule} atomSize={compact ? 20 : 28} />
      <span className={styles.moleculeName}>{gridMolecule.molecule.formula}</span>
      {isTutorialTarget && (
        <span className={styles.arrowHint} aria-hidden="true">&larr;</span>
      )}
    </div>
  );
}

export default function MoleculeGrid({
  reaction,
  droppedMolecules,
  showTutorial,
}: MoleculeGridProps) {
  const { reactantMolecules, productMolecules } = useMemo(
    () => buildGridMolecules(reaction, droppedMolecules),
    [reaction, droppedMolecules],
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
              />
            ))}
            {reactantMolecules.length === 0 && (
              <span className={styles.emptyHint}>All placed</span>
            )}
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
              />
            ))}
            {productMolecules.length === 0 && (
              <span className={styles.emptyHint}>All placed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { MoleculeGridProps, DroppedMoleculeInfo };
