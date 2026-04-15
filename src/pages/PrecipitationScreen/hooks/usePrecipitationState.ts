import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Metal,
  type PrecipitationReactionDef,
} from '../../../helper/chemistry/types';
import {
  getUnknownReactantMolarMass,
  getRandomMetal,
} from '../../../helper/chemistry/molarMass';
import { precipitationReactions } from '../../../constants/reactions/precipitationReactions';
import { tagAction } from '../../../helper/actionLogger';
import { saveToStorage, setScreenCompleted } from '../../../helper/persistence/storage';

type BeakerView = 'microscopic' | 'macroscopic';
type PrecipitatePosition = 'beaker' | 'scales';

type Phase =
  | 'chooseReaction'
  // Educational intro (iOS steps 2-3)
  | 'explainPrecipitation'
  | 'explainUnknownMetal'
  // Interactive
  | 'setWaterLevel'
  | 'addKnown'
  | 'addUnknown'
  | 'reaction1'
  // Post-reaction1 (iOS step 8)
  | 'endReaction1'
  // Interactive: weigh product
  | 'weighProduct'
  // Post-weighing narrative (iOS step 10)
  | 'postWeighing'
  | 'revealMetal'
  | 'addExtraUnknown'
  | 'reaction2'
  // Post-reaction2 (iOS step 14)
  | 'endReaction2'
  | 'complete';

type EquationState = 'blank' | 'showMolarity' | 'showAll';

/**
 * iOS ScreenElement — determines which UI elements are highlighted (bright)
 * vs dimmed (grayed out) at each step. Matches PrecipitationScreenViewModel.ScreenElement.
 */
export type HighlightElement =
  | 'reactionToggle'
  | 'reactionDefinition'
  | 'waterSlider'
  | 'knownReactantContainer'
  | 'unknownReactantContainer'
  | 'productMoles'
  | 'unknownReactantMoles'
  | 'unknownReactantMolarMass'
  | 'correctMetalRow'
  | 'metalTable'
  | 'beaker'
  | 'beakerToggle';

/**
 * iOS HighlightedElements: when non-empty, only the listed elements render
 * at full brightness; all others are dimmed to rgb(200,200,200).
 * When empty, all elements are at full brightness (no dimming).
 */
function getHighlightsForPhase(phase: Phase): HighlightElement[] {
  switch (phase) {
    case 'chooseReaction':
      return ['reactionToggle'];
    case 'explainPrecipitation':
      return ['reactionDefinition'];
    case 'explainUnknownMetal':
      return ['reactionDefinition', 'metalTable'];
    case 'setWaterLevel':
      return ['waterSlider', 'beaker'];
    case 'addKnown':
      return ['knownReactantContainer', 'beaker'];
    case 'addUnknown':
    case 'addExtraUnknown':
      return ['unknownReactantContainer', 'beaker'];
    case 'reaction1':
    case 'reaction2':
      return []; // cleared — everything bright
    case 'endReaction1':
    case 'endReaction2':
      return ['beaker', 'beakerToggle'];
    case 'weighProduct':
      return []; // cleared — everything bright for drag interaction
    case 'postWeighing':
      return ['productMoles', 'unknownReactantMoles'];
    case 'revealMetal':
      return ['unknownReactantMolarMass', 'correctMetalRow'];
    case 'complete':
      return []; // no dimming
    default:
      return [];
  }
}

interface MoleculeDot {
  color: string;
  x: number;
  y: number;
}

const STORAGE_KEY = 'precipitationState';
const MIN_MOLECULES = 5;
const MAX_MOLECULES = 40;
const INITIAL_WATER_LEVEL = 0.5;
// Grid dimensions matching iOS MoleculeGridSettings (rows x cols = 10 x 19 = 190)
const GRID_ROWS = 10;
const GRID_COLS = 19;
const GRID_SIZE = GRID_ROWS * GRID_COLS;

/**
 * iOS-style grid-based molecule placement (19 cols × 10 rows).
 * Randomly fills grid cells within the water region, avoiding already-occupied cells.
 * This produces an organized, non-overlapping layout matching iOS MoleculeGridSettings.
 */
