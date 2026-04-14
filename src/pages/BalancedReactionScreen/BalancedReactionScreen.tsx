import { useState, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ElementType, type Molecule } from '../../helper/chemistry/types';
import { atomInfoMap } from '../../helper/chemistry/atoms';
import { useBalancedReactionState } from './hooks/useBalancedReactionState';

import DragZone, { type HighlightState, type DroppedEntry } from '../../components/balanced-reaction/DragZone/DragZone';
import MoleculeGrid from '../../components/balanced-reaction/MoleculeGrid/MoleculeGrid';
import MoleculeView from '../../components/balanced-reaction/MoleculeView/MoleculeView';
import ReactionDefinition from '../../components/balanced-reaction/ReactionDefinition/ReactionDefinition';
import Scales from '../../components/balanced-reaction/Scales/Scales';
import BeakyBox from '../../components/shared/BeakyBox/BeakyBox';
import DropdownSelector from '../../components/shared/DropdownSelector/DropdownSelector';
import BranchMenu from '../../components/shared/BranchMenu/BranchMenu';
import LeftSidebar from '../../components/shared/LeftSidebar/LeftSidebar';
import HighlightOverlay from '../../components/shared/HighlightOverlay/HighlightOverlay';

import styles from './BalancedReactionScreen.module.scss';

type DragMoleculeType = 'reactant' | 'product' | null;

