import { useMemo } from 'react';
import type { LimitingReagentReactionDef } from '../../../helper/chemistry/types';
import HighlightOverlay from '../../shared/HighlightOverlay/HighlightOverlay';
import styles from './LimitingEquationView.module.scss';

type EquationState = 'blank' | 'theoretical' | 'actual';

export type LimitingEquationHighlight =
  | 'limitingReactantMolesToVolume'
  | 'neededExcessReactantMoles'
  | 'theoreticalProductMass'
  | 'productYieldPercentage';

interface LimitingEquationViewProps {
  equationState: EquationState;
  reactionProgress: number;
  reaction: LimitingReagentReactionDef;
  limitingMoles: number;
  volume: number;
  /**
   * When non-empty, only the named equation cells render at full intensity —
   * the rest are dimmed via HighlightOverlay. When empty, all cells render
   * without any dimming. Mirrors iOS `highlights.elements`.
   */
  highlights?: ReadonlySet<LimitingEquationHighlight>;
}

interface EquationData {
  molarity: number;
  limitingMoles: number;
  neededExcessMoles: number;
  theoreticalProductMoles: number;
  theoreticalProductMass: number;
  reactingExcessMoles: number;
  reactingExcessMass: number;
  actualProductMoles: number;
  actualProductMass: number;
  yieldPercent: number;
}

function computeEquationData(
  reaction: LimitingReagentReactionDef,
  limitingMoles: number,
  volume: number,
  progress: number,
): EquationData {
  const molarity = volume > 0 ? limitingMoles / volume : 0;
  const excessCoeff = reaction.excessReactant.coefficient;
  const neededExcessMoles = excessCoeff * limitingMoles;
  const theoreticalProductMoles = limitingMoles;
  const theoreticalProductMass = theoreticalProductMoles * reaction.product.molarMass;

  const yieldFraction = reaction.yield * progress;
  const actualProductMoles = theoreticalProductMoles * yieldFraction;
  const actualProductMass = actualProductMoles * reaction.product.molarMass;

  const reactingExcessMoles = excessCoeff * actualProductMoles;
  const reactingExcessMass = reactingExcessMoles * reaction.excessReactant.molarMass;

  const yieldPercent = progress > 0 ? yieldFraction * 100 : 0;

  return {
    molarity,
    limitingMoles,
    neededExcessMoles,
    theoreticalProductMoles,
    theoreticalProductMass,
    reactingExcessMoles,
    reactingExcessMass,
    actualProductMoles,
    actualProductMass,
    yieldPercent,
  };
}

