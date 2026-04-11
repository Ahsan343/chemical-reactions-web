import { useState, useCallback, useMemo } from 'react';
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

function generateMoleculePositions(count: number, color: string, waterLevel: number = 1): MoleculeDot[] {
  const dots: MoleculeDot[] = [];
  // Only place molecules within the water-filled region (bottom portion).
  // y=0 is top, y=1 is bottom. Water fills from bottom up to (1 - waterLevel).
  // Add 0.08 padding below the water surface so dots don't get clipped at the top edge.
  const waterSurface = 1 - Math.min(1, Math.max(0, waterLevel));
  const minY = Math.max(0.08, waterSurface + 0.08);
  const maxY = 0.92;
  const yRange = maxY - minY;
  for (let i = 0; i < count; i++) {
    dots.push({
      color,
      x: 0.1 + Math.random() * 0.8,
      y: minY + Math.random() * yRange,
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

  unknownReactantMolarMass: number;
  knownReactantMoles: number;
  productMolesProduced: number;
  productMassProduced: number;
  unknownReactantMoles: number;
  unknownReactantMassAdded: number;

  selectReaction: (reaction: PrecipitationReactionDef) => void;
  toggleBeakerView: (view: BeakerView) => void;
  setWaterLevel: (level: number) => void;
  addReactant: (type: 'known' | 'unknown', count: number) => void;
  dragPrecipitate: (position: PrecipitatePosition) => void;
  setDropTarget: (active: boolean) => void;
  weighProduct: () => void;
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

  const knownMolecules = useMemo(() => {
    if (!selectedReaction) return [];
    return generateMoleculePositions(knownMoleculeCount, selectedReaction.knownReactant.color, waterLevel);
  }, [knownMoleculeCount, selectedReaction, waterLevel]);

  const unknownMolecules = useMemo(() => {
    if (!selectedReaction) return [];
    return generateMoleculePositions(unknownMoleculeCount, selectedReaction.unknownReactant.color, waterLevel);
  }, [unknownMoleculeCount, selectedReaction, waterLevel]);

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
            setEquationState('showMolarity');
            setBeakerView('macroscopic');
            setPhase('reaction1');
            setReactionProgress(0);
            setTimeout(() => setReactionProgress(0.5), 100);
            setTimeout(() => setPhase('weighProduct'), 1500);
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
          setPhase('reaction1');
          setReactionProgress(0);
          tagAction('startReaction', 'precipitation', { reaction: 1, unknownMoleculeCount });
          setTimeout(() => {
            setReactionProgress(0.5);
          }, 100);
          setTimeout(() => {
            setPhase('endReaction1');
          }, 1500);
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
        setPhase('addExtraUnknown');
        tagAction('revealMetal', 'precipitation', { metal: currentMetal });
        break;
      case 'addExtraUnknown':
        setPhase('reaction2');
        setReactionProgress(0.5);
        tagAction('startReaction', 'precipitation', { reaction: 2 });
        setTimeout(() => {
          setReactionProgress(1.0);
        }, 100);
        setTimeout(() => {
          setPhase('endReaction2');
        }, 1500);
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
  }, [phase, knownMoleculeCount, unknownMoleculeCount, precipitatePosition, exploreMode, currentMetal, selectedReaction, waterLevel]);

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

    knownMolecules,
    unknownMolecules,

    unknownReactantMolarMass,
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
    next,
    back,
    canGoNext,
    showBack,
  };
}
