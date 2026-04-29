import { useState, useCallback, useMemo, useRef } from 'react';
import type { LimitingReagentReactionDef } from '../../../helper/chemistry/types';
import { limitingReagentReactions } from '../../../constants/reactions/limitingReagentReactions';
import { tagAction } from '../../../helper/actionLogger';
import { saveToStorage, loadFromStorage, setScreenCompleted } from '../../../helper/persistence/storage';

type EquationState = 'blank' | 'theoretical' | 'actual';

type InputPhase =
  | 'selectReaction'
  // Educational intro (matching iOS steps 2-6)
  | 'introStoichiometry'
  | 'introPhysicalStates'
  | 'introPhysicalStatesDetail'
  | 'introMoles'
  | 'introAvogadro'
  // Interactive: set water level (iOS step 7)
  | 'setWaterLevel'
  // Interactive: add limiting reactant (iOS step 8)
  | 'addLimiting'
  // Post-limiting narrative: molarity & calculation (iOS steps 9-14)
  | 'explainMolarity'
  | 'showLimitingMolarity'
  | 'showLimitingMoles'
  | 'showNeededExcess'
  | 'showTheoreticalProduct'
  | 'showTheoreticalMass'
  // Interactive: add excess reactant (iOS step 15)
  | 'addExcess'
  // Reaction animation (iOS step 16)
  | 'reacting'
  // Post-reaction narrative (iOS steps 17-19)
  | 'endReaction'
  | 'explainYieldConcept'
  | 'showYieldPercentage'
  // Interactive: add extra excess that won't react (iOS step 20)
  | 'addExtraExcess'
  // Post-extra-excess narrative (iOS steps 21-23)
  | 'explainExcessNotReacting'
  | 'explainLimitingReagent'
  | 'explainExcessReactant'
  // Done
  | 'complete';

interface MoleculeDot {
  color: string;
  x: number;
  y: number;
}

interface MoleculeCounts {
  limiting: number;
  excess: number;
  product: number;
}

const STORAGE_KEY = 'limitingReagent';
const COMPLETED_EXPERIMENTS_KEY = 'limitingReagentCompleted';
const MIN_LIMITING_MOLECULES = 12;
const MAX_LIMITING_MOLECULES = 30;
const MIN_EXTRA_EXCESS = 5;
export const MIN_WATER_LEVEL = 0.1;
export const MAX_WATER_LEVEL = 1;
// iOS MoleculeGridSettings: 19 columns × 10 rows
const GRID_COLS = 19;
const GRID_ROWS = 10;
const REACTION_DURATION_MS = 2000;
const REACTION_TICK_MS = 50;

// Phase ordering for back-button navigation
const PHASE_ORDER: InputPhase[] = [
  'selectReaction',
  'introStoichiometry',
  'introPhysicalStates',
  'introPhysicalStatesDetail',
  'introMoles',
  'introAvogadro',
  'setWaterLevel',
  'addLimiting',
  'explainMolarity',
  'showLimitingMolarity',
  'showLimitingMoles',
  'showNeededExcess',
  'showTheoreticalProduct',
  'showTheoreticalMass',
  'addExcess',
  'reacting',
  'endReaction',
  'explainYieldConcept',
  'showYieldPercentage',
  'addExtraExcess',
  'explainExcessNotReacting',
  'explainLimitingReagent',
  'explainExcessReactant',
  'complete',
];

interface StoredState {
  reactionId: string;
  waterLevel: number;
  moleculeCounts: MoleculeCounts;
  inputPhase: InputPhase;
}

function generateRandomPositions(
  count: number,
  existingPositions: MoleculeDot[],
  color: string,
  waterLevel: number = 1,
): MoleculeDot[] {
  const result: MoleculeDot[] = [];
  const occupied = new Set(existingPositions.map((p) => `${Math.round(p.x * GRID_COLS)},${Math.round(p.y * GRID_ROWS)}`));

  // Only place molecules within the water-filled region (bottom portion of beaker).
  // waterLevel 0→1 means 0%→100% filled from bottom. Row 0 = top, GRID_ROWS-1 = bottom.
  // Add 1 row padding below the water surface so dots don't get clipped at the top edge.
  const surfaceRow = Math.floor(GRID_ROWS * (1 - Math.min(1, Math.max(0, waterLevel))));
  const minRow = Math.min(surfaceRow + 1, GRID_ROWS - 1);
  const availableRows = Math.max(1, GRID_ROWS - minRow);

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let col: number;
    let row: number;
    do {
      col = Math.floor(Math.random() * GRID_COLS);
      row = minRow + Math.floor(Math.random() * availableRows);
      attempts++;
    } while (occupied.has(`${col},${row}`) && attempts < 100);
    occupied.add(`${col},${row}`);
    result.push({
      color,
      x: (col + 0.5) / GRID_COLS,
      y: (row + 0.5) / GRID_ROWS,
    });
  }
  return result;
}