function fmt(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function Term({ base, sub, underline }: { base: string; sub: string; underline?: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <span>
        <span className={styles.termBase}>{base}</span>
        <span className={styles.termSub}>{sub}</span>
      </span>
      {underline && <span className={styles.termUnderline}>({underline})</span>}
    </span>
  );
}

function Placeholder({ value }: { value: string | null }) {
  return (
    <span className={`${styles.placeholder} ${value === null ? styles.placeholderEmpty : ''}`}>
      {value ?? '?'}
    </span>
  );
}

export default function LimitingEquationView({
  equationState,
  reactionProgress,
  reaction,
  limitingMoles,
  volume,
  highlights,
}: LimitingEquationViewProps) {
  const data = useMemo(
    () => computeEquationData(reaction, limitingMoles, volume, reactionProgress),
    [reaction, limitingMoles, volume, reactionProgress],
  );

  const showTheoretical = equationState === 'theoretical' || equationState === 'actual';
  const showActual = equationState === 'actual';

  const lr = reaction.limitingReactant.formula;
  const er = reaction.excessReactant.formula;
  const pr = reaction.product.formula;

  const hasActiveHighlight = (highlights?.size ?? 0) > 0;
  const isCellHighlighted = (target: LimitingEquationHighlight) =>
    !hasActiveHighlight || (highlights?.has(target) ?? false);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Top row, col 1: Limiting reactant moles */}
        <HighlightOverlay highlighted={isCellHighlighted('limitingReactantMolesToVolume')}>
        <div className={`${styles.cell} ${showTheoretical ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={styles.equationLine}>
                <Term base="n" sub={lr} />
              </div>
              <div className={styles.equationLine}>
                <Placeholder value={showTheoretical ? fmt(data.limitingMoles, 2) : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={styles.equationLine}>
                = V &times; <Term base="M" sub={lr} />
              </div>
              <div className={styles.equationLine}>
                ={' '}
                <span className={styles.orangeValue}>{fmt(volume, 2)}</span>
                {' \u00D7 '}
                <Placeholder value={showTheoretical ? fmt(data.molarity, 2) : null} />
              </div>
            </div>
          </div>
        </div>

        </HighlightOverlay>

        {/* Top row, col 2: Excess reactant needed moles */}
        <HighlightOverlay highlighted={isCellHighlighted('neededExcessReactantMoles')}>
        <div className={`${styles.cell} ${showTheoretical ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={styles.equationLine}>
                <Term base="n" sub={er} underline="needed" />
              </div>
              <div className={styles.equationLine}>
                <Placeholder value={showTheoretical ? fmt(data.neededExcessMoles, 2) : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={styles.equationLine}>
                = {reaction.excessReactant.coefficient} &times; <Term base="n" sub={lr} />
              </div>
              <div className={styles.equationLine}>
                = {reaction.excessReactant.coefficient} &times;{' '}
                <Placeholder value={showTheoretical ? fmt(data.limitingMoles, 2) : null} />
              </div>
            </div>
          </div>
        </div>

        </HighlightOverlay>

        {/* Top row, col 3: Theoretical product mass */}
        <HighlightOverlay highlighted={isCellHighlighted('theoreticalProductMass')}>
        <div className={`${styles.cell} ${showTheoretical ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={styles.equationLine}>
                <Term base="m" sub={pr} underline="theoretical" />
              </div>
              <div className={styles.equationLine}>
                <Placeholder value={showTheoretical ? fmt(data.theoreticalProductMass, 2) : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={styles.equationLine}>
                = <Term base="n" sub={pr} underline="theoretical" /> &times; <Term base="MM" sub={pr} />
              </div>
              <div className={styles.equationLine}>
                ={' '}
                <Placeholder value={showTheoretical ? fmt(data.theoreticalProductMoles, 2) : null} />
                {' \u00D7 '}
                {reaction.product.molarMass}
              </div>
            </div>
          </div>
        </div>

        </HighlightOverlay>

        {/* Bottom row, col 1: Reacting excess reactant moles (fraction) — no iOS highlight target, dim when any highlight active */}
        <HighlightOverlay highlighted={!hasActiveHighlight}>
        <div className={`${styles.cell} ${showActual ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                <Term base="n" sub={er} underline="reacts" />
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                <Placeholder value={showActual ? fmt(data.reactingExcessMoles, 2) : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                ={' '}
                <span className={styles.fraction}>
                  <span className={styles.numerator}>
                    <Term base="n" sub={er} />
                  </span>
                  <span className={styles.divider} style={{ minWidth: 80 }} />
                  <span className={styles.denominator}>
                    <Term base="MM" sub={er} />
                  </span>
                </span>
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                ={' '}
                <span className={styles.fraction}>
                  <span className={styles.numerator}>
                    <Placeholder value={showActual ? fmt(data.reactingExcessMass, 2) : null} />
                  </span>
                  <span className={styles.divider} style={{ minWidth: 50 }} />
                  <span className={styles.denominator}>
                    {reaction.excessReactant.molarMass}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        </HighlightOverlay>

        {/* Bottom row, col 2: Actual product mass — no iOS highlight target, dim when any highlight active */}
        <HighlightOverlay highlighted={!hasActiveHighlight}>
        <div className={`${styles.cell} ${showActual ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                <Term base="m" sub={pr} underline="actual" />
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                <Placeholder value={showActual ? fmt(data.actualProductMass, 2) : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                = <Term base="n" sub={pr} underline="actual" /> &times; <Term base="MM" sub={pr} />
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                ={' '}
                <Placeholder value={showActual ? fmt(data.actualProductMoles, 2) : null} />
                {' \u00D7 '}
                {reaction.product.molarMass}
              </div>
            </div>
          </div>
        </div>

        </HighlightOverlay>

        {/* Bottom row, col 3: Yield percentage (fraction) */}
        <HighlightOverlay highlighted={isCellHighlighted('productYieldPercentage')}>
        <div className={`${styles.cell} ${showActual ? styles.visible : styles.hidden}`}>
          <div className={styles.equationRow}>
            <div className={styles.lhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                y(%)
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                <Placeholder value={showActual ? `${fmt(data.yieldPercent, 0)}%` : null} />
              </div>
            </div>
            <div className={styles.rhsColumn}>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                ={' '}
                <span className={styles.fraction}>
                  <span className={styles.numerator}>
                    <Term base="m" sub={pr} underline="actual" />
                  </span>
                  <span className={styles.divider} style={{ minWidth: 80 }} />
                  <span className={styles.denominator}>
                    <Term base="m" sub={pr} underline="theoretical" />
                  </span>
                </span>
                {' \u00D7 100'}
              </div>
              <div className={`${styles.equationLine} ${styles.doubleLine}`}>
                ={' '}
                <span className={styles.fraction}>
                  <span className={styles.numerator}>
                    <Placeholder value={showActual ? fmt(data.actualProductMass, 2) : null} />
                  </span>
                  <span className={styles.divider} style={{ minWidth: 80 }} />
                  <span className={styles.denominator}>
                    <Placeholder value={showTheoretical ? fmt(data.theoreticalProductMass, 2) : null} />
                  </span>
                </span>
                {' \u00D7 100'}
              </div>
            </div>
          </div>
        </div>
        </HighlightOverlay>
      </div>
    </div>
  );
}
