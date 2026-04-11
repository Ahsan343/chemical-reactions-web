import { useParams, useNavigate } from 'react-router-dom';
import { loadFromStorage } from '../../helper/persistence/storage';
import { balancedReactions } from '../../constants/reactions/balancedReactions';
import { limitingReagentReactions } from '../../constants/reactions/limitingReagentReactions';
import { precipitationReactions } from '../../constants/reactions/precipitationReactions';
import type {
  BalancedReactionDef,
  LimitingReagentReactionDef,
  Metal,
} from '../../helper/chemistry/types';
import styles from './FilingCabinet.module.scss';

interface LimitingReagentEntry {
  reactionId: string;
  waterLevel: number;
  moleculeCounts: { limiting: number; excess: number; product: number };
  inputPhase: string;
}

interface PrecipitationEntry {
  completed: boolean;
  reactionId?: string;
  metal?: Metal;
  precipitateMass?: number;
}

type SubunitKey = 'balanced' | 'limiting' | 'precipitation';

const SUBUNIT_TITLES: Record<SubunitKey, string> = {
  balanced: 'Balanced Reactions',
  limiting: 'Limiting Reagent',
  precipitation: 'Precipitation',
};

function formatEquation(reaction: BalancedReactionDef): string {
  const formatSide = (
    entries: { molecule: { formula: string }; coefficient: number }[],
  ) =>
    entries
      .map((e) => (e.coefficient > 1 ? `${e.coefficient}${e.molecule.formula}` : e.molecule.formula))
      .join(' + ');

  return `${formatSide(reaction.reactants)} \u2192 ${formatSide(reaction.products)}`;
}

function formatLimitingEquation(reaction: LimitingReagentReactionDef): string {
  const reactants = [
    reaction.limitingReactant.formula,
    reaction.excessReactant.coefficient > 1
      ? `${reaction.excessReactant.coefficient}${reaction.excessReactant.formula}`
      : reaction.excessReactant.formula,
  ].join(' + ');

  const products = [
    reaction.product.formula,
    ...reaction.byProducts.map((bp) =>
      bp.coefficient > 1 ? `${bp.coefficient}${bp.formula}` : bp.formula,
    ),
  ].join(' + ');

  return `${reactants} \u2192 ${products}`;
}

function BalancedSection() {
  const completedScreens = loadFromStorage<string[]>('completedScreens') ?? [];
  const isComplete = completedScreens.includes('balanced');

  if (!isComplete) {
    return <EmptyState />;
  }

  return (
    <div className={styles.cardList}>
      {balancedReactions.map((reaction) => (
        <div key={reaction.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.reactionName}>{reaction.name}</h3>
            <span className={styles.statusBadge}>Balanced &#10003;</span>
          </div>
          <p className={styles.equation}>{formatEquation(reaction)}</p>
        </div>
      ))}
    </div>
  );
}

function LimitingReagentSection() {
  // Read per-reaction completed experiments first, fall back to legacy single key
  const completedExperiments = loadFromStorage<Record<string, LimitingReagentEntry>>('limitingReagentCompleted');
  const legacyStored = loadFromStorage<LimitingReagentEntry>('limitingReagent');

  // Build list of completed entries from both sources
  const entries: LimitingReagentEntry[] = [];

  if (completedExperiments) {
    Object.values(completedExperiments).forEach((entry) => {
      if (entry.inputPhase === 'complete') {
        entries.push(entry);
      }
    });
  }

  // If legacy key has a completed experiment not already in per-reaction store, include it
  if (legacyStored && legacyStored.inputPhase === 'complete') {
    const alreadyIncluded = entries.some((e) => e.reactionId === legacyStored.reactionId);
    if (!alreadyIncluded) {
      entries.push(legacyStored);
    }
  }

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.cardList}>
      {entries.map((stored) => {
        const reaction = limitingReagentReactions.find((r) => r.id === stored.reactionId);
        if (!reaction) return null;

        const volume = stored.waterLevel * 0.25;
        const gridSize = 80;
        const molarity = stored.moleculeCounts.limiting / gridSize;
        const limitingMoles = volume * molarity;
        const theoreticalMass = limitingMoles * reaction.product.molarMass;
        const actualMass = theoreticalMass * reaction.yield;
        const yieldPercent = theoreticalMass > 0 ? (actualMass / theoreticalMass) * 100 : 0;

        return (
          <div key={stored.reactionId} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.reactionName}>{reaction.name}</h3>
              <span className={styles.statusBadge}>Complete &#10003;</span>
            </div>
            <p className={styles.equation}>{formatLimitingEquation(reaction)}</p>
            <div className={styles.dataRow}>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Theoretical Mass</span>
                <span className={styles.dataValue}>{theoreticalMass.toFixed(4)} g</span>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Actual Mass</span>
                <span className={styles.dataValue}>{actualMass.toFixed(4)} g</span>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Yield</span>
                <span className={`${styles.dataValue} ${styles.accentValue}`}>
                  {yieldPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrecipitationSection() {
  const stored = loadFromStorage<PrecipitationEntry>('precipitationState');
  const completedScreens = loadFromStorage<string[]>('completedScreens') ?? [];
  const isComplete = completedScreens.includes('precipitation') || stored?.completed;

  if (!isComplete) {
    return <EmptyState />;
  }

  return (
    <div className={styles.cardList}>
      {precipitationReactions.map((reaction) => {
        const metals = reaction.metals;
        return (
          <div key={reaction.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.reactionName}>
                {`${reaction.unknownReactant.formulaTemplate} + ${reaction.knownReactant.formula}`}
              </h3>
              <span className={styles.statusBadge}>Complete &#10003;</span>
            </div>
            <p className={styles.equation}>
              {reaction.product.formula} (s) — Molar Mass: {reaction.product.molarMass} g/mol
            </p>
            <div className={styles.dataRow}>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Possible Metals</span>
                <span className={styles.dataValue}>{metals.join(', ')}</span>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Precipitate</span>
                <span className={styles.dataValue}>{reaction.product.formula}</span>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Product Molar Mass</span>
                <span className={`${styles.dataValue} ${styles.accentValue}`}>
                  {reaction.product.molarMass} g/mol
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{'\uD83D\uDDC4'}</div>
      <p className={styles.emptyText}>No experiments completed yet</p>
    </div>
  );
}

export default function FilingCabinet() {
  const { subunit } = useParams<{ subunit: string }>();
  const navigate = useNavigate();

  const key = (subunit ?? 'balanced') as SubunitKey;
  const title = SUBUNIT_TITLES[key] ?? 'Filing Cabinet';

  const renderContent = () => {
    switch (key) {
      case 'balanced':
        return <BalancedSection />;
      case 'limiting':
        return <LimitingReagentSection />;
      case 'precipitation':
        return <PrecipitationSection />;
      default:
        return <EmptyState />;
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          &#8592;
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {renderContent()}
    </div>
  );
}
