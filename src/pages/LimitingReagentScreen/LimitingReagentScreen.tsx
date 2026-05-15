import { useCallback, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useCanvasScale } from '../../layout/ResponsiveLayout';
import { useLimitingReagentState } from './hooks/useLimitingReagentState';

import { FillableBeaker } from '../../components/shared/Beaker/FillableBeaker';
import BeakerMoleculeGrid from '../../components/shared/Beaker/BeakerMoleculeGrid';
import ShakingContainer from '../../components/shared/ShakingContainer/ShakingContainer';
import BeakyBox from '../../components/shared/BeakyBox/BeakyBox';
import DropdownSelector from '../../components/shared/DropdownSelector/DropdownSelector';
import BranchMenu from '../../components/shared/BranchMenu/BranchMenu';
import LeftSidebar from '../../components/shared/LeftSidebar/LeftSidebar';
import RightActionButtons from '../../components/shared/RightActionButtons/RightActionButtons';
import HighlightOverlay from '../../components/shared/HighlightOverlay/HighlightOverlay';
import EquationDisplay from '../../components/shared/EquationDisplay/EquationDisplay';
import type { EquationSegment } from '../../components/shared/EquationDisplay/EquationDisplay';
import LimitingEquationView, { type LimitingEquationHighlight } from '../../components/limiting-reagent/LimitingEquationView/LimitingEquationView';
import { MIN_WATER_LEVEL } from './hooks/useLimitingReagentState';
import ProgressChart from '../../components/limiting-reagent/ProgressChart/ProgressChart';

import styles from './LimitingReagentScreen.module.scss';

function buildReactionSegments(reaction: {
  limitingReactant: { formula: string; state: string; };
  excessReactant: { formula: string; state: string; coefficient: number; };
  product: { formula: string; state: string; };
  byProducts: { formula: string; state: string; coefficient: number; }[];
}): EquationSegment[] {
  const segments: EquationSegment[] = [];

  if (reaction.excessReactant.coefficient > 1) {
    segments.push({ text: String(reaction.excessReactant.coefficient), isCoefficient: true });
  }
  segments.push({ text: reaction.excessReactant.formula });
  segments.push({ text: `(${reaction.excessReactant.state})`, isState: true });
  segments.push({ text: ' + ' });
  segments.push({ text: reaction.limitingReactant.formula });
  segments.push({ text: `(${reaction.limitingReactant.state})`, isState: true });
  segments.push({ text: ' \u2192 ' });

  const products = [
    ...reaction.byProducts.map((bp) => ({
      formula: bp.formula,
      state: bp.state,
      coefficient: bp.coefficient,
    })),
    { formula: reaction.product.formula, state: reaction.product.state, coefficient: 1 },
  ];

  products.forEach((prod, idx) => {
    if (idx > 0) {
      segments.push({ text: ' + ' });
    }
    if (prod.coefficient > 1) {
      segments.push({ text: String(prod.coefficient), isCoefficient: true });
    }
    segments.push({ text: prod.formula });
    segments.push({ text: `(${prod.state})`, isState: true });
  });

  return segments;
}

