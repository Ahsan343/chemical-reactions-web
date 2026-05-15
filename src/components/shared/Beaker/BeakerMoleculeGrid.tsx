import styles from './Beaker.module.scss';

interface MoleculeDot {
  /** CSS color string */
  color: string;
  /** X position as fraction (0-1) within the grid */
  x: number;
  /** Y position as fraction (0-1) within the grid */
  y: number;
  /** Optional opacity (0-1) for fade transitions during reactions */
  opacity?: number;
  /** Optional stacking order */
  zIndex?: number;
}

interface BeakerMoleculeGridProps {
  /** Array of molecule dots to render */
  molecules: MoleculeDot[];
  /** Diameter of each dot in pixels */
  dotSize?: number;
  /** Whether dots should animate in with a fade */
  animated?: boolean;
}

export function BeakerMoleculeGrid({
  molecules,
  dotSize = 10,
  animated = false,
}: BeakerMoleculeGridProps) {
  return (
    <div className={styles.moleculeGridContainer}>
      {molecules.map((mol, i) => (
        <div
          key={i}
          className={`${styles.moleculeDot} ${animated ? styles.moleculeDotAnimated : ''}`}
          style={{
            left: `${mol.x * 100}%`,
            top: `${mol.y * 100}%`,
            width: dotSize,
            height: dotSize,
            backgroundColor: mol.color,
            opacity: mol.opacity !== undefined ? mol.opacity : undefined,
            zIndex: mol.zIndex,
            transition: mol.opacity !== undefined ? 'opacity 0.3s ease' : undefined,
            animationDelay: animated ? `${i * 30}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export type { MoleculeDot, BeakerMoleculeGridProps };
export default BeakerMoleculeGrid;
