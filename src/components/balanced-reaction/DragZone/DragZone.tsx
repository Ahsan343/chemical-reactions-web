import { useDroppable } from '@dnd-kit/core';
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
}

const OUTLINE_COLORS: Record<HighlightState, string> = {
  correct: 'rgb(220, 84, 59)',
  wrong: 'rgb(160, 160, 160)',
  none: 'rgb(64, 64, 64)',
};

export default function DragZone({
  id,
  elementType,
  highlightState,
  width = 180,
  height = 200,
  droppedEntries = [],
}: DragZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const outlineColor = OUTLINE_COLORS[highlightState];
  const emphasised = highlightState !== 'none';

  // Build a flat list of molecules to show inside the beaker
  const beakerMolecules: { molecule: Molecule; key: string }[] = [];
  for (const entry of droppedEntries) {
    for (let i = 0; i < entry.count; i++) {
      beakerMolecules.push({
        molecule: entry.molecule,
        key: `${entry.molecule.id}-${i}`,
      });
    }
  }

  return (
    <div ref={setNodeRef} className={styles.zone}>
      <div className={`${styles.beakerWrapper} ${isOver || emphasised ? styles.beakerActive : ''}`}>
        <Beaker
          width={width}
          height={height}
          outlineColor={outlineColor}
          liquidLevel={0}
        >
          {beakerMolecules.length > 0 && (
            <div className={styles.moleculesInBeaker}>
              {beakerMolecules.map((entry) => (
                <div key={entry.key} className={styles.beakerMolecule}>
                  <MoleculeView
                    molecule={entry.molecule}
                    atomSize={16}
                    showSymbols={false}
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