export function useLimitingReagentState(exploreMode = false) {
  // Always start fresh — molecule dots aren't persisted so restoring
  // mid-experiment state produces a broken view (counts & equations filled
  // but no dots in the beaker). This matches iOS behaviour where the
  // screen begins from scratch each time.
  const [selectedReaction, setSelectedReaction] = useState<LimitingReagentReactionDef | null>(null);
  const [waterLevel, setWaterLevel] = useState(0.5);
  const [moleculeCounts, setMoleculeCounts] = useState<MoleculeCounts>({ limiting: 0, excess: 0, product: 0 });
  const [equationState, setEquationState] = useState<EquationState>('blank');
  const [reactionProgress, setReactionProgress] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [inputPhase, setInputPhase] = useState<InputPhase>('selectReaction');

  const [limitingDots, setLimitingDots] = useState<MoleculeDot[]>([]);
  const [excessDots, setExcessDots] = useState<MoleculeDot[]>([]);
  const [productDots, setProductDots] = useState<MoleculeDot[]>([]);
  const [extraExcessDots, setExtraExcessDots] = useState<MoleculeDot[]>([]);
  const [extraExcessCount, setExtraExcessCount] = useState(0);

  const reactionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const volume = useMemo(() => waterLevel * 0.25, [waterLevel]);

  const molarity = useMemo(() => {
    if (!selectedReaction || volume <= 0) return 0;
    const gridSize = GRID_COLS * GRID_ROWS;
    return moleculeCounts.limiting / gridSize;
  }, [selectedReaction, moleculeCounts.limiting, volume]);

  const limitingMoles = useMemo(() => volume * molarity, [volume, molarity]);

  const excessNeeded = useMemo(() => {
    if (!selectedReaction) return 0;
    return selectedReaction.excessReactant.coefficient * limitingMoles;
  }, [selectedReaction, limitingMoles]);

  const theoreticalMass = useMemo(() => {
    if (!selectedReaction) return 0;
    return limitingMoles * selectedReaction.product.molarMass;
  }, [selectedReaction, limitingMoles]);

  const actualMass = useMemo(() => {
    if (!selectedReaction) return 0;
    return theoreticalMass * selectedReaction.yield * reactionProgress;
  }, [selectedReaction, theoreticalMass, reactionProgress]);

  const yieldPercent = useMemo(() => {
    if (!selectedReaction || theoreticalMass <= 0) return 0;
    return (actualMass / theoreticalMass) * 100;
  }, [selectedReaction, actualMass, theoreticalMass]);

  const productMoles = useMemo(() => {
    if (!selectedReaction) return 0;
    return limitingMoles; // 1:1 stoichiometry for product
  }, [selectedReaction, limitingMoles]);

  const persistState = useCallback((
    reaction: LimitingReagentReactionDef,
    water: number,
    counts: MoleculeCounts,
    phase: InputPhase,
  ) => {
    saveToStorage<StoredState>(STORAGE_KEY, {
      reactionId: reaction.id,
      waterLevel: water,
      moleculeCounts: counts,
      inputPhase: phase,
    });
  }, []);

  const selectReaction = useCallback((reaction: LimitingReagentReactionDef) => {
    setSelectedReaction(reaction);
    setMoleculeCounts({ limiting: 0, excess: 0, product: 0 });
    setLimitingDots([]);
    setExcessDots([]);
    setProductDots([]);
    setExtraExcessDots([]);
    setExtraExcessCount(0);
    // Show equations immediately as soon as a substance is selected
    setEquationState('theoretical');
    setReactionProgress(0);
    setIsReacting(false);
    // In explore mode, skip educational intro
    setInputPhase(exploreMode ? 'setWaterLevel' : 'introStoichiometry');
    tagAction('selectReaction', 'limitingReagent', { reactionId: reaction.id });
    persistState(reaction, waterLevel, { limiting: 0, excess: 0, product: 0 }, exploreMode ? 'setWaterLevel' : 'introStoichiometry');
  }, [waterLevel, persistState, exploreMode]);

  const handleWaterLevelChange = useCallback((level: number) => {
    const clampedLevel = Math.max(MIN_WATER_LEVEL, Math.min(MAX_WATER_LEVEL, level));
    setWaterLevel(clampedLevel);
    tagAction('adjustWaterLevel', 'limitingReagent', { level: clampedLevel });
    if (selectedReaction) {
      persistState(selectedReaction, clampedLevel, moleculeCounts, inputPhase);
    }
  }, [selectedReaction, moleculeCounts, inputPhase, persistState]);

  const addMolecules = useCallback((type: 'limiting' | 'excess', count: number) => {
    if (!selectedReaction) return;

    if (exploreMode) {
      // In explore mode, allow adding both types freely without phase gating
      if (type === 'limiting') {
        const newCount = Math.min(moleculeCounts.limiting + count, MAX_LIMITING_MOLECULES);
        const toAdd = newCount - moleculeCounts.limiting;
        if (toAdd <= 0) return;
        const newDots = generateRandomPositions(toAdd, [...limitingDots, ...excessDots], selectedReaction.limitingReactant.color, waterLevel);
        setLimitingDots((prev) => [...prev, ...newDots]);
        setMoleculeCounts((prev) => ({ ...prev, limiting: newCount }));
        tagAction('addLimiting', 'limitingReagent', { count: toAdd, total: newCount, explore: true });
      } else if (type === 'excess') {
        const maxExcess = Math.max(moleculeCounts.limiting * selectedReaction.excessReactant.coefficient, MAX_LIMITING_MOLECULES);
        const newCount = Math.min(moleculeCounts.excess + count, maxExcess);
        const toAdd = newCount - moleculeCounts.excess;
        if (toAdd <= 0) return;
        const newDots = generateRandomPositions(toAdd, [...limitingDots, ...excessDots], selectedReaction.excessReactant.color, waterLevel);
        setExcessDots((prev) => [...prev, ...newDots]);
        setMoleculeCounts((prev) => ({ ...prev, excess: newCount }));
        tagAction('addExcess', 'limitingReagent', { count: toAdd, total: newCount, explore: true });
      }
      return;
    }

    if (type === 'limiting' && inputPhase === 'addLimiting') {
      const newCount = Math.min(moleculeCounts.limiting + count, MAX_LIMITING_MOLECULES);
      const toAdd = newCount - moleculeCounts.limiting;
      if (toAdd <= 0) return;

      const newDots = generateRandomPositions(
        toAdd,
        [...limitingDots, ...excessDots],
        selectedReaction.limitingReactant.color,
        waterLevel,
      );

      setLimitingDots((prev) => [...prev, ...newDots]);
      const newCounts = { ...moleculeCounts, limiting: newCount };
      setMoleculeCounts(newCounts);
      tagAction('addLimiting', 'limitingReagent', { count: toAdd, total: newCount });

      if (newCount >= MIN_LIMITING_MOLECULES) {
        // Auto-advance to molarity explanation (iOS behavior)
        setInputPhase('explainMolarity');
        setEquationState('theoretical');
        persistState(selectedReaction, waterLevel, newCounts, 'explainMolarity');
      } else {
        persistState(selectedReaction, waterLevel, newCounts, 'addLimiting');
      }
    } else if (type === 'excess' && (inputPhase === 'addExcess' || inputPhase === 'reacting')) {
      // Ted 4.28 (slide 47): "They can't keep shaking here. It stops."
      // Auto-advance from addExcess at ~70% of stoichiometric so the user
      // still has reagent to shake during the reacting animation. Allow
      // continued pours during 'reacting' up to the full stoichiometric cap.
      const maxExcess = moleculeCounts.limiting * selectedReaction.excessReactant.coefficient;
      const advanceThreshold = Math.max(1, Math.round(maxExcess * 0.7));
      const newCount = Math.min(moleculeCounts.excess + count, maxExcess);
      const toAdd = newCount - moleculeCounts.excess;
      if (toAdd <= 0) return;

      const newDots = generateRandomPositions(
        toAdd,
        [...limitingDots, ...excessDots],
        selectedReaction.excessReactant.color,
        waterLevel,
      );

      setExcessDots((prev) => [...prev, ...newDots]);
      const newCounts = { ...moleculeCounts, excess: newCount };
      setMoleculeCounts(newCounts);
      tagAction('addExcess', 'limitingReagent', { count: toAdd, total: newCount, phase: inputPhase });

      // Auto-advance to 'reacting' once advanceThreshold reached, so user
      // can keep shaking the rest during the reaction animation.
      if (inputPhase === 'addExcess' && newCount >= advanceThreshold) {
        setInputPhase('reacting');
        persistState(selectedReaction, waterLevel, newCounts, 'reacting');
      } else {
        persistState(selectedReaction, waterLevel, newCounts, inputPhase);
      }
    } else if (type === 'excess' && inputPhase === 'addExtraExcess') {
      // Extra excess: molecules go in beaker but don't react (demonstrates limiting concept)
      const addCount = Math.min(count, 10);
      const newDots = generateRandomPositions(
        addCount,
        [...limitingDots, ...excessDots, ...productDots, ...extraExcessDots],
        selectedReaction.excessReactant.color,
        waterLevel,
      );
      setExtraExcessDots((prev) => [...prev, ...newDots]);
      setExtraExcessCount((prev) => prev + addCount);
      tagAction('addExtraExcess', 'limitingReagent', { count: addCount });
    }
  }, [selectedReaction, inputPhase, moleculeCounts, limitingDots, excessDots, productDots, extraExcessDots, waterLevel, persistState, exploreMode]);

  const startReaction = useCallback(() => {
    if (!selectedReaction || isReacting) return;
    if (exploreMode) {
      if (moleculeCounts.limiting === 0 || moleculeCounts.excess === 0) return;
      setEquationState('theoretical');
    } else if (inputPhase !== 'reacting') {
      return;
    }

    setIsReacting(true);
    setEquationState('actual');
    tagAction('startReaction', 'limitingReagent', { reactionId: selectedReaction.id });

    const allDots = [...limitingDots, ...excessDots].sort(() => Math.random() - 0.5);
    const productCount = Math.min(limitingDots.length, Math.floor(excessDots.length / selectedReaction.excessReactant.coefficient));
    const newProductDots = allDots.slice(0, productCount).map((d) => ({
      ...d,
      color: selectedReaction.product.color,
    }));

    setProductDots(newProductDots);

    let elapsed = 0;
    reactionTimerRef.current = setInterval(() => {
      elapsed += REACTION_TICK_MS;
      const progress = Math.min(1, elapsed / REACTION_DURATION_MS);
      setReactionProgress(progress);

      if (progress >= 1) {
        if (reactionTimerRef.current) {
          clearInterval(reactionTimerRef.current);
          reactionTimerRef.current = null;
        }
        setIsReacting(false);
        // In explore mode go straight to complete; in guided mode go to endReaction narrative
        const nextPhase: InputPhase = exploreMode ? 'complete' : 'endReaction';
        setInputPhase(nextPhase);
        setMoleculeCounts((prev) => ({ ...prev, product: productCount }));
        if (selectedReaction) {
          persistState(selectedReaction, waterLevel, { ...moleculeCounts, product: productCount }, nextPhase);
        }
        tagAction('reactionComplete', 'limitingReagent', { reactionId: selectedReaction.id });
      }
    }, REACTION_TICK_MS);
  }, [selectedReaction, isReacting, inputPhase, limitingDots, excessDots, waterLevel, moleculeCounts, persistState, exploreMode]);

  const allMolecules = useMemo((): MoleculeDot[] => {
    const visible: MoleculeDot[] = [];

    if (reactionProgress < 1) {
      visible.push(...limitingDots);
      visible.push(...excessDots);
    } else {
      // Ted 4.28 / slide 48: at end of reaction retain a small unreacted
      // remainder of EACH reactant so the next slide (yield percentage =
      // ~96-98%) makes physical sense — "real life doesn't get 100%". The
      // amount retained = (1 - yield) of theoretical, with a floor of 1
      // molecule each so it's always visible.
      const yieldFraction = selectedReaction?.yield ?? 0.98;
      const unreactedFraction = Math.max(0, 1 - yieldFraction);
      const limitingLeftover = Math.max(1, Math.round(moleculeCounts.limiting * unreactedFraction));
      const excessLeftover = Math.max(1, Math.round(
        moleculeCounts.limiting * (selectedReaction?.excessReactant.coefficient ?? 1) * unreactedFraction
      ));
      // Show the trailing N limiting dots and N excess dots (from end of array)
      visible.push(...limitingDots.slice(-Math.min(limitingLeftover, limitingDots.length)));
      const stoichiometricExcess = moleculeCounts.limiting * (selectedReaction?.excessReactant.coefficient ?? 1);
      const trueExtraExcess = excessDots.length - stoichiometricExcess; // poured beyond stoichiometric
      const totalExcessVisible = Math.max(0, trueExtraExcess) + excessLeftover;
      visible.push(...excessDots.slice(-Math.min(totalExcessVisible, excessDots.length)));
    }

    // Products: at progress=1, show yield-fraction (not 100%) so visible
    // count matches the "actual yield" pedagogy.
    const yieldFraction = selectedReaction?.yield ?? 1;
    const productScale = reactionProgress < 1 ? reactionProgress : yieldFraction;
    const visibleProductCount = Math.floor(productDots.length * productScale);
    visible.push(...productDots.slice(0, visibleProductCount));

    // Show extra excess dots (from addExtraExcess phase - unreacted)
    visible.push(...extraExcessDots);

    return visible;
  }, [limitingDots, excessDots, productDots, extraExcessDots, reactionProgress, moleculeCounts.limiting, selectedReaction]);

  const reset = useCallback(() => {
    tagAction('reset', 'limitingReagent', { fromPhase: inputPhase });
    setSelectedReaction(null);
    setWaterLevel(0.5);
    setMoleculeCounts({ limiting: 0, excess: 0, product: 0 });
    setLimitingDots([]);
    setExcessDots([]);
    setProductDots([]);
    setExtraExcessDots([]);
    setExtraExcessCount(0);
    setEquationState('blank');
    setReactionProgress(0);
    setIsReacting(false);
    setInputPhase('selectReaction');
    if (reactionTimerRef.current) {
      clearInterval(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
    saveToStorage(STORAGE_KEY, null);
  }, [inputPhase]);

  const goBack = useCallback(() => {
    if (isReacting) return; // Don't allow going back during reaction animation

    const currentIndex = PHASE_ORDER.indexOf(inputPhase);
    if (currentIndex <= 0) {
      // Already at the beginning — go back to menu / reset
      reset();
      return;
    }

    const prevPhase = PHASE_ORDER[currentIndex - 1];
    tagAction('goBack', 'limitingReagent', { from: inputPhase, to: prevPhase });
    setInputPhase(prevPhase);

    // Reset state when re-entering an interactive add/reaction phase from
    // downstream so the user can redo it cleanly (fixes "can't add more
    // reagent after going back" — Ted PPTX comment 1 on slide 37).
    let updatedCounts = moleculeCounts;

    if (prevPhase === 'addLimiting') {
      // Returning to "shake H2C2O4 in" — clear the whole experiment since
      // every downstream value depends on the limiting reactant amount.
      setLimitingDots([]);
      setExcessDots([]);
      setProductDots([]);
      setExtraExcessDots([]);
      setExtraExcessCount(0);
      setReactionProgress(0);
      setIsReacting(false);
      updatedCounts = { limiting: 0, excess: 0, product: 0 };
      setMoleculeCounts(updatedCounts);
      setEquationState('blank');
    } else if (prevPhase === 'addExcess') {
      // Returning to "shake NaHCO3 in" — clear excess + product, keep limiting
      setExcessDots([]);
      setProductDots([]);
      setExtraExcessDots([]);
      setExtraExcessCount(0);
      setReactionProgress(0);
      setIsReacting(false);
      updatedCounts = { ...moleculeCounts, excess: 0, product: 0 };
      setMoleculeCounts(updatedCounts);
      setEquationState('theoretical');
    } else if (prevPhase === 'reacting') {
      // Returning to "wait for reaction" — clear products + reset progress
      setProductDots([]);
      setReactionProgress(0);
      setIsReacting(false);
      updatedCounts = { ...moleculeCounts, product: 0 };
      setMoleculeCounts(updatedCounts);
      setEquationState('theoretical');
    } else if (prevPhase === 'addExtraExcess') {
      // Returning to "add extra NaHCO3 that won't react" — clear extra dots
      setExtraExcessDots([]);
      setExtraExcessCount(0);
    } else if (PHASE_ORDER.indexOf(prevPhase) < PHASE_ORDER.indexOf('explainMolarity')) {
      setEquationState('blank');
    } else if (PHASE_ORDER.indexOf(prevPhase) < PHASE_ORDER.indexOf('reacting')) {
      setEquationState('theoretical');
    }

    if (selectedReaction) {
      persistState(selectedReaction, waterLevel, updatedCounts, prevPhase);
    }
  }, [inputPhase, isReacting, selectedReaction, waterLevel, moleculeCounts, persistState, reset]);

  // Unified next() handles all phase transitions
  const next = useCallback(() => {
    if (exploreMode) {
      if (inputPhase === 'complete') {
        reset();
      } else if (!isReacting && moleculeCounts.limiting > 0 && moleculeCounts.excess > 0) {
        startReaction();
      }
      return;
    }

    switch (inputPhase) {
      // Educational intro sequence
      case 'introStoichiometry':
        setInputPhase('introPhysicalStates');
        tagAction('nextPhase', 'limitingReagent', { from: 'introStoichiometry', to: 'introPhysicalStates' });
        break;
      case 'introPhysicalStates':
        setInputPhase('introPhysicalStatesDetail');
        tagAction('nextPhase', 'limitingReagent', { from: 'introPhysicalStates', to: 'introPhysicalStatesDetail' });
        break;
      case 'introPhysicalStatesDetail':
        setInputPhase('introMoles');
        tagAction('nextPhase', 'limitingReagent', { from: 'introPhysicalStatesDetail', to: 'introMoles' });
        break;
      case 'introMoles':
        setInputPhase('introAvogadro');
        tagAction('nextPhase', 'limitingReagent', { from: 'introMoles', to: 'introAvogadro' });
        break;
      case 'introAvogadro':
        setInputPhase('setWaterLevel');
        tagAction('nextPhase', 'limitingReagent', { from: 'introAvogadro', to: 'setWaterLevel' });
        break;

      // Interactive: water level
      case 'setWaterLevel':
        setInputPhase('addLimiting');
        tagAction('setWaterLevel', 'limitingReagent', { waterLevel });
        if (selectedReaction) {
          persistState(selectedReaction, waterLevel, moleculeCounts, 'addLimiting');
        }
        break;

      // Post-limiting narrative sequence
      case 'explainMolarity':
        setInputPhase('showLimitingMolarity');
        tagAction('nextPhase', 'limitingReagent', { from: 'explainMolarity', to: 'showLimitingMolarity' });
        break;
      case 'showLimitingMolarity':
        setInputPhase('showLimitingMoles');
        tagAction('nextPhase', 'limitingReagent', { from: 'showLimitingMolarity', to: 'showLimitingMoles' });
        break;
      case 'showLimitingMoles':
        setInputPhase('showNeededExcess');
        tagAction('nextPhase', 'limitingReagent', { from: 'showLimitingMoles', to: 'showNeededExcess' });
        break;
      case 'showNeededExcess':
        setInputPhase('showTheoreticalProduct');
        tagAction('nextPhase', 'limitingReagent', { from: 'showNeededExcess', to: 'showTheoreticalProduct' });
        break;
      case 'showTheoreticalProduct':
        setInputPhase('showTheoreticalMass');
        tagAction('nextPhase', 'limitingReagent', { from: 'showTheoreticalProduct', to: 'showTheoreticalMass' });
        break;
      case 'showTheoreticalMass':
        setInputPhase('addExcess');
        tagAction('nextPhase', 'limitingReagent', { from: 'showTheoreticalMass', to: 'addExcess' });
        if (selectedReaction) {
          persistState(selectedReaction, waterLevel, moleculeCounts, 'addExcess');
        }
        break;

      // Reaction
      case 'reacting':
        startReaction();
        break;

      // Post-reaction narrative sequence
      case 'endReaction':
        setInputPhase('explainYieldConcept');
        tagAction('nextPhase', 'limitingReagent', { from: 'endReaction', to: 'explainYieldConcept' });
        break;
      case 'explainYieldConcept':
        setInputPhase('showYieldPercentage');
        tagAction('nextPhase', 'limitingReagent', { from: 'explainYieldConcept', to: 'showYieldPercentage' });
        break;
      case 'showYieldPercentage':
        setInputPhase('addExtraExcess');
        tagAction('nextPhase', 'limitingReagent', { from: 'showYieldPercentage', to: 'addExtraExcess' });
        break;

      // Extra excess
      case 'addExtraExcess':
        if (extraExcessCount >= MIN_EXTRA_EXCESS) {
          setInputPhase('explainExcessNotReacting');
          tagAction('nextPhase', 'limitingReagent', { from: 'addExtraExcess', to: 'explainExcessNotReacting' });
        }
        break;

      // Post-extra-excess narrative sequence
      case 'explainExcessNotReacting':
        setInputPhase('explainLimitingReagent');
        tagAction('nextPhase', 'limitingReagent', { from: 'explainExcessNotReacting', to: 'explainLimitingReagent' });
        break;
      case 'explainLimitingReagent':
        setInputPhase('explainExcessReactant');
        tagAction('nextPhase', 'limitingReagent', { from: 'explainLimitingReagent', to: 'explainExcessReactant' });
        break;
      case 'explainExcessReactant':
        setInputPhase('complete');
        setScreenCompleted('limitingReagent');
        tagAction('screenCompleted', 'limitingReagent', { reactionId: selectedReaction?.id });
        if (selectedReaction) {
          persistState(selectedReaction, waterLevel, moleculeCounts, 'complete');
          // Save completed experiment per-reaction so Filing Cabinet can show all
          const completedExperiments = loadFromStorage<Record<string, StoredState>>(COMPLETED_EXPERIMENTS_KEY) ?? {};
          completedExperiments[selectedReaction.id] = {
            reactionId: selectedReaction.id,
            waterLevel,
            moleculeCounts,
            inputPhase: 'complete',
          };
          saveToStorage(COMPLETED_EXPERIMENTS_KEY, completedExperiments);
        }
        break;

      // Complete
      case 'complete':
        tagAction('reset', 'limitingReagent', {});
        reset();
        break;

      default:
        break;
    }
  }, [inputPhase, selectedReaction, waterLevel, moleculeCounts, extraExcessCount, isReacting, startReaction, reset, persistState, exploreMode]);

  // Compute canGoNext
  const canGoNext = useMemo(() => {
    if (exploreMode) {
      if (!selectedReaction) return false;
      if (inputPhase === 'complete') return true;
      if (isReacting) return false;
      return moleculeCounts.limiting > 0 && moleculeCounts.excess > 0;
    }

    // Narrative-only phases: always can go next
    const narrativePhases: InputPhase[] = [
      'introStoichiometry', 'introPhysicalStates', 'introPhysicalStatesDetail',
      'introMoles', 'introAvogadro',
      'explainMolarity', 'showLimitingMolarity', 'showLimitingMoles',
      'showNeededExcess', 'showTheoreticalProduct', 'showTheoreticalMass',
      'endReaction', 'explainYieldConcept', 'showYieldPercentage',
      'explainExcessNotReacting', 'explainLimitingReagent', 'explainExcessReactant',
    ];
    if (narrativePhases.includes(inputPhase)) return true;

    switch (inputPhase) {
      case 'selectReaction':
        return false;
      case 'setWaterLevel':
        return true;
      case 'addLimiting':
        return moleculeCounts.limiting >= MIN_LIMITING_MOLECULES;
      case 'addExcess':
        return false; // auto-advances when stoichiometric amount reached
      case 'reacting':
        return !isReacting;
      case 'addExtraExcess':
        return extraExcessCount >= MIN_EXTRA_EXCESS;
      case 'complete':
        return true;
      default:
        return false;
    }
  }, [inputPhase, moleculeCounts, isReacting, selectedReaction, exploreMode, extraExcessCount]);

  return {
    selectedReaction,
    waterLevel,
    moleculeCounts,
    equationState,
    reactionProgress,
    isReacting,
    inputPhase,
    volume,
    molarity,
    limitingMoles,
    excessNeeded,
    theoreticalMass,
    actualMass,
    yieldPercent,
    productMoles,
    extraExcessCount,
    allMolecules,
    reactions: limitingReagentReactions,
    selectReaction,
    setWaterLevel: handleWaterLevelChange,
    addMolecules,
    startReaction,
    next,
    canGoNext,
    reset,
    goBack,
    exploreMode,
  };
}
