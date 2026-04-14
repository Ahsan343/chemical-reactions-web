import { useCallback, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { usePrecipitationState } from './hooks/usePrecipitationState';

import { replaceMetalInFormula } from '../../helper/chemistry/molarMass';
import { Metal } from '../../helper/chemistry/types';

import EquationDisplay, { type EquationSegment } from '../../components/shared/EquationDisplay/EquationDisplay';
import DropdownSelector from '../../components/shared/DropdownSelector/DropdownSelector';
import BranchMenu from '../../components/shared/BranchMenu/BranchMenu';
import LeftSidebar from '../../components/shared/LeftSidebar/LeftSidebar';
import { FillableBeaker } from '../../components/shared/Beaker/FillableBeaker';
import { BeakerMoleculeGrid } from '../../components/shared/Beaker/BeakerMoleculeGrid';
import ShakingContainer from '../../components/shared/ShakingContainer/ShakingContainer';
import BeakyBox from '../../components/shared/BeakyBox/BeakyBox';
import MetalTable from '../../components/precipitation/MetalTable/MetalTable';
import PrecipitateShape from '../../components/precipitation/PrecipitateShape/PrecipitateShape';
import DigitalScales from '../../components/precipitation/DigitalScales/DigitalScales';
import BeakerToggle from '../../components/precipitation/BeakerToggle/BeakerToggle';

import styles from './PrecipitationScreen.module.scss';

function buildReactionSegments(
  state: ReturnType<typeof usePrecipitationState>
): EquationSegment[] {
  const { selectedReaction, metalRevealed, currentMetal } = state;
  if (!selectedReaction) return [];

  const emphasize = !metalRevealed;

  const unknownFormula = replaceMetalInFormula(
    selectedReaction.unknownReactant.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium
  );
  const unknownDisplay = metalRevealed
    ? unknownFormula
    : unknownFormula.replace(/Na|Li|K/g, 'M');

  const productFormula = selectedReaction.product.formula;

  const secondaryFormula = replaceMetalInFormula(
    selectedReaction.secondaryProduct.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium
  );
  const secondaryDisplay = metalRevealed
    ? secondaryFormula
    : secondaryFormula.replace(/Na|Li|K/g, 'M');

  return [
    { text: unknownDisplay, emphasize },
    { text: `(${selectedReaction.unknownReactant.state})`, isState: true },
    { text: ' + ' },
    { text: selectedReaction.knownReactant.formula },
    { text: `(${selectedReaction.knownReactant.state})`, isState: true },
    { text: ' \u2192 ' },
    { text: productFormula },
    { text: `(${selectedReaction.product.state})`, isState: true },
    { text: ' + ' },
    { text: secondaryDisplay, emphasize },
    { text: `(${selectedReaction.secondaryProduct.state})`, isState: true },
  ];
}

function getGuideStatement(state: ReturnType<typeof usePrecipitationState>, explore: boolean) {
  if (explore) {
    switch (state.phase) {
      case 'chooseReaction':
        return [{ text: 'Free Explore: Choose a reaction to begin experimenting freely.' }];
      case 'reaction1':
        return [{ text: 'The reaction is proceeding. A precipitate is forming...' }];
      case 'weighProduct':
        return [{ text: 'Drag the precipitate onto the scales to weigh it, then press Next.' }];
      case 'revealMetal':
        return [
          { text: 'Press Next to reveal the identity of metal ' },
          { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
          { text: '.' },
        ];
      case 'complete':
        return [
          { text: 'The metal is ' },
          { text: state.currentMetal, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '! Experiment complete.' },
        ];
      default:
        return [{ text: 'Add reactants freely, adjust water level, then click React to start.' }];
    }
  }
  switch (state.phase) {
    case 'chooseReaction':
      return [
        { text: 'Stoichiometry has various applications. Let\'s find out more. ' },
        { text: 'Choose a reaction.', bold: true },
      ];

    // Educational intro (iOS steps 2-3)
    case 'explainPrecipitation':
      return [
        { text: 'This is a Precipitation Reaction. How do I know? Well, one way is to notice that one of the product is a solid (s), so once reaction takes place, this solid will be produced and deposit as a precipitate. In this case ' },
        { text: state.selectedReaction?.product.formula ?? 'CaCO₃', bold: true },
      ];
    case 'explainUnknownMetal':
      return [
        { text: 'But there\'s something else that is strange about the reaction right? Well, ' },
        { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
        { text: ' is not a real element. M in this case represents just an alkaline metal. We will learn how stoichiometry can tell us which one of those 3 components is ' },
        { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
        { text: '.' },
      ];

    case 'setWaterLevel':
      return [
        { text: 'So this is a reaction that takes place in water, let\'s set the volume of water in the beaker. ' },
        { text: 'Use the slider to set the volume.', bold: true },
      ];
    case 'addKnown':
      return [
        { text: 'Perfect! Now shake ' },
        { text: state.selectedReaction?.knownReactant.formula ?? 'known reactant', bold: true },
        { text: ' to prepare a solution of it. ' },
        { text: 'Shake it into the beaker.', bold: true },
      ];
    case 'addUnknown':
      return [
        { text: `You added ${state.knownReactantMoles.toFixed(4)} moles of ` },
        { text: state.selectedReaction?.knownReactant.formula ?? '', bold: true },
        { text: '. Now go ahead and add ' },
        { text: state.metalRevealed
            ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
            : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
          bold: true },
        { text: ' and let\'s watch them react. ' },
        { text: 'Notice the amount of grams added at the shaker. Keep shaking to see it react.', bold: true },
      ];
    case 'reaction1':
      return [
        { text: 'Perfect! You added ' },
        { text: `${state.unknownReactantMassAdded.toFixed(2)} grams`, bold: true },
        { text: ' of ' },
        { text: state.metalRevealed
            ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
            : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
          bold: true },
        { text: '. Now let\'s just see the reaction going. ' },
        { text: `Watch how ${state.selectedReaction?.product.formula ?? 'the product'} is produced.`, bold: true },
      ];

    // Post-reaction1 (iOS step 8)
    case 'endReaction1':
      return [
        { text: 'The reaction is complete! Why don\'t you check out the macroscopic beaker to see the precipitate you produced! ' },
        { text: 'Tap the toggle.', bold: true },
        { text: ' You can also tap back or the run again button to see the reaction again.' },
      ];

    case 'weighProduct':
      return [
        { text: 'Now, why don\'t you drag the solid ' },
        { text: state.selectedReaction?.product.formula ?? 'product', bold: true },
        { text: ' onto the scales to weigh it? ' },
        { text: 'Drag the solid onto the scales.', bold: true },
      ];

    // Post-weighing explanation (iOS step 10)
    case 'postWeighing':
      return [
        { text: `${state.productMassProduced.toFixed(2)} grams of ` },
        { text: state.selectedReaction?.product.formula ?? '', bold: true },
        { text: ` was produced. By dividing this by its Molar Mass, we know that it's ` },
        { text: `${state.productMolesProduced.toFixed(4)} mol`, bold: true },
        { text: `, which means that the ` },
        { text: `${state.unknownReactantMassAdded.toFixed(2)} grams of `, bold: true },
        { text: state.metalRevealed
            ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
            : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
          bold: true },
        { text: ` we added are ` },
        { text: `${state.productMolesProduced.toFixed(4)} mol. But what does this mean?`, bold: true },
      ];

    case 'revealMetal': {
      const unknownMolarMass = state.unknownReactantMolarMass;
      const unknownFormula = state.metalRevealed
        ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
        : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M');
      const revealedFormula = replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal);
      return [
        { text: `Well, if there are ${state.unknownReactantMassAdded.toFixed(2)} grams in ${state.productMolesProduced.toFixed(4)} moles of ${unknownFormula}, then how many are in 1 mol? There are ${unknownMolarMass} grams of ${unknownFormula}, in 1 mol. That's right, ${unknownMolarMass} g/mol is the Molar Mass of it, and ` },
        { text: `${revealedFormula}`, bold: true },
        { text: ` Molar Mass matches perfectly! So ` },
        { text: `M = ${state.currentMetal}`, bold: true, color: 'rgb(220, 84, 59)' },
      ];
    }
    case 'addExtraUnknown': {
      const revealedFormula2 = replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal);
      return [
        { text: 'We already discovered the mystery. At this point the ' },
        { text: revealedFormula2, bold: true },
        { text: ' is the Limiting Reagent, so just keep shaking ' },
        { text: revealedFormula2, bold: true },
        { text: ` to neutralize the ${state.selectedReaction?.knownReactant.formula ?? ''} in its entirety. ` },
        { text: 'Keep shaking to see it react.', bold: true },
      ];
    }
    case 'reaction2':
      return [
        { text: 'Now just watch how the reactant you added produces more and more ' },
        { text: state.selectedReaction?.product.formula ?? 'product', bold: true },
        { text: ', as it neutralizes all of the ' },
        { text: state.selectedReaction?.knownReactant.formula ?? '', bold: true },
        { text: ' that was left in the beaker. ' },
        { text: 'Change between both Microscopic and Macroscopic views.', bold: true },
      ];

    // Post-reaction2 (iOS step 14)
    case 'endReaction2':
      return [
        { text: 'Done! All there\'s not more reactant left. In a real laboratory, you would be able to extract the precipitate of ' },
        { text: state.selectedReaction?.product.formula ?? '', bold: true },
        { text: ' with a filter and weight it to know the mass, so this could be applied to real life.' },
      ];

    case 'complete':
      return [{ text: 'Experiment complete. You identified the unknown metal using stoichiometry. Well done!' }];
    default:
      return [{ text: '' }];
  }
}

export default function PrecipitationScreen() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const exploreMode = searchParams.get('mode') === 'explore';
  const state = usePrecipitationState(exploreMode);

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const precipitateRef = useRef<HTMLDivElement>(null);
  const scalesRef = useRef<HTMLDivElement>(null);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!exploreMode && state.phase !== 'weighProduct') return;
      if (state.precipitatePosition !== 'beaker') return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: 0, y: 0 });
    },
    [state.phase, state.precipitatePosition, exploreMode],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setDragOffset({ x: dx, y: dy });

      if (scalesRef.current) {
        const scalesRect = scalesRef.current.getBoundingClientRect();
        const isOver =
          e.clientX >= scalesRect.left &&
          e.clientX <= scalesRect.right &&
          e.clientY >= scalesRect.top &&
          e.clientY <= scalesRect.bottom;
        state.setDropTarget(isOver);
      }
    },
    [state],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      setDragOffset(null);

      if (scalesRef.current) {
        const scalesRect = scalesRef.current.getBoundingClientRect();
        const isOver =
          e.clientX >= scalesRect.left &&
          e.clientX <= scalesRect.right &&
          e.clientY >= scalesRect.top &&
          e.clientY <= scalesRect.bottom;

        if (isOver) {
          state.dragPrecipitate('scales');
        }
      }
      state.setDropTarget(false);
    },
    [state],
  );

  const hasReaction = state.selectedReaction !== null;
  const segments = buildReactionSegments(state);
  const guideStatement = getGuideStatement(state, exploreMode);

  const showPrecipitate =
    hasReaction &&
    state.phase === 'weighProduct' &&
    state.precipitatePosition === 'beaker' &&
    state.beakerView === 'macroscopic';

  const isReactionPhase = state.phase === 'reaction1' || state.phase === 'reaction2' || state.phase === 'weighProduct' || state.phase === 'revealMetal' || state.phase === 'complete';
  const knownContainerActive = exploreMode ? (hasReaction && !isReactionPhase) : state.phase === 'addKnown';
  const unknownContainerActive = exploreMode ? (hasReaction && !isReactionPhase) : (state.phase === 'addUnknown' || state.phase === 'addExtraUnknown');

  return (
    <div className={styles.screen}>
      <LeftSidebar />
      <BranchMenu currentRoute={location.pathname} />
      {/* Top bar: equation + controls */}
      <div className={styles.topBar}>
        <div className={styles.equationArea}>
          {hasReaction && <EquationDisplay segments={segments} />}
        </div>
        <div className={styles.controls}>
          <DropdownSelector
            options={dropdownOptions}
            selectedId={state.selectedReaction?.id ?? null}
            onChange={handleSelectReaction}
            disabled={exploreMode ? false : state.phase !== 'chooseReaction'}
            placeholder="Choose a reaction"
          />
        </div>
      </div>

      {hasReaction ? (
        <div className={styles.mainContent}>
          {/* Left column */}
          <div className={styles.leftColumn}>
            <div className={styles.containersRow}>
              <ShakingContainer
                color={state.selectedReaction!.knownReactant.color}
                label={state.selectedReaction!.knownReactant.formula}
                onPour={() => state.addReactant('known', 5)}
                disabled={!knownContainerActive}
                isActive={knownContainerActive}
                tooltipText={
                  knownContainerActive
                    ? `${state.knownMoleculeCount} molecules`
                    : undefined
                }
              />
              <ShakingContainer
                color={state.selectedReaction!.unknownReactant.color}
                label={
                  state.metalRevealed
                    ? replaceMetalInFormula(
                        state.selectedReaction!.unknownReactant.formulaTemplate,
                        state.currentMetal
                      )
                    : replaceMetalInFormula(
                        state.selectedReaction!.unknownReactant.formulaTemplate,
                        Metal.Sodium
                      ).replace(/Na|Li|K/g, 'M')
                }
                onPour={() => state.addReactant('unknown', 5)}
                disabled={!unknownContainerActive}
                isActive={unknownContainerActive}
                tooltipText={
                  unknownContainerActive && state.unknownReactantMassAdded > 0
                    ? `${state.unknownReactantMassAdded.toFixed(2)} g`
                    : undefined
                }
              />
            </div>

            <div className={styles.beakerScalesRow}>
              <div className={styles.beakerWrapper}>
                <FillableBeaker
                  waterLevel={state.waterLevel}
                  onWaterLevelChange={state.setWaterLevel}
                  disabled={exploreMode ? (!hasReaction || isReactionPhase) : state.phase !== 'setWaterLevel'}
                  width={160}
                >
                {state.beakerView === 'microscopic' ? (
                  <BeakerMoleculeGrid
                    molecules={[...state.knownMolecules, ...state.unknownMolecules]}
                    animated
                  />
                ) : state.reactionProgress > 0 && state.precipitatePosition === 'beaker' && state.phase !== 'weighProduct' ? (
                  <PrecipitateShape
                    progress={state.reactionProgress}
                    color={state.selectedReaction!.product.color}
                    size={90}
                  />
                ) : null}
              </FillableBeaker>

              {showPrecipitate && (state.phase === 'weighProduct' || (exploreMode && state.reactionProgress > 0 && state.precipitatePosition === 'beaker')) && (
                <div
                  ref={precipitateRef}
                  className={styles.precipitateDraggable}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '25%',
                    width: 60,
                    height: 60,
                    transform: dragOffset
                      ? `translate(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px)`
                      : 'translateX(-50%)',
                    zIndex: 10,
                    cursor: dragOffset ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <PrecipitateShape
                    progress={state.reactionProgress}
                    color={state.selectedReaction!.product.color}
                    size={60}
                  />
                </div>
              )}
              </div>

              <div className={styles.scalesArea} ref={scalesRef}>
                {state.precipitatePosition === 'scales' && (
                  <div className={styles.scalePrecipitate}>
                    <PrecipitateShape
                      progress={state.reactionProgress}
                      color={state.selectedReaction!.product.color}
                      size={44}
                    />
                  </div>
                )}
                <DigitalScales
                  mass={state.precipitateMass}
                  isDropTarget={state.isDropTarget}
                  showMass={state.precipitatePosition === 'scales'}
                />
              </div>
            </div>

            <div className={styles.toggleArea}>
              <BeakerToggle
                view={state.beakerView}
                onChange={state.toggleBeakerView}
                disabled={false}
              />
            </div>
          </div>

          {/* Middle column */}
          <div className={styles.middleColumn}>
            <div className={styles.tableWrapper}>
              <MetalTable
                reaction={state.selectedReaction!}
                revealedMetal={state.metalRevealed ? state.currentMetal : null}
                showHighlight={state.metalRevealed}
              />
            </div>

            {state.selectedReaction && (state.knownMoleculeCount > 0 || state.unknownMoleculeCount > 0) && (
              <div className={styles.chartPlaceholder}>
                <div className={styles.chartBars}>
                  {(() => {
                    const maxMol = 40;
                    const maxDots = 10;
                    const scale = maxMol > 0 ? maxDots / maxMol : 0;
                    const p = Math.min(1, Math.max(0, state.reactionProgress));
                    // Use actual molecule counts — clamp to maxDots to prevent overflow
                    const krDots = state.knownMoleculeCount > 0
                      ? Math.min(maxDots, Math.max(0, Math.round(state.knownMoleculeCount * scale * (1 - p))))
                      : 0;
                    const urDots = state.unknownMoleculeCount > 0
                      ? Math.min(maxDots, Math.max(0, Math.round(state.unknownMoleculeCount * scale * (1 - p))))
                      : 0;
                    const prDots = (state.knownMoleculeCount > 0 && state.unknownMoleculeCount > 0)
                      ? Math.min(maxDots, Math.round(Math.min(state.knownMoleculeCount, state.unknownMoleculeCount) * scale * p))
                      : 0;
                    const molSize = 12;
                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 3 }}>
                          {Array.from({ length: krDots }).map((_, i) => (
                            <div key={`kr-${i}`} style={{ width: molSize, height: molSize, borderRadius: '50%', backgroundColor: state.selectedReaction!.knownReactant.color }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 3 }}>
                          {Array.from({ length: urDots }).map((_, i) => (
                            <div key={`ur-${i}`} style={{ width: molSize, height: molSize, borderRadius: '50%', backgroundColor: state.selectedReaction!.unknownReactant.color }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 3 }}>
                          {Array.from({ length: prDots }).map((_, i) => (
                            <div key={`pr-${i}`} style={{ width: molSize, height: molSize, borderRadius: '50%', backgroundColor: state.selectedReaction!.product.color }} />
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.knownReactant.color }} />
                      <span className={styles.chartLabel}>KR</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.unknownReactant.color }} />
                      <span className={styles.chartLabel}>UR</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.product.color }} />
                      <span className={styles.chartLabel}>P</span>
                    </div>
                  </>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className={styles.rightColumn}>
            <div className={styles.equationPanel}>
              {/* Known reactant moles: n = V x M */}
              <div className={styles.equationGroup}>
                <div className={styles.equationLine}>
                  <span style={{ fontStyle: 'italic' }}>n</span>
                  <sub>{state.selectedReaction!.knownReactant.formula}</sub>
                  {' = V \u00D7 '}
                  <span style={{ fontStyle: 'italic' }}>M</span>
                  <sub>{state.selectedReaction!.knownReactant.formula}</sub>
                </div>
                <div className={styles.equationLine}>
                  {'= '}
                  <span className={styles.equationValue}>
                    {state.waterLevel.toFixed(2)}
                  </span>
                  {' \u00D7 '}
                  {state.equationState !== 'blank' ? (
                    <span className={styles.equationValue}>{state.knownReactantMolarity.toFixed(2)}</span>
                  ) : (
                    <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(180,180,180)', borderRadius: 3, textAlign: 'center', lineHeight: '20px', color: 'rgb(180,180,180)' }}>?</span>
                  )}
                </div>
                {state.equationState !== 'blank' && (
                  <div className={styles.equationLine}>
                    <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                      <span className={styles.equationValue}>
                        {state.knownReactantMoles.toFixed(4)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Product moles: n = m / MM */}
              {state.equationState === 'showAll' && (
                <>
                  <div className={styles.equationGroup}>
                    <div className={styles.equationLine}>
                      <span style={{ fontStyle: 'italic' }}>n</span>
                      <sub>{state.selectedReaction!.product.formula}</sub>
                      {' = '}
                      <span className={styles.equationFraction}>
                        <span><span style={{ fontStyle: 'italic' }}>m</span><sub>{state.selectedReaction!.product.formula}</sub></span>
                        <span className={styles.fractionLine} />
                        <span>MM<sub>{state.selectedReaction!.product.formula}</sub></span>
                      </span>
                    </div>
                    <div className={styles.equationLine}>
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.productMolesProduced.toFixed(4)}
                        </span>
                      </span>
                      {' = '}
                      <span className={styles.equationFraction}>
                        <span className={styles.equationValue}>
                          {state.productMassProduced.toFixed(2)}
                        </span>
                        <span className={styles.fractionLine} />
                        <span>{state.selectedReaction!.product.molarMass}</span>
                      </span>
                    </div>
                  </div>

                  {/* Unknown reactant moles */}
                  <div className={styles.equationGroup}>
                    <div className={styles.equationLine}>
                      <span style={{ fontStyle: 'italic' }}>n</span>
                      <sub>{state.selectedReaction!.product.formula}</sub>
                      {' = '}
                      <span style={{ fontStyle: 'italic' }}>n</span>
                      <sub>unknown<small>(react)</small></sub>
                    </div>
                    <div className={styles.equationLine}>
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.productMolesProduced.toFixed(4)}
                        </span>
                      </span>
                      {' = '}
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.unknownReactantMoles.toFixed(4)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Unknown reactant molar mass: MM = m / n */}
                  <div className={styles.equationGroup}>
                    <div className={styles.equationLine}>
                      MM<sub>unknown</sub>
                      {' = '}
                      <span className={styles.equationFraction}>
                        <span><span style={{ fontStyle: 'italic' }}>m</span><sub>unknown</sub></span>
                        <span className={styles.fractionLine} />
                        <span><span style={{ fontStyle: 'italic' }}>n</span><sub>unknown<small>(react)</small></sub></span>
                      </span>
                    </div>
                    <div className={styles.equationLine}>
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.unknownReactantMolarMass}
                        </span>
                      </span>
                      {' = '}
                      <span className={styles.equationFraction}>
                        <span className={styles.equationValue}>
                          {state.unknownReactantMassAdded.toFixed(2)}
                        </span>
                        <span className={styles.fractionLine} />
                        <span className={styles.equationValue}>
                          {state.unknownReactantMoles.toFixed(4)}
                        </span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.bottomBar}>
              <BeakyBox
                statement={guideStatement}
                onNext={state.next}
                onBack={state.back}
                canGoNext={state.canGoNext}
                showBack={state.showBack}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.placeholder}>
          Select a precipitation reaction to begin the simulation.
        </div>
      )}
    </div>
  );
}
