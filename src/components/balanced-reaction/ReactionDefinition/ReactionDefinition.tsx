import { useMemo } from 'react';
import { type BalancedReactionDef, type Molecule, type Atom, type AtomCount } from '../../../helper/chemistry/types';
import { atomInfoMap } from '../../../helper/chemistry/atoms';
import styles from './ReactionDefinition.module.scss';

interface ReactionDefinitionProps {
  reaction: BalancedReactionDef;
  emphasizeCoefficients?: boolean;
  /**
   * Map of molecule id → count placed by user.
   * When provided, coefficient boxes show the user's count (empty if 0)
   * instead of the correct answer.
   */
  userCounts?: Map<string, number>;
}

interface TermProps {
  molecule: Molecule;
  coefficient: number;
  emphasize: boolean;
  displayValue?: number; // user-placed count (undefined = show correct answer)
  isCorrect?: boolean;   // whether user count matches target
}

/* ── Mini molecule icon (small cluster of colored circles) ── */

function expandAtoms(atoms: AtomCount[]): Atom[] {
  const result: Atom[] = [];
  for (const { atom, count } of atoms) {
    for (let i = 0; i < count; i++) {
      result.push(atom);
    }
  }
  return result;
}

interface AtomPos { atom: Atom; x: number; y: number }

function miniLayout(atomList: Atom[], r: number): { positions: AtomPos[]; w: number; h: number } {
  const gap = r * 1.7;
  const n = atomList.length;

  if (n === 1) {
    return { positions: [{ atom: atomList[0], x: r, y: r }], w: r * 2, h: r * 2 };
  }
  if (n === 2) {
    return {
      positions: [
        { atom: atomList[0], x: r, y: r },
        { atom: atomList[1], x: r + gap, y: r },
      ],
      w: gap + r * 2,
      h: r * 2,
    };
  }
  if (n === 3) {
    const oY = r * 0.5;
    return {
      positions: [
        { atom: atomList[0], x: r + gap / 2, y: r - oY },
        { atom: atomList[1], x: r, y: r + oY },
        { atom: atomList[2], x: r + gap, y: r + oY },
      ],
      w: gap + r * 2,
      h: r * 2 + oY,
    };
  }

  // 4+ atoms: grid
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const positions = atomList.map((atom, i) => ({
    atom,
    x: r + (i % cols) * gap,
    y: r + Math.floor(i / cols) * gap,
  }));
  return {
    positions,
    w: (cols - 1) * gap + r * 2,
    h: (rows - 1) * gap + r * 2,
  };
}

function MiniMolecule({ molecule }: { molecule: Molecule }) {
  const atomList = useMemo(() => expandAtoms(molecule.atoms), [molecule.atoms]);
  const r = 4.5;
  const { positions, w, h } = useMemo(() => miniLayout(atomList, r), [atomList, r]);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={styles.miniMolecule}>
      {positions.map((pos, i) => {
        const info = atomInfoMap[pos.atom];
        return (
          <circle key={i} cx={pos.x} cy={pos.y} r={r} fill={info.color} />
        );
      })}
    </svg>
  );
}

/* ── Coefficient box ── */

function CoefficientBox({
  displayValue,
  isCorrect,
}: {
  displayValue: number | undefined;
  isCorrect: boolean;
}) {
  // If no value provided, or value is 0, show empty dashed box
  if (displayValue === undefined || displayValue === 0) {
    return <span className={styles.placeholderBox} />;
  }

  // Has a value — show it with styling based on correctness
  const boxClass = isCorrect
    ? `${styles.coefficientBox} ${styles.coefficientCorrect}`
    : `${styles.coefficientBox} ${styles.coefficientFilled}`;

  return (
    <span className={boxClass}>
      {displayValue}
    </span>
  );
}

/* ── Term (coefficient box + formula + mini molecule) ── */

function Term({ molecule, coefficient, emphasize, displayValue, isCorrect }: TermProps) {
  // If no userCounts mode, show correct coefficient directly
  const showDirectValue = displayValue === undefined;

  return (
    <span className={styles.term}>
      <span className={styles.termTop}>
        {showDirectValue ? (
          <span
            className={styles.placeholderBox}
          />
        ) : (
          <CoefficientBox
            displayValue={displayValue}
            isCorrect={isCorrect ?? false}
          />
        )}
        <span className={styles.formula}>{molecule.formula}</span>
      </span>
      <span className={styles.termBottom}>
        <MiniMolecule molecule={molecule} />
      </span>
    </span>
  );
}

/* ── ReactionDefinition ── */

function ReactionDefinition({
  reaction,
  emphasizeCoefficients = false,
  userCounts,
}: ReactionDefinitionProps) {
  return (
    <div className={styles.reactionDefinition} role="math" aria-label={reaction.name}>
      <div className={styles.side}>
        {reaction.reactants.map((entry, index) => {
          const userCount = userCounts?.get(entry.molecule.id);
          const hasUserCounts = userCounts !== undefined;
          return (
            <span key={entry.molecule.id} className={styles.element}>
              {index > 0 && <span className={styles.operator}>+</span>}
              <Term
                molecule={entry.molecule}
                coefficient={entry.coefficient}
                emphasize={emphasizeCoefficients}
                displayValue={hasUserCounts ? (userCount ?? 0) : undefined}
                isCorrect={hasUserCounts ? (userCount === entry.coefficient) : false}
              />
            </span>
          );
        })}
      </div>

      <span className={styles.arrow}>{'\u2192'}</span>

      <div className={styles.side}>
        {reaction.products.map((entry, index) => {
          const userCount = userCounts?.get(entry.molecule.id);
          const hasUserCounts = userCounts !== undefined;
          return (
            <span key={entry.molecule.id} className={styles.element}>
              {index > 0 && <span className={styles.operator}>+</span>}
              <Term
                molecule={entry.molecule}
                coefficient={entry.coefficient}
                emphasize={emphasizeCoefficients}
                displayValue={hasUserCounts ? (userCount ?? 0) : undefined}
                isCorrect={hasUserCounts ? (userCount === entry.coefficient) : false}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default ReactionDefinition;
