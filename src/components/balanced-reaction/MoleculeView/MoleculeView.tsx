import { useMemo } from 'react';
import { type Atom, type AtomCount, type Molecule } from '../../../helper/chemistry/types';
import { atomInfoMap } from '../../../helper/chemistry/atoms';
import styles from './MoleculeView.module.scss';

interface MoleculeViewProps {
  molecule: Molecule;
  atomSize?: number;
  showSymbols?: boolean;
}

interface AtomPosition {
  atom: Atom;
  x: number;
  y: number;
}

function expandAtoms(atoms: AtomCount[]): Atom[] {
  const result: Atom[] = [];
  for (const { atom, count } of atoms) {
    for (let i = 0; i < count; i++) {
      result.push(atom);
    }
  }
  return result;
}

function computeLayout(atomList: Atom[], size: number): AtomPosition[] {
  const totalAtoms = atomList.length;
  const spacing = size * 0.85;

  if (totalAtoms === 1) {
    return [{ atom: atomList[0], x: size, y: size }];
  }

  if (totalAtoms === 2) {
    return [
      { atom: atomList[0], x: size - spacing / 2, y: size },
      { atom: atomList[1], x: size + spacing / 2, y: size },
    ];
  }

  if (totalAtoms === 3) {
    const triangleOffsetY = spacing * 0.3;
    return [
      { atom: atomList[0], x: size, y: size - triangleOffsetY },
      { atom: atomList[1], x: size - spacing / 2, y: size + triangleOffsetY },
      { atom: atomList[2], x: size + spacing / 2, y: size + triangleOffsetY },
    ];
  }

  if (totalAtoms === 4) {
    const half = spacing / 2;
    return [
      { atom: atomList[0], x: size - half, y: size - half },
      { atom: atomList[1], x: size + half, y: size - half },
      { atom: atomList[2], x: size - half, y: size + half },
      { atom: atomList[3], x: size + half, y: size + half },
    ];
  }

  const cols = Math.ceil(Math.sqrt(totalAtoms));
  const rows = Math.ceil(totalAtoms / cols);
  const gridWidth = (cols - 1) * spacing;
  const gridHeight = (rows - 1) * spacing;
  const startX = size - gridWidth / 2;
  const startY = size - gridHeight / 2;

  return atomList.map((atom, index) => ({
    atom,
    x: startX + (index % cols) * spacing,
    y: startY + Math.floor(index / cols) * spacing,
  }));
}

function MoleculeView({
  molecule,
  atomSize = 20,
  showSymbols = true,
}: MoleculeViewProps) {
  const atomList = useMemo(() => expandAtoms(molecule.atoms), [molecule.atoms]);

  const positions = useMemo(
    () => computeLayout(atomList, atomSize),
    [atomList, atomSize],
  );

  const radius = atomSize / 2;
  const fontSize = atomSize * 0.75;

  const svgBounds = useMemo(() => {
    if (positions.length === 0) {
      return { minX: 0, minY: 0, width: atomSize * 2, height: atomSize * 2 };
    }
    const minX = Math.min(...positions.map((p) => p.x)) - radius;
    const minY = Math.min(...positions.map((p) => p.y)) - radius;
    const maxX = Math.max(...positions.map((p) => p.x)) + radius;
    const maxY = Math.max(...positions.map((p) => p.y)) + radius;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [positions, atomSize, radius]);

  return (
    <svg
      className={styles.moleculeView}
      width={svgBounds.width}
      height={svgBounds.height}
      viewBox={`${svgBounds.minX} ${svgBounds.minY} ${svgBounds.width} ${svgBounds.height}`}
      role="img"
      aria-label={molecule.name}
    >
      {positions.map((pos, index) => {
        const info = atomInfoMap[pos.atom];
        return (
          <g key={index}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={info.color}
            />
            {showSymbols && (
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={fontSize}
                fontWeight={600}
                className={styles.atomSymbol}
              >
                {info.symbol}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default MoleculeView;