function generateMoleculePositions(
  count: number,
  color: string,
  waterLevel: number = 1,
  existingDots: MoleculeDot[] = [],
): MoleculeDot[] {
  const dots: MoleculeDot[] = [];
  const occupied = new Set(
    existingDots.map((p) => `${Math.round(p.x * GRID_COLS)},${Math.round(p.y * GRID_ROWS)}`),
  );

  // Water surface row: waterLevel 0→1 means 0%→100% filled from bottom.
  // Row 0 = top, GRID_ROWS-1 = bottom.
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
    dots.push({
      color,
      x: (col + 0.5) / GRID_COLS,
      y: (row + 0.5) / GRID_ROWS,
    });
  }
  return dots;
}

export interface PrecipitationState {
  reactions: PrecipitationReactionDef[];
  selectedReaction: PrecipitationReactionDef | null;
  currentMetal: Metal;
  beakerView: BeakerView;
  waterLevel: number;
  knownMoleculeCount: number;
  unknownMoleculeCount: number;
  reactionProgress: number;
  precipitatePosition: PrecipitatePosition;
  precipitateMass: number | null;
  equationState: EquationState;
  metalRevealed: boolean;
  phase: Phase;
  isDropTarget: boolean;

  knownMolecules: MoleculeDot[];
  unknownMolecules: MoleculeDot[];
  /** Combined molecule dots for beaker view during reactions — includes fading reactants + appearing products */
  reactionMolecules: MoleculeDot[];

  unknownReactantMolarMass: number;
  knownReactantMolarity: number;
  knownReactantMoles: number;
  productMolesProduced: number;
  productMassProduced: number;
  unknownReactantMoles: number;
  unknownReactantMassAdded: number;

  showRunAgain: boolean;
  /** iOS HighlightedElements — which elements are active/highlighted at this step */
  highlights: HighlightElement[];

  selectReaction: (reaction: PrecipitationReactionDef) => void;
  toggleBeakerView: (view: BeakerView) => void;
  setWaterLevel: (level: number) => void;
  addReactant: (type: 'known' | 'unknown', count: number) => void;
  dragPrecipitate: (position: PrecipitatePosition) => void;
  setDropTarget: (active: boolean) => void;
  weighProduct: () => void;
  runReactionAgain: () => void;
  next: () => void;
  back: () => void;
  canGoNext: boolean;
  showBack: boolean;
}

