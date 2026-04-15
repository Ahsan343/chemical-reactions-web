import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Molecule } from '../../../helper/chemistry/types';
import MoleculeView from '../MoleculeView/MoleculeView';
import styles from './GhostMolecule.module.scss';

interface GhostMoleculeProps {
  /** Molecule to render as the tutorial ghost (the first reactant). */
  molecule: Molecule;
  /** Only animate while this is true. */
  active: boolean;
}

interface Rect {
  left: number;
  top: number;
}

/**
 * iOS parity: while the drag tutorial is active, an animated translucent copy
 * of the first reactant molecule moves from its position in the molecule grid
 * to the centre of the reactant beaker, repeating forever. An open hand icon
 * appears below the molecule while it moves.
 *
 * Uses `position: fixed` plus getBoundingClientRect() so we can animate between
 * two DOM nodes that live in different subtrees. Source: `[data-tutorial-source="first-reactant"]`
 * Target: `[data-beaker="reactant-beaker"]`
 */
export default function GhostMolecule({ molecule, active }: GhostMoleculeProps) {
  const [positions, setPositions] = useState<{ start: Rect; end: Rect } | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setPositions(null);
      return;
    }

    const measure = () => {
      const source = document.querySelector<HTMLElement>(
        '[data-tutorial-source="first-reactant"]',
      );
      const target = document.querySelector<HTMLElement>(
        '[data-beaker="reactant-beaker"]',
      );
      if (!source || !target) {
        setPositions(null);
        return;
      }

      const srcRect = source.getBoundingClientRect();
      const tgtRect = target.getBoundingClientRect();

      setPositions({
        start: {
          left: srcRect.left + srcRect.width / 2,
          top: srcRect.top + srcRect.height / 2,
        },
        end: {
          left: tgtRect.left + tgtRect.width / 2,
          top: tgtRect.top + tgtRect.height / 2,
        },
      });
    };

    // Measure after layout settles
    measure();

    // Re-measure on resize or scroll (layout-affecting)
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    // Also re-measure shortly after mount to catch any post-paint shifts
    const t = window.setTimeout(measure, 60);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.clearTimeout(t);
    };
  }, [active, molecule.id]);

  if (!active || !positions) return null;

  const style: React.CSSProperties = {
    ['--start-x' as string]: `${positions.start.left}px`,
    ['--start-y' as string]: `${positions.start.top}px`,
    ['--end-x' as string]: `${positions.end.left}px`,
    ['--end-y' as string]: `${positions.end.top}px`,
  };

  // Portal to document.body so that `position: fixed` and the computed
  // viewport coordinates aren't re-scaled by ResponsiveLayout's transform
  // ancestor. Without this, on mobile / scaled screens the ghost animates
  // between the wrong pixel positions (offset from the actual grid & beaker).
  return createPortal(
    <div className={styles.ghostOverlay} style={style} aria-hidden="true">
      <div className={styles.ghost}>
        <div className={styles.moleculeWrap}>
          <MoleculeView molecule={molecule} atomSize={28} />
        </div>
        <img
          className={styles.hand}
          src="/openhand.png"
          alt=""
          width={36}
          height={40}
          draggable={false}
        />
      </div>
    </div>,
    document.body,
  );
}
