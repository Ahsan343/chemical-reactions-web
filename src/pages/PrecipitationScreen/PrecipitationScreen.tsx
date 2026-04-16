import { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import {
  usePrecipitationState,
  type HighlightElement,
  MIN_WATER_LEVEL,
  MAX_WATER_LEVEL,
} from './hooks/usePrecipitationState';

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
import { type TextLine } from '../../components/shared/guide/useGuideStore';
import MetalTable from '../../components/precipitation/MetalTable/MetalTable';
import PrecipitateShape from '../../components/precipitation/PrecipitateShape/PrecipitateShape';
import DigitalScales from '../../components/precipitation/DigitalScales/DigitalScales';
import BeakerToggle from '../../components/precipitation/BeakerToggle/BeakerToggle';
import MovingHand from '../../components/shared/MovingHand/MovingHand';
import { useCanvasScale } from '../../layout/ResponsiveLayout';

import styles from './PrecipitationScreen.module.scss';

/**
 * iOS HighlightedElements.colorMultiply — returns a CSS filter/style to dim
 * elements that are NOT in the current highlight list.
 * When highlights is empty, everything is bright (no dimming).
 */
function highlightStyle(
  highlights: HighlightElement[],
  element: HighlightElement,
): React.CSSProperties {
  if (highlights.length === 0) return {};
  const isActive = highlights.includes(element);
  return isActive
    ? { transition: 'opacity 0.3s ease, filter 0.3s ease' }
    : {
        opacity: 0.35,
        filter: 'saturate(0.3)',
        pointerEvents: 'none' as const,
        transition: 'opacity 0.3s ease, filter 0.3s ease',
      };
}

function buildReactionSegments(
  state: ReturnType<typeof usePrecipitationState>
): EquationSegment[] {
  const { selectedReaction, metalRevealed, currentMetal } = state;
  if (!selectedReaction) return [];

  const emphasize = !metalRevealed;

  const unknownCoeff = selectedReaction.unknownReactant.coefficient > 1
    ? `${selectedReaction.unknownReactant.coefficient}` : '';
  const unknownFormula = replaceMetalInFormula(
    selectedReaction.unknownReactant.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium
  );
  const unknownDisplay = metalRevealed
    ? unknownFormula
    : unknownFormula.replace(/Na|Li|K/g, 'M');

  const productFormula = selectedReaction.product.formula;

  const secondaryCoeff = selectedReaction.secondaryProduct.coefficient > 1
    ? `${selectedReaction.secondaryProduct.coefficient}` : '';
  const secondaryFormula = replaceMetalInFormula(
    selectedReaction.secondaryProduct.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium
  );
  const secondaryDisplay = metalRevealed
    ? secondaryFormula
    : secondaryFormula.replace(/Na|Li|K/g, 'M');

  return [
    { text: `${unknownCoeff}${unknownDisplay}`, emphasize },
    { text: `(${selectedReaction.unknownReactant.state})`, isState: true },
    { text: ' + ' },
    { text: selectedReaction.knownReactant.formula },
    { text: `(${selectedReaction.knownReactant.state})`, isState: true },
    { text: ' \u2192 ' },
    { text: productFormula },
    { text: `(${selectedReaction.product.state})`, isState: true },
    { text: ' + ' },
    { text: `${secondaryCoeff}${secondaryDisplay}`, emphasize },
    { text: `(${selectedReaction.secondaryProduct.state})`, isState: true },
  ];
}

/**
 * iOS [TextLine] — returns array of paragraphs (TextLine[]).
 * Each paragraph is a TextSegment[]. Instruction lines are separate paragraphs in bold/orange.
 */
function getGuideStatement(state: ReturnType<typeof usePrecipitationState>, explore: boolean): TextLine[] {
  if (explore) {
    switch (state.phase) {
      case 'chooseReaction':
        return [[{ text: 'Free Explore: Choose a reaction to begin experimenting freely.' }]];
      case 'reaction1':
        return [[{ text: 'The reaction is proceeding. A precipitate is forming...' }]];
      case 'weighProduct':
        return [[{ text: 'Drag the precipitate onto the scales to weigh it, then press Next.' }]];
      case 'revealMetal':
        return [[
          { text: 'Press Next to reveal the identity of metal ' },
          { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
          { text: '.' },
        ]];
      case 'complete':
        return [[
          { text: 'The metal is ' },
          { text: state.currentMetal, bold: true, color: 'rgb(220, 84, 59)' },
          { text: '! Experiment complete.' },
        ]];
      default:
        return [[{ text: 'Add reactants freely, adjust water level, then click React to start.' }]];
    }
  }
  switch (state.phase) {
    case 'chooseReaction':
      return [
        [{ text: 'Stoichiometry has various applications. Let\'s find out more.' }],
        [{ text: 'Choose a reaction.', bold: true }],
      ];

    // Educational intro (iOS steps 2-3)
    case 'explainPrecipitation':
      return [[
        { text: 'This is a precipitation reaction. How do I know? Well, one way is to notice that one of the products is a ' },
        { text: 'solid (s)', bold: true },
        { text: ', so once the reaction takes place, this solid will be produced and deposit as a precipitate. In this case, ' },
        { text: state.selectedReaction?.product.formula ?? 'CaCO₃', bold: true },
        { text: '.' },
      ]];
    case 'explainUnknownMetal':
      return [[
        { text: 'But there\'s something else that is strange about this reaction right? Well, ' },
        { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
        { text: ' is not a real element. M in this case represents just an alkaline metal. We will learn how stoichiometry can tell us which one of those 3 components is ' },
        { text: 'M', bold: true, color: 'rgb(220, 84, 59)' },
        { text: '.' },
      ]];

    case 'setWaterLevel':
      return [
        [{ text: 'This is a reaction that takes place in water, so let\'s set the volume of water in the beaker.' }],
        [{ text: 'Use the slider to set the volume.', bold: true }],
      ];
    case 'addKnown':
      return [
        [
          { text: 'Perfect! Now, shake ' },
          { text: state.selectedReaction?.knownReactant.formula ?? 'known reactant', bold: true },
          { text: ' to prepare a solution of it.' },
        ],
        [{ text: 'Shake it into the beaker.', bold: true }],
      ];
    case 'addUnknown':
      return [
        [
          { text: `You added ${state.knownReactantMoles.toFixed(2)} moles of ` },
          { text: state.selectedReaction?.knownReactant.formula ?? '', bold: true },
          { text: '. Now, go ahead and add ' },
          { text: state.metalRevealed
              ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
              : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
            bold: true },
          { text: ' and let\'s watch them react.' },
        ],
        [{ text: 'Notice the amount of grams added by the shaker. Keep shaking to see it react.', bold: true }],
      ];
    case 'reaction1': {
      const reaction1Grams = state.unknownReactantMassAdded;
      const reaction1GramName = reaction1Grams === 1 ? 'gram' : 'grams';
      return [
        [
          { text: 'Perfect! You added ' },
          { text: `${reaction1Grams.toFixed(2)} ${reaction1GramName}`, bold: true },
          { text: ' of ' },
          { text: state.metalRevealed
              ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
              : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
            bold: true },
          { text: '. Now, let\'s watch the reaction going.' },
        ],
        [{ text: `Watch how ${state.selectedReaction?.product.formula ?? 'the product'} is produced.`, bold: true }],
      ];
    }

    // Post-reaction1 (iOS step 8)
    case 'endReaction1':
      return [
        [
          { text: 'The reaction is complete! Why don\'t you check out the macroscopic beaker to see the precipitate you produced! ' },
          { text: 'Tap the toggle.', bold: true },
        ],
        [{ text: 'You can also tap back or the run again button to see the reaction again.' }],
      ];

    case 'weighProduct':
      return [
        [
          { text: 'Now, why don\'t you drag the solid ' },
          { text: state.selectedReaction?.product.formula ?? 'product', bold: true },
          { text: ' onto the scales to weigh it?' },
        ],
        [{ text: 'Drag the solid onto the scales.', bold: true }],
      ];

    // Post-weighing explanation (iOS step 10)
    case 'postWeighing': {
      const postWeighGrams = state.productMassProduced;
      const gramName = postWeighGrams === 1 ? 'gram' : 'grams';
      const unknownGrams2 = state.unknownReactantMassAdded;
      const unknownGramName2 = unknownGrams2 === 1 ? 'gram' : 'grams';
      return [[
        { text: `${postWeighGrams.toFixed(2)} ${gramName} of `, bold: true },
        { text: state.selectedReaction?.product.formula ?? '', bold: true },
        { text: ` was produced. By dividing this by its molar mass, we know that it is ${state.productMolesProduced.toFixed(2)} mol, which means that the ${unknownGrams2.toFixed(2)} ${unknownGramName2} of ` },
        { text: state.metalRevealed
            ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
            : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M'),
          bold: true },
        { text: ` we added are ` },
        { text: `${state.unknownReactantMoles.toFixed(2)} mol. But what does this mean?`, bold: true },
      ]];
    }

    case 'revealMetal': {
      const unknownMolarMass = state.unknownReactantMolarMass;
      const unknownFormula = state.metalRevealed
        ? replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal)
        : replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', Metal.Sodium).replace(/Na|Li|K/g, 'M');
      const revealedFormula = replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal);
      const revealGrams = state.unknownReactantMassAdded;
      const revealGramName = revealGrams === 1 ? 'gram' : 'grams';
      return [[
        { text: `Well, if there are ${revealGrams.toFixed(2)} ${revealGramName} in ${state.unknownReactantMoles.toFixed(2)} moles of `, bold: true },
        { text: unknownFormula, bold: true },
        { text: `, then how many are in 1 mol? There are ${unknownMolarMass} grams of ` },
        { text: unknownFormula, bold: true },
        { text: ` in 1 mol. That's right, ${unknownMolarMass} g/mol is the molar mass of it, and the molar mass of ` },
        { text: revealedFormula, bold: true },
        { text: ` matches it perfectly! So, ` },
        { text: `M = ${state.currentMetal}`, bold: true, color: 'rgb(220, 84, 59)' },
        { text: '.' },
      ]];
    }
    case 'addExtraUnknown': {
      const revealedFormula2 = replaceMetalInFormula(state.selectedReaction?.unknownReactant.formulaTemplate ?? '', state.currentMetal);
      return [
        [
          { text: 'We already discovered the mystery. At this point, ' },
          { text: revealedFormula2, bold: true },
          { text: ' is the limiting reagent, so just keep shaking ' },
          { text: revealedFormula2, bold: true },
          { text: ' to neutralize the ' },
          { text: state.selectedReaction?.knownReactant.formula ?? '', bold: true },
          { text: ' in its entirety.' },
        ],
        [{ text: 'Keep shaking to see it react.', bold: true }],
      ];
    }
    case 'reaction2':
      return [
        [
          { text: 'Now just watch how the reactant you added produces more and more ' },
          { text: state.selectedReaction?.product.formula ?? 'product', bold: true },
          { text: ', as it neutralizes all of the ' },
          { text: state.selectedReaction?.knownReactant.formula ?? '', bold: true },
          { text: ' that was left in the beaker.' },
        ],
        [{ text: 'Change between both microscopic and macroscopic views.', bold: true }],
      ];

    // Post-reaction2 (iOS step 14)
    case 'endReaction2':
      return [
        [{ text: 'Done! There\'s no more reactant left.' }],
        [
          { text: 'In a real laboratory, you would be able to extract the precipitate of ' },
          { text: state.selectedReaction?.product.formula ?? '', bold: true },
          { text: ' with a filter and weigh it to know the mass, so this could be applied in real life.' },
        ],
      ];

    case 'complete':
      if (state.reactionRun === 1) {
        return [[{ text: 'Great job! Press Next to repeat the experiment with the other reaction.' }]];
      }
      return [[{ text: 'Experiment complete. You identified the unknown metal using stoichiometry. Well done!' }]];
    case 'prepareSecondReaction':
      return [[{ text: 'Now, let\'s repeat the experiment with the other reaction!' }]];
    default:
      return [[{ text: '' }]];
  }
}

export default function PrecipitationScreen() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const exploreMode = searchParams.get('mode') === 'explore';
  const state = usePrecipitationState(exploreMode);

  const [isDragging, setIsDragging] = useState(false);
  // Captures the pointer position AND the precipitate's left/top (in px
  // relative to the beaker/scales row) at drag start, so we can update
  // precipitatePos directly as the user drags. Updating left/top (rather
  // than layering a transform offset that must later be cleared) means the
  // CSS transition animates a single smooth glide from the release point to
  // the scales — no "snap back to beaker then slide to scales" two-step.
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const precipitateRef = useRef<HTMLDivElement>(null);
  const scalesRef = useRef<HTMLDivElement>(null);

  // Divide viewport pointer deltas by the canvas scale so drag tracks the
  // cursor 1:1 on scaled / mobile screens. No-op on desktop (scale === 1).
  const canvasScale = useCanvasScale();

  // iOS: dropdown shows the full chemical equation with M placeholder
  // e.g. "M₂CO₃(aq) + CaCl₂(aq) → CaCO₃(s) + 2MCl(aq)"
  const dropdownOptions = state.reactions.map((r) => {
    const unknownCoeff = r.unknownReactant.coefficient > 1 ? r.unknownReactant.coefficient : '';
    const unknownDisplay = `${unknownCoeff}${r.unknownReactant.formulaTemplate}`;
    const secondaryCoeff = r.secondaryProduct.coefficient > 1 ? r.secondaryProduct.coefficient : '';
    const secondaryDisplay = `${secondaryCoeff}${r.secondaryProduct.formulaTemplate}`;
    return {
      id: r.id,
      label: `${unknownDisplay}(${r.unknownReactant.state}) + ${r.knownReactant.formula}(${r.knownReactant.state}) → ${r.product.formula}(${r.product.state}) + ${secondaryDisplay}(${r.secondaryProduct.state})`,
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!exploreMode && state.phase !== 'weighProduct') return;
      if (state.precipitatePosition !== 'beaker') return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      // Capture the precipitate's current position (relative to
      // beakerScalesRow) directly from the DOM so we don't need precipitatePos
      // as a callback dependency (avoids use-before-declaration).
      const rowEl = beakerScalesRowRef.current;
      const precipEl = precipitateRef.current;
      let originLeft = 0;
      let originTop = 0;
      if (rowEl && precipEl) {
        const rowRect = rowEl.getBoundingClientRect();
        const pRect = precipEl.getBoundingClientRect();
        const s = canvasScale > 0 ? canvasScale : 1;
        // Convert viewport deltas back to logical pixels (see notes in the
        // position-measuring useLayoutEffect above).
        originLeft = (pRect.left + pRect.width / 2 - rowRect.left) / s;
        originTop = (pRect.top + pRect.height / 2 - rowRect.top) / s;
      }
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        originLeft,
        originTop,
      };
      setIsDragging(true);
    },
    [state.phase, state.precipitatePosition, exploreMode, canvasScale],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const scaleDivisor = canvasScale > 0 ? canvasScale : 1;
      const dx = (e.clientX - dragStartRef.current.pointerX) / scaleDivisor;
      const dy = (e.clientY - dragStartRef.current.pointerY) / scaleDivisor;
      setPrecipitatePos({
        left: `${dragStartRef.current.originLeft + dx}px`,
        top: `${dragStartRef.current.originTop + dy}px`,
      });

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
    [state, canvasScale],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      setIsDragging(false);

      if (scalesRef.current) {
        const scalesRect = scalesRef.current.getBoundingClientRect();
        const isOver =
          e.clientX >= scalesRect.left &&
          e.clientX <= scalesRect.right &&
          e.clientY >= scalesRect.top &&
          e.clientY <= scalesRect.bottom;

        if (isOver) {
          // Commit the drop → the position useLayoutEffect will remeasure to
          // the scales centre, and because the draggable class is gone the
          // CSS transition on left/top produces ONE smooth glide.
          state.dragPrecipitate('scales');
        } else {
          // Not over scales: snap back to beaker via the same transition.
          // Force the effect to re-run by triggering a measure through
          // setting position explicitly. The effect re-runs anyway because
          // precipitatePosition hasn't changed — so manually reset.
          const rowEl = beakerScalesRowRef.current;
          const beakerEl = beakerWrapperRef.current;
          if (rowEl && beakerEl) {
            const rowRect = rowEl.getBoundingClientRect();
            const beakerRect = beakerEl.getBoundingClientRect();
            const waterSurface = beakerEl.querySelector('[data-water-surface]');
            const s = canvasScale > 0 ? canvasScale : 1;
            const beakerCenterX =
              (beakerRect.left + beakerRect.width / 2 - rowRect.left) / s;
            const waterCenterY = waterSurface
              ? (((waterSurface as HTMLElement).getBoundingClientRect().top + beakerRect.bottom) / 2 - rowRect.top) / s
              : (beakerRect.top + beakerRect.height * 0.7 - rowRect.top) / s;
            setPrecipitatePos({
              left: `${beakerCenterX}px`,
              top: `${waterCenterY}px`,
            });
          }
        }
      }
      state.setDropTarget(false);
    },
    [state, canvasScale],
  );

  const hasReaction = state.selectedReaction !== null;
  const segments = buildReactionSegments(state);
  const guideStatement = getGuideStatement(state, exploreMode);

  // iOS: unknownReactant name uses showMetal=false, showCoeff=false for equation subscripts
  const unknownFormulaDisplay = hasReaction
    ? (state.metalRevealed
        ? replaceMetalInFormula(state.selectedReaction!.unknownReactant.formulaTemplate, state.currentMetal)
        : replaceMetalInFormula(state.selectedReaction!.unknownReactant.formulaTemplate, Metal.Sodium).replace(/Na|Li|K/g, 'M'))
    : '';

  // Measure bottle→beaker fall distance for pour animation
  const containersRowRef = useRef<HTMLDivElement>(null);
  const beakerWrapperRef = useRef<HTMLDivElement>(null);
  const [fallDistance, setFallDistance] = useState('140px');

  useLayoutEffect(() => {
    const measure = () => {
      const cEl = containersRowRef.current;
      const bEl = beakerWrapperRef.current;
      if (cEl && bEl) {
        const cRect = cEl.getBoundingClientRect();
        const waterSurface = bEl.querySelector('[data-water-surface]');
        if (waterSurface) {
          const wsRect = waterSurface.getBoundingClientRect();
          const dist = wsRect.top - cRect.bottom;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        } else {
          const bRect = bEl.getBoundingClientRect();
          const dist = bRect.top + bRect.height * 0.4 - cRect.bottom;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        }
      }
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [hasReaction, state.waterLevel]);

  // Precipitate position: measures beaker water center and scales center
  // relative to beakerScalesRow, and transitions smoothly between them (iOS: easeOut 0.25s)
  const beakerScalesRowRef = useRef<HTMLDivElement>(null);
  const [precipitatePos, setPrecipitatePos] = useState<{ left: string; top: string }>({
    left: '50%',
    top: '70%',
  });

  useLayoutEffect(() => {
    const measure = () => {
      const rowEl = beakerScalesRowRef.current;
      const beakerEl = beakerWrapperRef.current;
      const scalesEl = scalesRef.current;
      if (!rowEl) return;
      // getBoundingClientRect returns viewport pixels. When the page is
      // wrapped in ResponsiveLayout's `transform: scale()` container,
      // everything inside is scaled — so viewport pixels = logicalPixels *
      // scale. The precipitate element lives inside that same scaled
      // container and its CSS left/top are interpreted in the parent's
      // *logical* coordinate system. So divide viewport deltas by the scale
      // to get back to logical pixels. On desktop (scale = 1) this is a
      // no-op. Without it, at e.g. scale 0.5 the precipitate lands at half
      // the intended position — above the water, offset from the cursor,
      // etc. (matches the bug reported for small screens).
      const s = canvasScale > 0 ? canvasScale : 1;
      const rowRect = rowEl.getBoundingClientRect();

      if (state.precipitatePosition === 'beaker' && beakerEl) {
        // iOS: precipitate sits at center of water column
        const waterSurface = beakerEl.querySelector('[data-water-surface]');
        const beakerRect = beakerEl.getBoundingClientRect();
        const beakerCenterX =
          (beakerRect.left + beakerRect.width / 2 - rowRect.left) / s;

        let waterCenterY: number;
        if (waterSurface) {
          const wsRect = waterSurface.getBoundingClientRect();
          // Center between water surface and beaker bottom
          waterCenterY =
            ((wsRect.top + beakerRect.bottom) / 2 - rowRect.top) / s;
        } else {
          waterCenterY =
            (beakerRect.top + beakerRect.height * 0.7 - rowRect.top) / s;
        }

        setPrecipitatePos({
          left: `${beakerCenterX}px`,
          top: `${waterCenterY}px`,
        });
      } else if (state.precipitatePosition === 'scales' && scalesEl) {
        const scalesRect = scalesEl.getBoundingClientRect();
        setPrecipitatePos({
          left: `${(scalesRect.left + scalesRect.width / 2 - rowRect.left) / s}px`,
          top: `${(scalesRect.top + scalesRect.height * 0.3 - rowRect.top) / s}px`,
        });
      }
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [state.precipitatePosition, state.waterLevel, hasReaction, canvasScale]);

  const isReactionPhase = state.phase === 'reaction1' || state.phase === 'reaction2' || state.phase === 'weighProduct' || state.phase === 'revealMetal' || state.phase === 'complete';
  const knownContainerActive = exploreMode ? (hasReaction && !isReactionPhase) : state.phase === 'addKnown';
  const unknownContainerActive = exploreMode ? (hasReaction && !isReactionPhase) : (state.phase === 'addUnknown' || state.phase === 'addExtraUnknown');

  return (
    <div className={styles.screen}>
      <LeftSidebar />
      <BranchMenu currentRoute={location.pathname} />
      {/* Top bar: equation + controls */}
      <div className={styles.topBar}>
        <div className={styles.equationArea} style={highlightStyle(state.highlights, 'reactionDefinition')}>
          {hasReaction && <EquationDisplay segments={segments} />}
        </div>
        <div className={styles.controls} style={highlightStyle(state.highlights, 'reactionToggle')}>
          <DropdownSelector
            options={dropdownOptions}
            selectedId={state.selectedReaction?.id ?? null}
            onChange={handleSelectReaction}
            disabled={exploreMode ? false : (state.phase !== 'chooseReaction' && state.phase !== 'complete')}
            placeholder="Choose a reaction"
          />
        </div>
      </div>

      {hasReaction ? (
        <div className={styles.mainContent}>
          {/* Left column */}
          <div className={styles.leftColumn}>
            <div className={styles.containersRow} ref={containersRowRef}>
              <div style={highlightStyle(state.highlights, 'knownReactantContainer')}>
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
                  fallDistance={fallDistance}
                />
              </div>
              <div style={highlightStyle(state.highlights, 'unknownReactantContainer')}>
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
                  fallDistance={fallDistance}
                />
              </div>
            </div>

            <div className={styles.beakerScalesRow} ref={beakerScalesRowRef}>
              <div
                className={styles.beakerWrapper}
                ref={beakerWrapperRef}
                style={
                  state.highlights.length > 0
                    ? (state.highlights.includes('beaker') || state.highlights.includes('waterSlider'))
                      ? { transition: 'opacity 0.3s ease, filter 0.3s ease' }
                      : { opacity: 0.35, filter: 'saturate(0.3)', transition: 'opacity 0.3s ease, filter 0.3s ease' }
                    : {}
                }
              >
                <FillableBeaker
                  waterLevel={state.waterLevel}
                  onWaterLevelChange={state.setWaterLevel}
                  minWaterLevel={MIN_WATER_LEVEL}
                  maxWaterLevel={MAX_WATER_LEVEL}
                  disabled={exploreMode ? (!hasReaction || isReactionPhase) : state.phase !== 'setWaterLevel'}
                  width={160}
                >
                {state.beakerView === 'microscopic' ? (
                  <BeakerMoleculeGrid
                    molecules={state.reactionMolecules}
                    animated
                  />
                ) : null}
              </FillableBeaker>

              {/* iOS "Run again?" button — shown after reactions complete */}
              {state.showRunAgain && (
                <button
                  type="button"
                  className={styles.runAgainButton}
                  onClick={state.runReactionAgain}
                >
                  Run again?
                </button>
              )}
              </div>

              <div className={styles.scalesArea} ref={scalesRef}>
                <DigitalScales
                  mass={state.precipitateMass}
                  isDropTarget={state.isDropTarget}
                  showMass={state.precipitatePosition === 'scales'}
                />
              </div>

              {/* Unified precipitate — animates between beaker center and scales */}
              {hasReaction && state.reactionProgress > 0 && state.beakerView === 'macroscopic' && (
                <div
                  ref={precipitateRef}
                  className={`${styles.precipitateAnimated} ${
                    state.phase === 'weighProduct' && state.precipitatePosition === 'beaker'
                      ? styles.precipitateDraggable
                      : ''
                  }`}
                  style={{
                    ...precipitatePos,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                  onPointerDown={
                    state.phase === 'weighProduct' && state.precipitatePosition === 'beaker'
                      ? handlePointerDown
                      : undefined
                  }
                  onPointerMove={
                    state.phase === 'weighProduct' && state.precipitatePosition === 'beaker'
                      ? handlePointerMove
                      : undefined
                  }
                  onPointerUp={
                    state.phase === 'weighProduct' && state.precipitatePosition === 'beaker'
                      ? handlePointerUp
                      : undefined
                  }
                  onPointerCancel={
                    state.phase === 'weighProduct' && state.precipitatePosition === 'beaker'
                      ? handlePointerUp
                      : undefined
                  }
                >
                  <PrecipitateShape
                    progress={state.reactionProgress}
                    color={state.selectedReaction!.product.color}
                    size={(() => {
                      // Scale the precipitate polygon with water level so it
                      // always stays inside the liquid region. At min water
                      // (small puddle) cap at 36px; at max water use 60px.
                      const w = Math.max(
                        MIN_WATER_LEVEL,
                        Math.min(MAX_WATER_LEVEL, state.waterLevel),
                      );
                      const t = (w - MIN_WATER_LEVEL) / (MAX_WATER_LEVEL - MIN_WATER_LEVEL);
                      return Math.round(36 + t * 24);
                    })()}
                  />
                </div>
              )}
            </div>

            {/* Hand gesture animation: guides user to drag precipitate → scales */}
            <MovingHand
              startRef={precipitateRef}
              endRef={scalesRef}
              visible={
                state.phase === 'weighProduct' &&
                state.precipitatePosition === 'beaker' &&
                state.beakerView === 'macroscopic' &&
                !isDragging
              }
              showDelay={2}
            />

            <div className={styles.toggleArea} style={highlightStyle(state.highlights, 'beakerToggle')}>
              <BeakerToggle
                view={state.beakerView}
                onChange={state.toggleBeakerView}
                disabled={false}
              />
            </div>
          </div>

          {/* Middle column */}
          <div className={styles.middleColumn}>
            <div
              className={styles.tableWrapper}
              style={
                state.highlights.length > 0
                  ? (state.highlights.includes('metalTable') || state.highlights.includes('correctMetalRow'))
                    ? { transition: 'opacity 0.3s ease, filter 0.3s ease' }
                    : { opacity: 0.35, filter: 'saturate(0.3)', transition: 'opacity 0.3s ease, filter 0.3s ease' }
                  : {}
              }
            >
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.knownReactant.color }} />
                    <span className={styles.chartLabel}>{state.selectedReaction.knownReactant.formula}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.unknownReactant.color }} />
                    <span className={styles.chartLabel}>
                      {state.metalRevealed
                        ? replaceMetalInFormula(state.selectedReaction.unknownReactant.formulaTemplate, state.currentMetal)
                        : replaceMetalInFormula(state.selectedReaction.unknownReactant.formulaTemplate, Metal.Sodium).replace(/Na|Li|K/g, 'M')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: state.selectedReaction.product.color }} />
                    <span className={styles.chartLabel}>{state.selectedReaction.product.formula}</span>
                  </div>
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
                        {state.knownReactantMoles.toFixed(2)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Product moles: n = m / MM */}
              {state.equationState === 'showAll' && (
                <>
                  <div className={styles.equationGroup} style={highlightStyle(state.highlights, 'productMoles')}>
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
                          {state.productMolesProduced.toFixed(2)}
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

                  {/* Unknown reactant moles: iOS n_product = coeff × n_unknown(react) */}
                  <div className={styles.equationGroup} style={highlightStyle(state.highlights, 'unknownReactantMoles')}>
                    <div className={styles.equationLine}>
                      <span style={{ fontStyle: 'italic' }}>n</span>
                      <sub>{state.selectedReaction!.product.formula}</sub>
                      {' = '}
                      {state.selectedReaction!.unknownReactant.coefficient > 1 && (
                        <>{state.selectedReaction!.unknownReactant.coefficient} &times; </>
                      )}
                      <span style={{ fontStyle: 'italic' }}>n</span>
                      <sub>{unknownFormulaDisplay}<small>(react)</small></sub>
                    </div>
                    <div className={styles.equationLine}>
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.productMolesProduced.toFixed(2)}
                        </span>
                      </span>
                      {' = '}
                      {state.selectedReaction!.unknownReactant.coefficient > 1 && (
                        <>{state.selectedReaction!.unknownReactant.coefficient} &times; </>
                      )}
                      <span style={{ display: 'inline-block', minWidth: 40, height: 20, border: '1.5px solid rgb(220,84,59)', borderRadius: 3, textAlign: 'center', lineHeight: '20px' }}>
                        <span className={styles.equationValue}>
                          {state.unknownReactantMoles.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Unknown reactant molar mass: MM = m / n */}
                  <div className={styles.equationGroup} style={highlightStyle(state.highlights, 'unknownReactantMolarMass')}>
                    <div className={styles.equationLine}>
                      MM<sub>{unknownFormulaDisplay}</sub>
                      {' = '}
                      <span className={styles.equationFraction}>
                        <span><span style={{ fontStyle: 'italic' }}>m</span><sub>{unknownFormulaDisplay}</sub></span>
                        <span className={styles.fractionLine} />
                        <span><span style={{ fontStyle: 'italic' }}>n</span><sub>{unknownFormulaDisplay}<small>(react)</small></sub></span>
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
                          {state.unknownReactantMoles.toFixed(2)}
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
          <div className={styles.placeholderContent}>
            <div className={styles.placeholderText}>
              Select a precipitation reaction to begin the simulation.
            </div>
            <BeakyBox
              statement={guideStatement}
              onNext={state.next}
              onBack={state.back}
              canGoNext={false}
              showBack={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