export default function LimitingReagentScreen() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const exploreMode = searchParams.get('mode') === 'explore';
  const state = useLimitingReagentState(exploreMode);

  const dropdownOptions = state.reactions.map((r) => ({
    id: r.id,
    label: r.name,
  }));

  const handleSelectReaction = useCallback(
    (id: string) => {
      const reaction = state.reactions.find((r) => r.id === id);
      if (reaction) {
        state.selectReaction(reaction);
      }
    },
    [state],
  );

  const handlePourLimiting = useCallback(() => {
    state.addMolecules('limiting', 5);
  }, [state]);

  const handlePourExcess = useCallback(() => {
    state.addMolecules('excess', 5);
  }, [state]);

  const reactionSegments = useMemo(() => {
    if (!state.selectedReaction) return [];
    return buildReactionSegments(state.selectedReaction);
  }, [state.selectedReaction]);

  const r = state.selectedReaction;

  const beakyStatement = useMemo(() => {
    if (exploreMode) {
      if (!r) {
        return [{ text: 'Free Explore: Choose a reaction to begin experimenting freely.' }];
      }
      if (state.inputPhase === 'complete') {
        return [
          { text: 'Reaction complete! Yield: ' },
          { text: `${state.yieldPercent.toFixed(0)}%`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '. Click Next to try again.' },
        ];
      }
      if (state.isReacting) {
        return [{ text: 'Reaction in progress...' }];
      }
      return [{ text: 'Adjust water level, add reactants freely, then click React when ready.' }];
    }

    switch (state.inputPhase) {
      case 'selectReaction':
        return [
          { text: 'Now that we know how reactions have their own equation, we should learn now how to use them to determine desired data. ' },
          { text: 'Choose a reaction.', bold: true, color: 'rgb(220, 84, 59)' },
        ];

      // --- Educational intro (steps 2-6) ---
      case 'introStoichiometry':
        return [
          { text: 'The section of Chemistry that uses relations between compounds in a reaction to determine data is called ' },
          { text: 'Stoichiometry', bold: true },
          { text: ". Let's analyze the equation chosen." },
        ];
      case 'introPhysicalStates':
        return [
          { text: 'We already knew about the Stoichiometric Coefficients, but what are those sub indexes at the right of each compound? Well, those indicate the ' },
          { text: 'physical state', bold: true },
          { text: ' of the molecule.' },
        ];
      case 'introPhysicalStatesDetail':
        return [
          { text: "So, let's see: " },
          { text: '(aq)', bold: true },
          { text: ' stands for aqueous, which means that the compound is dissolved in water. ' },
          { text: '(l)', bold: true },
          { text: ' means liquid, ' },
          { text: '(s)', bold: true },
          { text: ' solid and ' },
          { text: '(g)', bold: true },
          { text: ' gaseous. But could we use molecules in real life?' },
        ];
      case 'introMoles':
        return [
          { text: "Well, we usually can't. Remember that the Stoichiometric Coefficients represent the molecules, but at the same time, for practical reason, we talk about " },
          { text: 'moles', bold: true },
          { text: '.' },
        ];
      case 'introAvogadro':
        return [
          { text: '1 mol = ' },
          { text: '6.02214076\u00D710\u00B2\u00B3', bold: true },
          { text: " (the Avogadro number). When we talk about particles (say molecules, atoms, ions). It's a very convenient unit to use in Stoichiometry." },
        ];

      // --- Set water level (iOS step 7) ---
      case 'setWaterLevel':
        return [
          { text: 'This reaction takes place in water as we already know, so let\'s first set the volume of water (in liters) in the beaker. Volume is often represented by the letter ' },
          { text: 'V', bold: true },
          { text: '. ' },
          { text: 'Use the slider to set the volume.', bold: true, color: 'rgb(220, 84, 59)' },
        ];

      // --- Add limiting reactant (iOS step 8) ---
      case 'addLimiting': {
        const byProductsText = r?.byProducts?.map(bp => bp.formula).join(' and ') ?? '';
        const productsText = byProductsText
          ? `${byProductsText} and ${r?.product.formula ?? ''}`
          : r?.product.formula ?? '';

        return [
          { text: 'Perfect! Now, the reactants of this reaction are ' },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: ' and ' },
          { text: r?.limitingReactant.formula ?? '', bold: true, color: r?.limitingReactant.color },
          { text: `. When these two interact, they produce ` },
          { text: productsText, bold: true, color: r?.product.color },
          // Blueprint slide 37 hardcodes "solid" here (the user is shaking a
          // solid powder into water) regardless of the limiting reactant's
          // listed dissolved-state. Per "blueprint = source of truth".
          { text: `. In this particular case, we have the solid ` },
          { text: r?.limitingReactant.formula ?? '', bold: true, color: r?.limitingReactant.color },
          { text: ', so ' },
          { text: `shake it into the beaker.`, bold: true, color: 'rgb(220, 84, 59)' },
        ];
      }

      // --- Post-limiting narrative (iOS steps 9-14) ---
      case 'explainMolarity':
        return [
          { text: `Awesome! So you are preparing a ` },
          { text: 'solution', bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.limitingReactant.formula ?? ''} right now. An important concept related to this, is ` },
          { text: 'Molarity (M)', bold: true },
          { text: '. ' },
          { text: 'Molarity', bold: true, color: 'rgb(220, 84, 59)' },
          { text: ' is a way to express the concentration of a substance in the solution, in units of ' },
          { text: 'mol/L', bold: true, color: 'rgb(220, 84, 59)' },
          { text: '.' },
        ];
      case 'showLimitingMolarity':
        return [
          { text: `So right now, the Molarity of ` },
          { text: r?.limitingReactant.formula ?? '', bold: true, color: r?.limitingReactant.color },
          { text: ' in this solution is ' },
          { text: `${state.molarity.toFixed(2)}M`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` or ` },
          { text: `${state.molarity.toFixed(2)} moles/L`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: `. This means that for each liter of substance, there is ${state.molarity.toFixed(2)} moles of ${r?.limitingReactant.formula ?? ''}. ` },
          { text: 'But we already know how many liters there are right?', bold: true, color: 'rgb(220, 84, 59)' },
        ];
      case 'showLimitingMoles':
        return [
          { text: `Since there are ` },
          { text: `${state.volume.toFixed(3)} L`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ' of water in the beaker, there are ' },
          { text: `${state.limitingMoles.toFixed(2)} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ` },
          { text: r?.limitingReactant.formula ?? '', bold: true, color: r?.limitingReactant.color },
          { text: ` present in the solution (Moles = V x M). But what else can we determine by knowing the moles of this reactant? Let's see..` },
        ];
      case 'showNeededExcess':
        return [
          { text: `So we know that for this reactant to be consumed completely, each ` },
          { text: `1 mol`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.limitingReactant.formula ?? ''} has to react with ` },
          { text: `${r?.excessReactant.coefficient ?? 1} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.excessReactant.formula ?? ''}. So we would need ` },
          { text: `${state.excessNeeded.toFixed(2)} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.excessReactant.formula ?? ''}. Let's call it ${r?.excessReactant.formula ?? ''} needed.` },
        ];
      case 'showTheoreticalProduct':
        return [
          { text: `Let's look at the stoichiometric relation in the reaction. By each ` },
          { text: `1 mol`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.limitingReactant.formula ?? ''} that reacts, so in theory if it reacts in its entirety, ` },
          { text: `${state.limitingMoles.toFixed(2)} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.limitingReactant.formula ?? ''} should produce ` },
          { text: `${state.productMoles.toFixed(2)} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ${r?.product.formula ?? ''}` },
        ];
      case 'showTheoreticalMass':
        return [
          { text: 'And by knowing the ' },
          { text: 'Molar Mass (MM sometimes referred to as M, in g/mol)', bold: true },
          { text: ` of the compound, we can calculate the mass produced. Theoretically, ` },
          { text: `${state.theoreticalMass.toFixed(2)} grams`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ` of ` },
          { text: `${r?.product.formula ?? ''}`, bold: true, color: r?.product.color },
          { text: ` should be produced if all the ` },
          { text: `${r?.limitingReactant.formula ?? ''}`, bold: true, color: r?.limitingReactant.color },
          { text: ` reacts.` },
        ];

      // --- Add excess reactant (iOS step 15) ---
      case 'addExcess':
        return [
          { text: `Let's call that ${r?.product.formula ?? ''} theoretical. Let's add now the other reactant, the ${r?.excessReactant.formula ?? ''}, and see the reaction going. ` },
          { text: `Shake ${r?.excessReactant.formula ?? ''} into the beaker.`, bold: true, color: 'rgb(220, 84, 59)' },
        ];

      // --- Reaction (iOS step 16) ---
      case 'reacting':
        return [
          { text: `Awesome! Now let's wait for the ` },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: ' to be produced. Using the Molar Mass of ' },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: ' we can know really how many grams of it is being produced. Let\'s call that the ' },
          { text: `actual ${r?.product.formula ?? ''}\n`, bold: true, color: r?.product.color },
          { text: 'Keep shaking.', bold: true, color: 'rgb(220, 84, 59)' },
        ];

      // --- Post-reaction narrative (iOS steps 17-19) ---
      case 'endReaction':
        return [
          { text: 'Done! You added the amount needed of ' },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: '. But wait a minute, the actual mass of ' },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: ' is ' },
          { text: `${state.actualMass.toFixed(2)}g`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: ', being still lower than what we expected, the theoretical ' },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: ' ' },
          { text: `${state.theoreticalMass.toFixed(2)}g`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '.' },
        ];
      case 'explainYieldConcept':
        return [
          { text: 'Well, this is because in real life, the ideal values of the products are not obtained. An important concept is ' },
          { text: 'Yield Percentage', bold: true },
          { text: '. This percentage represents how close or far from theory is the real mass obtained of the product.' },
        ];
      case 'showYieldPercentage':
        return [
          { text: 'Yield Percentage is determined as the ratio of the Actual Yield (actual mass obtained of ' },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: ') and Theoretical Yield (the expected mass of ' },
          { text: r?.product.formula ?? '', bold: true, color: r?.product.color },
          { text: '). In this case, the Yield Percentage is ' },
          { text: `${state.yieldPercent.toFixed(0)}%`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '.' },
        ];

      // --- Extra excess (iOS step 20) ---
      case 'addExtraExcess':
        return [
          { text: `Do you think we could improve that percentage by adding even more ` },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: "? " },
          { text: `Let's see, shake ${r?.excessReactant.formula ?? ''} into the beaker.`, bold: true, color: 'rgb(220, 84, 59)' },
        ];

      // --- Post-extra-excess narrative (iOS steps 21-23) ---
      case 'explainExcessNotReacting':
        return [
          { text: 'Wow! ' },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: ' is accumulating. But the reaction is not taking place. ' },
          { text: 'Why is this?', bold: true, color: 'rgb(220, 84, 59)' },
        ];
      case 'explainLimitingReagent':
        return [
          { text: `Very simple! There is not enough ${r?.limitingReactant.formula ?? ''}, we only added so much of it (` },
          { text: `${state.limitingMoles.toFixed(2)} moles`, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '). In stoichiometry, this is called the ' },
          { text: 'Limiting Reagent', bold: true },
          { text: `, as ` },
          { text: r?.limitingReactant.formula ?? '', bold: true, color: r?.limitingReactant.color },
          { text: ` is the compound that limits the reaction as there is a shortage of it.` },
        ];
      case 'explainExcessReactant':
        return [
          { text: `When this happens, the other reactant would be the ` },
          { text: 'Excess Reactant', bold: true },
          { text: `, in this case ` },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: `. There's an excess of ` },
          { text: r?.excessReactant.formula ?? '', bold: true, color: r?.excessReactant.color },
          { text: `, making it accumulate instead of react. Awesome right? Let's learn more about stoichiometry.` },
        ];

      // --- Complete ---
      case 'complete':
        return [
          { text: 'Now, let\'s repeat the experiment with the other reaction!' },
        ];

      default:
        return [{ text: '' }];
    }
  }, [state.inputPhase, r, state.yieldPercent, state.isReacting, state.molarity, state.volume,
      state.limitingMoles, state.excessNeeded, state.productMoles, state.theoreticalMass,
      state.actualMass, exploreMode]);

  const handleNext = useCallback(() => {
    state.next();
  }, [state]);

  const handleBack = useCallback(() => {
    state.goBack();
  }, [state]);

  const showBack = state.inputPhase !== 'selectReaction';
  const hasReaction = state.selectedReaction !== null;

  // Determine which containers are active
  const limitingActive = exploreMode
    ? (hasReaction && !state.isReacting)
    : state.inputPhase === 'addLimiting';
  const excessActive = exploreMode
    ? hasReaction
    // Ted 4.28 / slide 47: keep excess container active during 'reacting' so
    // student can continue shaking through the reaction animation.
    : (state.inputPhase === 'addExcess'
        || state.inputPhase === 'reacting'
        || state.inputPhase === 'addExtraExcess');

  // --- iOS parity: per-step highlight targets (mirrors ScreenElement enum) ---
  // In explore mode or complete/no-highlight steps, nothing is dimmed (all highlighted).
  type HighlightTarget =
    | 'selectReaction'
    | 'reactionDefinitionStates'
    | 'beakerSlider'
    | 'limitingReactantContainer'
    | 'excessReactantContainer'
    | LimitingEquationHighlight;

  const activeHighlights = useMemo<ReadonlySet<HighlightTarget>>(() => {
    if (exploreMode) return new Set();
    switch (state.inputPhase) {
      case 'selectReaction':
        return new Set<HighlightTarget>(['selectReaction', 'beakerSlider']);
      case 'introPhysicalStates':
        return new Set<HighlightTarget>(['reactionDefinitionStates']);
      case 'setWaterLevel':
        return new Set<HighlightTarget>(['beakerSlider']);
      case 'addLimiting':
        // Beaker must stay visible — user is pouring INTO it
        return new Set<HighlightTarget>(['limitingReactantContainer', 'beakerSlider']);
      case 'showLimitingMoles':
        return new Set<HighlightTarget>(['limitingReactantMolesToVolume']);
      case 'showNeededExcess':
        return new Set<HighlightTarget>(['neededExcessReactantMoles']);
      case 'showTheoreticalMass':
        return new Set<HighlightTarget>(['theoreticalProductMass']);
      case 'addExcess':
      case 'addExtraExcess':
        // Beaker must stay visible — user is pouring INTO it
        return new Set<HighlightTarget>(['excessReactantContainer', 'beakerSlider']);
      case 'showYieldPercentage':
        return new Set<HighlightTarget>(['productYieldPercentage']);
      default:
        return new Set();
    }
  }, [exploreMode, state.inputPhase]);

  const hasAny = activeHighlights.size > 0;
  const isHighlighted = (t: HighlightTarget) => !hasAny || activeHighlights.has(t);

  // Build equation-cell highlight set for LimitingEquationView
  const equationHighlights = useMemo<ReadonlySet<LimitingEquationHighlight>>(() => {
    const s = new Set<LimitingEquationHighlight>();
    (['limitingReactantMolesToVolume', 'neededExcessReactantMoles', 'theoreticalProductMass', 'productYieldPercentage'] as const).forEach((k) => {
      if (activeHighlights.has(k)) s.add(k);
    });
    return s;
  }, [activeHighlights]);

  const canvasScale = useCanvasScale();

  // Measure bottle→beaker fall distance for pour animation (iOS: 200pt/s linear drop)
  const containersRef = useRef<HTMLDivElement>(null);
  const beakerRef = useRef<HTMLDivElement>(null);
  const [fallDistance, setFallDistance] = useState('120px');

  useLayoutEffect(() => {
    const measure = () => {
      const cEl = containersRef.current;
      const bEl = beakerRef.current;
      if (cEl && bEl) {
        const cRect = cEl.getBoundingClientRect();
        const s = canvasScale > 0 ? canvasScale : 1;
        // Find the water surface marker inside the beaker area
        const waterSurface = bEl.querySelector('[data-water-surface]');
        if (waterSurface) {
          const wsRect = waterSurface.getBoundingClientRect();
          const dist = (wsRect.top - cRect.bottom) / s;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        } else {
          // Fallback: 40% into beaker
          const bRect = bEl.getBoundingClientRect();
          const dist = (bRect.top + bRect.height * 0.4 - cRect.bottom) / s;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        }
      }
    };
    // Small delay to let CSS transitions settle after waterLevel changes
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [hasReaction, state.waterLevel, canvasScale]);

  return (
    <div className={styles.screen}>
      <LeftSidebar />
      <RightActionButtons
        onPlay={hasReaction ? state.next : undefined}
        onUndo={hasReaction ? state.reset : undefined}
        playActive={state.canGoNext && state.inputPhase !== 'selectReaction'}
        playDisabled={!state.canGoNext}
        undoDisabled={!hasReaction}
      />
      <BranchMenu currentRoute={location.pathname} />
      <div className={styles.topBar}>
        <div className={styles.equationArea}>
          {hasReaction && (
            <HighlightOverlay highlighted={isHighlighted('reactionDefinitionStates')}>
              <EquationDisplay segments={reactionSegments} />
            </HighlightOverlay>
          )}
        </div>

        <div className={styles.controls}>
          <HighlightOverlay highlighted={isHighlighted('selectReaction')}>
            <DropdownSelector
              options={dropdownOptions}
              selectedId={state.selectedReaction?.id ?? null}
              onChange={handleSelectReaction}
              disabled={exploreMode ? false : state.inputPhase !== 'selectReaction'}
              placeholder="Choose a Substance"
            />
          </HighlightOverlay>
        </div>
      </div>

      {/* Math equations — TOP CENTER */}
      {hasReaction && (
        <div className={styles.equationPanel}>
          <LimitingEquationView
            equationState={state.equationState}
            reactionProgress={state.reactionProgress}
            reaction={state.selectedReaction!}
            limitingMoles={state.limitingMoles}
            volume={state.volume}
            highlights={equationHighlights}
          />
        </div>
      )}

      {/* CENTER-BOTTOM: beaker column (bottles+beaker) + chart side by side */}
      <div className={styles.centerArea}>
        {/* Left: bottles stacked above beaker */}
        <div className={styles.beakerColumn}>
          <div className={styles.containersRow} ref={containersRef}>
            <HighlightOverlay highlighted={isHighlighted('limitingReactantContainer')}>
              <ShakingContainer
                color={state.selectedReaction?.limitingReactant.color ?? 'rgb(200,60,60)'}
                label={state.selectedReaction?.limitingReactant.formula ?? 'Limiting'}
                onPour={handlePourLimiting}
                disabled={!limitingActive}
                isActive={limitingActive}
                tooltipText={limitingActive ? 'Click to add molecules' : undefined}
                fallDistance={fallDistance}
              />
            </HighlightOverlay>
            <HighlightOverlay highlighted={isHighlighted('excessReactantContainer')}>
              <ShakingContainer
                color={state.selectedReaction?.excessReactant.color ?? 'rgb(120,60,200)'}
                label={state.selectedReaction?.excessReactant.formula ?? 'Excess'}
                onPour={handlePourExcess}
                disabled={!excessActive}
                isActive={excessActive}
                tooltipText={excessActive ? 'Click to add molecules' : undefined}
                fallDistance={fallDistance}
              />
            </HighlightOverlay>
          </div>

          <HighlightOverlay highlighted={isHighlighted('beakerSlider')}>
            <div className={styles.beakerArea} ref={beakerRef}>
              <FillableBeaker
                waterLevel={state.waterLevel}
                onWaterLevelChange={state.setWaterLevel}
                minWaterLevel={MIN_WATER_LEVEL}
                disabled={exploreMode ? !hasReaction || state.isReacting : state.inputPhase !== 'setWaterLevel'}
                liquidColor="rgb(192, 224, 224)"
                width={320}
              >
                <BeakerMoleculeGrid
                  molecules={state.allMolecules}
                  dotSize={10}
                  animated={false}
                />
              </FillableBeaker>
              {hasReaction && state.selectedReaction && (
                <div className={styles.compoundIndicators}>
                  <div className={styles.compoundLabel}>
                    <div
                      className={styles.compoundDot}
                      style={{ backgroundColor: state.selectedReaction.limitingReactant.color }}
                    />
                    {state.selectedReaction.limitingReactant.formula}
                  </div>
                  <div className={styles.compoundLabel}>
                    <div
                      className={styles.compoundDot}
                      style={{ backgroundColor: state.selectedReaction.excessReactant.color }}
                    />
                    {state.selectedReaction.excessReactant.formula}
                  </div>
                  <div className={styles.compoundLabel}>
                    <div
                      className={styles.compoundDot}
                      style={{ backgroundColor: state.selectedReaction.product.color }}
                    />
                    {state.selectedReaction.product.formula}
                  </div>
                </div>
              )}
            </div>
          </HighlightOverlay>
        </div>

        {/* Right: chart always visible; empty columns before a reaction is selected */}
        <div className={styles.progressArea}>
          <ProgressChart
            progress={state.reactionProgress}
            reactantColor={state.selectedReaction?.limitingReactant.color ?? '#aaa'}
            excessColor={state.selectedReaction?.excessReactant.color ?? '#888'}
            productColor={state.selectedReaction?.product.color ?? '#999'}
            limitingLabel={state.selectedReaction?.limitingReactant.formula ?? ''}
            excessLabel={state.selectedReaction?.excessReactant.formula ?? ''}
            productLabel={state.selectedReaction?.product.formula ?? ''}
            limitingCount={state.moleculeCounts.limiting}
            excessCount={state.moleculeCounts.excess + state.extraExcessCount}
            limitingCoefficient={1}
            excessCoefficient={state.selectedReaction?.excessReactant.coefficient ?? 1}
            maxCount={30}
            showLegend={hasReaction}
          />
        </div>
      </div>

      {/* BeakyBox — bottom right */}
      <div className={styles.beakyArea}>
        <BeakyBox
          statement={beakyStatement}
          onNext={handleNext}
          onBack={handleBack}
          canGoNext={state.canGoNext}
          showBack={showBack}
        />
      </div>
    </div>
  );
}
