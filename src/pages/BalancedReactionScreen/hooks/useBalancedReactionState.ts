import { useState, useRef, useCallback, useMemo } from 'react';
import { type BalancedReactionDef, type Molecule, type Atom, ElementType } from '../../../helper/chemistry/types';
import { ReactionBalancer } from '../../../helper/chemistry/reactionBalancer';
import { balancedReactions } from '../../../constants/reactions/balancedReactions';
import { tagAction } from '../../../helper/actionLogger';
import { loadFromStorage, saveToStorage, setScreenCompleted } from '../../../helper/persistence/storage';


type Phase =
  | 'selectReaction'
  // Educational intro (iOS steps 2-5)
  | 'introFormulas'
  | 'introFormulaExample'
  | 'introCoefficients'
  | 'introBalanced'
  // Interactive: drag molecules
  | 'dragMolecules'
  // Success
  | 'balanced';

const PHASE_ORDER: Phase[] = [
  'selectReaction', 'introFormulas', 'introFormulaExample',
  'introCoefficients', 'introBalanced', 'dragMolecules', 'balanced',
];

interface DroppedMoleculeInfo {
  side: ElementType;
  count: number;
}

interface AtomBalance {
  atom: Atom;
  reactantCount: number;
  productCount: number;
  isBalanced: boolean;
  surplus: number;
}

interface BalancedReactionState {
  selectedReaction: BalancedReactionDef | null;
  balancer: ReactionBalancer;
  droppedMolecules: Map<string, DroppedMoleculeInfo>;
  isBalanced: boolean;
  canGoNext: boolean;
  allAtoms: Atom[];
  atomBalances: AtomBalance[];
  showTutorial: boolean;
  reactions: BalancedReactionDef[];
  phase: Phase;
  completedCount: number;
  lastAdjustedMolecule: Molecule | null;
  dynamicStatement: Array<{ text: string; bold?: boolean }> | null;
  selectReaction: (reaction: BalancedReactionDef) => void;
  addMoleculeToBeaker: (molecule: Molecule, side: ElementType) => void;
  removeMoleculeFromBeaker: (molecule: Molecule, side: ElementType) => void;
  next: () => void;
  reset: () => void;
  goBack: () => void;
}