export default function BalancedReactionScreen() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const exploreMode = searchParams.get('mode') === 'explore';
  const state = useBalancedReactionState(exploreMode);

  const [reactantHighlight, setReactantHighlight] = useState<HighlightState>('none');
  const [productHighlight, setProductHighlight] = useState<HighlightState>('none');
  const [, setDraggingType] = useState<DragMoleculeType>(null);
  const [activeDragMolecule, setActiveDragMolecule] = useState<Molecule | null>(null);

  const dropdownOptions = state.reactions.map((r) => {
    const reactantStr = r.reactants
      .map((e) => (e.coefficient > 1 ? `${e.coefficient}` : '') + e.molecule.formula)
      .join(' + ');
    const productStr = r.products
      .map((e) => (e.coefficient > 1 ? `${e.coefficient}` : '') + e.molecule.formula)
      .join(' + ');
    return {
      id: r.id,
      label: `${reactantStr} → ${productStr}`,
    };
  });

  const handleSelectReaction = useCallback(
    (id: string) => {
      const reaction = state.reactions.find((r) => r.id === id);
      if (reaction) {
        state.selectReaction(reaction);
      }
    },
    [state],
  );

  const resolveElementType = (dragData: { elementType: ElementType }): 'reactant' | 'product' => {
    return dragData.elementType === ElementType.Reactant ? 'reactant' : 'product';
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { molecule: Molecule; elementType: ElementType } | undefined;
    if (data) {
      setDraggingType(resolveElementType(data));
      setActiveDragMolecule(data.molecule);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      const data = active.data.current as { elementType: ElementType } | undefined;
      if (!data) return;

      const moleculeType = resolveElementType(data);

      if (!over) {
        setReactantHighlight('none');
        setProductHighlight('none');
        return;
      }

      const overId = over.id as string;

      if (overId === 'reactant-beaker') {
        setReactantHighlight(moleculeType === 'reactant' ? 'correct' : 'wrong');
        setProductHighlight('none');
      } else if (overId === 'product-beaker') {
        setProductHighlight(moleculeType === 'product' ? 'correct' : 'wrong');
        setReactantHighlight('none');
      } else {
        setReactantHighlight('none');
        setProductHighlight('none');
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event;

      setReactantHighlight('none');
      setProductHighlight('none');
      setDraggingType(null);
      setActiveDragMolecule(null);

      const data = active.data.current as {
        molecule: Molecule;
        elementType: ElementType;
        source?: 'beaker';
      } | undefined;
      if (!data) return;

      // If molecule was dragged FROM a beaker (drag-out to remove)
      if (data.source === 'beaker') {
        // Remove if dropped outside any beaker, or on the wrong beaker
        const overId = over?.id as string | undefined;
        const moleculeType = resolveElementType(data);
        const droppedOnOwnBeaker =
          (overId === 'reactant-beaker' && moleculeType === 'reactant') ||
          (overId === 'product-beaker' && moleculeType === 'product');

        if (!droppedOnOwnBeaker) {
          // Dragged out — remove from beaker
          state.removeMoleculeFromBeaker(data.molecule, data.elementType);
        }
        return;
      }

      // Normal drag from grid to beaker (add)
      if (!over) return;

      const overId = over.id as string;
      const moleculeType = resolveElementType(data);

      if (overId === 'reactant-beaker' && moleculeType === 'reactant') {
        state.addMoleculeToBeaker(data.molecule, ElementType.Reactant);
      } else if (overId === 'product-beaker' && moleculeType === 'product') {
        state.addMoleculeToBeaker(data.molecule, ElementType.Product);
      }
    },
    [state],
  );

  const hasReaction = state.selectedReaction !== null;

  // Build user counts map (molecule id → count placed) for the equation display
  const userCounts = useMemo(() => {
    const counts = new Map<string, number>();
    state.droppedMolecules.forEach((info, moleculeId) => {
      counts.set(moleculeId, info.count);
    });
    return counts;
  }, [state.droppedMolecules]);

  // Build dropped entries for each beaker
  const reactantDropped: DroppedEntry[] = useMemo(() => {
    if (!state.selectedReaction) return [];
    const entries: DroppedEntry[] = [];
    for (const entry of state.selectedReaction.reactants) {
      const info = state.droppedMolecules.get(entry.molecule.id);
      if (info && info.count > 0) {
        entries.push({ molecule: entry.molecule, side: ElementType.Reactant, count: info.count });
      }
    }
    return entries;
  }, [state.selectedReaction, state.droppedMolecules]);

  const productDropped: DroppedEntry[] = useMemo(() => {
    if (!state.selectedReaction) return [];
    const entries: DroppedEntry[] = [];
    for (const entry of state.selectedReaction.products) {
      const info = state.droppedMolecules.get(entry.molecule.id);
      if (info && info.count > 0) {
        entries.push({ molecule: entry.molecule, side: ElementType.Product, count: info.count });
      }
    }
    return entries;
  }, [state.selectedReaction, state.droppedMolecules]);

  // Determine if dragging should be enabled (only during dragMolecules phase or explore mode)
  const dragEnabled = exploreMode || state.phase === 'dragMolecules';

  // Build guide statement based on phase
  const beakyStatement = useMemo(() => {
    if (exploreMode) {
      if (!hasReaction) {
        return [{ text: 'Free Explore: Choose a reaction to begin experimenting.' }];
      }
      return state.isBalanced
        ? [{ text: 'Balanced! Try a different combination or switch reactions to keep exploring.' }]
        : [{ text: 'Free Explore: Drag molecules into beakers. Try different combinations freely.' }];
    }

    switch (state.phase) {
      case 'selectReaction':
        return [
          { text: 'Chemical reactions are represented as an equation. ' },
          { text: 'Choose a reaction and then let\'s find out more about that!', bold: true },
        ];

      // Educational intro (iOS steps 2-5)
      case 'introFormulas':
        return [
          { text: 'A reaction is separated in two parts: the left part where the ' },
          { text: 'reactants', bold: true },
          { text: ' are, and the right part where the ' },
          { text: 'products', bold: true },
          { text: ' are. The compounds are represented as ' },
          { text: 'empirical formulas', bold: true },
          { text: ', which indicates the atoms ratio within the molecule.' },
        ];
      case 'introFormulaExample': {
        // Dynamic: describe the reactants of the selected reaction
        const r = state.selectedReaction;
        if (r) {
          const r1 = r.reactants[0];
          const r2 = r.reactants.length > 1 ? r.reactants[1] : null;
          // Build atom description for a molecule
          const describeAtoms = (mol: typeof r1.molecule) => {
            return mol.atoms
              .map((a) => {
                const info = atomInfoMap[a.atom];
                return `${a.count} atom${a.count > 1 ? 's' : ''} of ${info?.name ?? a.atom} (${info?.symbol ?? a.atom})`;
              })
              .join(' and ');
          };
          const parts: Array<{ text: string; bold?: boolean }> = [
            { text: 'For example, in this case ' },
            { text: r1.molecule.formula, bold: true },
            { text: ` is ${r1.molecule.name} which has ${describeAtoms(r1.molecule)}.` },
          ];
          if (r2) {
            parts.push(
              { text: ' ' },
              { text: r2.molecule.formula, bold: true },
              { text: ` is ${r2.molecule.name} which has ${describeAtoms(r2.molecule)}.` },
            );
          }
          return parts;
        }
        return [{ text: 'Each compound in the equation has a specific molecular formula representing its atoms.' }];
      }
      case 'introCoefficients':
        return [
          { text: 'But this is not the only numbers that are involved in the equation. ' },
          { text: 'Stoichiometric coefficients', bold: true },
          { text: ' are values that are written on the left of the compound to determine how many molecules there are.' },
        ];
      case 'introBalanced':
        return [
          { text: 'These values allow the reaction to be ' },
          { text: 'balanced', bold: true },
          { text: '. All chemical reactions, as the equation they are, have to be balanced, meaning that there has to be the ' },
          { text: 'same amount of atoms on each side of the equation', bold: true },
          { text: '.' },
        ];

      // Interactive: drag molecules
      case 'dragMolecules': {
        // Show dynamic per-molecule feedback if a molecule has been adjusted
        if (state.lastAdjustedMolecule && state.dynamicStatement) {
          // Dynamic statement has two parts: main text and bold call-to-action
          const parts = state.dynamicStatement;
          return parts;
        }

        // Otherwise show the generic intro text
        if (state.completedCount === 0) {
          // First reaction
          return [
            { text: "Let's learn how to do that right now with this equation. At the moment, there aren't any compounds on either side. " },
            { text: 'Drag the molecules to the corresponding side to balance the equation.', bold: true },
          ];
        } else {
          // Subsequent reactions
          return [
            { text: "Let's balance this reaction now. " },
            { text: 'Drag the molecules to the corresponding side to balance the equation.', bold: true },
          ];
        }
      }

      // Success
      case 'balanced': {
        const isLastReaction = state.completedCount >= state.reactions.length;
        if (isLastReaction) {
          return [
            { text: 'The equation is balanced!', bold: true },
            { text: ' This is what the real equation for this reaction looks like. There are the same number of atoms on both sides of the equation. ' },
            { text: 'Perfect! Now you know how to balance equations.', bold: true },
          ];
        } else {
          return [
            { text: 'The equation is balanced!', bold: true },
            { text: ' This is what the real equation for this reaction looks like. There are the same number of atoms on both sides of the equation. ' },
            { text: 'Choose another one.', bold: true },
          ];
        }
      }

      default:
        return [{ text: '' }];
    }
  }, [state.phase, state.isBalanced, state.selectedReaction, state.lastAdjustedMolecule, state.dynamicStatement, state.completedCount, state.reactions.length, hasReaction, exploreMode]);

  return (
    <div className={styles.screen}>
      <LeftSidebar />
      <BranchMenu currentRoute={location.pathname} />
      <DndContext
        onDragStart={dragEnabled ? handleDragStart : undefined}
        onDragOver={dragEnabled ? handleDragOver : undefined}
        onDragEnd={dragEnabled ? handleDragEnd : undefined}
      >
        <div className={styles.topBar}>
          <div className={styles.equationArea}>
            {state.selectedReaction && (
              <ReactionDefinition
                reaction={state.selectedReaction}
                emphasizeCoefficients={
                  state.phase === 'introCoefficients' || state.phase === 'introBalanced'
                }
                userCounts={userCounts}
              />
            )}
          </div>

          <div className={styles.controls}>
            <DropdownSelector
              options={dropdownOptions}
              selectedId={state.selectedReaction?.id ?? null}
              onChange={handleSelectReaction}
              disabled={exploreMode ? false : (state.phase !== 'selectReaction' && state.phase !== 'balanced')}
              placeholder="Choose a reaction"
            />
          </div>
        </div>

        {hasReaction && (
          <div className={styles.mainContent}>
            <div className={styles.centerColumn}>
              <div className={styles.scalesRow}>
                {state.allAtoms.map((atom) => {
                  const info = atomInfoMap[atom];
                  return (
                    <Scales
                      key={atom}
                      atom={atom}
                      atomColor={info.color}
                      atomSymbol={info.symbol}
                      reactantCount={state.balancer.getAtomCount(atom, ElementType.Reactant)}
                      productCount={state.balancer.getAtomCount(atom, ElementType.Product)}
                      isBalanced={state.balancer.atomIsBalanced(atom)}
                    />
                  );
                })}
              </div>

              <HighlightOverlay highlighted={dragEnabled && !state.isBalanced}>
                <div className={styles.beakerRow}>
                  <DragZone
                    id="reactant-beaker"
                    elementType="reactant"
                    highlightState={reactantHighlight}
                    width={220}
                    height={260}
                    droppedEntries={reactantDropped}
                    onRemoveMolecule={dragEnabled ? state.removeMoleculeFromBeaker : undefined}
                  />

                  <div className={styles.reactionArrow}>
                    <svg width="48" height="28" viewBox="0 0 48 28">
                      <line x1="2" y1="14" x2="36" y2="14" stroke="rgb(200, 50, 50)" strokeWidth="5" strokeLinecap="round" />
                      <polyline points="30,5 44,14 30,23" fill="none" stroke="rgb(200, 50, 50)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <DragZone
                    id="product-beaker"
                    elementType="product"
                    highlightState={productHighlight}
                    width={220}
                    height={260}
                    droppedEntries={productDropped}
                    onRemoveMolecule={dragEnabled ? state.removeMoleculeFromBeaker : undefined}
                  />
                </div>
              </HighlightOverlay>
            </div>

            <div className={styles.sidePanel}>
              <MoleculeGrid
                reaction={state.selectedReaction!}
                showTutorial={state.showTutorial}
                dragEnabled={dragEnabled}
              />
            </div>
          </div>
        )}

        {/* Drag overlay: shows the molecule being dragged at cursor position */}
        <DragOverlay dropAnimation={null}>
          {activeDragMolecule ? (
            <div className={styles.dragOverlay}>
              <MoleculeView molecule={activeDragMolecule} atomSize={28} />
              <span className={styles.dragOverlayLabel}>{activeDragMolecule.formula}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className={styles.bottomBar}>
        <BeakyBox
          statement={beakyStatement}
          onNext={state.next}
          onBack={state.goBack}
          canGoNext={state.canGoNext}
          showBack={hasReaction && state.phase !== 'selectReaction'}
        />
      </div>
    </div>
  );
}
