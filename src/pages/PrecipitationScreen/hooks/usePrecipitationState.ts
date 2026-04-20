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
  // Post-reaction explanation (blueprint slide 66)
  | 'postWeighing'
  | 'revealMetal'
  | 'addExtraUnknown'
  | 'reaction2'
  // Post-reaction2 (iOS step 14)
  | 'endReaction2'
  | 'complete'
  // iOS PrepareNewReaction — transition to second reaction
  | 'prepareSecondReaction';

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
    case 'postWeighing':
      return ['productMoles', 'unknownReactantMoles'];
    case 'revealMetal':
      return ['unknownReactantMolarMass', 'correctMetalRow'];
    case 'complete':
      return []; // no dimming
    case 'prepareSecondReaction':
      return []; // no dimming during transition
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

// iOS parity (ChemicalReactionsSettings.swift) maps rows 6→14 to volumes
// 0.1→0.7 L. In the web canvas the beaker is short enough that 0.1 L
// renders as a barely-visible puddle, so we raise the floor to 0.3 L which
// gives a visible working volume while still well below the 0.7 L max.
// The slider is bounded to this range and the count-adjustment logic below
// scales molecule capacity linearly with waterLevel.
export const MIN_WATER_LEVEL = 0.3;
export const MAX_WATER_LEVEL = 0.7;
const INITIAL_WATER_LEVEL = 0.5;

// Grid dimensions matching iOS MoleculeGridSettings (rows x cols = 10 x 19 = 190)
const GRID_ROWS = 10;
const GRID_COLS = 19;
const GRID_SIZE = GRID_ROWS * GRID_COLS;

/**
 * Max molecules per reactant at a given water level — mirrors iOS
 * ReactantInputLimits. iOS maps water rows 6→10 (over volumes 0.1L→0.7L)
 * to grid sizes 114→190 (rows × 19 cols), and the per-reactant cap is
 * roughly a quarter of the grid (leaving room for the other reactant plus
 * stoichiometric headroom). At min water the cap is still generous (~30
 * molecules) — nowhere near the 5-molecule reaction threshold. We still
 * ceiling at MAX_MOLECULES so the total never exceeds what the web grid
 * renders cleanly.
 */
const IOS_ROWS_AT_MIN_VOLUME = 6;
const IOS_ROWS_AT_MAX_VOLUME = 10;
const IOS_VOLUME_MIN = 0.1; // iOS rows=6
const IOS_VOLUME_MAX = 0.7; // iOS rows=10
const IOS_GRID_COLS = 19;
const IOS_CAP_FRACTION = 0.25; // ~one quarter of grid per reactant