export function useBalancedReactionState(exploreMode = false): BalancedReactionState {
  const [selectedReaction, setSelectedReaction] = useState<BalancedReactionDef | null>(null);
  const [droppedMolecules, setDroppedMolecules] = useState<Map<string, DroppedMoleculeInfo>>(
    () => new Map(),
  );
  const [showTutorial, setShowTutorial] = useState(true);
  const [updateCount, forceUpdate] = useState(0);
  const [phase, setPhase] = useState<Phase>('selectReaction');
  const [completedCount, setCompletedCount] = useState(0);
  const [lastAdjustedMolecule, setLastAdjustedMolecule] = useState<Molecule | null>(null);

  const balancerRef = useRef<ReactionBalancer>(
    new ReactionBalancer(balancedReactions[0]),
  );

  const BALANCED_STORAGE_KEY = 'balancedCompleted';

  interface BalancedEntry {
    reactionId: string;
  }


  const selectReaction = useCallback((reaction: BalancedReactionDef) => {
    setSelectedReaction(reaction);
    balancerRef.current = new ReactionBalancer(reaction);
    setDroppedMolecules(new Map());
    setShowTutorial(true);
    setLastAdjustedMolecule(null);
    // Skip intro for explore mode or if user has already completed first reaction
    if (exploreMode) {
      setPhase('dragMolecules');
    } else if (completedCount === 0) {
      setPhase('introFormulas');
    } else {
      setPhase('dragMolecules');
    }
    tagAction('selectReaction', 'balancedReaction', { reactionId: reaction.id });
    forceUpdate((n) => n + 1);
  }, [exploreMode, completedCount]);

  // Shared helper: synchronize phase with the current balance state.
  // Handles both directions:
  //   - dragMolecules → balanced (when a change achieves exact-coefficient balance)
  //   - balanced → dragMolecules (when a change breaks balance)
  const syncPhaseWithBalance = useCallback(() => {
    const nowBalanced = balancerRef.current.isBalanced;
    if (nowBalanced && phase !== 'balanced') {
      setPhase('balanced');
      setCompletedCount((prev) => prev + 1);
      setScreenCompleted('balanced');
      if (selectedReaction) {
        const existing = loadFromStorage<Record<string, BalancedEntry>>(BALANCED_STORAGE_KEY) ?? {};
        existing[selectedReaction.id] = { reactionId: selectedReaction.id };
        saveToStorage(BALANCED_STORAGE_KEY, existing);
      }
      tagAction('screenCompleted', 'balancedReaction', { reactionId: selectedReaction?.id });
    } else if (!nowBalanced && phase === 'balanced') {
      setPhase('dragMolecules');
    }
  }, [phase, selectedReaction]);

  const addMoleculeToBeaker = useCallback((molecule: Molecule, side: ElementType) => {
    balancerRef.current.add(molecule, side);
    setLastAdjustedMolecule(molecule);

    setDroppedMolecules((prev) => {
      const next = new Map(prev);
      const key = molecule.id;
      const existing = next.get(key);
      if (existing) {
        next.set(key, { side, count: existing.count + 1 });
      } else {
        next.set(key, { side, count: 1 });
      }
      return next;
    });

    if (showTutorial) {
      setShowTutorial(false);
    }

    tagAction('addMolecule', 'balancedReaction', {
      moleculeId: molecule.id,
      side,
    });

    forceUpdate((n) => n + 1);

    syncPhaseWithBalance();
  }, [showTutorial, syncPhaseWithBalance]);

  const removeMoleculeFromBeaker = useCallback((molecule: Molecule, side: ElementType) => {
    balancerRef.current.remove(molecule, side);
    setLastAdjustedMolecule(molecule);

    setDroppedMolecules((prev) => {
      const next = new Map(prev);
      const key = molecule.id;
      const existing = next.get(key);
      if (existing && existing.count > 1) {
        next.set(key, { side, count: existing.count - 1 });
      } else {
        next.delete(key);
      }
      return next;
    });

    tagAction('removeMolecule', 'balancedReaction', {
      moleculeId: molecule.id,
      side,
    });

    forceUpdate((n) => n + 1);

    syncPhaseWithBalance();
  }, [syncPhaseWithBalance]);

  const reset = useCallback(() => {
    tagAction('reset', 'balancedReaction', { reactionId: selectedReaction?.id });
    balancerRef.current.reset();
    setDroppedMolecules(new Map());
    setShowTutorial(true);
    setLastAdjustedMolecule(null);
    setPhase(selectedReaction ? 'dragMolecules' : 'selectReaction');
    forceUpdate((n) => n + 1);
  }, [selectedReaction]);

  const goBack = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex <= 0) {
      reset();
      return;
    }
    const prevPhase = PHASE_ORDER[currentIndex - 1];
    tagAction('goBack', 'balancedReaction', { from: phase, to: prevPhase });
    setPhase(prevPhase);
  }, [phase, reset]);

  const next = useCallback(() => {
    if (exploreMode) return;

    switch (phase) {
      case 'introFormulas':
        setPhase('introFormulaExample');
        tagAction('nextPhase', 'balancedReaction', { from: 'introFormulas', to: 'introFormulaExample' });
        break;
      case 'introFormulaExample':
        setPhase('introCoefficients');
        tagAction('nextPhase', 'balancedReaction', { from: 'introFormulaExample', to: 'introCoefficients' });
        break;
      case 'introCoefficients':
        setPhase('introBalanced');
        tagAction('nextPhase', 'balancedReaction', { from: 'introCoefficients', to: 'introBalanced' });
        break;
      case 'introBalanced':
        setPhase('dragMolecules');
        tagAction('nextPhase', 'balancedReaction', { from: 'introBalanced', to: 'dragMolecules' });
        break;
      case 'balanced': {
        // Auto-advance to next reaction
        if (!selectedReaction) break;
        const currentIdx = balancedReactions.findIndex((r) => r.id === selectedReaction.id);
        const nextIdx = (currentIdx + 1) % balancedReactions.length;
        const nextReaction = balancedReactions[nextIdx];
        setSelectedReaction(nextReaction);
        balancerRef.current = new ReactionBalancer(nextReaction);
        setDroppedMolecules(new Map());
        setShowTutorial(true);
        setPhase('dragMolecules');
        forceUpdate((n) => n + 1);
        tagAction('nextReaction', 'balancedReaction', { reactionId: nextReaction.id });
        break;
      }
      default:
        break;
    }
  }, [phase, selectedReaction, exploreMode]);

  const balancer = balancerRef.current;
  const isBalanced = balancer.isBalanced;

  const canGoNext = useMemo(() => {
    if (exploreMode) return false;

    const narrativePhases: Phase[] = [
      'introFormulas', 'introFormulaExample', 'introCoefficients', 'introBalanced',
    ];
    if (narrativePhases.includes(phase)) return true;

    if (phase === 'balanced') return true;

    return false;
  }, [phase, exploreMode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allAtoms = useMemo(() => balancer.allAtoms, [balancer, updateCount]);

  const atomBalances: AtomBalance[] = useMemo(
    () =>
      allAtoms.map((atom) => ({
        atom,
        reactantCount: balancer.getAtomCount(atom, ElementType.Reactant),
        productCount: balancer.getAtomCount(atom, ElementType.Product),
        isBalanced: balancer.atomIsBalanced(atom),
        surplus: balancer.getAtomSurplus(atom),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAtoms, balancer, updateCount],
  );

  type StatementPart = { text: string; bold?: boolean };

  const dynamicStatement: StatementPart[] | null = useMemo(() => {
    if (!lastAdjustedMolecule || !selectedReaction) return null;

    // If the reaction is balanced, show nothing (phase auto-advances)
    if (balancer.isBalanced) {
      return null;
    }

    // If it's a "multiple of balanced" state
    if (balancer.isAtomCountsBalanced && balancer.isMultipleOfBalanced) {
      return [
        { text: 'There are now the same number of atoms on both sides of the equation, but each coefficient could be smaller. ' },
        { text: 'Try to remove molecules', bold: true },
        { text: '.' },
      ];
    }

    // Unbalanced - show detailed feedback
    if (!balancer.isAtomCountsBalanced) {
      const coefficient = balancer.getMoleculeCount(lastAdjustedMolecule.id,
        selectedReaction.reactants.some(r => r.molecule.id === lastAdjustedMolecule.id)
          ? ElementType.Reactant
          : ElementType.Product);

      const moleculePlural = coefficient === 1 ? 'molecule' : 'molecules';

      if (coefficient === 1) {
        // First molecule added
        return [
          { text: `Equation is unbalanced now! You added 1 molecule of ${lastAdjustedMolecule.formula}. The Stoichiometric Coefficient for it now is 1 then. ` },
          { text: 'Drag the molecules to the corresponding side. You can remove the molecule by tapping it.', bold: true },
        ];
      } else {
        // Subsequent molecules
        return [
          { text: `Equation is unbalanced now! You added ${coefficient} ${moleculePlural} of ${lastAdjustedMolecule.formula}. The Stoichiometric Coefficient for it now is ${coefficient} then. ` },
          { text: 'Keep dragging the molecules to balance the equation. You can remove the molecule by tapping it.', bold: true },
        ];
      }
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAdjustedMolecule, selectedReaction, balancer, updateCount]);

  return {
    selectedReaction,
    balancer,
    droppedMolecules,
    isBalanced,
    canGoNext,
    allAtoms,
    atomBalances,
    showTutorial,
    reactions: balancedReactions,
    phase,
    completedCount,
    lastAdjustedMolecule,
    dynamicStatement,
    selectReaction,
    addMoleculeToBeaker,
    removeMoleculeFromBeaker,
    next,
    reset,
    goBack,
  };
}