export function usePrecipitationState(exploreMode = false): PrecipitationState {
  const [selectedReaction, setSelectedReaction] = useState<PrecipitationReactionDef | null>(null);
  const [currentMetal, setCurrentMetal] = useState<Metal>(() =>
    getRandomMetal([Metal.Sodium, Metal.Lithium, Metal.Potassium])
  );
  const [beakerView, setBeakerView] = useState<BeakerView>('microscopic');
  const [waterLevel, setWaterLevel] = useState(INITIAL_WATER_LEVEL);
  const [knownMoleculeCount, setKnownMoleculeCount] = useState(0);
  const [unknownMoleculeCount, setUnknownMoleculeCount] = useState(0);
  const [reactionProgress, setReactionProgress] = useState(0);
  const [precipitatePosition, setPrecipitatePosition] = useState<PrecipitatePosition>('beaker');
  const [equationState, setEquationState] = useState<EquationState>('blank');
  const [metalRevealed, setMetalRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>('chooseReaction');
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [productMolecules, setProductMolecules] = useState<MoleculeDot[]>([]);
  const reactionAnimRef = useRef<number | null>(null);

  /**
   * Animate reactionProgress from `from` to `to` over `durationMs` (iOS: 3s linear).
   * Uses requestAnimationFrame for smooth interpolation that drives both the
   * precipitate growth and the chart molecule counts.
   */
  const animateReaction = useCallback((from: number, to: number, durationMs: number, onComplete?: () => void) => {
    if (reactionAnimRef.current) cancelAnimationFrame(reactionAnimRef.current);
    setReactionProgress(from);
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs); // linear 0→1
      setReactionProgress(from + (to - from) * t);
      if (t < 1) {
        reactionAnimRef.current = requestAnimationFrame(step);
      } else {
        reactionAnimRef.current = null;
        onComplete?.();
      }
    };
    reactionAnimRef.current = requestAnimationFrame(step);
  }, []);

  const volume = waterLevel;

  const unknownReactantMolarMass = useMemo(() => {
    if (!selectedReaction) return 0;
    return getUnknownReactantMolarMass(selectedReaction, currentMetal);
  }, [selectedReaction, currentMetal]);

  // Molarity = molecule count / grid size (matches iOS BeakerGrid.concentration)
  const knownReactantMolarity = useMemo(() => {
    return knownMoleculeCount / GRID_SIZE;
  }, [knownMoleculeCount]);

  const knownReactantMoles = useMemo(() => {
    return volume * knownReactantMolarity;
  }, [volume, knownReactantMolarity]);

  const unknownReactantMoles = useMemo(() => {
    if (!selectedReaction || unknownReactantMolarMass === 0) return 0;
    const unknownConcentration = unknownMoleculeCount / GRID_SIZE;
    return volume * unknownConcentration;
  }, [selectedReaction, unknownMoleculeCount, volume, unknownReactantMolarMass]);

  const unknownReactantMassAdded = useMemo(() => {
    return unknownReactantMoles * unknownReactantMolarMass;
  }, [unknownReactantMoles, unknownReactantMolarMass]);

  const productMolesProduced = useMemo(() => {
    if (!selectedReaction) return 0;
    return unknownReactantMoles;
  }, [selectedReaction, unknownReactantMoles]);

  const productMassProduced = useMemo(() => {
    if (!selectedReaction) return 0;
    return productMolesProduced * selectedReaction.product.molarMass;
  }, [selectedReaction, productMolesProduced]);

  const precipitateMass = useMemo(() => {
    if (precipitatePosition !== 'scales') return null;
    return productMassProduced * reactionProgress;
  }, [precipitatePosition, productMassProduced, reactionProgress]);

  // Generate both molecule sets together so they don't overlap each other (iOS grid collision avoidance)
  const { knownMolecules, unknownMolecules } = useMemo(() => {
    if (!selectedReaction) return { knownMolecules: [] as MoleculeDot[], unknownMolecules: [] as MoleculeDot[] };
    const known = generateMoleculePositions(knownMoleculeCount, selectedReaction.knownReactant.color, waterLevel);
    const unknown = generateMoleculePositions(unknownMoleculeCount, selectedReaction.unknownReactant.color, waterLevel, known);
    return { knownMolecules: known, unknownMolecules: unknown };
  }, [knownMoleculeCount, unknownMoleculeCount, selectedReaction, waterLevel]);

  /**
   * iOS FractionedCoordinates: during reaction phases, reactant dots progressively
   * disappear while product dots progressively appear. Uses reactionProgress to
   * compute fraction of each type to show. Product positions are generated once
   * when the reaction starts and stored in productMolecules state.
   */
  const reactionMolecules = useMemo(() => {
    if (!selectedReaction) return [];
    const p = Math.min(1, Math.max(0, reactionProgress));

    // Not in a reaction phase — return static reactant dots
    const reactionPhases: Phase[] = ['reaction1', 'endReaction1', 'reaction2', 'endReaction2', 'weighProduct', 'postWeighing', 'revealMetal', 'addExtraUnknown', 'complete'];
    if (!reactionPhases.includes(phase) || p === 0) {
      return [...knownMolecules, ...unknownMolecules];
    }

    // Fraction of reactants consumed & products formed (same logic as chart)
    const knownVisible = Math.max(0, Math.round(knownMoleculeCount * (1 - p)));
    const unknownVisible = Math.max(0, Math.round(unknownMoleculeCount * (1 - p)));
    const productCount = Math.round(
      Math.min(knownMoleculeCount, unknownMoleculeCount) * p,
    );

    // Slice arrays: show first N dots from each (iOS prefix behavior)
    const visibleKnown = knownMolecules.slice(0, knownVisible);
    const visibleUnknown = unknownMolecules.slice(0, unknownVisible);
    const visibleProduct = productMolecules.slice(0, productCount);

    return [...visibleKnown, ...visibleUnknown, ...visibleProduct];
  }, [selectedReaction, reactionProgress, phase, knownMoleculeCount, unknownMoleculeCount, knownMolecules, unknownMolecules, productMolecules]);

  const selectReaction = useCallback((reaction: PrecipitationReactionDef) => {
    setSelectedReaction(reaction);
    const metal = getRandomMetal(reaction.metals);
    setCurrentMetal(metal);
    setKnownMoleculeCount(0);
    setUnknownMoleculeCount(0);
    setReactionProgress(0);
    setPrecipitatePosition('beaker');
    setEquationState('blank');
    setMetalRevealed(false);
    setBeakerView('microscopic');
    setProductMolecules([]);
    // In explore mode skip educational intro
    setPhase(exploreMode ? 'setWaterLevel' : 'explainPrecipitation');
    tagAction('selectReaction', 'precipitation', { reactionId: reaction.id });
  }, [exploreMode]);

  const toggleBeakerView = useCallback((view: BeakerView) => {
    setBeakerView(view);
    tagAction('toggleBeakerView', 'precipitation', { view });
  }, []);

  const addReactant = useCallback((type: 'known' | 'unknown', count: number) => {
    if (exploreMode) {
      // In explore mode, allow adding both types freely
      if (type === 'known') {
        setKnownMoleculeCount((prev) => {
          const next = Math.min(prev + count, MAX_MOLECULES);
          if (next >= MIN_MOLECULES) {
            setEquationState('showMolarity');
          }
          return next;
        });
        tagAction('addKnownReactant', 'precipitation', { count, explore: true });
      } else if (type === 'unknown') {
        setUnknownMoleculeCount((prev) => Math.min(prev + count, MAX_MOLECULES));
        tagAction('addUnknownReactant', 'precipitation', { count, explore: true });
      }
      return;
    }
    if (type === 'known' && phase === 'addKnown') {
      setKnownMoleculeCount((prev) => {
        const next = Math.min(prev + count, MAX_MOLECULES);
        if (next >= MIN_MOLECULES) {
          setEquationState('showMolarity');
        }
        return next;
      });
      tagAction('addKnownReactant', 'precipitation', { count });
    } else if (type === 'unknown' && (phase === 'addUnknown' || phase === 'addExtraUnknown')) {
      setUnknownMoleculeCount((prev) => Math.min(prev + count, MAX_MOLECULES));
      tagAction('addUnknownReactant', 'precipitation', { count });
    }
  }, [phase, exploreMode]);

  const dragPrecipitate = useCallback((position: PrecipitatePosition) => {
    if (!exploreMode && phase !== 'weighProduct') return;
    setPrecipitatePosition(position);
    tagAction('dragPrecipitate', 'precipitation', { position });
  }, [phase, exploreMode]);

  const setDropTargetState = useCallback((active: boolean) => {
    setIsDropTarget(active);
  }, []);

  const weighProductAction = useCallback(() => {
    if (phase !== 'weighProduct') return;
    setPrecipitatePosition('scales');
    tagAction('weighProduct', 'precipitation', {});
  }, [phase]);

  const canGoNext = useMemo(() => {
    if (exploreMode) {
      switch (phase) {
        case 'chooseReaction':
          return false;
        case 'setWaterLevel':
        case 'addKnown':
        case 'addUnknown':
          return knownMoleculeCount > 0 && unknownMoleculeCount > 0;
        case 'weighProduct':
          return precipitatePosition === 'scales';
        case 'reaction1':
        case 'reaction2':
          return false;
        case 'revealMetal':
          return true;
        case 'complete':
          return false;
        default:
          return false;
      }
    }

    // Narrative phases: always can proceed
    const narrativePhases: Phase[] = [
      'explainPrecipitation', 'explainUnknownMetal',
      'endReaction1', 'postWeighing', 'endReaction2',
    ];
    if (narrativePhases.includes(phase)) return true;

    switch (phase) {
      case 'chooseReaction':
        return false;
      case 'setWaterLevel':
        return waterLevel > 0.1;
      case 'addKnown':
        return knownMoleculeCount >= MIN_MOLECULES;
      case 'addUnknown':
      case 'addExtraUnknown':
        return unknownMoleculeCount >= MIN_MOLECULES;
      case 'weighProduct':
        return precipitatePosition === 'scales';
      case 'reaction1':
      case 'reaction2':
        return reactionProgress >= (phase === 'reaction1' ? 0.5 : 1.0);
      case 'revealMetal':
        return true;
      case 'complete':
        return false;
      default:
        return false;
    }
  }, [phase, waterLevel, knownMoleculeCount, unknownMoleculeCount, precipitatePosition, reactionProgress, exploreMode]);

  const showBack = phase !== 'chooseReaction';

  const next = useCallback(() => {
    if (exploreMode) {
      // Simplified explore flow
      switch (phase) {
        case 'setWaterLevel':
        case 'addKnown':
        case 'addUnknown':
          // Trigger reaction when both reactants present
          if (knownMoleculeCount > 0 && unknownMoleculeCount > 0) {
            // Generate product positions for microscopic view
            if (selectedReaction) {
              const allReactants = [...knownMolecules, ...unknownMolecules];
              const maxProduct = Math.min(knownMoleculeCount, unknownMoleculeCount);
              const prods = generateMoleculePositions(maxProduct, selectedReaction.product.color, waterLevel, allReactants);
              setProductMolecules(prods);
            }
            setEquationState('showMolarity');
            setBeakerView('macroscopic');
            setPhase('reaction1');
            animateReaction(0, 0.5, 3000, () => setPhase('weighProduct'));
          }
          break;
        case 'weighProduct':
          if (precipitatePosition === 'scales') {
            setPhase('revealMetal');
            setEquationState('showAll');
          }
          break;
        case 'revealMetal':
          setMetalRevealed(true);
          setPhase('complete');
          setScreenCompleted('precipitation');
          saveToStorage(STORAGE_KEY, { completed: true });
          tagAction('screenCompleted', 'precipitation', { reactionId: selectedReaction?.id, explore: true });
          break;
        default:
          break;
      }
      return;
    }

    switch (phase) {
      // Educational intro
      case 'explainPrecipitation':
        setPhase('explainUnknownMetal');
        tagAction('nextPhase', 'precipitation', { from: 'explainPrecipitation', to: 'explainUnknownMetal' });
        break;
      case 'explainUnknownMetal':
        setPhase('setWaterLevel');
        tagAction('nextPhase', 'precipitation', { from: 'explainUnknownMetal', to: 'setWaterLevel' });
        break;

      // Interactive phases
      case 'setWaterLevel':
        setPhase('addKnown');
        tagAction('setWaterLevel', 'precipitation', { waterLevel });
        break;
      case 'addKnown':
        if (knownMoleculeCount >= MIN_MOLECULES) {
          setPhase('addUnknown');
          setEquationState('showMolarity');
          tagAction('nextPhase', 'precipitation', { from: 'addKnown', to: 'addUnknown', knownMoleculeCount });
        }
        break;
      case 'addUnknown':
        if (unknownMoleculeCount >= MIN_MOLECULES) {
          // Generate product molecule positions on the grid, avoiding existing reactant positions
          if (selectedReaction) {
            const allReactants = [...knownMolecules, ...unknownMolecules];
            const maxProduct = Math.min(knownMoleculeCount, unknownMoleculeCount);
            const prods = generateMoleculePositions(maxProduct, selectedReaction.product.color, waterLevel, allReactants);
            setProductMolecules(prods);
          }
          setPhase('reaction1');
          tagAction('startReaction', 'precipitation', { reaction: 1, unknownMoleculeCount });
          // iOS: 3s linear animation, reactionProgress 0 → 0.5
          animateReaction(0, 0.5, 3000, () => setPhase('endReaction1'));
        }
        break;

      // Post reaction1: show precipitate, toggle beaker
      case 'endReaction1':
        setBeakerView('macroscopic');
        setPhase('weighProduct');
        tagAction('nextPhase', 'precipitation', { from: 'endReaction1', to: 'weighProduct' });
        break;

      case 'weighProduct':
        if (precipitatePosition === 'scales') {
          setPhase('postWeighing');
          setEquationState('showAll');
          tagAction('nextPhase', 'precipitation', { from: 'weighProduct', to: 'postWeighing' });
        }
        break;

      // Post-weighing explanation
      case 'postWeighing':
        setPhase('revealMetal');
        tagAction('nextPhase', 'precipitation', { from: 'postWeighing', to: 'revealMetal' });
        break;

      case 'revealMetal':
        setMetalRevealed(true);
        // iOS: precipitate returns to beaker for second reaction
        setPrecipitatePosition('beaker');
        setBeakerView('macroscopic');
        setPhase('addExtraUnknown');
        tagAction('revealMetal', 'precipitation', { metal: currentMetal });
        break;
      case 'addExtraUnknown':
        // Regenerate product positions with the full amount for reaction2
        if (selectedReaction) {
          const allReactants = [...knownMolecules, ...unknownMolecules];
          const maxProduct = Math.min(knownMoleculeCount, unknownMoleculeCount);
          const prods = generateMoleculePositions(maxProduct, selectedReaction.product.color, waterLevel, allReactants);
          setProductMolecules(prods);
        }
        setPhase('reaction2');
        tagAction('startReaction', 'precipitation', { reaction: 2 });
        // iOS: 3s linear animation, reactionProgress 0.5 → 1.0
        animateReaction(0.5, 1.0, 3000, () => setPhase('endReaction2'));
        break;

      // Post reaction2
      case 'endReaction2':
        setPhase('complete');
        setScreenCompleted('precipitation');
        saveToStorage(STORAGE_KEY, { completed: true });
        tagAction('screenCompleted', 'precipitation', { reactionId: selectedReaction?.id });
        break;

      case 'complete':
        break;
      default:
        break;
    }
  }, [phase, knownMoleculeCount, unknownMoleculeCount, precipitatePosition, exploreMode, currentMetal, selectedReaction, waterLevel, animateReaction, knownMolecules, unknownMolecules]);

  const back = useCallback(() => {
    tagAction('back', 'precipitation', { fromPhase: phase });
    switch (phase) {
      case 'explainPrecipitation':
      case 'explainUnknownMetal':
        setPhase('chooseReaction');
        setSelectedReaction(null);
        break;
      case 'setWaterLevel':
        if (exploreMode) {
          setPhase('chooseReaction');
          setSelectedReaction(null);
        } else {
          setPhase('explainUnknownMetal');
        }
        break;
      case 'addKnown':
        setPhase('setWaterLevel');
        setKnownMoleculeCount(0);
        break;
      case 'addUnknown':
        setPhase('addKnown');
        setUnknownMoleculeCount(0);
        break;
      case 'endReaction1':
      case 'weighProduct':
        setPhase('addUnknown');
        setReactionProgress(0);
        setPrecipitatePosition('beaker');
        setBeakerView('microscopic');
        break;
      case 'postWeighing':
      case 'revealMetal':
        setPhase('weighProduct');
        setPrecipitatePosition('beaker');
        setEquationState('showMolarity');
        break;
      default:
        break;
    }
  }, [phase, exploreMode]);

  // iOS "Run again?" button — shown after reactions complete (endReaction1, endReaction2)
  const showRunAgain = phase === 'endReaction1' || phase === 'endReaction2';

  // iOS HighlightedElements — computed from current phase (explore mode: no highlighting)
  const highlights = useMemo(() => {
    if (exploreMode) return [] as HighlightElement[];
    return getHighlightsForPhase(phase);
  }, [phase, exploreMode]);

  const runReactionAgain = useCallback(() => {
    if (!showRunAgain) return;
    // iOS: back() → RunReaction.reapply() → resetReaction() then doApply()
    // Resets progress to startOfReaction, then re-animates over 3s linear
    if (phase === 'endReaction1') {
      setPhase('reaction1');
      tagAction('runReactionAgain', 'precipitation', { reaction: 1 });
      animateReaction(0, 0.5, 3000, () => setPhase('endReaction1'));
    } else if (phase === 'endReaction2') {
      setPhase('reaction2');
      tagAction('runReactionAgain', 'precipitation', { reaction: 2 });
      animateReaction(0.5, 1.0, 3000, () => setPhase('endReaction2'));
    }
  }, [phase, showRunAgain, animateReaction]);

  return {
    reactions: precipitationReactions,
    selectedReaction,
    currentMetal,
    beakerView,
    waterLevel,
    knownMoleculeCount,
    unknownMoleculeCount,
    reactionProgress,
    precipitatePosition,
    precipitateMass,
    equationState,
    metalRevealed,
    phase,
    isDropTarget,
    showRunAgain,
    highlights,

    knownMolecules,
    unknownMolecules,
    reactionMolecules,

    unknownReactantMolarMass,
    knownReactantMolarity,
    knownReactantMoles,
    productMolesProduced,
    productMassProduced,
    unknownReactantMoles,
    unknownReactantMassAdded,

    selectReaction,
    toggleBeakerView,
    setWaterLevel,
    addReactant,
    dragPrecipitate,
    setDropTarget: setDropTargetState,
    weighProduct: weighProductAction,
    runReactionAgain,
    next,
    back,
    canGoNext,
    showBack,
  };
}