function maxMoleculesForWater(waterLevel: number): number {
  const w = Math.max(IOS_VOLUME_MIN, Math.min(IOS_VOLUME_MAX, waterLevel));
  const t = (w - IOS_VOLUME_MIN) / (IOS_VOLUME_MAX - IOS_VOLUME_MIN);
  const rows = IOS_ROWS_AT_MIN_VOLUME + t * (IOS_ROWS_AT_MAX_VOLUME - IOS_ROWS_AT_MIN_VOLUME);
  const gridSize = rows * IOS_GRID_COLS;
  const cap = Math.floor(gridSize * IOS_CAP_FRACTION);
  return Math.max(MIN_MOLECULES, Math.min(MAX_MOLECULES, cap));
}

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

  // The water region occupies [surfaceFrac, 1] within the overlay, so molecule
  // y-positions need to be remapped into that sub-range. We use a variable
  // number of rows matching iOS (rows=6 at min volume → rows=10 at max) so
  // molecules fill the water region proportionally without leaving an empty
  // gap at the surface.
  //
  // surfaceFrac must match Beaker.tsx's childrenOverlay geometry EXACTLY,
  // not `1 - waterLevel`. The overlay sits at innerTop+4 with height
  // resolvedHeight - innerTop - cornerRadius*0.5 - 4 (not the full beaker),
  // so `1 - waterLevel` overshoots the true surface by ~3%. For beaker
  // width=160 (used in precipitation) the exact surface fraction is computed
  // below. This is resolution-independent: the parent ResponsiveLayout scales
  // the entire canvas uniformly, so the fractional position maps to the
  // correct pixel on both small and large screens.
  const BEAKER_WIDTH = 160;
  const BEAKER_HEIGHT = Math.round(BEAKER_WIDTH * 1.1); // 176
  const BEAKER_INNER_TOP = BEAKER_WIDTH * 0.03 * 2 + 2; // 11.6
  const BEAKER_CORNER_RADIUS = BEAKER_WIDTH * 0.1; // 16
  const BEAKER_LIQUID_FILLABLE = BEAKER_HEIGHT - BEAKER_INNER_TOP;
  const OVERLAY_TOP = BEAKER_INNER_TOP + 4;
  const OVERLAY_HEIGHT = BEAKER_HEIGHT - BEAKER_INNER_TOP - BEAKER_CORNER_RADIUS * 0.5 - 4;

  const wl = Math.min(1, Math.max(0, waterLevel));
  const liquidTop = BEAKER_INNER_TOP + BEAKER_LIQUID_FILLABLE * (1 - wl);
  const surfaceFrac = Math.max(0, Math.min(1, (liquidTop - OVERLAY_TOP) / OVERLAY_HEIGHT));
  const t = (Math.max(IOS_VOLUME_MIN, Math.min(IOS_VOLUME_MAX, wl)) - IOS_VOLUME_MIN)
    / (IOS_VOLUME_MAX - IOS_VOLUME_MIN);
  const rowsInWater = Math.max(
    1,
    Math.round(IOS_ROWS_AT_MIN_VOLUME + t * (IOS_ROWS_AT_MAX_VOLUME - IOS_ROWS_AT_MIN_VOLUME)),
  );

  // Dot radius as a fraction of overlay height (dotSize=10 / overlayHeight)
  // so the topmost dots sit with their TOP edge right at the water surface
  // (not half-submerged, not clipped) and the bottom row clears the beaker
  // floor curve. Using the exact overlay height keeps this pixel-accurate at
  // all screen sizes.
  const DOT_RADIUS_FRAC = 5 / OVERLAY_HEIGHT;
  const usableTop = surfaceFrac + DOT_RADIUS_FRAC;
  const usableBottom = 1 - DOT_RADIUS_FRAC * 1.5;
  const usableHeight = Math.max(0.0001, usableBottom - usableTop);

  const occupied = new Set(
    existingDots.map((p) => `${Math.round(p.x * GRID_COLS)},${Math.round(p.y * GRID_ROWS)}`),
  );

  // Stratified row assignment: guarantees the top row is populated even when
  // the molecule count is low (e.g. 10 dots across 8 rows). Without this,
  // random row picks often leave the surface row empty and dots appear to
  // float below the water surface.
  const existingRowCount = existingDots.length;
  for (let i = 0; i < count; i++) {
    const slot = existingRowCount + i; // continue the stripe if adding to existing layout
    const assignedRow = slot % rowsInWater;
    let attempts = 0;
    let col: number = 0;
    let row: number = assignedRow;
    let keyRow: number = 0;
    do {
      col = Math.floor(Math.random() * GRID_COLS);
      // Nudge row a bit for visual variety if the stratified slot is full
      row = attempts === 0 ? assignedRow : Math.floor(Math.random() * rowsInWater);
      const rowFrac = rowsInWater > 1 ? row / (rowsInWater - 1) : 0;
      const y = usableTop + rowFrac * usableHeight;
      keyRow = Math.round(y * GRID_ROWS);
      attempts++;
      if (!occupied.has(`${col},${keyRow}`)) break;
    } while (attempts < 100);
    occupied.add(`${col},${keyRow}`);
    const rowFrac = rowsInWater > 1 ? row / (rowsInWater - 1) : 0;
    dots.push({
      color,
      x: (col + 0.5) / GRID_COLS,
      y: usableTop + rowFrac * usableHeight,
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
  equationState: EquationState;
  metalRevealed: boolean;
  phase: Phase;

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
  /** Which experiment run: 1 = first reaction, 2 = second reaction */
  reactionRun: 1 | 2;

  selectReaction: (reaction: PrecipitationReactionDef) => void;
  toggleBeakerView: (view: BeakerView) => void;
  setWaterLevel: (level: number) => void;
  addReactant: (type: 'known' | 'unknown', count: number) => void;
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
  const [equationState, setEquationState] = useState<EquationState>('blank');
  const [metalRevealed, setMetalRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>('chooseReaction');
  const [productMolecules, setProductMolecules] = useState<MoleculeDot[]>([]);
  const reactionAnimRef = useRef<number | null>(null);
  // Track which experiment run we're on (iOS runs firstReaction + secondReaction sequentially)
  const [reactionRun, setReactionRun] = useState<1 | 2>(1);
  const [completedReactionIds, setCompletedReactionIds] = useState<string[]>([]);

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

  // iOS: productMolesProduced = coeff × reactingUnknownReactantMoles
  // For reaction1 (coeff=1): 1:1 ratio. For reaction2 (coeff=2): product = 2 × unknown moles reacting
  const productMolesProduced = useMemo(() => {
    if (!selectedReaction) return 0;
    const coeff = selectedReaction.unknownReactant.coefficient;
    return coeff * unknownReactantMoles;
  }, [selectedReaction, unknownReactantMoles]);

  const productMassProduced = useMemo(() => {
    if (!selectedReaction) return 0;
    return productMolesProduced * selectedReaction.product.molarMass;
  }, [selectedReaction, productMolesProduced]);

  // Generate both molecule sets together so they don't overlap each other (iOS grid collision avoidance)
  const { knownMolecules, unknownMolecules } = useMemo(() => {
    if (!selectedReaction) return { knownMolecules: [] as MoleculeDot[], unknownMolecules: [] as MoleculeDot[] };
    const known = generateMoleculePositions(knownMoleculeCount, selectedReaction.knownReactant.color, waterLevel);
    const unknown = generateMoleculePositions(unknownMoleculeCount, selectedReaction.unknownReactant.color, waterLevel, known);
    return { knownMolecules: known, unknownMolecules: unknown };
  }, [knownMoleculeCount, unknownMoleculeCount, selectedReaction, waterLevel]);

  /**
   * iOS FractionedCoordinates: during reaction phases, reactant dots progressively
   * disappear while product dots progressively appear.
   *
   * Real-time reaction during pouring: during addUnknown / addExtraUnknown, product
   * molecules appear immediately as unknowns are added (stoichiometric visibility).
   * During reaction1/reaction2 animation phases (e.g. "Run Again"), a progress-based
   * interpolation smoothly animates from all-reactants → stoichiometric result.
   */
  const reactionMolecules = useMemo(() => {
    if (!selectedReaction) return [];

    // --- Stoichiometric helper: computes the physically-correct molecule split ---
    const stoichiometric = () => {
      const productsFormed = Math.min(knownMoleculeCount, unknownMoleculeCount);
      const knownRemaining = knownMoleculeCount - productsFormed;
      const unknownExcess = Math.max(0, unknownMoleculeCount - knownMoleculeCount);

      const visibleKnown = knownMolecules.slice(0, knownRemaining);
      // Show excess unknowns from the end of the array (first ones added reacted first)
      const visibleUnknown = unknownExcess > 0
        ? unknownMolecules.slice(unknownMoleculeCount - unknownExcess)
        : [];
      const visibleProducts = productMolecules.slice(0, productsFormed);

      return [...visibleKnown, ...visibleUnknown, ...visibleProducts];
    };

    // Real-time reaction during pouring — products appear as unknowns are added
    if ((phase === 'addUnknown' || phase === 'addExtraUnknown') && productMolecules.length > 0) {
      return stoichiometric();
    }

    // Post-reaction phases: show stoichiometric result (no animation)
    const postReactionPhases: Phase[] = [
      'endReaction1', 'endReaction2', 'postWeighing', 'revealMetal', 'complete',
    ];
    if (postReactionPhases.includes(phase) && productMolecules.length > 0) {
      return stoichiometric();
    }

    // Animation phases (reaction1 / reaction2): progress-based interpolation
    // from all-reactants (p=0) → stoichiometric result (p=1)
    if (phase === 'reaction1' || phase === 'reaction2') {
      const p = Math.min(1, Math.max(0, reactionProgress));
      if (p === 0) return [...knownMolecules, ...unknownMolecules];

      const maxReacting = Math.min(knownMoleculeCount, unknownMoleculeCount);
      const productsFormed = Math.round(maxReacting * p);
      const knownRemaining = knownMoleculeCount - productsFormed;
      const unknownRemaining = Math.max(0, unknownMoleculeCount - productsFormed);

      const visibleKnown = knownMolecules.slice(0, knownRemaining);
      const visibleUnknown = unknownMolecules.slice(0, unknownRemaining);
      const visibleProduct = productMolecules.slice(0, productsFormed);

      return [...visibleKnown, ...visibleUnknown, ...visibleProduct];
    }

    // Default: show all reactants (no reaction yet)
    return [...knownMolecules, ...unknownMolecules];
  }, [selectedReaction, reactionProgress, phase, knownMoleculeCount, unknownMoleculeCount, knownMolecules, unknownMolecules, productMolecules]);

  const selectReaction = useCallback((reaction: PrecipitationReactionDef) => {
    setSelectedReaction(reaction);
    const metal = getRandomMetal(reaction.metals);
    setCurrentMetal(metal);
    setKnownMoleculeCount(0);
    setUnknownMoleculeCount(0);
    setReactionProgress(0);
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

  // Clamp water level to the iOS-valid range and keep molecule counts in
  // sync — lowering water must reduce reactant molecules so they still fit
  // in the available liquid region.
  const setWaterLevelClamped = useCallback((level: number) => {
    const clamped = Math.max(MIN_WATER_LEVEL, Math.min(MAX_WATER_LEVEL, level));
    setWaterLevel(clamped);
    const cap = maxMoleculesForWater(clamped);
    setKnownMoleculeCount((prev) => Math.min(prev, cap));
    setUnknownMoleculeCount((prev) => Math.min(prev, cap));
  }, []);

  const addReactant = useCallback((type: 'known' | 'unknown', count: number) => {
    // Cap scales with water level so you can't cram more molecules into
    // the beaker than the current liquid volume can hold.
    const cap = maxMoleculesForWater(waterLevel);
    if (exploreMode) {
      // In explore mode, allow adding both types freely (within the cap)
      if (type === 'known') {
        setKnownMoleculeCount((prev) => {
          const next = Math.min(prev + count, cap);
          if (next >= MIN_MOLECULES) {
            setEquationState('showMolarity');
          }
          return next;
        });
        tagAction('addKnownReactant', 'precipitation', { count, explore: true });
      } else if (type === 'unknown') {
        setUnknownMoleculeCount((prev) => Math.min(prev + count, cap));
        // Pre-generate product positions for real-time stoichiometric view
        if (selectedReaction && productMolecules.length === 0 && knownMoleculeCount > 0) {
          const prods = generateMoleculePositions(
            knownMoleculeCount, selectedReaction.product.color, waterLevel, knownMolecules,
          );
          setProductMolecules(prods);
        }
        tagAction('addUnknownReactant', 'precipitation', { count, explore: true });
      }
      return;
    }
    if (type === 'known' && phase === 'addKnown') {
      setKnownMoleculeCount((prev) => {
        const next = Math.min(prev + count, cap);
        if (next >= MIN_MOLECULES) {
          setEquationState('showMolarity');
        }
        return next;
      });
      tagAction('addKnownReactant', 'precipitation', { count });
    } else if (type === 'unknown' && (phase === 'addUnknown' || phase === 'addExtraUnknown')) {
      setUnknownMoleculeCount((prev) => Math.min(prev + count, cap));
      tagAction('addUnknownReactant', 'precipitation', { count });
    }
  }, [phase, exploreMode, waterLevel, selectedReaction, productMolecules, knownMoleculeCount, knownMolecules]);

  const canGoNext = useMemo(() => {
    if (exploreMode) {
      switch (phase) {
        case 'chooseReaction':
          return false;
        case 'setWaterLevel':
        case 'addKnown':
        case 'addUnknown':
          return knownMoleculeCount > 0 && unknownMoleculeCount > 0;
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
        return waterLevel >= MIN_WATER_LEVEL;
      case 'addKnown':
        return knownMoleculeCount >= MIN_MOLECULES;
      case 'addUnknown':
      case 'addExtraUnknown':
        return unknownMoleculeCount >= MIN_MOLECULES;
      case 'reaction1':
      case 'reaction2':
        return reactionProgress >= (phase === 'reaction1' ? 0.5 : 1.0);
      case 'revealMetal':
        return true;
      case 'complete':
        // iOS: if first reaction done and there's another reaction, allow proceeding to second
        return reactionRun === 1;
      case 'prepareSecondReaction':
        return true;
      default:
        return false;
    }
  }, [phase, waterLevel, knownMoleculeCount, unknownMoleculeCount, reactionProgress, exploreMode, reactionRun]);

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
            // Generate product positions if not already generated during pouring
            if (selectedReaction && productMolecules.length === 0) {
              const prods = generateMoleculePositions(
                knownMoleculeCount, selectedReaction.product.color, waterLevel, knownMolecules,
              );
              setProductMolecules(prods);
            }
            setEquationState('showAll');
            setBeakerView('macroscopic');
            setReactionProgress(0.5);
            setPhase('postWeighing');
          }
          break;
        case 'postWeighing':
          setPhase('revealMetal');
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
          // Pre-generate product positions for real-time reaction during pouring.
          // Pool size = knownMoleculeCount (max possible products in 1:1 stoichiometry).
          if (selectedReaction) {
            const prods = generateMoleculePositions(
              knownMoleculeCount, selectedReaction.product.color, waterLevel, knownMolecules,
            );
            setProductMolecules(prods);
          }
          setPhase('addUnknown');
          setEquationState('showMolarity');
          tagAction('nextPhase', 'precipitation', { from: 'addKnown', to: 'addUnknown', knownMoleculeCount });
        }
        break;
      case 'addUnknown':
        if (unknownMoleculeCount >= MIN_MOLECULES) {
          // Products already formed in real-time during pouring (stoichiometric
          // visibility in reactionMolecules memo). Transition straight to the
          // post-reaction state — no separate animation needed.
          setReactionProgress(0.5);
          setPhase('endReaction1');
          tagAction('startReaction', 'precipitation', { reaction: 1, unknownMoleculeCount });
        }
        break;

      // Post reaction1: show precipitate, then explanation
      case 'endReaction1':
        setBeakerView('macroscopic');
        setPhase('postWeighing');
        setEquationState('showAll');
        tagAction('nextPhase', 'precipitation', { from: 'endReaction1', to: 'postWeighing' });
        break;

      // Post-reaction explanation
      case 'postWeighing':
        // Reveal the metal identity so the table highlights the matching row
        // and the equation/BeakyBox can reference the actual compound.
        setMetalRevealed(true);
        setPhase('revealMetal');
        tagAction('nextPhase', 'precipitation', { from: 'postWeighing', to: 'revealMetal' });
        break;

      case 'revealMetal':
        setBeakerView('macroscopic');
        setPhase('addExtraUnknown');
        tagAction('revealMetal', 'precipitation', { metal: currentMetal });
        break;
      case 'addExtraUnknown':
        // Products already formed in real-time during pouring.
        setReactionProgress(1.0);
        setPhase('endReaction2');
        tagAction('startReaction', 'precipitation', { reaction: 2 });
        break;

      // Post reaction2
      case 'endReaction2':
        setPhase('complete');
        if (selectedReaction) {
          setCompletedReactionIds(prev => [...prev, selectedReaction.id]);
        }
        if (reactionRun === 2) {
          // Both reactions done
          setScreenCompleted('precipitation');
          saveToStorage(STORAGE_KEY, { completed: true });
        }
        tagAction('screenCompleted', 'precipitation', { reactionId: selectedReaction?.id, run: reactionRun });
        break;

      case 'complete':
        if (reactionRun === 1) {
          // iOS PrepareNewReaction: transition to second reaction
          setPhase('prepareSecondReaction');
          tagAction('nextPhase', 'precipitation', { from: 'complete', to: 'prepareSecondReaction' });
        }
        break;

      case 'prepareSecondReaction': {
        // Auto-select the other reaction (iOS: model.setNextReaction())
        const otherReaction = precipitationReactions.find(r =>
          !completedReactionIds.includes(r.id) && r.id !== selectedReaction?.id
        ) ?? precipitationReactions.find(r => r.id !== selectedReaction?.id);
        if (otherReaction) {
          setSelectedReaction(otherReaction);
          const metal = getRandomMetal(otherReaction.metals);
          setCurrentMetal(metal);
        }
        // Reset all experiment state for second run
        setKnownMoleculeCount(0);
        setUnknownMoleculeCount(0);
        setReactionProgress(0);
        setEquationState('blank');
        setMetalRevealed(false);
        setBeakerView('microscopic');
        setProductMolecules([]);
        setReactionRun(2);
        setPhase('explainPrecipitation');
        tagAction('prepareSecondReaction', 'precipitation', { newReactionId: otherReaction?.id });
        break;
      }
      default:
        break;
    }
  }, [phase, knownMoleculeCount, unknownMoleculeCount, exploreMode, currentMetal, selectedReaction, waterLevel, animateReaction, knownMolecules, unknownMolecules, completedReactionIds, reactionRun]);

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
        setPhase('addUnknown');
        setReactionProgress(0);
        setBeakerView('microscopic');
        break;
      case 'postWeighing':
      case 'revealMetal':
        setPhase('endReaction1');
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
    // Replay: animate progress from 0 (all reactants) → 1 (stoichiometric result)
    // over 3s linear. The reaction1/reaction2 branch of reactionMolecules uses
    // the same stoichiometric formula so no visual jump at start/end.
    if (phase === 'endReaction1') {
      setPhase('reaction1');
      tagAction('runReactionAgain', 'precipitation', { reaction: 1 });
      animateReaction(0, 1.0, 3000, () => setPhase('endReaction1'));
    } else if (phase === 'endReaction2') {
      setPhase('reaction2');
      tagAction('runReactionAgain', 'precipitation', { reaction: 2 });
      animateReaction(0, 1.0, 3000, () => setPhase('endReaction2'));
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
    equationState,
    metalRevealed,
    phase,
    showRunAgain,
    highlights,
    reactionRun,

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
    setWaterLevel: setWaterLevelClamped,
    addReactant,
    runReactionAgain,
    next,
    back,
    canGoNext,
    showBack,
  };
}
